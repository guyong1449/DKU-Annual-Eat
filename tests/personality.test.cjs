const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core.js');
const {createEatTI}=require('../src/personality.js');
const renderReport=require('./report-harness.cjs');
const eat=createEatTI();
const illustrations=Object.fromEntries(eat.types.map(t=>[t.id,`data:image/png;base64,${t.id}`]));
const row=(i,extra={})=>({id:String(i),time:`2025-01-${String(i+1).padStart(2,'0')} 17:30`,cents:-1200,merchant:'面档',status:'交易成功',type:'Expense 消费',...extra});
const dataset=records=>({version:1,source:'dkucard',start:'2025-01-01',end:'2026-09-13',account:'所有账户',complete:true,records});

test('matched roles use real evidence, conservative dining recognition and immutable inputs',()=>{
  const rows=Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]}));
  rows.push(row(12,{merchant:'全家'}),row(13,{merchant:'未分类商户'}),row(14,{cents:500}));
  const before=JSON.stringify(rows), result=eat.analyze(rows);
  assert.equal(result.count,12);assert.equal(result.skipped,2);assert.equal(result.days,12);
  assert.deepEqual(result.roles.map(r=>r.id),['DUSK','RHYT','SAVE','ROAM']);
  assert.equal(new Set(result.roles.map(r=>r.id)).size,result.roles.length);
  assert.match(result.candidates.find(r=>r.id==='ROAM').evidence.zh,/25.0%/);
  assert.match(result.candidates.find(r=>r.id==='ROAM').evidence.en,/25\.0%/);
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

test('route distribution shows five leading counters and reconciles the remaining counters',()=>{
  const names=['面档','轻食沙拉','咖啡烘焙','中式套餐','西式风味','饮料水果吧','烧腊'];
  const rows=names.flatMap((merchant,i)=>Array.from({length:7-i},(_,n)=>row(n,{merchant})));
  const result=eat.analyze(rows),route=result.distributions[0].parts;
  assert.deepEqual(route.map(p=>p.count),[7,6,5,4,3,3]);
  assert.deepEqual(route.slice(0,5).map(p=>p.zh),names.slice(0,5));
  assert.equal(route.at(-1).zh,'其他 2 个餐饮窗口');
  assert.equal(route.at(-1).en,'2 other dining counters');
  assert.equal(route.reduce((n,p)=>n+p.count,0),result.count);
  assert.equal(new Set(route.map(p=>p.color)).size,6);
  const onlyFive=eat.analyze(rows.filter(r=>names.indexOf(r.merchant)<5));
  assert.equal(onlyFive.distributions[0].parts.length,5);
  assert.ok(!onlyFive.distributions[0].parts.some(p=>p.count===0));
  const long=eat.shareSVG(result,'zh','2025 年','long',illustrations);
  assert.match(long.svg,/其他 2 个餐饮窗口/);
  assert.match(long.svg,/<rect width="1080" height="\d+" fill="#f3f6fa"/);
});

test('time and price boundaries partition every transaction exactly once and disclose ties',()=>{
  const hours=['07:59','08:00','09:59','10:00','10:59','11:00','13:00','13:01','16:59','17:00','19:30','19:31'];
  const result=eat.analyze(hours.map((h,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} ${h}`,cents:-[1500,1501,2999,3000][i%4]})));
  assert.deepEqual(result.distributions[1].parts.map(p=>p.count),[2,2,2,2,2,2]);
  assert.deepEqual(result.distributions[2].parts.map(p=>p.count),[3,6,3]);
  assert.ok(result.candidates.some(r=>r.id==='JUST'));
  const tied=eat.analyze(Array.from({length:6},(_,i)=>row(i,{cents:-(i%2?3000:1500)})));
  const closed=eat.analyze(Array.from({length:6},(_,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} 07:30`})));
  assert.ok(!closed.candidates.some(r=>r.id==='EDGE'));
  assert.ok(!closed.candidates.some(r=>['DAWN','RHYT'].includes(r.id)));
  assert.ok(!eat.types.some(t=>t.id==='MOON'));
});

test('every minute belongs to one disclosed meal slot and snack periods match the right character',()=>{
  const rows=Array.from({length:1440},(_,i)=>row(i,{time:`2025-01-${String(i%28+1).padStart(2,'0')} ${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`}));
  const distribution=eat.analyze(rows).distributions[1];
  assert.deepEqual(distribution.parts.map(p=>p.count),[120,60,121,239,151,749]);
  for(const [hour,id] of [['11:00','NOON'],['13:00','NOON'],['13:01','TEA'],['16:59','TEA'],['17:00','DUSK'],['19:30','DUSK']]){
    const result=eat.analyze(Array.from({length:6},(_,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} ${hour}`})));
    assert.ok(result.candidates.some(r=>r.id===id),hour+' should match '+id);
    const slot=result.distributions[1].parts.findIndex(p=>p.count===6);
    for(const lang of ['zh','en'])assert.ok(result.candidates.find(r=>r.id===id).evidence[lang].includes(eat.i18n[lang].timeParts[slot]));
  }
});

test('matched cards and all 25 catalog entries include their code, story and bilingual one-liner',()=>{
  assert.ok(new Set(eat.types.map(t=>t.tint)).size>=6);
  const result=eat.analyze(Array.from({length:16},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]})));
  for(const lang of ['zh','en']){
    const gallery=eat.gallery(lang),html=eat.render(result,lang);
    assert.equal((gallery.match(/class="eat-quote"/g)||[]).length,25);
    for(const t of eat.types)assert.ok(gallery.includes(lang==='zh'?t.quote:t.quoteEn),t.id);
    for(const t of result.roles){assert.ok(html.includes('class="eat-card-id">'+t.id));assert.ok(html.includes(lang==='zh'?t.story:t.storyEn));}
  }
});

test('exported western characters use the same dedicated illustration as the page',()=>{
  const result=eat.analyze(Array.from({length:12},(_,i)=>row(i,{merchant:'西式风味'})));
  assert.ok(result.roles.some(t=>t.id==='WEST'));
  for(const kind of ['card','long']){
    const share=eat.shareSVG(result,'zh','2025 年',kind,illustrations);
    assert.match(share.svg,/href="data:image\/png;base64,WEST"/);
  }
});

test('all character cutouts are packaged and shared by the offline page and both export layouts',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const {reportHTML}=require('../src/report.js'),{files}=require('../scripts/package.cjs');
  const html=reportHTML(core.summarize(dataset(Array.from({length:12},(_,i)=>row(i)))));
  const result=eat.analyze(Array.from({length:12},(_,i)=>row(i)));
  assert.ok(!html.includes('eat-character-atlas'));
  for(const type of eat.types){
    const file=`src/assets/characters/${type.id}.png`,bytes=fs.readFileSync(path.join(__dirname,'..',file));
    assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',type.id);
    assert.equal(bytes.readUInt32BE(16),bytes.readUInt32BE(20),type.id+' must retain a padded square');
    assert.ok(bytes.readUInt32BE(16)>200,type.id);
    assert.ok(files.includes(file));
    assert.ok(html.includes(`id="eat-character-${type.id}" width="1" height="1" href="data:image/png;base64,${bytes.toString('base64')}"`));
    assert.match(eat.avatar(type),new RegExp(`viewBox="0 0 1 1".*href="#eat-character-${type.id}"`));
    for(const kind of ['card','long']){
      const one={...result,roles:[{...type,evidence:{zh:'完整插画',en:'Complete illustration'}}]};
      const {svg}=eat.shareSVG(one,'zh','2025',kind,illustrations);
      assert.ok(svg.includes(`href="${illustrations[type.id]}" width="1" height="1" preserveAspectRatio="xMidYMid meet"`));
      assert.ok(!/1254|eat-character-atlas/.test(svg));
    }
  }
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
  assert.equal(few.roles.length,4);
  const html=eat.render(few);
  assert.equal((html.match(/class="eat-role"/g)||[]).length,4);
  assert.ok(!html.includes('咖啡面包搭子'));
  for(const result of [eat.analyze([]),{...few,roles:[]}]) {
    assert.equal((eat.render(result).match(/class="eat-role"/g)||[]).length,0);
    assert.ok(!eat.render(result).includes('eat-lineup'));
  }
});

test('extension navigation and period controls are isolated from financial reporting',()=>{
  const data=dataset([...Array.from({length:6},(_,i)=>row(i)),...Array.from({length:6},(_,i)=>row(i+8,{time:`2026-02-${String(i+1).padStart(2,'0')} 12:00`,cents:-2000}))]);
  const {element}=renderReport(core.reportHTML(data));
  const expected=eat.analyze(core.summarize(data).expenses.filter(r=>r.time.startsWith('2026'))).roles.length;
  const allExpected=eat.analyze(core.summarize(data).expenses).roles.length;
  const net=element('net').innerHTML, ranking=element('ranking').innerHTML;
  assert.equal(element('eat-view').hidden,true);
  element('show-eat').onclick();assert.equal(element('eat-view').hidden,false);assert.equal(element('report-view').hidden,true);
  assert.equal(element('eat-year').value,'2026');
  assert.equal((element('eat-result').innerHTML.match(/class="eat-role"/g)||[]).length,expected);
  element('eat-year').value='2025';element('eat-year').onchange();
  assert.match(element('eat-result').innerHTML,/傍晚开饭派/);
  element('eat-month').value='02';element('eat-month').onchange();
  assert.match(element('eat-result').innerHTML,/饭格还在酝酿中/);
  assert.equal(element('net').innerHTML,net);assert.equal(element('ranking').innerHTML,ranking);
  element('show-report').onclick();assert.equal(element('report-view').hidden,false);
  element('year-filter').value='2025';element('year-filter').onchange();
  assert.match(element('eat-result').innerHTML,/饭格还在酝酿中/);
  element('eat-year').value='';element('eat-year').onchange();
  assert.equal(element('eat-month').disabled,true);
  assert.equal((element('eat-result').innerHTML.match(/class="eat-role"/g)||[]).length,allExpected);
  assert.match(core.reportHTML({...data,complete:false}),/部分数据饭格/);
});

test('catalog speaks full chinese or full english per mode, with english accents kept in chinese',()=>{
  for(const t of eat.types){
    assert.ok(t.en&&t.quoteEn&&t.storyEn&&t.ruleEn,t.id+' 缺少英文字段');
    const [tag]=eat.tagOf(t.axis);
    assert.ok(tag&&!/^(角色|时段|偏好|花费|路线|节奏|日历)$/.test(tag),t.id+' 轴标签仍过于生硬');
  }
  const result=eat.analyze(Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]})));
  const zh=eat.render(result,'zh'), en=eat.render(result,'en');
  assert.match(zh,/三组数字，还原你的饭格/);assert.match(zh,/数据幕后/);assert.match(eat.gallery('zh'),/这家想试，那家也舍不得错过/);assert.ok(zh.includes('这家想试，那家也舍不得错过'));assert.ok(!zh.includes('You collect food counters'));assert.ok(!zh.includes('饭票')&&!en.includes('饭票'),'饭票字样残留');assert.ok(!zh.includes('小票作证')&&!zh.includes('四舍五入')&&!zh.includes('为什么匹配到我')&&!zh.includes('FLAVOUR 0')&&!zh.includes('心头好：'));assert.ok(!zh.includes('小票不会说谎')&&!zh.includes('小票说话')&&!zh.includes('食堂营业时间')&&!zh.includes('饭格年份'),'残留小字');
  assert.match(en,/BEHIND THE SCENES/);assert.ok(en.includes('You collect food counters'));assert.ok(!en.includes('这家想试，那家也舍不得错过'));
  for(const defensive of ['不代表','不等于','仅供参考','刷卡时间不等于实际进餐时间'])assert.ok(!zh.includes(defensive)&&!en.includes(defensive),'出现了防御性描述：'+defensive);
  assert.match(eat.gallery('en'),/The Slurp Therapist/);assert.ok(!eat.gallery('en').includes('烦恼先放，面先嗦'));
  assert.deepEqual(eat.types.map(t=>t.name),['雨露均沾','老主顾','尝鲜客','早餐起跑员','正午干饭王','傍晚开饭派','错峰干饭侠','小额快乐家','刚刚好','嚼嚼嚼','严肃称重中','沙拉派','吨吨吨','咖啡面包搭子','我来两碗','刀叉仪式派','麻辣江湖客','铁板氛围组','清真常客','烧腊拼饭','省心套餐','准点到场','周末觅食家','宠粉双窗口','午后补给']);
  assert.match(eat.gallery('zh'),/我来两碗/);
  const share=eat.shareSVG(result,'zh','全部年份','card',illustrations);
  assert.ok(share.svg.startsWith('<svg xmlns="http:'));
  assert.ok(share.svg.includes('/2000/svg" width="1080"'));
  assert.match(share.svg,/data:image\/png;base64,DUSK/);
  assert.equal(share.width,1080);assert.ok(share.height>1920);
  result.roles.forEach(t=>assert.ok(share.svg.includes(t.name)));
  const long=eat.shareSVG(result,'en','All years','long',illustrations);
  assert.ok(long.height>share.height);assert.ok(!long.svg.includes('YOUR DINING FLAVOUR CODE'));
});

test('lineup cards flip on hover and show the dossier immediately, plus a language toggle',()=>{
  const result=eat.analyze(Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]})));
  const html=eat.render(result,'zh');
  assert.equal((html.match(/class="eat-flip"/g)||[]).length,result.roles.length);
  assert.equal((html.match(/aria-expanded="false"/g)||[]).length,result.roles.length);
  for(const marker of ['eat-flip-face eat-back','eat-dossier','eat-back-name'])assert.ok(html.includes(marker),marker+' 缺失');
  for(const gone of ['eat-wait','eat-dial','停留 5 秒','unseal','翻面看档案','eat-flip-hint','鼠标放上去','名册归名册','为什么匹配到我','In short','小票不会说谎','有据可循的脑洞'])assert.ok(!html.includes(gone),'冗余文案残留：'+gone);
  for(const t of result.roles)assert.ok(html.includes(t.headline.zh));
  // The toolbar toggle re-renders the whole EatTI view in the other language.
  const data=dataset(Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]})));
  const {element}=renderReport(core.reportHTML(data));
  element('eat-year').value='2025';element('eat-year').onchange();
  element('show-eat').onclick();
  assert.equal(element('eat-card').textContent,'导出卡片');assert.equal(element('eat-long').textContent,'导出长图');
  assert.match(core.reportHTML(data),/导出卡片/);
  assert.match(element('eat-result').innerHTML,/傍晚开饭派/);
  assert.equal(element('language-toggle').textContent,'English');
  element('language-toggle').onclick();
  assert.equal(element('language-toggle').textContent,'中文');
  assert.match(element('eat-result').innerHTML,/The Dinner Devotee/);
  assert.ok(!element('eat-result').innerHTML.includes('忙完了？开饭！'));
  assert.match(element('eat-title').textContent,/Claim another you/);
  element('language-toggle').onclick();
  assert.match(element('eat-result').innerHTML,/傍晚开饭派/);
});

test('switching EatTI language preserves month selection and discloses the same scope',()=>{
  const data=dataset([...Array.from({length:6},(_,i)=>row(i,{time:`2026-01-${String(i+1).padStart(2,'0')} 17:30`})),...Array.from({length:6},(_,i)=>row(i+10,{time:`2026-02-${String(i+1).padStart(2,'0')} 12:00`,cents:-3200}))]);
  const {element}=renderReport(core.reportHTML(data));
  assert.equal(element('eat-year').value,'2026');
  element('eat-month').value='02';element('eat-month').onchange();
  assert.match(element('eat-sample').textContent,/2026 年 2 月/);
  assert.match(element('eat-result').innerHTML,/正午干饭王/);
  element('language-toggle').onclick();
  assert.equal(element('eat-month').value,'02');
  assert.match(element('eat-sample').textContent,/2026-02/);
  assert.match(element('eat-result').innerHTML,/The Lunch Hour MVP/);
  element('language-toggle').onclick();assert.equal(element('eat-month').value,'02');
});

test('afternoon and treat roles qualify at exactly 15% without being the largest category',()=>{
  const sample=n=>Array.from({length:20},(_,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} ${i<n?'15:00':'17:30'}`,cents:i<n?-3000:-1200}));
  for(const id of ['TEA','TREAT']){
    assert.ok(!eat.analyze(sample(2)).candidates.some(r=>r.id===id));
    const result=eat.analyze(sample(3));
    assert.ok(result.candidates.some(r=>r.id===id));
    assert.match(result.candidates.find(r=>r.id===id).evidence.zh,/15.0%/);
    assert.ok(!result.candidates.find(r=>r.id===id).evidence.zh.includes('最多'));
    assert.match(eat.types.find(t=>t.id===id).rule,/15%/);
  }
  const dominant=eat.analyze(sample(20));
  assert.equal(dominant.candidates.filter(t=>t.id==='TEA').length,1);
  assert.equal(dominant.candidates.filter(t=>t.id==='TREAT').length,1);
  for(const t of eat.types)for(const key of ['quote','quoteEn','rule','ruleEn'])assert.ok(!/[。.]$/.test(t[key]),t.id+' '+key);
});

test('dining distributions are available below the personality sample threshold and exports use the light palette',()=>{
  const result=eat.analyze([row(0,{time:'2025-01-01 13:01'})]);
  assert.equal(result.ready,false);assert.equal(result.distributions[1].parts[3].count,1);
  assert.match(eat.distributionsHTML(result),/下午加餐 13:01–16:59/);
  assert.match(eat.distributionsHTML(result),/100.0%/);
  const ready=eat.analyze(Array.from({length:6},(_,i)=>row(i)));
  for(const kind of ['card','long']){
    const share=eat.shareSVG(ready,'zh','2025 年',kind,illustrations);
    assert.match(share.svg,/fill="#f3f6fa"/);assert.ok(!/<rect[^>]*fill="(?:#061942|#0d2a5e)"/.test(share.svg));
    ready.roles.forEach(t=>assert.ok(share.svg.includes(t.color==='#047444'?'rgba(4,116,68,.07)':t.tint)));
  }
  assert.match(eat.types.find(t=>t.id==='WEST').story,/西餐/);
  const shared=eat.distributionsHTML(ready);
  assert.ok(!shared.includes('opacity:'));
  assert.equal((shared.match(/class="distribution-dot"/g)||[]).length,10);
  assert.ok(new Set(ready.distributions[1].parts.map(p=>p.color)).size===6);
});

test('off-peak combines late lunch and dinner with exact clock boundaries',()=>{
  const sample=hours=>hours.map((hour,i)=>row(i,{time:`2025-01-${String(i+1).padStart(2,'0')} ${hour}`}));
  for(const hour of ['10:00','10:59','13:00','18:30','09:59','11:00','07:59'])assert.ok(!eat.analyze(sample(Array(6).fill(hour))).candidates.some(t=>t.id==='EDGE'),hour);
  for(const hour of ['13:01','16:59','18:31','19:31'])assert.ok(eat.analyze(sample(Array(6).fill(hour))).candidates.some(t=>t.id==='EDGE'),hour);
  const combined=eat.analyze(sample(['13:01','14:00','18:31','19:00','12:00','12:00','17:30','17:30']));
  assert.match(combined.candidates.find(t=>t.id==='EDGE').evidence.zh,/合计 4 次/);
  assert.equal(combined.distributions[1].parts[4].count,4);
  const morning=sample(['10:00','10:01','10:02','10:03','13:01','18:31']);
  assert.ok(!eat.analyze(morning).candidates.some(t=>t.id==='EDGE'));
});

test('weekend matching includes exactly 20% and still requires six swipes',()=>{
  const sample=(n,total)=>Array.from({length:total},(_,i)=>row(i,{time:`2025-01-${i<n?'04':'06'} 17:30`}));
  // Ensure three distinct dates for personality matching while retaining weekdays.
  const qualify=(n,total)=>{const rows=sample(n,total);rows[total-1].time='2025-01-07 17:30';return eat.analyze(rows);};
  assert.ok(qualify(6,30).candidates.some(t=>t.id==='WEEK'));
  assert.ok(!qualify(6,31).candidates.some(t=>t.id==='WEEK'));
  assert.ok(!qualify(5,20).candidates.some(t=>t.id==='WEEK'));
  assert.match(eat.types.find(t=>t.id==='WEEK').rule,/20%/);
});

test('EatTI exports replace the three scales with dining facts and distributions before the characters',()=>{
  const rows=['2025-01-01','2025-01-02','2025-01-03','2025-01-04','2025-01-04','2025-01-06'].map((date,i)=>row(i,{time:date+' 17:30',cents:i===4?-3600:-1200}));
  const result=eat.analyze([...rows,row(7,{merchant:'校园打印',cents:-99999}),row(8,{cents:99999})]);
  assert.equal(result.facts.largest.cents,-3600);
  assert.equal(result.facts.streak,4);
  assert.equal(result.facts.weekends,2);
  for(const kind of ['card','long'])for(const lang of ['zh','en']){
    const {svg}=eat.shareSVG(result,lang,'2025',kind,illustrations);
    for(const label of ['FUN FACTS',...eat.i18n[lang].distLabels])assert.ok(svg.indexOf(label)<svg.indexOf('href="data:image/png;base64,'+result.roles[0].id+'"'),label);
    assert.match(svg,/¥ 36.00/);assert.match(svg,/33.3%/);
    assert.ok(!svg.includes('<circle')&&!/<rect[^>]*fill="#1f5b46"/.test(svg));
    assert.ok(!/本命专一|四处打卡|犒劳大餐|After dark/.test(svg));
    assert.equal((svg.match(/FUN FACTS/g)||[]).length,1);
  }
});

test('EatTI exports share the report distribution layout and keep bilingual character names below a year-only masthead',()=>{
  const result=eat.analyze(Array.from({length:12},(_,i)=>row(i,{merchant:['面档','轻食沙拉','咖啡烘焙','中式套餐'][i%4]})));
  const chart=eat.distributionShareSVG(result,'zh',378);
  assert.equal(chart.height,424);
  assert.match(chart.svg,/11:00–13:00/);
  assert.match(chart.svg,/rx="6"/);
  for(const kind of ['card','long']){
    const share=eat.shareSVG(result,'zh','2025-01-01 — 2025-01-12',kind,illustrations);
    const header=share.svg.slice(0,share.svg.indexOf('FUN FACTS'));
    assert.match(header,/>2025 年<\/text>/);
    assert.ok(!/\d{4}-\d{2}-\d{2}|饭格代码|FLAVOUR CODE|干饭档案|年度番外|Your dining dossier|<tspan/.test(header));
    assert.ok(share.svg.includes(chart.svg));
    result.roles.forEach(role=>{
      assert.ok(share.svg.includes(role.name));assert.ok(share.svg.includes(role.en));assert.ok(share.svg.includes(role.id));
    });
    assert.match(share.svg,/stroke-dasharray="3 3"/);
    if(kind==='long'){
      assert.match(share.svg,/<svg x="76"[^>]*width="176" height="176"/);
      assert.match(share.svg,/<text x="288"[^>]*>DUSK<\/text>/);
    }
  }
});
