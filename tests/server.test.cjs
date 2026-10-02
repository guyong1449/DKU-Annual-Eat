const {test}=require('node:test');
const assert=require('node:assert/strict');
const base=process.env.DKU_TEST_URL;
test('local API requires its per-run token and rejects other origins', {skip:!base}, async()=>{
  assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/);
  const html=await (await fetch(base)).text();
  const token=/const token='([a-f0-9]{48})'/.exec(html)?.[1];
  assert.ok(token,'launcher substitutes a token');
  assert.equal((await fetch(base+'/api/status')).status,403);
  assert.equal((await fetch(base+'/api/data')).status,403);
  assert.equal((await fetch(base+'/api/status',{headers:{'X-DKU-App':token,Origin:'https://example.com'}})).status,403);
  const headers={'X-DKU-App':token};
  assert.equal((await fetch(base+'/api/status',{headers})).status,200);
  assert.equal((await fetch(base+'/private/browser-session/DevToolsActivePort',{headers})).status,404);
  assert.equal((await fetch(base+'/api/start',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{"year":9999}'})).status,400);
  assert.equal((await fetch(base+'/report/not-a-valid-report')).status,403);
  const state=await (await fetch(base+'/api/status',{headers})).json();
  assert.ok(Array.isArray(state.history));
  for(const item of state.history.slice(0,1)){
    const report=await fetch(base+item.reportURL);
    assert.equal(report.status,200);assert.equal(report.headers.get('referrer-policy'),'no-referrer');
    assert.match(await report.text(),/消费的月度节奏/);
    assert.equal((await fetch(base+item.reportURL,{headers:{'sec-fetch-site':'cross-site'}})).status,403);
    assert.equal((await fetch(base+item.dataURL,{headers:{'sec-fetch-site':'cross-site'}})).status,403);
    const download=await fetch(base+item.reportURL+'?download=1');
    assert.match(download.headers.get('content-disposition'),/^attachment/);
    const data=await (await fetch(base+item.dataURL)).json();
    assert.equal(data.complete,true);assert.equal(data.records.length,item.count);
  }
});
