const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CDP}=require('../scripts/cdp.cjs');

test('browser evaluation retains actionable error details without exposing a stack trace',async()=>{
  const client={send:async()=>({exceptionDetails:{text:'Uncaught',exception:{description:'Error: Query form is missing\n    at collect (index:1)'}}})};
  await assert.rejects(()=>CDP.prototype.evaluate.call(client,'query','session'),{message:'Query form is missing'});
  client.send=async()=>({result:{value:{page:1}}});
  assert.deepEqual(await CDP.prototype.evaluate.call(client,'query','session'),{page:1});
});
