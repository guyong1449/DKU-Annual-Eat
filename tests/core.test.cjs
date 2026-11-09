const {test} = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');
const renderReport=require('./report-harness.cjs');
const row = (id, cents, extra={}) => ({id, cents, time:'2025-01-02 12:10', type:'Expense 消费', merchant:'校园商户', status:'交易成功', ...extra});
const data = records => ({version:1,source:'dkucard',start:'2025-01-01',end:'2025-12-31',account:'所有账户',complete:true,records});

test('query selector supports single years and all years starting at 2022',()=>{
  assert.deepEqual(core.queryRange('all','2026-09-13'),{start:'2022-01-01',end:'2026-09-13',label:'all'});
  assert.deepEqual(core.queryRange(2022,'2026-09-13'),{start:'2022-01-01',end:'2022-12-31',label:'2022'});
  assert.deepEqual(core.queryRange(2026,'2026-09-13'),{start:'2026-01-01',end:'2026-09-13',label:'2026'});
  for(const value of [2021,2027,undefined,'2025',NaN])assert.throws(()=>core.queryRange(value,'2026-09-13'));
});

test('money is parsed into integer cents without losing the sign', () => {
  assert.equal(core.amountToCents(' - 1,203.05 '), -120305);
  assert.equal(core.amountToCents('+ 0.1'), 10);
  for (const input of ['1.234','NaN','12元','-','1e3']) assert.throws(() => core.amountToCents(input));
});
test('successful refunds offset consumption; top-ups and failed rows are excluded', () => {
  const summary = core.summarize(data([row('1',-10),row('2',-20),row('3',100,{type:'Recharge 充值'}),row('4',10,{type:'Refund 退款'}),row('5',-50,{status:'交易失败'}),row('6',-80,{type:'其他'})]));
  assert.equal(summary.total,20); assert.equal(summary.gross,20); assert.equal(summary.returned,0); assert.equal(summary.refunds.length,0); assert.equal(summary.expenses.length,1); assert.equal(summary.excluded.length,5);
  assert.equal(summary.months.length,12); assert.equal(summary.months[1][1],0);
});
test('duplicate IDs are removed, conflicting records fail closed', () => {
  assert.equal(core.summarize(data([row('1',-10),row('1',-10)])).total,10);
  assert.throws(() => core.summarize(data([row('1',-10),row('1',-20)])), /不同记录/);
});
test('date bounds and invalid timestamps are rejected', () => {
  assert.throws(() => core.summarize(data([row('1',-10,{time:'2024-12-31 23:59'})])), /范围/);
  assert.throws(() => core.summarize(data([row('1',-10,{time:'2025-02-30 12:00'})])), /时间/);
  assert.throws(() => core.summarize(data([row('1',-10,{time:'2025-02-28 24:00'})])), /时间/);
});
test('cross-year months are not merged', () => {
  const input = {...data([row('1',-10),row('2',-20,{time:'2026-01-02 08:00'})]),end:'2026-12-31'};
  assert.equal(core.summarize(input).months.length,24);
  assert.equal(core.summarize(input).months[12][1],20);
});
test('report escapes merchant data and only authorizes its own hashed inline script', () => {
  const html = core.reportHTML(data([row('1',-100,{merchant:'<script>alert(1)</script> & "shop"'})]));
  assert.equal((html.match(/<script>/g)||[]).length,1);
  const script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
  assert.ok(!script.includes('\r'),'CSP hashes must match HTML newline normalization');
  assert.ok(html.includes('sha256-'+require('node:crypto').createHash('sha256').update(script).digest('base64')));
  assert.ok(!/https?:\/\//.test(html)); assert.ok(html.includes('default-src'));
  assert.match(renderReport(html).element('ranking').innerHTML,/&lt;script&gt;/);
});
test('incomplete collection is visibly labelled and empty data is supported', () => {
  assert.match(core.reportHTML({...data([]),complete:false}), /部分数据报告/);
  assert.equal(core.summarize(data([])).total,0);
  assert.throws(() => core.validateDataset({entities:[]}), /DKU JSON/);
});
test('full reversal cancels the old charge and preserves the replacement charge',()=>{
  const summary=core.summarize(data([row('a',-3762),row('b',3762,{type:'Expense Canceled 消费冲正'}),row('c',-2304)]));
  assert.equal(summary.total,2304);assert.equal(summary.months[0][1],2304);assert.equal(summary.merchants[0].cents,2304);
});
test('ten-percent cashback is subtracted once, never apply a second discount',()=>{
  const summary=core.summarize(data([row('a',-10000),row('b',1000,{type:'Discount Refund 折扣返还'})]));
  assert.equal(summary.total,9000);
});
test('cross-month refunds stay in their posting month; negative net values are retained',()=>{
  const summary=core.summarize(data([row('a',-100),row('b',100,{time:'2025-02-01 10:00',type:'Expense Canceled 消费冲正'})]));
  assert.equal(summary.total,0);assert.equal(summary.months[0][1],100);assert.equal(summary.months[1][1],-100);
  assert.equal(core.summarize(data([row('b',100,{type:'Refund 退款'})])).total,-100);
});
test('failed refunds and negative cancellation adjustments are not treated as money returned',()=>{
  const summary=core.summarize(data([row('a',-100),row('b',100,{type:'Refund 退款',status:'交易失败'}),row('c',-20,{type:'Expense Canceled 消费冲正'})]));
  assert.equal(summary.total,100);assert.equal(summary.refunds.length,0);
});
test('merchant tags and totals are scoped to each year, including renamed merchants',()=>{
  const input={...data([row('a',-100,{merchant:'旧面档'}),row('b',-200,{merchant:'共用店名'}),row('c',-300,{merchant:'新面档',time:'2026-01-02 12:00'}),row('d',-400,{merchant:'共用店名',time:'2026-01-02 12:01'}),row('e',100,{type:'Refund 退款',merchant:'共用店名',time:'2026-01-03 12:00'})]),end:'2026-12-31'};
  const s=core.summarize(input);
  assert.equal(s.years[0].total,300);assert.equal(s.years[1].total,600);
  assert.deepEqual(new Set(s.years[0].merchants.map(x=>x.name)),new Set(['旧面档','共用店名']));
  assert.deepEqual(new Set(s.years[1].merchants.map(x=>x.name)),new Set(['新面档','共用店名']));
  assert.equal(s.years[1].merchants.find(x=>x.name==='共用店名').cents,300);
  const {element}=renderReport(core.reportHTML(input));
  element('year-filter').value='2025';element('year-filter').onchange();
  assert.equal(element('annual-label').textContent,'2025 年窗口详情');
  element('year-filter').value='2026';element('year-filter').onchange();
  assert.equal(element('annual-label').textContent,'2026 年窗口详情');
  assert.ok(!element('merchant-tags').innerHTML.includes('旧面档'));
});
test('all annual merchants get tags and ranking entries, not just the top ten',()=>{
  const {element}=renderReport(core.reportHTML(data(Array.from({length:14},(_,i)=>row(String(i),-100-i,{merchant:'店铺'+i})))));
  assert.equal((element('merchant-tags').innerHTML.match(/class="merchant-tag" /g)||[]).length,14);
  assert.equal((element('ranking').innerHTML.match(/class="rank"/g)||[]).length,14);
});
test('included and excluded records are rendered in separate labelled detail tables',()=>{
  const html=core.reportHTML(data([row('a',-1080,{merchant:'面档'}),row('b',20000,{type:'WeChat Top up 微信充值',merchant:'充值'})]));
  const {element}=renderReport(html);
  assert.match(element('included-label').textContent,/已计入净消费的明细 · 1 条/);assert.match(element('included').innerHTML,/面档/);assert.ok(!element('included').innerHTML.includes('WeChat Top up'));
  assert.match(element('excluded-label').textContent,/未计入净消费的其他明细 · 1 条/);assert.match(element('excluded').innerHTML,/WeChat Top up/);
});

test('printing charges and refunds are excluded from totals, rankings and counted details',()=>{
  const input=data([row('a',-35880,{merchant:'pharos printing 校园打印'}),row('b',1000,{merchant:' PHAROS  PRINTING 校园打印 ',type:'Refund 退款'}),row('c',-1080,{merchant:'面档'})]);
  const s=core.summarize(input);
  assert.equal(s.total,1080);assert.equal(s.gross,1080);assert.equal(s.returned,0);
  assert.equal(s.expenses.length,1);assert.equal(s.refunds.length,0);assert.equal(s.excluded.length,2);
  assert.equal(s.months[0][1],1080);assert.equal(s.years[0].total,1080);
  assert.deepEqual(s.merchants.map(x=>x.name),['面档']);assert.deepEqual(s.years[0].merchants.map(x=>x.name),['面档']);
  assert.equal(s.max.merchant,'面档');assert.equal(s.data.records.length,3);
  const {element}=renderReport(core.reportHTML(input));
  assert.ok(!element('included').innerHTML.includes('pharos printing'));assert.match(element('excluded').innerHTML,/不计入：校园打印/);assert.match(element('excluded').innerHTML,/pharos printing 校园打印/);
});

test('five-minute reversals match one-to-one and preserve replacement purchases and source rows',()=>{
  const input=data([row('z',-1000),row('a',1000,{type:'Expense Canceled 消费冲正',time:'2025-01-02 12:15'}),row('b',-1000),row('c',-600)]);
  const s=core.summarize(input);
  assert.equal(s.total,1600);assert.equal(s.expenses.length,2);assert.equal(s.refunds.length,0);assert.equal(s.merchants[0].count,2);
  assert.equal(s.excluded.length,2);assert.equal(s.data.records.length,4);assert.equal(input.records[0].exclusionReason,undefined);
  const {element}=renderReport(core.reportHTML(input));assert.match(element('excluded').innerHTML,/疑似全额退款/);
});

test('reversal matching rejects cashback, partial returns, other merchants, failed income and top-ups',()=>{
  for(const extra of [{type:'Discount Refund 折扣返还'},{type:'Refund 退款',cents:100},{type:'Refund 退款',merchant:'其他店'},{type:'Refund 退款',status:'交易失败'},{type:'Recharge 充值'}]){
    const s=core.summarize(data([row('a',-1000),row('b',1000,extra)]));assert.equal(s.expenses.length,1);assert.ok(!s.excluded.some(r=>r.exclusionReason));
  }
});

test('refunds must follow expenses within five minutes on the same date',()=>{
  for(const time of ['2025-01-02 12:09','2025-01-02 12:16','2025-01-03 12:10']){
    const s=core.summarize(data([row('a',-1000),row('b',1000,{type:'Refund 退款',time})]));assert.equal(s.expenses.length,1);assert.equal(s.refunds.length,1);
  }
  const s=core.summarize(data([row('a',-1000,{time:'2025-01-02 23:59'}),row('b',1000,{type:'Refund 退款',time:'2025-01-03 00:01'})]));assert.equal(s.expenses.length,1);
});

test('same-minute positive expense reversals match regardless of ID or input order',()=>{
  const s=core.summarize(data([row('a',1000),row('z',-1000)]));assert.equal(s.total,0);assert.equal(s.expenses.length,0);assert.equal(s.excluded.length,2);
});


test('custom query ranges include both boundary dates and reject impossible or unavailable dates',()=>{
  assert.deepEqual(core.queryRange({start:'2024-02-29',end:'2026-01-01'},'2026-11-09'),{start:'2024-02-29',end:'2026-01-01',label:'custom'});
  assert.deepEqual(core.queryRange({start:'2026-11-09',end:'2026-11-09'},'2026-11-09'),{start:'2026-11-09',end:'2026-11-09',label:'custom'});
  for(const [start,end] of [['2025-02-29','2025-03-01'],['2026-05-02','2026-05-01'],['2021-12-31','2022-01-01'],['2026-11-09','2026-11-10'],['','2026-11-09']])assert.throws(()=>core.queryRange({start,end},'2026-11-09'));
});
