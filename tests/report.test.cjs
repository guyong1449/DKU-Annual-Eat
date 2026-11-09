const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
const {reportModel}=require('../src/report.js');
const renderReport=require('./report-harness.cjs');
const row=(id,merchant,cents,time='2025-01-10 12:00',type='Expense 消费')=>({id,merchant,cents,time,type,status:'交易成功'});
const dataset=records=>({version:1,source:'dkucard',start:'2025-01-01',end:'2026-12-31',account:'所有账户',complete:true,records});

test('English campus statuses populate both financial totals and EatTI after collection',()=>{
  const records=Array.from({length:6},(_,i)=>({...row(String(i),'面档',-1200,`2026-01-0${i+1} 12:00`,'Expense'),status:'Transaction Successful!'}));
  const {element}=renderReport(core.reportHTML(dataset(records)),{'dku-lang':'en'});
  assert.match(element('net').innerHTML,/72\.00/);
  assert.equal(Number(element('count').textContent),6);
  assert.match(element('eat-sample').textContent,/6/);
  assert.match(element('eat-result').innerHTML,/The Lunch Hour MVP/);
});
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

test('facts count weekdays, find the actual longest streak and compare clock times across dates',()=>{
  const input=dataset([
    row('a','面档',-1000,'2025-01-01 18:00'),
    row('b','咖啡烘焙',-2000,'2025-01-05 22:10'),
    row('c','面档',-3000,'2025-01-06 07:30'),
    row('d','面档',-500,'2025-01-07 12:00')
  ]);
  const {element,window}=renderReport(core.reportHTML(input));
  element('year-filter').value='2025';element('year-filter').onchange();
  const facts=element('fun-facts-body').innerHTML;
  for(const expected of ['3 天','2025-01-05 — 2025-01-07','07:30','22:10','25.0% · 1 次'])assert.ok(facts.includes(expected),expected);
  for(const kind of ['card','long']){
    element('report-'+kind).onclick();
    const svg=window.__lastShare;
    assert.match(svg,/有趣事实 · FUN FACTS/);
    for(const expected of ['3 天','2025-01-05','07:30','22:10','#044384','#047444'])assert.ok(svg.includes(expected),expected);
    assert.ok(!/NaN|Infinity|#58c8a0|#2f6bb0/.test(svg));
    const height=Number(/height="(\d+)"/.exec(svg)[1]);
    if(kind==='card')assert.equal(height,1580);
    for(const [,y] of svg.matchAll(/<text[^>]* y="([\d.-]+)"/g))assert.ok(Number(y)>0&&Number(y)<height,'text outside canvas: '+y);
  }
});

test('exports disclose month filtering and stay finite for empty, refund-only and negative-net periods',()=>{
  const samples=[[],[row('r','面档',2000,'2025-02-10 12:00','Refund 退款')],[row('a','面档',-500,'2025-01-10 12:00'),row('r','面档',2000,'2025-02-10 12:00','Refund 退款')]];
  for(const records of samples){
    const {element,window}=renderReport(core.reportHTML(dataset(records)));
    element('year-filter').value='2025';element('year-filter').onchange();
    for(const kind of ['card','long']){element('report-'+kind).onclick();assert.ok(!/NaN|Infinity/.test(window.__lastShare));}
    element('month-filter').value='02';element('month-filter').onchange();
    element('report-card').onclick();
    assert.match(window.__lastShare,/2025 年 2 月/);assert.match(window.__lastShare,/本月净消费/);
    assert.match(window.__lastShare,/2025-02-01 — 2025-02-28/);
  }
});

test('exports inherit the page theme and both print controls invoke printing',()=>{
  const html=core.reportHTML(dataset([row('a','面档',-1000)]));
  const {element,window}=renderReport(html.replace('--navy:#044384','--navy:#123456').replace('--share-green:#047444','--share-green:#234567'));
  element('report-card').onclick();
  assert.ok(window.__lastShare.includes('#123456'));assert.ok(window.__lastShare.includes('#234567'));
  element('print').onclick();element('eat-print').onclick();assert.equal(window.printCalls,2);
});

test('donut uses closed annular sectors in bright colours and handles a single counter',()=>{
  const html=core.reportHTML(dataset([row('a','面档',-3000),row('b','咖啡烘焙',-1000)]));
  const {element}=renderReport(html);element('year-filter').value='2025';element('year-filter').onchange();
  const ring=element('distribution').innerHTML;
  assert.equal((ring.match(/<path /g)||[]).length,2);
  assert.match(ring,/M 100 10 A 90 90/);assert.match(ring,/#044384/);assert.match(ring,/#047444/);
  assert.ok(!ring.includes('stroke-dash'));
  const single=renderReport(core.reportHTML(dataset([row('a','面档',-1000)])));
  single.element('year-filter').value='2025';single.element('year-filter').onchange();
  assert.match(single.element('distribution').innerHTML,/<circle/);
  assert.ok(!/NaN|Infinity/.test(single.element('distribution').innerHTML));
});

test('shared dining patterns and overlooked spending facts follow report filters and global language',()=>{
  const input=dataset([
    row('a','面档',-100,'2025-02-01 12:00'),row('b','面档',-200,'2025-02-02 12:00'),
    row('c','面档',-300,'2025-02-03 15:00'),row('d','咖啡烘焙',-900,'2025-02-04 18:00'),
    row('e','面档',100,'2025-02-05 12:00','Refund 退款')
  ]);
  const html=core.reportHTML(input),{element,window,document,stored}=renderReport(html);
  element('year-filter').value='2025';element('year-filter').onchange();
  element('month-filter').value='02';element('month-filter').onchange();
  const facts=element('fun-facts-body').innerHTML;
  for(const value of ['单笔中位数','¥ 2.50','小额消费累计','¥ 15.00','连刷同一窗口','3 次','周末消费占比','50.0%'])assert.ok(facts.includes(value),value);
  assert.match(html,/<section class="card fun-facts">/);
  assert.match(element('spending-patterns').innerHTML,/午餐 11:00–13:00/);
  assert.match(element('spending-patterns').innerHTML,/50.0%/);
  const net=element('net').innerHTML;
  element('language-toggle').onclick();
  assert.equal(document.documentElement.lang,'en');assert.equal(stored['dku-lang'],'en');
  assert.equal(element('month-filter').value,'02');assert.equal(element('net').innerHTML,net);
  assert.equal(element('report-card').textContent,'Export card');
  assert.match(element('fun-facts-body').innerHTML,/Median charge/);
  assert.match(element('spending-patterns').innerHTML,/Lunch 11:00–13:00/);
  assert.equal(element('eat-card').textContent,'Export card');
  element('report-long').onclick();assert.match(window.__lastShare,/Meal clock/);assert.match(window.__lastShare,/Median charge/);
  element('language-toggle').onclick();assert.equal(element('month-filter').value,'02');
  const english=renderReport(html,{'dku-lang':'en'});assert.equal(english.element('report-card').textContent,'Export card');
});

test('amount histogram uses exact band boundaries, excludes refunds and supports count/amount views',()=>{
  const costs=[500,501,1000,1001,1500,1501,2000,2001,3000,3001,5000,5001];
  const rows=costs.map((cents,i)=>row(String(i),'面档',-cents,`2025-02-${String(i+1).padStart(2,'0')} 12:00`));
  rows.push(row('refund','面档',300,'2025-02-20 12:00','Refund 退款'));
  const {element,window}=renderReport(core.reportHTML(dataset(rows)));
  element('year-filter').value='2025';element('year-filter').onchange();
  const histogram=element('spending-histogram').innerHTML;
  const counts=[...histogram.matchAll(/<title>[^<]* · (\d+) 笔 ·/g)].map(m=>Number(m[1]));
  assert.deepEqual(counts,[1,2,2,2,2,2,1]);assert.equal(counts.reduce((a,b)=>a+b,0),12);
  assert.match(histogram,/48.00/);assert.match(histogram,/消费笔数/);
  element('amount-total').onclick();assert.match(element('spending-histogram').innerHTML,/累计金额，元/);
  assert.match(element('spending-histogram').innerHTML,/¥80.01/);
  assert.match(element('fun-facts-body').innerHTML,/最常消费的星期/);
  assert.ok(!element('spending-patterns').innerHTML.includes('数据幕后'));
  element('report-long').onclick();assert.match(window.__lastShare,/单笔消费金额分布/);
  element('month-filter').value='03';element('month-filter').onchange();
  assert.ok(!/NaN|Infinity/.test(element('spending-histogram').innerHTML));
});


test('custom dates reconcile refunds across years, include full boundary days and update EatTI and exports',()=>{
  const input=dataset([
    row('a','面档',-1000,'2025-12-30 12:00'),row('b','面档',-2000,'2025-12-31 23:59'),
    row('c','面档',300,'2026-01-01 00:00','Refund 退款'),row('d','轻食沙拉',-500,'2026-01-01 19:30'),
    row('e','轻食沙拉',-900,'2026-01-02 12:00')
  ]);
  input.end='2026-02-28';
  const {element,window}=renderReport(core.reportHTML(input));
  const before=element('net').innerHTML;
  element('range-start').value='2025-12-31';element('range-end').value='2026-01-01';element('range-apply').onclick();
  assert.match(element('net').innerHTML,/22.00/);assert.equal(element('count').textContent,2);
  assert.equal(element('period').textContent,'2025-12-31 — 2026-01-01');
  assert.match(element('included').innerHTML,/23:59/);assert.match(element('included').innerHTML,/00:00/);
  assert.ok(!element('included').innerHTML.includes('2026-01-02'));
  assert.match(element('eat-sample').textContent,/2 笔餐饮扣款/);
  assert.equal(element('year-filter').disabled,true);assert.equal(element('eat-year').disabled,true);
  element('report-long').onclick();assert.match(window.__lastShare,/2025-12-31 — 2026-01-01/);assert.match(window.__lastShare,/期间净消费/);
  assert.match(window.dkuReport.share('card').filename,/2025-12-31_2026-01-01/);
  element('language-toggle').onclick();assert.match(element('net').innerHTML,/22.00/);assert.match(element('eat-sample').textContent,/2025-12-31 — 2026-01-01/);
  element('range-start').value='2026-02-30';element('range-apply').onclick();assert.equal(element('range-error').hidden,false);assert.match(element('net').innerHTML,/22.00/);
  element('range-clear').onclick();assert.equal(element('net').innerHTML,before);assert.equal(element('year-filter').disabled,false);
  element('range-start').value='2026-02-01';element('range-end').value='2026-02-28';element('range-apply').onclick();
  assert.equal(element('count').textContent,0);element('report-long').onclick();assert.ok(!/NaN|Infinity/.test(window.__lastShare));
});


test('compact card prioritizes charts and nine facts with regular numerals, separate from the long image',()=>{
  const {element,window}=renderReport(core.reportHTML(dataset([row('a','面档',-123456),row('b','轻食沙拉',-1500,'2025-01-11 17:30')])));
  element('year-filter').value='2025';element('year-filter').onchange();
  const card=window.dkuReport.share('card'),long=window.dkuReport.share('long');
  assert.equal(card.height,1580);assert.ok(long.height>card.height);
  assert.ok(!/\d,\d{3}/.test(card.svg));assert.ok(card.svg.includes('1234.56'));
  assert.equal(element('range-state').textContent,'');
  assert.equal(element('range-panel').beforeTarget,element('report-card'));
  element('show-eat').onclick();assert.equal(element('range-panel').beforeTarget,element('eat-card'));
  element('show-report').onclick();assert.equal(element('range-panel').beforeTarget,element('report-card'));
  for(const text of ['有趣事实 · FUN FACTS','巡饭足迹','开饭钟点','消费档位','周末消费占比','单日刷卡最多'])assert.ok(card.svg.includes(text),text);
  assert.ok(!card.svg.includes('width="984" height="226"'));
  assert.match(card.svg,/font-family="Arial,Helvetica,Microsoft YaHei,sans-serif"/);
  assert.match(card.svg,/tabular-nums lining-nums/);
  assert.ok(long.svg.includes('全部窗口 · 按净消费排序'));assert.ok(!card.svg.includes('全部窗口 · 按净消费排序'));
});

test('export copy stays concise, percentile captions use the median, and weekday bars use DKU green shades with grid lines',()=>{
  const records=Array.from({length:7},(_,i)=>row(String(i),'面档',-(i+1)*10000,`2025-01-${String(5+i).padStart(2,'0')} 12:00`));
  const {element,window}=renderReport(core.reportHTML(dataset(records)));
  element('year-filter').value='2025';element('year-filter').onchange();
  for(const kind of ['card','long']){
    const {svg}=window.dkuReport.share(kind);
    assert.ok(!/次消费|按扣款计算|一半扣款|中间 50%|发生在周六/.test(svg));
  }
  const {svg}=window.dkuReport.share('long');
  assert.match(svg,/50% 不超过<\/text><text[^>]*>¥400\.00<\/text>/);
  assert.match(svg,/<rect x="382" y="356" width="316" height="94" rx="16" fill="white"\/>/);
  assert.match(svg,/<text x="404" y="389"[^>]*fill="#047444"[^>]*>消费窗口<\/text>/);
  const weekly=svg.slice(svg.indexOf('一周偏好'),svg.indexOf('巡饭足迹'));
  assert.equal((weekly.match(/<line /g)||[]).length,5);
  assert.equal((weekly.match(/<rect [^>]*fill="#047444"/g)||[]).length,7);
  for(const opacity of [.88,.76,.64,.52,.4,.28])assert.ok(weekly.includes(`fill-opacity="${opacity}"`));
  assert.match(element('fun-facts-body').innerHTML,/按扣款计算/);
  element('language-toggle').onclick();
  assert.ok(!/before refunds|Half of your charges|Middle 50%/.test(window.dkuReport.share('long').svg));
});
