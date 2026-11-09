const {test} = require('node:test');
const assert = require('node:assert/strict');
const {collectInBrowser} = require('../scripts/collection.cjs');

const campus = 'https://dkucard.dukekunshan.edu.cn';
const records = [{id:'synthetic',time:'2026-01-02 10:30',type:'Expense',merchant:'Dining',cents:-1200,status:'Successful'}];
const data = {version:1,source:'dkucard',start:'2026-01-01',end:'2026-01-31',account:'所有账户',complete:true,records};

function scenario(frames) {
  let index=0, clock=0, runId;
  const states=[], injections=[];
  let cleaned=false;
  const frame=()=>frames[Math.min(index,frames.length-1)];
  const client={
    async send(method) {
      assert.equal(method,'Target.getTargetInfo');
      return {targetInfo:{url:frame().url||campus+'/dku/english'}};
    },
    async evaluate(expression) {
      if(expression.includes('return {ready:document.readyState')){
        if(frame().contextLost)throw new Error('Execution context was destroyed');
        return {ready:frame().ready!==false,runId:frame().reloaded?undefined:runId,progress:frame().progress};
      }
      if(expression==='window.__dkuAppData')return frame().data||data;
      const run=/window\.__dkuAppRun="([a-f0-9-]+)"/.exec(expression);
      if(run){runId=run[1];injections.push(expression);}
      if(expression.includes('delete window.__dkuAppData'))cleaned=true;
    }
  };
  const options={client,targetId:'tab',sessionId:'session',sources:'/* collector sources */',start:data.start,end:data.end,
    now:()=>clock,pause:async ms=>{clock+=ms;index++;},onState:state=>states.push(state)};
  return {options,states,injections,get cleaned(){return cleaned;}};
}

test('collection waits through sign-in and reads a language-specific campus page',async()=>{
  const flow=scenario([
    {url:'https://shib.oit.duke.edu/idp/profile/SAML2/Redirect/SSO',ready:false},
    {},{progress:{phase:'collecting',page:1,pages:1,count:1}},{progress:{phase:'complete'}}
  ]);
  assert.deepEqual(await collectInBrowser(flow.options),data);
  assert.equal(flow.injections.length,1);
  assert.ok(flow.states.some(state=>state.phase==='login'));
  assert.ok(flow.states.some(state=>state.count===1));
  assert.equal(flow.cleaned,true);
});

test('locale redirects and reloaded execution contexts restart a complete query',async()=>{
  for(const transition of [{url:campus+'/dku/changeLanguage',ready:false},{reloaded:true},{contextLost:true}]){
    const flow=scenario([{},transition,{progress:{phase:'collecting'}}, {progress:{phase:'complete'}}]);
    assert.deepEqual(await collectInBrowser(flow.options),data);
    assert.equal(flow.injections.length,2);
    assert.equal(flow.cleaned,true);
  }
});

test('navigation retries are bounded and parser errors retain their specific reason',async()=>{
  const repeated=scenario([{},...Array.from({length:8},()=>({reloaded:true}))]);
  await assert.rejects(()=>collectInBrowser(repeated.options),/反复跳转/);
  assert.equal(repeated.injections.length,4);
  const failed=scenario([{}, {progress:{phase:'error',message:'学校交易表头已变化，已停止采集'}}]);
  await assert.rejects(()=>collectInBrowser(failed.options),/学校交易表头已变化/);
  assert.equal(failed.cleaned,true);
});

test('cancellation and malformed completed data never produce a dataset',async()=>{
  const cancelled=scenario([{}, {progress:{phase:'complete'}}]);
  let checks=0;
  await assert.rejects(()=>collectInBrowser({...cancelled.options,cancelled:()=>++checks>=2}),/取消/);
  const invalid=scenario([{}, {progress:{phase:'complete'},data:{...data,records:[{...records[0],time:'2025-12-31 10:30'}]}}]);
  await assert.rejects(()=>collectInBrowser(invalid.options),/超出所选日期范围/);
});

test('waiting for sign-in has a finite timeout and never injects into another origin',async()=>{
  const waiting=scenario([{url:'https://shib.oit.duke.edu/idp/profile/SAML2/Redirect/SSO',ready:false}]);
  const pause=waiting.options.pause;
  await assert.rejects(()=>collectInBrowser({...waiting.options,pause:()=>pause(10*60*1000)}),/等待登录超过/);
  assert.equal(waiting.injections.length,0);
});

test('a superseded query cannot overwrite a restarted query or hide a setup error',async()=>{
  const vm=require('node:vm');
  const flow=scenario([{}, {reloaded:true}, {progress:{phase:'complete'}}]);
  await collectInBrowser(flow.options);
  const pending=[];
  const context={window:{},location:{origin:campus},AbortController,DKUCollector:{
    browserReader:()=>null,
    collect:()=>new Promise(resolve=>pending.push(resolve))
  }};
  for(const expression of flow.injections)vm.runInNewContext(expression,context);
  pending[0]({...data,records:[]});
  await new Promise(setImmediate);
  assert.equal(context.window.__dkuAppProgress.phase,'collecting');
  pending[1](data);
  await new Promise(setImmediate);
  assert.equal(context.window.__dkuAppProgress.phase,'complete');
  assert.equal(context.window.__dkuAppData,data);
  context.DKUCollector.browserReader=()=>{throw new Error('Missing verification token');};
  vm.runInNewContext(flow.injections.at(-1),context);
  assert.equal(context.window.__dkuAppProgress.message,'Missing verification token');
});
