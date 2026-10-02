const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {CDP}=require('./cdp.cjs');
const {ReportLibrary}=require('./library.cjs');
const core=require('../src/core.js');
const root=path.resolve(__dirname,'..');
const privateDir=path.join(root,'private');
const profile=path.join(privateDir,'browser-session');
const instanceFile=path.join(privateDir,'app-instance.json');
const appId=crypto.createHash('sha256').update(root).digest('hex').slice(0,24);
const secret=crypto.randomBytes(24).toString('hex');
const entry='https://dkucard.dukekunshan.edu.cn/dku/index';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
fs.mkdirSync(privateDir,{recursive:true});
const log=message=>fs.appendFileSync(path.join(privateDir,'app.log'),`${new Date().toISOString()} ${message}\n`);
let state={phase:'ready',message:'选择年份，点击开始。学校登录将在专用窗口中完成。'};
let client,server,origin,activeTarget,activeSession,cancelled=false,result,activeJob=false,library;
const chromeCandidates=[process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe')].filter(Boolean);
const browserPath=chromeCandidates.find(file=>fs.existsSync(file));
function openBrowser(url,debug=false){
  if(!browserPath)throw new Error('未找到 Chrome 或 Edge，请先安装其中一个浏览器');
  const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check'];
  if(debug)args.push('--remote-debugging-address=127.0.0.1','--remote-debugging-port=0');
  args.push(url);
  const child=spawn(browserPath,args,{stdio:'ignore',detached:true,windowsHide:false});
  child.on('error',()=>{state={phase:'error',message:'无法启动浏览器，请检查 Chrome 或 Edge 安装。'};});child.unref();
}
async function connectBrowser(){
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
    try{
      const [port,socketPath]=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);
      if(!/^\d+$/.test(port)||!socketPath.startsWith('/devtools/browser/'))throw new Error('Browser not ready');
      return await CDP.connect(`ws://127.0.0.1:${port}${socketPath}`);
    }catch{await delay(200);}
  }
  throw new Error('专用浏览器未就绪。请关闭本工具的专用窗口，再双击启动。');
}
function setState(phase,message,extra={}){state={phase,message,...extra};log(phase);}
async function isCardPage(){
  if(!activeTarget)return false;
  const {targetInfo}=await client.send('Target.getTargetInfo',{targetId:activeTarget});
  const url=new URL(targetInfo.url);
  return url.origin==='https://dkucard.dukekunshan.edu.cn' && url.pathname==='/dku/index';
}
async function startJob({start,end,label}){
  activeJob=true;cancelled=false;
  try{
    setState('login','请在打开的校园卡标签页完成学校登录。完成后会自动读取，无需复制任何内容。');
    ({targetId:activeTarget}=await client.send('Target.createTarget',{url:entry}));
    ({sessionId:activeSession}=await client.send('Target.attachToTarget',{targetId:activeTarget,flatten:true}));
    const deadline=Date.now()+10*60*1000;
    let ready=false;
    while(Date.now()<deadline){
      if(cancelled)throw new Error('已取消');
      if(await isCardPage())ready=await client.evaluate("!!(document.querySelector('#searchForm input[name=_csrf]') && document.querySelector('#pdata .nyu-table'))",activeSession);
      if(ready)break;
      await delay(1000);
    }
    if(!ready)throw new Error('等待登录超过 10 分钟，请点击开始重试');
    setState('collecting','登录成功，正在读取交易记录…');
    const sources=['core.js','collector.js'].map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n');
    await client.evaluate(sources,activeSession);
    await client.evaluate(`window.__dkuAppAbort=new AbortController();window.__dkuAppProgress={phase:'collecting'};DKUCollector.collect({start:${JSON.stringify(start)},end:${JSON.stringify(end)},account:'所有账户',signal:window.__dkuAppAbort.signal,readPage:DKUCollector.browserReader({form:document.querySelector('#searchForm'),start:${JSON.stringify(start)},end:${JSON.stringify(end)},accountValue:'',signal:window.__dkuAppAbort.signal}),progress:p=>window.__dkuAppProgress={phase:'collecting',...p}}).then(data=>{window.__dkuAppData=data;window.__dkuAppProgress={phase:'complete'}}).catch(error=>window.__dkuAppProgress={phase:'error',message:error.message});void 0;`,activeSession);
    const collectionDeadline=Date.now()+30*60*1000;
    while(Date.now()<collectionDeadline){
      if(cancelled)throw new Error('已取消');
      if(!await isCardPage())throw new Error('校园卡页面已离开或登录过期，请点击开始重试');
      const progress=await client.evaluate('window.__dkuAppProgress',activeSession);
      if(progress?.phase==='error')throw new Error(progress.message);
      if(progress?.phase==='complete'){
        const collected=core.validateDataset(await client.evaluate('window.__dkuAppData',activeSession));
        const summary=core.summarize(collected);
        const saved=library.save(collected,label);
        result=collected;
        library.publish(origin);
        const {reportURL}=saved;
        setState('complete',`已完成 · ${result.records.length} 条记录 · 净消费 ¥ ${core.money(summary.total)}`,{count:result.records.length,expenseCount:summary.expenses.length,refundCount:summary.refunds.length,total:core.money(summary.total),excluded:summary.excluded.length,...saved});
        try{
          const {targetId}=await client.send('Target.createTarget',{url:origin+reportURL});
          await client.send('Target.activateTarget',{targetId});
        }catch{state.openWarning='报告已保存。自动打开未成功，请点击「查看年度报告」。';}
        return;
      }
      state={phase:'collecting',message:`正在读取 ${progress?.page||0} / ${progress?.pages||'?'} 页，共 ${progress?.count||0} 条记录。`,...progress};
      await delay(750);
    }
    throw new Error('采集超过 30 分钟，请缩小范围后重试');
  }catch(error){
    setState('error',cancelled?'已取消，未生成部分报告。':error.message);
  }finally{
    if(activeSession){try{if(await isCardPage())await client.evaluate('window.__dkuAppAbort?.abort();delete window.__dkuAppData;',activeSession);}catch{}}
    if(activeSession){try{await client.send('Target.detachFromTarget',{sessionId:activeSession});}catch{}}
    activeSession=null;activeTarget=null;
    activeJob=false;
  }
}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function authorized(req){return req.headers.host===new URL(origin).host && req.headers['x-dku-app']===secret && (!req.headers.origin||req.headers.origin===origin);}
async function requestBody(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>1024)throw new Error('请求过大');}return JSON.parse(value||'{}');}
let dashboardTarget;
async function main(){
  let preferredPort=47836;
  try{
    const previous=JSON.parse(fs.readFileSync(instanceFile,'utf8'));
    if(previous.appId===appId && Number.isInteger(previous.port)&&previous.port>0&&previous.port<65536){
      preferredPort=previous.port;
      const response=await fetch(`http://127.0.0.1:${previous.port}/health`,{signal:AbortSignal.timeout(1000)});
      if((await response.json()).appId===appId){openBrowser(`http://127.0.0.1:${previous.port}`);process.send?.({type:'ready'});return;}
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
      if(req.method==='GET'&&url.pathname==='/api/status'){json(res,200,{...state,history:library.list(),warnings:library.warnings,archivePath:path.join(privateDir,'home.html')});return;}
      if(req.method==='GET'&&url.pathname==='/api/data'&&result){json(res,200,result);return;}
      if(req.method==='GET'&&url.pathname==='/api/report'&&result){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(core.reportHTML(result));return;}
      if(req.method==='POST'&&url.pathname==='/api/start'){
        const body=await requestBody(req);
        let range;
        try{range=core.queryRange(body.year,new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}));}catch(error){json(res,400,{error:error.message});return;}
        if(!client||client.socket.readyState!==WebSocket.OPEN||activeJob){json(res,409,{error:'浏览器正在准备、已关闭或已有采集任务。请重新启动工具后重试。'});return;}
        void startJob(range);json(res,202,{ok:true});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/cancel'){cancelled=true;json(res,200,{ok:true});return;}
      if(req.method==='POST'&&url.pathname==='/api/quit'){
        cancelled=true;json(res,200,{ok:true});
        setTimeout(async()=>{try{await client?.send('Browser.close');}catch{}server.close();process.exit(0);},250);return;
      }
      json(res,404,{error:'Not found'});
    }catch{json(res,400,{error:'请求失败，请重试'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(preferredPort,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  origin=`http://127.0.0.1:${server.address().port}`;
  library.publish(origin,{refresh:true});
  fs.writeFileSync(instanceFile,JSON.stringify({appId,port:server.address().port,pid:process.pid}));
  setState('preparing','正在准备专用浏览器…');
  openBrowser(origin,true);
  client=await connectBrowser();
  const {targetInfos}=await client.send('Target.getTargets');
  dashboardTarget=targetInfos.find(target=>target.url===origin+'/'||target.url===origin)?.targetId;
  client.socket.addEventListener('close',()=>{log('browser closed');server.close();setTimeout(()=>process.exit(0),500);});
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
