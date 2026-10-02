const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
const snapshot={id:'a',start:'2025-01-01',end:'2025-12-31',savedAt:'2026-09-13T12:00:00Z',count:3,file:'dku-a.json',reportName:'dku-a.html',reportURL:'/report/a',dataURL:'/data/a'};
function harness(protocol='http:'){
  function element(){return {value:'',children:[],hidden:true,disabled:false,classList:{add(){}},append(child){this.children.push(child);if(!this.value)this.value=child.value;},replaceChildren(...children){this.children=children;this.value='';},querySelectorAll(){return this.children;}};}
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  let state={phase:'ready',message:'已恢复',history:[snapshot]},fail=false;const requests=[];
  const context=vm.createContext({document:{getElementById:get,createElement:element},location:{protocol},AbortSignal,Date,setTimeout(){},fetch:async(url,options)=>{
    requests.push(url);if(fail===403)return {ok:false,status:403,json:async()=>({error:'请从本工具窗口操作'})};if(fail)throw new Error('offline');
    return {ok:true,json:async()=>state};
  }});
  vm.runInContext(source,context);
  return {get,requests,async tick(next,offline=false){if(next)state=next;fail=offline;await vm.runInContext('poll()',context);}};
}
test('history remains accessible while collecting, after cancellation and after disconnect',async()=>{
  const app=harness();await app.tick();
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('downloads').children.length,3);
  await app.tick({phase:'collecting',message:'采集中',history:[snapshot]});
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('start').disabled,true);
  await app.tick({phase:'error',message:'已取消',history:[snapshot]});
  assert.equal(app.get('result').hidden,false);assert.equal(app.get('start').disabled,false);
  await app.tick(null,true);assert.equal(app.get('result').hidden,false);
  assert.match(app.get('status').textContent,/查看报告.html/);assert.equal(app.get('quit').disabled,true);
  await app.tick(null,403);assert.match(app.get('status').textContent,/请刷新此页/);
});
test('empty history is explicit and direct file opening never calls the local API',async()=>{
  const empty=harness();await empty.tick({phase:'ready',message:'就绪',history:[]});
  assert.equal(empty.get('result').hidden,true);assert.equal(empty.get('empty-history').textContent,'暂无报告');
  const file=harness('file:');await file.tick();
  assert.deepEqual(file.requests,[]);assert.equal(file.get('start').disabled,true);
  assert.equal(file.get('offline-link').hidden,false);
});
test('adding a snapshot selects the new result without repeated HTML or JSON fetches',async()=>{
  const app=harness();await app.tick();
  await app.tick({phase:'complete',message:'完成',history:[{...snapshot,id:'b',reportURL:'/report/b'},snapshot]});
  assert.equal(app.get('history').value,'b');
  assert.equal(app.get('downloads').children[0].href,'/report/b');
  assert.ok(app.requests.every(url=>url==='/api/status'));
});
