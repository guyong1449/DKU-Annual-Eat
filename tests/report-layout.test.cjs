const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
const {reportModel,filterPeriod}=require('../src/report.js');
const {createEatTI}=require('../src/personality.js');
const renderReport=require('./report-harness.cjs');
const row=(id,merchant,cents,time)=>({id,merchant,cents,time,type:cents<0?'Expense':'Refund',status:'Successful'});
const data=records=>({version:1,source:'dkucard',start:'2024-08-01',end:'2026-11-15',account:'所有账户',complete:true,records});

test('financial counters group only an unambiguous explicit location code while keeping source rows and Eat TI unchanged',()=>{
  const input=data([
    row('a','蛋包饭 1F-2',-2000,'2024-08-10 12:00'),row('b','面档 Harbour Deli 1F-2（卫孔记） 1F-2',-1500,'2025-03-01 12:00'),
    row('c','港式烧腊 2F-3',-3000,'2025-05-01 12:00'),row('d','一楼西侧',-1000,'2025-05-02 12:00'),
    row('e','面档 Harbour Deli 1F-2（卫孔记） 1F-2',100,'2025-05-03 12:00'),row('f','窗口 1F-2 / 2F-3',-500,'2026-04-01 12:00')
  ]);
  const original=JSON.stringify(input),summary=core.summarize(input),model=reportModel(summary);
  const period=filterPeriod(model.years,'',{start:input.start,end:input.end});
  const counter=period.merchants.find(m=>m.name==='1F-2');
  assert.equal(counter.cents,3400);assert.equal(counter.count,2);assert.equal(counter.refundCount,1);
  assert.equal(counter.sourceNames.length,2);assert.equal(period.merchants.find(m=>m.name==='2F-3').cents,3000);
  assert(period.merchants.some(m=>m.name==='一楼西侧'));assert(period.merchants.some(m=>m.name==='窗口 1F-2 / 2F-3'));
  assert.equal(period.total,summary.total);assert.equal(period.merchants.reduce((n,m)=>n+m.cents,0),summary.total);
  for(const merchant of period.merchants)assert.equal(merchant.months.reduce((n,[,v])=>n+v,0),merchant.cents);
  assert.deepEqual(createEatTI().analyze(period.included),createEatTI().analyze([...summary.expenses,...summary.refunds].sort((a,b)=>a.time.localeCompare(b.time))));
  assert.equal(JSON.stringify(input),original);
  const oneMonth=filterPeriod(model.years,'',{start:'2025-03-01',end:'2025-03-31'});
  assert.equal(oneMonth.merchants[0].name,'1F-2');assert.deepEqual(oneMonth.merchants[0].sourceNames,['面档 Harbour Deli 1F-2（卫孔记） 1F-2']);
});

test('cross-year chart axes place month numbers above separate year groups in both web and image exports',()=>{
  const {element,window}=renderReport(core.reportHTML(data([row('a','面档 1F-2',-1500,'2025-01-10 12:00')])));
  element('range-start').value='2024-08-01';element('range-end').value='2026-11-15';element('range-apply').onclick();
  for(const markup of [element('monthly').innerHTML,element('merchant-detail').innerHTML,window.dkuReport.share('card').svg,window.dkuReport.share('long').svg]){
    const axis=/<g class="month-axis">([\s\S]*?)<\/g><g class="year-axis">([\s\S]*?)<\/g>/.exec(markup);
    assert(axis,'separate month and year axis groups exist');
    assert.equal((axis[1].match(/class="month-tick"/g)||[]).length,28);
    assert.doesNotMatch(axis[1],/20\d{2}-\d{2}/);
    for(const year of ['2024','2025','2026'])assert.match(axis[2],new RegExp('>'+year+'<'));
    assert.equal((axis[2].match(/<line /g)||[]).length,3);
  }
  assert.match(element('merchant-detail').innerHTML,/校园卡返回名称/);
  assert.match(element('included').innerHTML,/面档 1F-2/);
});

test('long time ranges receive yearly print panels instead of shrinking all month labels into one row',()=>{
  const input={...data([]),start:'2022-01-01'};
  const {element}=renderReport(core.reportHTML(input));
  element('range-start').value=input.start;element('range-end').value=input.end;element('range-apply').onclick();
  assert.match(element('monthly').innerHTML,/has-print-years/);
  assert.equal((element('monthly').innerHTML.match(/class="print-year-chart"/g)||[]).length,5);
});

test('print content follows date filters, language and selected counter, including empty periods',()=>{
  const {element}=renderReport(core.reportHTML(data([row('a','面档 1F-2',-1500,'2025-01-10 12:00')])));
  element('year-filter').value='2025';element('year-filter').onchange();
  assert.equal((element('report-print').innerHTML.match(/class="print-sheet"/g)||[]).length,3);
  assert.match(element('report-print').innerHTML,/1F-2/);assert.match(element('report-print').innerHTML,/面档 1F-2/);
  assert.match(element('report-print').innerHTML,/15\.00/);
  assert.doesNotMatch(element('report-print').innerHTML,/id="amount-(?:count|total)"/);
  element('language-toggle').onclick();assert.match(element('report-print').innerHTML,/Little discoveries/);
  element('range-start').value='2026-06-01';element('range-end').value='2026-06-30';element('range-apply').onclick();
  assert.match(element('report-print').innerHTML,/2026-06-01 — 2026-06-30/);
  assert.doesNotMatch(element('report-print').innerHTML,/15\.00|面档 1F-2/);
});
