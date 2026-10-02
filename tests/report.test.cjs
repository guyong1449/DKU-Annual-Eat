const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
const {reportModel}=require('../src/report.js');
const renderReport=require('./report-harness.cjs');
const row=(id,merchant,cents,time='2025-01-10 12:00',type='Expense 消费')=>({id,merchant,cents,time,type,status:'交易成功'});
const dataset=records=>({version:1,source:'dkucard',start:'2025-01-01',end:'2026-12-31',account:'所有账户',complete:true,records});
test('window month series reconcile with each annual total and maintain refund posting dates',()=>{
  const s=core.summarize(dataset([row('a','面档',-1000),row('b','面档',100,'2025-02-10 12:00','Refund 退款'),row('c','咖啡',-2000),row('d','pharos printing 校园打印',-3000),row('e','面档',-500,'2026-01-01 12:00')]));
  const model=reportModel(s);
  for(const annual of model.years){
    assert.equal(annual.months.reduce((n,m)=>n+m[1],0),annual.total);
    assert.equal(annual.merchants.reduce((n,m)=>n+m.cents,0),annual.total);
    for(const merchant of annual.merchants)assert.equal(merchant.months.reduce((n,m)=>n+m[1],0),merchant.cents);
  }
  assert.equal(model.years[0].merchants.find(m=>m.name==='面档').months[1][1],-100);
  const {element,charts}=renderReport(core.reportHTML(s.data));
  element('year-filter').value='2025';element('year-filter').onchange();
  assert.ok(element('monthly').innerHTML.includes('<rect'));
  charts[1].onclick();assert.ok(element('monthly').innerHTML.includes('<polyline'));
  element('merchant-select').value='1';element('merchant-select').onchange();
  assert.match(element('merchant-detail').innerHTML,/¥ 9.00/);
  assert.match(element('merchant-detail').innerHTML,/2025-02 · ¥ -1.00/);
  element('year-filter').value='2026';element('year-filter').onchange();
  assert.match(element('net').innerHTML,/5.00/);assert.ok(!element('ranking').innerHTML.includes('咖啡'));
});
test('empty and refund-only reports render finite charts and avoid invalid pie percentages',()=>{
  for(const records of [[],[row('r','面档',100,'2025-01-10 12:00','Refund 退款')]]){
    const {element}=renderReport(core.reportHTML(dataset(records)));
    element('year-filter').value='2025';element('year-filter').onchange();
    assert.match(element('distribution').innerHTML,/暂无正净消费/);
    assert.ok(!/NaN|Infinity/.test(element('monthly').innerHTML));
    assert.ok(!/NaN|Infinity/.test(element('merchant-detail').innerHTML));
  }
});

test('all-history report lists queried years and month filters update totals, merchants and both detail tables',()=>{
  const input={...dataset([row('a','旧面档',-1000,'2023-01-10 12:00'),row('b','面档',-2000),row('c','面档',200,'2025-02-10 12:00','Refund 退款'),row('d','咖啡',-500,'2025-02-12 12:00'),row('e','pharos printing 校园打印',-300,'2025-02-12 12:00'),row('f','新窗口',-600,'2026-09-01 12:00')]),start:'2022-01-01',end:'2026-09-13'};
  const {element}=renderReport(core.reportHTML(input));
  assert.equal(element('year-filter').value,'2026');
  assert.ok(!element('year-filter').innerHTML.includes('2021'));
  assert.ok(element('year-filter').innerHTML.includes('2022'));
  assert.ok(element('year-filter').innerHTML.includes('2023'));
  assert.ok(!element('month-filter').innerHTML.includes('value="10"'));
  element('year-filter').value='2025';element('year-filter').onchange();
  element('month-filter').value='02';element('month-filter').onchange();
  assert.match(element('net').innerHTML,/3.00/);assert.equal(element('count').textContent,1);
  assert.match(element('ranking').innerHTML,/咖啡/);assert.match(element('ranking').innerHTML,/-2.00/);
  assert.ok(!element('included').innerHTML.includes('2025-01'));
  assert.match(element('excluded').innerHTML,/校园打印/);
  assert.match(element('period').textContent,/2025-02-01 — 2025-02-28/);
  element('month-filter').value='03';element('month-filter').onchange();
  assert.match(element('net').innerHTML,/0.00/);assert.match(element('ranking').innerHTML,/暂无/);
  element('year-filter').value='2023';element('year-filter').onchange();
  assert.equal(element('month-filter').value,'');assert.match(element('net').innerHTML,/10.00/);
  assert.ok(!element('merchant-tags').innerHTML.includes('新窗口'));
});
