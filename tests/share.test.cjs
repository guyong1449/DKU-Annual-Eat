const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createImageExporter}=require('../src/share.js');

const button=()=>({disabled:false,attributes:{},setAttribute(key,value){this.attributes[key]=value;}});

test('shared image exporter isolates buttons and restores state after success or failure',async()=>{
  const exports=createImageExporter(),card=button(),long=button();
  let finish,fail;
  const cardJob=exports.run('card',card,()=>new Promise(resolve=>{finish=resolve;}));
  assert.equal(card.disabled,true);assert.equal(card.attributes['aria-busy'],'true');
  assert.equal(long.disabled,false);
  let repeated=false;await exports.run('card',card,()=>{repeated=true;});assert.equal(repeated,false);
  const longJob=exports.run('long',long,()=>new Promise((_,reject)=>{fail=reject;}));
  const rejected=assert.rejects(longJob,/render failed/);
  assert.equal(exports.size,2);
  const replacement=button();exports.sync(replacement,'card');assert.equal(replacement.disabled,true);
  finish('saved');assert.equal(await cardJob,'saved');
  assert.equal(card.disabled,false);assert.equal(replacement.disabled,false);assert.equal(long.disabled,true);
  fail(new Error('render failed'));await rejected;
  assert.equal(long.disabled,false);assert.equal(long.attributes['aria-busy'],'false');assert.equal(exports.size,0);
});
