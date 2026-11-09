const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const {ReportLibrary}=require('./library.cjs');
const {browserOptions,openDashboard,createBrowser}=require('./browser.cjs');
const {collectInBrowser}=require('./collection.cjs');
const core=require('../src/core.js');
const root=path.resolve(__dirname,'..');
const privateDir=path.join(root,'private');
const profile=path.join(privateDir,'browser-session');
const instanceFile=path.join(privateDir,'app-instance.json');
const appId=crypto.createHash('sha256').update(root).digest('hex').slice(0,24);
const secret=crypto.randomBytes(24).toString('hex');
const entry='https://dkucard.dukekunshan.edu.cn/dku/index';
fs.mkdirSync(privateDir,{recursive:true});
const log=message=>fs.appendFileSync(path.join(privateDir,'app.log'),`${new Date().toISOString()} ${message}\n`);
let state={phase:'ready',message:'选择年份，点击开始。学校登录将在专用窗口中完成。'};
let server,origin,cancelled=false,result,activeJob=false,library,quitting=false;
const browsers=browserOptions();
let selectedBrowser=browsers[0]?.id;
const clients=new Map();
async function prepareBrowser(id){
  if(clients.get(id)?.isConnected())return clients.get(id);
  const browser=browsers.find(browser=>browser.id===id);
  if(!browser)throw new Error('未找到所选浏览器，请安装后重新启动工具');
  const client=await createBrowser({browser,profile,origin,onDisconnect(){
    log('browser closed');
    if(quitting)return;
    if(process.platform==='win32'){server.close();setTimeout(()=>process.exit(0),500);}
    else if(selectedBrowser===id&&!activeJob)setState('error','专用浏览器已关闭');
  }});
  clients.set(id,client);
  return client;
}
function setState(phase,message,extra={}){state={phase,message,...extra};log(phase);}
async function startJob({start,end,label},browserId){
  activeJob=true;cancelled=false;
  selectedBrowser=browserId;
  let client,page;
  try{
    setState('login','正在准备采集浏览器，请检查浏览器权限提示。');
    client=await prepareBrowser(browserId);
    if(cancelled)throw new Error('已取消');
    setState('login','请在打开的校园卡标签页完成学校登录。完成后会自动读取，无需复制任何内容。');
    page=await client.openPage(entry);
    if(cancelled)throw new Error('已取消');
    const sources=['core.js','collector.js'].map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n');
    const collected=await collectInBrowser({
      client,...page,getTargetURL:()=>client.getTargetURL(page.targetId),sources,start,end,
      cancelled:()=>cancelled,
      onState(next){
        if(state.phase!==next.phase)setState(next.phase,next.message,next);
        else state=next;
      }
    });
    if(cancelled)throw new Error('已取消');
    const summary=core.summarize(collected);
    const saved=library.save(collected,label);
    result=collected;
    library.publish(origin);
    setState('complete',`已完成 · ${result.records.length} 条记录 · 净消费 ¥ ${core.money(summary.total)}`,{count:result.records.length,expenseCount:summary.expenses.length,refundCount:summary.refunds.length,total:core.money(summary.total),excluded:summary.excluded.length,...saved});
    try{
      await client.showPage(origin+saved.reportURL);
    }catch{state.openWarning='报告已保存。自动打开未成功，请点击「查看年度报告」。';}
  }catch(error){
    setState('error',cancelled?'已取消，未生成部分报告。':error.message);
  }finally{
    if(page){try{await client.releasePage(page);}catch{}}
    activeJob=false;
  }
}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function authorized(req){return req.headers.host===new URL(origin).host && req.headers['x-dku-app']===secret && (!req.headers.origin||req.headers.origin===origin);}
async function requestBody(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>1024)throw new Error('请求过大');}return JSON.parse(value||'{}');}
async function main(){
  let preferredPort=47836;
  try{
    const previous=JSON.parse(fs.readFileSync(instanceFile,'utf8'));
    if(previous.appId===appId && Number.isInteger(previous.port)&&previous.port>0&&previous.port<65536){
      preferredPort=previous.port;
      const response=await fetch(`http://127.0.0.1:${previous.port}/health`,{signal:AbortSignal.timeout(1000)});
      if((await response.json()).appId===appId){await openDashboard({browser:browsers[0],profile,url:`http://127.0.0.1:${previous.port}`});process.send?.({type:'ready'});return;}
    }
  }catch{}
  require('./build.cjs');
  library=new ReportLibrary(privateDir);
  if(library.items.length)result=library.data(library.items[0].id);
  server=http.createServer(async(req,res)=>{
    try{
      if(req.headers.host!==new URL(origin).host){json(res,403,{error:'Invalid host'});return;}
      const url=new URL(req.url,origin);
      if(req.method==='GET'&&url.pathname==='/health'){json(res,200,{appId});return;}
      // A separate, unguessable URL for each finished report; no directory serving.
      const stored=/^\/(report|data)\/([a-f0-9]{48})$/.exec(url.pathname);
      if(req.method==='GET'&&stored&&library.get(stored[2])){
        if(req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'请从本工具窗口打开报告'});return;}
        const isData=stored[1]==='data';
        const name=library.get(stored[2]).file.replace(/\.json$/,isData?'.json':'.html');
        res.writeHead(200,{'Content-Type':isData?'application/json; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...(isData||url.searchParams.has('download')?{'Content-Disposition':`attachment; filename="${name}"`}:{})});res.end(isData?JSON.stringify(library.data(stored[2]),null,2):library.html(stored[2]));return;
      }
      if(req.method==='GET'&&url.pathname==='/'){
        const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('LOCAL_APP_TOKEN',secret);
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self' blob:; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Frame-Options':'DENY'});res.end(html);return;
      }
      if(!authorized(req)){json(res,403,{error:'请从本工具窗口操作'});return;}
      if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{...state,browser:selectedBrowser,browsers:browsers.map(({id,name})=>({id,name})),history:library.list(),warnings:library.warnings,archivePath:path.join(privateDir,'home.html')});return;}
      if(req.method==='GET'&&url.pathname==='/api/data'&&result){json(res,200,result);return;}
      if(req.method==='GET'&&url.pathname==='/api/report'&&result){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(core.reportHTML(result));return;}
      if(req.method==='POST'&&url.pathname==='/api/start'){
        const body=await requestBody(req);
        let range;
        try{range=core.queryRange(body.year==='custom'?{start:body.start,end:body.end}:body.year,new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}));}catch(error){json(res,400,{error:error.message});return;}
        const browserId=body.browser||selectedBrowser;
        if(!browsers.some(browser=>browser.id===browserId)){json(res,400,{error:'未找到所选浏览器，请安装后重新启动工具'});return;}
        if(activeJob||state.phase==='preparing'){json(res,409,{error:'浏览器正在准备、已关闭或已有采集任务。请重新启动工具后重试。'});return;}
        void startJob(range,browserId);json(res,202,{ok:true});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/cancel'){cancelled=true;json(res,200,{ok:true});return;}
      if(req.method==='POST'&&url.pathname==='/api/quit'){
        cancelled=true;quitting=true;json(res,200,{ok:true});
        setTimeout(async()=>{await Promise.allSettled([...clients.values()].map(client=>client.close()));server.close();process.exit(0);},250);return;
      }
      json(res,404,{error:'Not found'});
    }catch{json(res,400,{error:'请求失败，请重试'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(preferredPort,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  origin=`http://127.0.0.1:${server.address().port}`;
  library.publish(origin,{refresh:true});
  fs.writeFileSync(instanceFile,JSON.stringify({appId,port:server.address().port,pid:process.pid}));
  setState('preparing','正在准备专用浏览器…');
  if(selectedBrowser==='safari')await openDashboard({browser:browsers[0],profile,url:origin});
  else await prepareBrowser(selectedBrowser);
  setState('ready',library.items.length?'已恢复历史报告，可直接查看；需要更新流水时再采集新数据。':'选择某一年或全部年份。生成后可在报告中切换年份和月份。');
  console.log(origin);
  process.send?.({type:'ready'});
}
main().catch(error=>{
  const message=error.code==='EADDRINUSE'?'工具的本机端口已被其他程序占用，启动失败。已有数据仍可通过「查看报告.html」离线查看。':error.message;
  log(message);console.error(message);setState('error',message);
  process.send?.({type:'error',message});
  if(!server?.listening)process.exitCode=1;
});
