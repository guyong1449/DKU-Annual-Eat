const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
const {createLanguage}=require('../src/language.js');
const {createImageExporter}=require('../src/share.js');
const snapshot={id:'a',start:'2025-01-01',end:'2025-12-31',savedAt:'2026-09-13T12:00:00Z',count:3,file:'dku-a.json',reportName:'dku-a.html',reportURL:'/report/a',dataURL:'/data/a'};
function harness(protocol='http:',saveImage=async()=>{},stored={}){
  const exports=[];
  function element(tag){const el={value:'',children:[],hidden:true,disabled:false,dataset:{},setAttribute(){},classList:{add(){}},append(child){this.children.push(child);if(!this.value)this.value=child.value;},remove(){this.removed=true;},replaceChildren(...children){this.children=children;this.value='';},querySelectorAll(){return this.children;}};if(tag==='iframe')el.contentWindow={dkuReport:{share:kind=>({src:el.srcdoc,kind:'report-'+kind})}};return el;}
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  let state={phase:'ready',message:'已恢复',history:[snapshot]},fail=false;const requests=[],bodies=[];
  const context=vm.createContext({document:{documentElement:{},querySelectorAll(){return [];},body:{append:frame=>Promise.resolve().then(()=>frame.onload())},getElementById:get,createElement:element},localStorage:{getItem:key=>stored[key],setItem(key,value){stored[key]=value;}},saveShareImage:async share=>{exports.push(share);await saveImage(share);},location:{protocol},AbortSignal,Date,setTimeout(){},clearTimeout(){},fetch:async(url,options)=>{
    requests.push(url);if(options?.body)bodies.push(JSON.parse(options.body));if(fail===403)return {ok:false,status:403,json:async()=>({error:'请从本工具窗口操作'})};if(fail)throw new Error('offline');
    return {ok:true,json:async()=>state,text:async()=>url};
  }});
  vm.runInContext(`const createLanguage=${createLanguage.toString()};\nconst createImageExporter=${createImageExporter.toString()};\n${source}`,context);
  return {get,requests,bodies,exports,async tick(next,offline=false){if(next)state=next;fail=offline;await vm.runInContext('poll()',context);}};
}
test('history remains accessible while collecting, after cancellation and after disconnect',async()=>{
  const app=harness();await app.tick();
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('downloads').children.length,5);
  await app.tick({phase:'collecting',message:'采集中',history:[snapshot]});
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('start').disabled,true);
  await app.tick({phase:'error',message:'已取消',history:[snapshot]});
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('start').disabled,false);
  await app.tick(null,true);assert.equal(app.get('result').hidden,false);
  assert.match(app.get('status').textContent,/桌面启动器/);assert.equal(app.get('quit').disabled,true);
  await app.tick(null,403);assert.match(app.get('status').textContent,/请刷新此页/);
});

test('a saved English preference can start collection and retains actionable errors',async()=>{
  const app=harness('http:',async()=>{},{'dku-lang':'en'});
  await app.tick();
  assert.equal(app.get('year').value,'2026');
  assert.equal(app.get('start').disabled,false);
  await app.get('start').onclick();
  assert.deepEqual(app.bodies.at(-1),{year:2026});
  await app.tick({phase:'login',message:'请登录',history:[snapshot]});
  assert.equal(app.get('start').disabled,true);
  assert.equal(app.get('cancel').disabled,false);
  assert.match(app.get('status').textContent,/automatically/);
  await app.tick({phase:'error',message:'等待登录超过 10 分钟，请点击开始重试',history:[snapshot]});
  assert.match(app.get('status').textContent,/Sign-in timed out after 10 minutes/);
  assert.equal(app.get('start').disabled,false);
  await app.tick({phase:'error',message:'School query failed (HTTP 503)',history:[snapshot]});
  assert.match(app.get('status').textContent,/HTTP 503/);
  app.get('year').value='custom';app.get('year').onchange();
  app.get('collection-start').value='2026-02-01';app.get('collection-end').value='2026-01-01';
  const requests=app.bodies.length;
  await app.get('start').onclick();
  assert.equal(app.bodies.length,requests);
  assert.match(app.get('status').textContent,/Enter valid dates/);
});
test('empty history is explicit and direct file opening never calls the local API',async()=>{
  const empty=harness();await empty.tick({phase:'ready',message:'就绪',history:[]});
  assert.equal(empty.get('result').hidden,true);assert.equal(empty.get('empty-history').textContent,'暂无报告');
  const file=harness('file:');await file.tick();
  assert.deepEqual(file.requests,[]);assert.equal(file.get('start').disabled,true);
  assert.match(file.get('status').textContent,/桌面启动器/);
});
test('adding a snapshot selects the new result without repeated HTML or JSON fetches',async()=>{
  const app=harness();await app.tick();
  await app.tick({phase:'complete',message:'完成',history:[{...snapshot,id:'b',reportURL:'/report/b'},snapshot]});
  assert.equal(app.get('history').value,'b');
  assert.equal(app.get('downloads').children[0].href,'/report/b');
  assert.ok(app.requests.every(url=>url==='/api/status'));
});

test('saved-report exports use the selected snapshot and restore controls after success or failure',async()=>{
  const app=harness();await app.tick({phase:'ready',message:'就绪',history:[snapshot,{...snapshot,id:'b',reportURL:'/report/b'}]});
  app.get('history').value='b';app.get('history').onchange();
  await app.get('downloads').children[1].onclick();
  await app.get('downloads').children[2].onclick();
  assert.deepEqual(app.exports,[{src:'/report/b',kind:'report-card'},{src:'/report/b',kind:'report-long'}]);
  assert.equal(app.get('export-status').hidden,true);
  assert.equal(app.get('downloads').children[1].disabled,false);
  await app.tick(null,true);await app.get('downloads').children[1].onclick();
  assert.match(app.get('export-status').textContent,/生成失败/);
  assert.equal(app.get('downloads').children[1].disabled,false);
  app.get('language-toggle').onclick();
  assert.equal(app.get('downloads').children[1].textContent,'Export card');
  assert.match(app.get('history').children[0].textContent,/Latest/);
  assert.equal(app.get('history').value,'b');
});

test('saved-report card and long-image exports keep separate busy states through rerenders',async()=>{
  const finishes=[],app=harness('http:',()=>new Promise(resolve=>finishes.push(resolve)));
  await app.tick();
  const card=app.get('downloads').children[1],long=app.get('downloads').children[2];
  const cardJob=card.onclick();
  assert.equal(card.disabled,true);assert.equal(long.disabled,false);
  await card.onclick();
  const longJob=long.onclick();
  await new Promise(setImmediate);
  assert.equal(app.exports.length,2);assert.equal(finishes.length,2);
  app.get('language-toggle').onclick();
  assert.equal(app.get('downloads').children[1].disabled,true);
  assert.equal(app.get('downloads').children[2].disabled,true);
  finishes[0]();await cardJob;
  assert.equal(app.get('downloads').children[1].disabled,false);
  assert.equal(app.get('downloads').children[2].disabled,true);
  assert.equal(app.get('export-status').hidden,false);
  finishes[1]();await longJob;
  assert.equal(app.get('downloads').children[2].disabled,false);
  assert.equal(app.get('export-status').hidden,true);
});


test('collection defaults to 2026 and custom dates survive language changes and validation',async()=>{
  const app=harness();await app.tick();
  assert.equal(app.get('year').value,'2026');
  app.get('year').value='custom';app.get('year').onchange();
  assert.equal(app.get('collection-dates').hidden,false);
  app.get('collection-start').value='2024-12-31';app.get('collection-end').value='2025-01-01';
  app.get('language-toggle').onclick();
  assert.equal(app.get('year').value,'custom');assert.equal(app.get('collection-start').value,'2024-12-31');
  await app.get('start').onclick();
  assert.deepEqual(app.bodies.at(-1),{year:'custom',start:'2024-12-31',end:'2025-01-01'});
  const before=app.bodies.length;
  app.get('collection-start').value='2025-02-01';app.get('collection-end').value='2025-01-01';
  await app.get('start').onclick();assert.equal(app.bodies.length,before);
  assert.equal(app.get('start').disabled,false);
  await app.tick({phase:'collecting',message:'采集中',history:[snapshot]});
  assert.equal(app.get('collection-start').disabled,true);
});

test('Safari selection survives polling, explains permissions and is sent with the collection range',async()=>{
  const app=harness('http:',async()=>{},{'dku-lang':'en'});
  const state={phase:'ready',message:'就绪',history:[],browser:'chromium',browsers:[{id:'chromium',name:'Google Chrome'},{id:'safari',name:'Safari'}]};
  await app.tick(state);
  assert.equal(app.get('browser-settings').hidden,false);
  assert.equal(app.get('safari-help').hidden,true);
  app.get('browser').value='safari';app.get('browser').onchange();
  await app.tick(state);
  assert.equal(app.get('browser').value,'safari');assert.equal(app.get('safari-help').hidden,false);
  await app.get('start').onclick();
  assert.deepEqual(app.bodies.at(-1),{year:2026,browser:'safari'});
  await app.tick({...state,phase:'login'});
  assert.equal(app.get('browser').disabled,true);
  await app.tick({...state,phase:'error',message:'请在 Safari 开发者设置中开启“允许来自 Apple Events 的 JavaScript”，然后重试'});
  assert.match(app.get('status').textContent,/Enable Allow JavaScript from Apple Events/);
  assert.equal(app.get('browser').disabled,false);
  const safariOnly=harness();
  await safariOnly.tick({...state,browser:'safari',browsers:[{id:'safari',name:'Safari'}]});
  assert.equal(safariOnly.get('browser').value,'safari');assert.equal(safariOnly.get('safari-help').hidden,false);
});
