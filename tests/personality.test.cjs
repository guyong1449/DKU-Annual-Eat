const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
const {createEatTI}=require('../src/personality.js');
const renderReport=require('./report-harness.cjs');
const eat=createEatTI();
const row=(i,extra={})=>({id:String(i),time:`2025-01-${String(i+1).padStart(2,'0')} 17:30`,cents:-1200,merchant:'面档',status:'交易成功',type:'Expense 消费',...extra});
const dataset=records=>({version:1,source:'dkucard',start:'2025-01-01',end:'2026-09-13',account:'所有账户',complete:true,records});

test('matched roles use real evidence, conservative dining recognition and immutable inputs',()=>{
  const rows=Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]}));
  rows.push(row(12,{merchant:'全家'}),row(13,{merchant:'未分类商户'}),row(14,{cents:500}));
  const before=JSON.stringify(rows), result=eat.analyze(rows);
  assert.equal(result.count,12);assert.equal(result.skipped,2);assert.equal(result.days,12);
  assert.deepEqual(result.roles.map(r=>r.id),['DUSK','SAVE','RHYT','ROAM']);
  assert.equal(new Set(result.roles.map(r=>r.id)).size,result.roles.length);
  assert.match(result.candidates.find(r=>r.id==='ROAM').evidence,/25.0%/);
  assert.ok(result.candidates.length>3);
  for(const dist of result.distributions)assert.equal(dist.parts.reduce((n,p)=>n+p.count,0),12);
  assert.equal(JSON.stringify(rows),before);
});

test('refunds, reversals, printing, recharge and failed charges cannot become dining evidence',()=>{
  const data=dataset([...Array.from({length:6},(_,i)=>row(i)),
    row(8,{time:'2025-01-09 12:00',cents:-1500}),row(9,{time:'2025-01-09 12:02',cents:1500,type:'Refund 退款'}),
    row(10,{merchant:'校园打印'}),row(11,{type:'充值',cents:10000}),row(12,{status:'失败'}),
    row(13,{type:'Discount Refund 折扣返还',cents:120})]);
  const summary=core.summarize(data), result=eat.analyze([...summary.expenses,...summary.refunds]);
  assert.equal(result.count,6);assert.equal(result.roles.length,Math.min(6,result.candidates.length));
  assert.equal(summary.total,7080);
});

test('route thresholds include exact 60% and exclude exact 40% from explorers',()=>{
  const sample=n=>Array.from({length:10},(_,i)=>row(i,{merchant:i<n?'面档':['轻食沙拉','咖啡烘焙','中式套餐'][(i-n)%3]}));
  assert.ok(eat.analyze(sample(6)).candidates.some(r=>r.id==='HOME'));
  assert.ok(eat.analyze(sample(4)).candidates.some(r=>r.id==='MIXD'));
  assert.ok(eat.analyze(sample(3)).candidates.some(r=>r.id==='ROAM'));
});

test('time and price boundaries partition every transaction exactly once and disclose ties',()=>{
  const hours=['07:59','08:00','09:59','10:00','13:59','14:00','15:59','16:00','19:30','19:31'];
  const result=eat.analyze(hours.map((h,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} ${h}`,cents:-[1500,1501,2999,3000,1500,1501,2999,3000,1500,3000][i]})));
  assert.deepEqual(result.distributions[1].parts.map(p=>p.count),[2,2,2,2,2]);
  assert.deepEqual(result.distributions[2].parts.map(p=>p.count),[3,4,3]);
  assert.match(result.candidates.find(r=>r.id==='DAWN').note,/并列/);
  assert.ok(result.candidates.some(r=>r.id==='JUST'));
  const tied=eat.analyze(Array.from({length:6},(_,i)=>row(i,{cents:-(i%2?3000:1500)})));
  assert.match(tied.candidates.find(r=>r.id==='SAVE').note,/并列/);
  const closed=eat.analyze(Array.from({length:6},(_,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} 07:30`})));
  assert.ok(closed.candidates.some(r=>r.id==='EDGE'));
  assert.ok(!closed.candidates.some(r=>['DAWN','RHYT'].includes(r.id)));
  assert.ok(!eat.types.some(t=>t.id==='MOON'));
});

test('sparse and refund-only periods show an honest empty state and unsafe merchant text is escaped',()=>{
  for(const rows of [[],[row(0,{cents:100})],Array.from({length:5},(_,i)=>row(i)),Array.from({length:6},(_,i)=>row(i,{time:'2025-01-01 12:00'}))]) {
    const result=eat.analyze(rows);assert.equal(result.ready,false);assert.deepEqual(result.roles,[]);
    assert.match(eat.render(result),/饭格还在酝酿中/);assert.ok(!/NaN|Infinity/.test(eat.render(result)));
  }
  const result=eat.analyze(Array.from({length:6},(_,i)=>row(i,{merchant:'面档 <img src=x onerror=alert(1)>'})));
  assert.ok(!eat.render(result).includes('<img src=x'));
  assert.match(eat.render(result),/&lt;img/);
});

test('every catalog character is reachable with evidence rather than random assignment',()=>{
  const ids=new Set();
  const visit=rows=>{
    const result=eat.analyze(rows);
    assert.equal(result.roles.length,Math.min(6,result.candidates.length));
    assert.equal(new Set(result.roles.map(r=>r.id)).size,result.roles.length);
    result.roles.forEach(r=>{ids.add(r.id);assert.ok(Number.isFinite(r.score));});
    assert.deepEqual(eat.analyze([...rows].reverse()).roles,result.roles);
  };
  for(const hour of ['08:00','12:00','15:00','17:00','22:00'])for(const cents of [-1000,-2000,-4000]) {
    visit(Array.from({length:6},(_,i)=>row(i,{merchant:'校园食堂',cents,time:`2025-01-${String(i+1).padStart(2,'0')} ${hour}`})));
  }
  for(const merchant of ['自选称重','轻食沙拉','Juice Bar','咖啡烘焙','面档','西式风味','麻辣烫','特色铁板','清真餐厅','港式烧腊','中式套餐'])visit(Array.from({length:8},(_,i)=>row(i,{merchant})));
  // Balanced times and amounts let route-specific evidence enter the top six.
  for(const shops of [['校园食堂甲'],['校园食堂甲','校园食堂乙'],['校园食堂甲','校园食堂乙','校园食堂丙'],['校园食堂甲','校园食堂乙','校园食堂丙','校园食堂丁']]) {
    visit(Array.from({length:20},(_,i)=>row(i,{merchant:shops[i%shops.length],cents:-[1000,2000,4000][i%3],time:`2025-01-${String(i+1).padStart(2,'0')} ${['08:00','12:00','15:00','17:00','22:00'][i%5]}`})));
  }
  visit(Array.from({length:6},(_,i)=>row(i,{merchant:'校园食堂',time:`2025-01-${['04','05','11','12','18','19'][i]} ${['08:00','12:00','15:00','17:00','22:00'][i%5]}`,cents:-[1000,2000,4000][i%3]})));
  assert.deepEqual([...ids].sort(),eat.types.map(t=>t.id).sort());
});

test('specialty matching requires both support thresholds and never expands result beyond six',()=>{
  const sample=(n,total)=>Array.from({length:total},(_,i)=>row(i,{merchant:i<n?'咖啡烘焙':'校园食堂',time:`2025-01-${String(i%28+1).padStart(2,'0')} 12:00`}));
  for(const [n,total] of [[3,20],[4,27]])assert.ok(!eat.analyze(sample(n,total)).candidates.some(r=>r.id==='BAKE'));
  const result=eat.analyze(sample(4,26));
  assert.ok(result.candidates.some(r=>r.id==='BAKE'));
  assert.equal(result.roles.length,Math.min(6,result.candidates.length));
  assert.equal((eat.render(result).match(/class="eat-role"/g)||[]).length,result.roles.length);
  const pair=eat.analyze(Array.from({length:10},(_,i)=>row(i,{merchant:i%2?'校园食堂甲':'校园食堂乙'})));
  assert.ok(pair.candidates.some(r=>r.id==='PAIR'));
  assert.ok(!pair.candidates.some(r=>r.id==='MIXD'));
});

test('six-role limit truncates abundant matches, leaves sparse matches unfilled and hides unmatched roles',()=>{
  const many=eat.analyze(Array.from({length:16},(_,i)=>row(i,{merchant:['面档','咖啡烘焙','轻食沙拉','中式套餐'][i%4]})));
  assert.ok(many.candidates.length>6);
  assert.equal(many.roles.length,6);
  assert.deepEqual(many.roles,many.candidates.slice(0,6));
  assert.equal((eat.render(many).match(/class="eat-role"/g)||[]).length,6);
  const few=eat.analyze(Array.from({length:6},(_,i)=>row(i,{merchant:'校园食堂',time:`2025-01-${String(i+1).padStart(2,'0')} ${['08:00','10:00','12:00','14:00','16:00','18:00'][i]}`})));
  assert.equal(few.roles.length,3);
  const html=eat.render(few);
  assert.equal((html.match(/class="eat-role"/g)||[]).length,3);
  assert.match(html,/本次匹配 3 位/);
  assert.ok(!html.includes('咖啡烘焙驻民'));
  for(const result of [eat.analyze([]),{...few,roles:[]}]) {
    assert.equal((eat.render(result).match(/class="eat-role"/g)||[]).length,0);
    assert.ok(!eat.render(result).includes('eat-lineup'));
  }
});

test('extension navigation and period controls are isolated from financial reporting',()=>{
  const data=dataset([...Array.from({length:6},(_,i)=>row(i)),...Array.from({length:6},(_,i)=>row(i+8,{time:`2026-02-${String(i+1).padStart(2,'0')} 12:00`,cents:-2000}))]);
  const {element}=renderReport(core.reportHTML(data));
  const expected=eat.analyze(core.summarize(data).expenses).roles.length;
  const net=element('net').innerHTML, ranking=element('ranking').innerHTML;
  assert.equal(element('eat-view').hidden,true);
  element('show-eat').onclick();assert.equal(element('eat-view').hidden,false);assert.equal(element('report-view').hidden,true);
  assert.equal((element('eat-result').innerHTML.match(/class="eat-role"/g)||[]).length,expected);
  element('eat-year').value='2025';element('eat-year').onchange();
  assert.match(element('eat-result').innerHTML,/日落干饭家/);
  element('eat-month').value='02';element('eat-month').onchange();
  assert.match(element('eat-result').innerHTML,/饭格还在酝酿中/);
  assert.equal(element('net').innerHTML,net);assert.equal(element('ranking').innerHTML,ranking);
  element('show-report').onclick();assert.equal(element('report-view').hidden,false);
  element('year-filter').value='2025';element('year-filter').onchange();
  assert.match(element('eat-result').innerHTML,/饭格还在酝酿中/);
  element('eat-year').value='';element('eat-year').onchange();
  assert.equal(element('eat-month').disabled,true);
  assert.equal((element('eat-result').innerHTML.match(/class="eat-role"/g)||[]).length,expected);
  assert.match(core.reportHTML({...data,complete:false}),/部分数据饭格/);
});
