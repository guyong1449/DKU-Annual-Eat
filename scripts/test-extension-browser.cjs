// Real Chromium extension test with synthetic HTTPS campus/SSO responses.
// No school network request or personal browser profile is used.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {CDP}=require('./cdp.cjs');
const {build,output}=require('./build-extension.cjs');
const root=path.resolve(__dirname,'..');
const evidence=path.join(root,'private','extension-validation');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const checks=[];
async function until(fn,label,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){const value=await fn();if(value)return value;await delay(100);}throw new Error('Timed out: '+label);}
async function main(){
  build();fs.mkdirSync(evidence,{recursive:true});
  const cache=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.cache'),'ms-playwright');
  const candidates=fs.existsSync(cache)?fs.readdirSync(cache).filter(name=>/^chromium-\d+$/.test(name)).sort().reverse().map(name=>path.join(cache,name,'chrome-win64','chrome.exe')):[];
  const executable=process.env.DKU_TEST_BROWSER||candidates.find(file=>fs.existsSync(file));
  if(!executable)throw new Error('Set DKU_TEST_BROWSER to a Chromium / Chrome for Testing executable.');
  const profile=fs.mkdtempSync(path.join(evidence,'profile-'));
  const downloads=fs.mkdtempSync(path.join(evidence,'downloads-'));
  const child=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
    '--host-resolver-rules=MAP dkucard.dukekunshan.edu.cn 127.0.0.1, MAP shib.oit.duke.edu 127.0.0.1',
    '--remote-debugging-port=0','--user-data-dir='+profile,'--disable-extensions-except='+output,'--load-extension='+output,'about:blank'],{stdio:'ignore',windowsHide:true});
  let client;const sessions=new Map(),errors=[],queries=[],versions=new Map(),stoppedVersions=new Set();let mode='normal';
  try{
    const portFile=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(portFile),'browser startup');
    const [port,socket]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);client=await CDP.connect(`ws://127.0.0.1:${port}${socket}`);
    const evaluate=async(sessionId,expression)=>{
      const value=await client.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
      if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);
      return value.result?.value;
    };
    const rows=Array.from({length:8},(_,i)=>`<tr><td>2025.${i<3?'01':i===3?'02':'03'}.0${i%3+1}<br>12:30</td><td>Expense<br>Transaction Number: synthetic-${i}</td><td>${i===0?'蛋包饭 1F-2':'面档 Harbour Deli 1F-2（卫孔记） 1F-2'}</td><td>-13.50</td><td>Transaction Successful!</td></tr>`);
    const table=page=>`<table class="nyu-table"><thead><tr><th>Creation Time</th><th>Transaction ID</th><th>Merchant</th><th>Amount</th><th>Status</th></tr></thead><tbody>${(page===1?rows.slice(0,6):mode==='duplicate'?rows.slice(0,2):rows.slice(6)).join('')}</tbody></table>Page ${page} of 2`;
    client.socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.method==='ServiceWorker.workerVersionUpdated')for(const version of message.params.versions){versions.set(version.versionId,version);if(version.runningStatus==='stopped')stoppedVersions.add(version.versionId);}
      if(message.method==='Target.attachedToTarget'&&message.params.targetInfo.type==='page'){
        const {sessionId,targetInfo}=message.params;sessions.set(targetInfo.targetId,sessionId);
        void (async()=>{
          await client.send('Fetch.enable',{patterns:[{urlPattern:'https://dkucard.dukekunshan.edu.cn/*'},{urlPattern:'https://shib.oit.duke.edu/*'}]},sessionId);
          await client.send('Runtime.enable',{},sessionId);await client.send('Runtime.runIfWaitingForDebugger',{},sessionId);
        })().catch(error=>errors.push(error.message));
      }
      if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
      if(message.method==='Fetch.requestPaused')void (async()=>{
        const {requestId,request}=message.params,sessionId=message.sessionId,url=new URL(request.url);
        let body,responseCode=200,responseHeaders=[{name:'Content-Type',value:'text/html; charset=utf-8'}];
        if(url.hostname==='shib.oit.duke.edu')body='<h1>Synthetic SSO / MFA</h1><p>No real authentication required.</p>';
        else if(url.pathname==='/dku/index'){responseCode=302;responseHeaders.push({name:'Location',value:'https://shib.oit.duke.edu/mock-login'});body='';}
        else if(url.pathname==='/dku/login')body='<h1>Synthetic campus sign-in</h1>';
        else if(request.method==='POST'){
          const fields=new URLSearchParams(request.postData);queries.push(Object.fromEntries(fields));
          if(mode==='slow')await delay(1800);
          body=table(Number(fields.get('pageNo')));
        }else body=`<!doctype html><html><head><meta charset="utf-8"></head><body><form action="/dku/searchmydtl"><input name="_csrf" value="synthetic-csrf"></form>${table(1)}</body></html>`;
        await client.send('Fetch.fulfillRequest',{requestId,responseCode,responseHeaders,body:Buffer.from(body).toString('base64')},sessionId);
      })().catch(error=>{if(!/Invalid InterceptionId|Invalid state|Session.*not found/.test(error.message))errors.push(error.message);});
    });
    await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
    await client.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true,filter:[{type:'page',exclude:false},{exclude:true}]});
    const target=await until(async()=> {
      for(const target of (await client.send('Target.getTargets')).targetInfos.filter(target=>target.type==='service_worker'&&target.url.endsWith('/background.js'))){
        const {sessionId}=await client.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
        try{if(await evaluate(sessionId,'chrome.runtime.getManifest().name')==='DKU Annual Eat')return target;}catch{}
        finally{await client.send('Target.detachFromTarget',{sessionId});}
      }
    },'DKU extension service worker');
    const base=target.url.replace(/background\.js$/,'');
    const open=async url=>{const {targetId}=await client.send('Target.createTarget',{url});const sessionId=await until(()=>sessions.get(targetId),'page attach');try{await until(async()=>{try{return await evaluate(sessionId,`location.href===${JSON.stringify(url)}&&document.readyState==="complete"`);}catch{return false;}},'page load: '+url);}catch(error){console.error(await evaluate(sessionId,'JSON.stringify({url:location.href,title:document.title,ready:document.readyState,body:document.body?.innerText.slice(0,500)})'),errors);throw error;}return {targetId,sessionId};};
    const dashboard=await open(base+'app.html');
    assert.deepEqual(await evaluate(dashboard.sessionId,`(async()=>{const image=new Image();image.src=document.querySelector('link[rel="icon"]').href;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,32,32);return [...ctx.getImageData(4,16,1,1).data];})()`),[4,67,132,255]);
    checks.push('browser tab icon renders in DKU blue');
    const state=()=>evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"state"})');
    await until(async()=>(await state()).ok,'dashboard');
    const portal=await open('about:blank'),portalSession=portal.sessionId;
    await client.send('Page.navigate',{url:'https://dkucard.dukekunshan.edu.cn/dku/login'},portalSession);
    await until(()=>evaluate(dashboard.sessionId,'chrome.tabs.query({url:"https://dkucard.dukekunshan.edu.cn/*"}).then(tabs=>chrome.tabs.sendMessage(tabs[0].id,{type:"ping"})).then(()=>true,()=>false)'),'campus content script');
    await evaluate(dashboard.sessionId,'document.getElementById("year").value="2025";document.getElementById("start").click()');
    await until(async()=>(await state()).job?.phase==='login','waiting for MFA');
    await client.send('Page.navigate',{url:'https://shib.oit.duke.edu/mock-login'},portalSession);
    await until(()=>evaluate(portalSession,'location.href.endsWith("/mock-login")&&document.readyState==="complete"'),'mock SSO page');
    assert.equal(await evaluate(portalSession,'typeof DKUCollector'),'undefined');checks.push('SSO waits without injecting collector');
    await client.send('Page.navigate',{url:'https://dkucard.dukekunshan.edu.cn/dku/english'},portalSession);
    const done=await until(async()=>{const result=await state();if(result.job?.phase==='error')throw new Error(result.job.message);return result.job?.phase==='complete'?result:false;},'full collection');
    assert.equal(done.history.length,1);assert.equal(done.history[0].count,8);
    assert.deepEqual(queries.map(query=>query.pageNo),['1','2','1']);assert(queries.every(query=>query._csrf==='synthetic-csrf'&&query.accid===''));
    checks.push('English campus collection fetches every page and rechecks page one');
    const report=await open(base+'report.html?id='+done.job.reportId);
    await until(()=>evaluate(report.sessionId,'Boolean(window.dkuReport&&document.getElementById("net").textContent.includes("108"))'),'report rendering');
    assert(await evaluate(report.sessionId,`(()=>{
      const nav=document.querySelector('.report-navigation'),footer=document.querySelector('.extension-export'),view=document.getElementById('report-view');
      const names=document.getElementById('merchant-tags').textContent;
      return !!(nav.compareDocumentPosition(view)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(view.compareDocumentPosition(footer)&Node.DOCUMENT_POSITION_FOLLOWING)&&names.includes('蛋包饭 1F-2')&&names.includes('面档 Harbour Deli')&&document.querySelector('.topbar-actions .report-library')&&!footer.querySelector('h2')&&!footer.textContent.includes('需要留存或迁移时')&&footer.querySelectorAll('button').length===2&&decodeURIComponent(document.querySelector('link[rel="icon"]').href).includes('#044384');
    })()`));
    checks.push('primary report navigation precedes content; backups are at the bottom and full counter names remain visible');
    await evaluate(report.sessionId,'document.getElementById("show-eat").click()');
    assert.equal(await evaluate(report.sessionId,'document.getElementById("eat-view").hidden'),false);
    await evaluate(report.sessionId,'document.getElementById("language-toggle").click()');
    assert.equal(await evaluate(report.sessionId,'document.documentElement.lang'),'en');checks.push('report totals, Eat TI navigation, and English toggle');
    // Test both SVG-to-PNG rendering and the browser's actual download pipeline.
    const beforePNG=fs.readdirSync(downloads).filter(file=>file.endsWith('.png')).length;
    await evaluate(report.sessionId,'document.getElementById("eat-card").click()');
    try{await until(()=>fs.readdirSync(downloads).filter(file=>file.endsWith('.png')).length>beforePNG,'Eat TI image download');}
    catch(error){console.error('Image diagnostics',errors,await evaluate(report.sessionId,'JSON.stringify({sample:document.getElementById("eat-sample").textContent,button:document.getElementById("eat-card").outerHTML,share:window.__lastShare?.slice(0,100)})'));throw error;}
    await evaluate(report.sessionId,'document.getElementById("show-report").click();document.getElementById("report-long").click()');
    await until(()=>fs.readdirSync(downloads).filter(file=>file.endsWith('.png')).length>beforePNG+1,'report image download');
    checks.push('Eat TI card and report long image download as PNG');
    await evaluate(report.sessionId,'[...document.querySelectorAll(".extension-export button")][1].click()');
    const json=await until(()=>fs.readdirSync(downloads).find(file=>file.endsWith('.json')),'JSON download');
    const exported=JSON.parse(fs.readFileSync(path.join(downloads,json),'utf8'));
    assert.equal(exported.records.length,8);assert.equal(exported.complete,true);checks.push('JSON export preserves the complete raw dataset');
    await evaluate(report.sessionId,'[...document.querySelectorAll(".extension-export button")][0].click()');
    const offline=await until(()=>fs.readdirSync(downloads).find(file=>file.endsWith('.html')),'offline HTML download');
    const offlineTab=await open(require('node:url').pathToFileURL(path.join(downloads,offline)).href);
    await until(()=>evaluate(offlineTab.sessionId,'Boolean(window.dkuReport&&document.getElementById("net").textContent.includes("108"))'),'offline report scripts and CSP');checks.push('exported HTML opens offline with intact CSP and interactive charts');
    // Confirm local report history persists across the dashboard closing/reopening.
    await client.send('Target.closeTarget',{targetId:dashboard.targetId});
    const reopened=await open(base+'app.html');dashboard.sessionId=reopened.sessionId;dashboard.targetId=reopened.targetId;
    assert.equal((await state()).history.length,1);checks.push('history survives closing and reopening the tool page');
    // A content script must continue after the service worker is stopped.
    mode='slow';await evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"start",range:2025})');
    await until(async()=>(await state()).job?.phase==='collecting','second collection');
    await client.send('ServiceWorker.enable',{},dashboard.sessionId);
    const version=await until(()=>[...versions.values()].find(version=>version.scriptURL===target.url&&version.runningStatus==='running'),'running service worker version');
    stoppedVersions.delete(version.versionId);
    await client.send('ServiceWorker.stopWorker',{versionId:version.versionId},dashboard.sessionId);
    await until(()=>stoppedVersions.has(version.versionId),'service worker actually stopped');
    await client.send('Target.closeTarget',{targetId:dashboard.targetId});
    await until(async()=> (await evaluate(report.sessionId,'chrome.storage.session.get("job")')).job?.phase==='complete','collection without dashboard or worker',20000);
    const restored=await open(base+'app.html');dashboard.sessionId=restored.sessionId;dashboard.targetId=restored.targetId;
    assert.equal((await state()).history.length,2);
    checks.push('collection survives service worker shutdown and closing the tool page');
    mode='slow';await evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"start",range:2025})');
    await until(async()=>(await state()).job?.phase==='collecting','cancel job started');
    await evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"cancel"})');
    assert.equal((await state()).job.phase,'cancelled');assert.equal((await state()).history.length,2);checks.push('cancelled collection never saves a partial report');
    mode='duplicate';await evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"start",range:2025})');
    await until(async()=>(await state()).job?.phase==='error','duplicate page fails');assert.equal((await state()).history.length,2);checks.push('duplicate pages fail without replacing saved reports');
    await evaluate(dashboard.sessionId,`(()=>{const files=new DataTransfer();files.items.add(new File([${JSON.stringify(JSON.stringify(exported))}],"old-dku.json",{type:"application/json"}));files.items.add(new File([${JSON.stringify(JSON.stringify({...exported,complete:false}))}],"incomplete.json",{type:"application/json"}));const input=document.getElementById("import");input.files=files.files;input.dispatchEvent(new Event("change"));})()`);
    await until(async()=>(await state()).history.length===3,'old JSON import');
    await until(()=>evaluate(dashboard.sessionId,'document.getElementById("import-status").textContent.includes("incomplete.json")'),'incomplete JSON rejection');
    assert.equal((await state()).history.length,3);checks.push('old JSON imports through the UI and partial JSON is rejected');
    mode='normal';await evaluate(dashboard.sessionId,'chrome.runtime.sendMessage({type:"start",range:2025})');
    await until(async()=>{const result=await state();return result.job?.phase==='complete'&&result.history.length===4;},'recovery after collection error');
    checks.push('a successful retry recovers from collection errors');
    await delay(1600);
    for(const [name,sessionId] of [['dashboard',dashboard.sessionId],['report',report.sessionId]]){
      await client.send('Emulation.setDeviceMetricsOverride',{width:1360,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
      await evaluate(sessionId,'if(document.documentElement.lang!=="zh-CN")document.getElementById("language-toggle").click()');
      const shot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);
      fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from(shot.data,'base64'));
    }
    for(const width of [1360,390]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600},report.sessionId);
      assert(await evaluate(report.sessionId,'document.documentElement.scrollWidth<=innerWidth'),`report fits ${width}px viewport`);
      await evaluate(report.sessionId,'document.querySelector(".explorer").scrollIntoView({block:"start"})');
      const shot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},report.sessionId);
      fs.writeFileSync(path.join(evidence,`report-window-${width}.png`),Buffer.from(shot.data,'base64'));
    }
    checks.push('desktop and mobile reports fit the viewport with compact counter charts');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({checks,errors,synthetic:true,downloads},null,2));
    console.log(JSON.stringify({passed:checks.length,checks,evidence},null,2));
  }finally{
    if(client){await client.send('Browser.close').catch(()=>{});client.socket.close();}
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(5000)]);
    if(child.exitCode===null)child.kill();
    // Remove only this run's synthetic profile, after verifying its resolved parent.
    if(path.dirname(path.resolve(profile))===path.resolve(evidence)&&path.basename(profile).startsWith('profile-'))fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
