const {test} = require('node:test');
const assert = require('node:assert/strict');
const {collect} = require('../src/collector.js');
const row = id => ({id:String(id),time:'2025-09-01 12:00',cents:-10,type:'Expense 消费',status:'交易成功',merchant:'测试商户'});
const first = {page:1,pages:2,rows:Array.from({length:6},(_,i)=>row(i))};
const last = {page:2,pages:2,rows:[row(6)]};
const options = readPage => ({start:'2025-01-01',end:'2025-12-31',account:'所有账户',pause:async()=>{},readPage});
test('collects every page and rechecks first page before marking complete', async()=>{
  const calls=[]; const result=await collect(options(async p=>{calls.push(p);return p===1?first:last;}));
  assert.deepEqual(calls,[1,2,1]); assert.equal(result.records.length,7); assert.equal(result.complete,true);
});
test('repeated pages, missing rows, and changing page counts fail closed', async()=>{
  for (const bad of [first,{...last,pages:3},{...last,rows:[]},{...last,rows:[row(0)]}]) {
    await assert.rejects(()=>collect(options(async p=>p===1?first:bad)));
  }
});
test('new transactions during collection are detected by final check',async()=>{
  let calls=0;
  await assert.rejects(()=>collect(options(async p=>++calls===3?{...first,rows:[row(99),...first.rows.slice(1)]}:p===1?first:last)),/发生变化/);
});
test('cancellation stops further requests and never returns a partial success',async()=>{
  const controller=new AbortController(); let calls=0;
  await assert.rejects(()=>collect({...options(async()=>{calls++;controller.abort();return first;}),signal:controller.signal}),/取消/);
  assert.equal(calls,1);
});
test('a request failure produces no completed dataset',async()=>{
  await assert.rejects(()=>collect(options(async p=>{if(p===2)throw new Error('HTTP 403');return first;})),/403/);
});
