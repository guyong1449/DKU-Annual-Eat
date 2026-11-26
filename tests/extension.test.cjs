const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../src/core.js');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dataset={version:1,source:'dkucard',start:'2025-01-01',end:'2025-12-31',account:'所有账户',complete:true,
  records:[{id:'test-1',time:'2025-09-01 12:30',type:'Expense',merchant:'Noodles',cents:-1350,status:'Transaction Successful!'}]};
function worker({existing=true,listener=true}={}){
  let handle,removed,updated,job;const saved=[],sent=[],created=[];
  const chrome={runtime:{id:'test',getURL:name=>'chrome-extension://test/'+name,onMessage:{addListener:fn=>handle=fn}},
    storage:{session:{get:async()=>({job}),set:async next=>{job=next.job;}}},
    tabs:{query:async()=>existing?[{id:7,url:'https://dkucard.dukekunshan.edu.cn/dku/index'}]:[],
      update:async id=>({id}),create:async args=>{created.push(args);return {id:8};},
      sendMessage:async(id,message)=>{sent.push({id,message});if(!listener)throw new Error('No receiver');return {};},
      onRemoved:{addListener:fn=>removed=fn},onUpdated:{addListener:fn=>updated=fn}},action:{onClicked:{addListener(){}}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'extension/background.js'),'utf8'),{
    importScripts(){},chrome,DKUAnnual:core,URL,Date,crypto:webcrypto,
    DKUStore:{save:async data=>{saved.push(data);return 'report-1';},list:async()=>saved.map((data,i)=>({id:String(i),data}))}});
  const dashboard={id:'test',url:'chrome-extension://test/app.html'};
  const campus={id:'test',url:'https://dkucard.dukekunshan.edu.cn/dku/index',tab:{id:existing&&listener?7:8},frameId:0};
  const send=(message,sender=dashboard)=>new Promise(resolve=>handle(message,sender,resolve));
  return {send,campus,dashboard,saved,sent,created,get job(){return job;},removed,updated};
}
test('extension uses only campus host and storage; runtime pages contain no inline scripts',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'extension/manifest.json')));
  assert.deepEqual(manifest.permissions,['storage']);assert.deepEqual(manifest.host_permissions,['https://dkucard.dukekunshan.edu.cn/*']);
  assert.equal(manifest.manifest_version,3);assert.equal(manifest.externally_connectable,undefined);
  const {build,output}=require('../scripts/build-extension.cjs');build();
  for(const name of ['app.html','report.html'])assert.doesNotMatch(fs.readFileSync(path.join(output,name),'utf8'),/<script(?! src=)/);
  assert.equal((fs.readFileSync(path.join(output,'offline-template.html'),'utf8').match(/__DKU_REPORT_MODEL__/g)||[]).length,1);
});
test('session-backed job accepts only complete matching data and ignores duplicate completion',async()=>{
  const w=worker();assert.equal((await w.send({type:'start',range:2025})).ok,true);
  assert.equal(w.job.phase,'login');assert.equal(w.job.tabId,7);
  const id=w.job.id;assert.equal((await w.send({type:'resume'},w.campus)).job.id,id);
  assert.equal((await w.send({type:'begin',id},w.campus)).accepted,true);
  assert.equal((await w.send({type:'begin',id},w.campus)).accepted,undefined);
  assert.equal((await w.send({type:'start',range:2025})).ok,false);
  assert.equal((await w.send({type:'complete',id,data:{...dataset,complete:false}},w.campus)).ok,false);
  assert.equal(w.saved.length,0);
  assert.equal((await w.send({type:'complete',id,data:dataset},w.campus)).ok,true);
  assert.equal(w.job.phase,'complete');assert.equal(w.saved.length,1);
  await w.send({type:'complete',id,data:dataset},w.campus);assert.equal(w.saved.length,1);
});
test('cancellation and foreign senders cannot save a late or unsolicited dataset',async()=>{
  const w=worker();await w.send({type:'start',range:2025});const id=w.job.id;
  for(const sender of [{...w.campus,url:'https://shib.oit.duke.edu/'},{...w.campus,frameId:1},{...w.campus,tab:{id:99}}]){
    await w.send({type:'complete',id,data:dataset},sender);assert.equal(w.saved.length,0);
  }
  assert.equal((await w.send({type:'start',range:2025},w.campus)).ok,false);
  await w.send({type:'begin',id},w.campus);await w.send({type:'cancel'});
  await w.send({type:'complete',id,data:dataset},w.campus);
  assert.equal(w.job.phase,'cancelled');assert.equal(w.saved.length,0);
  assert.equal(w.sent.at(-1).message.type,'abort');
});
test('tabs predating installation open a fresh session-sharing tab; closed and navigated jobs stop',async()=>{
  const w=worker({listener:false});await w.send({type:'start',range:2025});assert.equal(w.job.tabId,8);assert.equal(w.created.length,1);
  await w.send({type:'begin',id:w.job.id},w.campus);w.updated(8,{status:'loading'});await w.send({type:'state'});
  assert.equal(w.job.phase,'error');assert.match(w.job.message,/跳转或刷新/);
  await w.send({type:'start',range:2025});w.removed(8);await w.send({type:'state'});
  assert.equal(w.job.phase,'error');assert.match(w.job.message,/已关闭/);
});
test('invalid dates are rejected before opening tabs; expired sign-in is never resumed',async()=>{
  const w=worker({existing:false});assert.equal((await w.send({type:'start',range:{start:'2025-02-30',end:'2025-12-31'}})).ok,false);
  assert.equal(w.created.length,0);await w.send({type:'start',range:2025});w.job.deadline=Date.now()-1;
  assert.equal((await w.send({type:'resume'},w.campus)).job,undefined);
  assert.equal(w.job.phase,'error');assert.match(w.job.message,/超过 10 分钟/);
});

test('immediate cancel and retry starts one collector and keeps the new controller cancellable',async()=>{
  let listener,current='a';const calls=[],messages=[];
  const chrome={runtime:{onMessage:{addListener:fn=>listener=fn},sendMessage:async message=>{
    messages.push(message);return {ok:true,...(message.type==='begin'?{accepted:message.id===current}:{})};
  }}};
  const form={querySelector:()=>true};
  vm.runInNewContext(fs.readFileSync(path.join(root,'extension/content.js'),'utf8'),{
    chrome,location:{origin:'https://dkucard.dukekunshan.edu.cn'},document:{querySelector:()=>true},
    AbortController,setTimeout,clearTimeout,
    DKUCollector:{findSearchForm:()=>form,browserReader:()=>()=>{},collect:({signal})=>new Promise((resolve,reject)=>{
      calls.push(signal);signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});
    })}});
  const receive=message=>listener(message,{},()=>{});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  receive({type:'collect',job:{id:'a',start:dataset.start,end:dataset.end}});await flush();assert.equal(calls.length,1);
  current='b';receive({type:'abort',id:'a'});
  receive({type:'collect',job:{id:'b',start:dataset.start,end:dataset.end}});
  receive({type:'collect',job:{id:'b',start:dataset.start,end:dataset.end}});
  await flush();assert.equal(calls.length,2);assert.equal(calls[0].aborted,true);assert.equal(calls[1].aborted,false);
  receive({type:'abort',id:'b'});await flush();assert.equal(calls[1].aborted,true);
  assert.equal(messages.filter(message=>message.type==='complete').length,0);
  assert.deepEqual(messages.filter(message=>message.type==='begin').map(message=>message.id),['a','b']);
});
