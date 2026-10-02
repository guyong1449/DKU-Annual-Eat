'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createEatTI,personalityApp}=require('./personality.js');

function reportModel(summary){
  const {data}=summary;
  const firstYear=data.start==='2000-01-01'?(data.records[0]?.time.slice(0,4)||data.end.slice(0,4)):data.start.slice(0,4);
  return {start:data.start,end:data.end,complete:data.complete,years:summary.years.filter(y=>y.year>=firstYear).map(annual=>{
    const included=[...summary.expenses,...summary.refunds].filter(r=>r.time.startsWith(annual.year)).sort((a,b)=>a.time.localeCompare(b.time));
    const excluded=summary.excluded.filter(r=>r.time.startsWith(annual.year));
    const months=summary.months.filter(([month])=>month.startsWith(annual.year));
    return {...annual,months,included,excluded,gross:included.reduce((sum,r)=>sum+Math.max(0,-r.cents),0),returned:included.reduce((sum,r)=>sum+Math.max(0,r.cents),0),count:included.filter(r=>r.cents<0).length,merchants:annual.merchants.map(merchant=>({...merchant,months:months.map(([month])=>[month,included.filter(r=>r.merchant===merchant.name&&r.time.startsWith(month)).reduce((sum,r)=>sum-r.cents,0)])}))};
  })};
}

function filterPeriod(year,month){
  if(!month)return year;
  const prefix=year.year+'-'+month;
  const included=year.included.filter(r=>r.time.startsWith(prefix)),excluded=year.excluded.filter(r=>r.time.startsWith(prefix));
  const merchants=new Map();
  for(const row of included){
    const item=merchants.get(row.merchant)||{name:row.merchant,cents:0,count:0,refundCount:0};
    item.cents-=row.cents;if(row.cents<0)item.count++;else item.refundCount++;
    merchants.set(row.merchant,item);
  }
  const gross=included.reduce((s,r)=>s+Math.max(0,-r.cents),0),returned=included.reduce((s,r)=>s+Math.max(0,r.cents),0);
  return {...year,included,excluded,gross,returned,total:gross-returned,count:included.filter(r=>r.cents<0).length,months:year.months.filter(([m])=>m===prefix),merchants:[...merchants.values()].sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name)).map(m=>({...m,months:[[prefix,m.cents]]}))};
}

// Kept inside the HTML so saved reports work without a server or external libraries.
function reportApp(model,filterPeriod){
  const $=id=>document.getElementById(id);
  const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>(value/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const colors=['#044384','#047444','#4c7c94','#6fbc4e','#94b4b4'];
  let year=model.years[model.years.length-1],annual=year,month='',selected=0,chartType='bar';
  const periodLabel=()=>`${year.year} 年${month?' '+Number(month)+' 月':''}`;
  function chart(months,type,color,label){
    if(!months.length)return '<p class="empty">暂无月度数据</p>';
    const vals=months.map(x=>x[1]/100),max=Math.max(...vals,1),min=Math.min(...vals,0),pad=(max-min)*.16;
    const high=max+pad,low=min<0?min-pad:0,W=660,H=260,left=55,right=18,top=28,bottom=35;
    const y=v=>top+(high-v)/(high-low)*(H-top-bottom),step=(W-left-right)/vals.length,x=i=>left+step*(i+.5),zero=y(0);
    const grid=Array.from({length:5},(_,i)=>{const value=low+(high-low)*i/4,yy=y(value);return `<line x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}" stroke="#e5eaf1"/><text x="${left-10}" y="${yy+4}" text-anchor="end" fill="#627085" font-size="11">${Math.round(value)}</text>`;}).join('');
    const line=type==='line'?`<polyline points="${vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`:'';
    const marks=vals.map((v,i)=>{const title=`${months[i][0]} · ¥ ${money(months[i][1])}`;return `${type==='bar'?`<rect x="${x(i)-step*.28}" y="${Math.min(y(v),zero)}" width="${step*.56}" height="${Math.max(Math.abs(y(v)-zero),v===0?0:1)}" rx="4" fill="${v<0?'#946621':color}"><title>${e(title)}</title></rect>`:`<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="white" stroke="${color}" stroke-width="2"><title>${e(title)}</title></circle>`}<text x="${x(i)}" y="${v>=0?y(v)-10:y(v)+18}" text-anchor="middle" fill="#172641" font-size="10">${Math.abs(v)>=1000?v.toFixed(0):Number(v.toFixed(2))}</text><text x="${x(i)}" y="${H-10}" text-anchor="middle" fill="#627085" font-size="11">${Number(months[i][0].slice(5))}月</text>`;}).join('');
    return `<div class="chart-scroll"><svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(label)}，金额单位元"><text x="0" y="14" fill="#627085" font-size="11">元</text>${grid}<line x1="${left}" y1="${zero}" x2="${W-right}" y2="${zero}" stroke="#a5b2c5"/>${line}${marks}</svg></div><details class="chart-values"><summary>查看每月金额</summary><div class="month-values">${months.map(([m,v])=>`<div>${e(m)}<span>¥ ${money(v)}</span></div>`).join('')}</div></details>`;
  }
  function donut(){
    const positive=annual.merchants.filter(m=>m.cents>0),sum=positive.reduce((s,m)=>s+m.cents,0);
    if(!sum)return '<p class="empty">暂无正净消费，无法计算占比</p>';
    const parts=positive.slice(0,4);if(positive.length>4)parts.push({name:`其他 ${positive.length-4} 个窗口`,cents:positive.slice(4).reduce((s,m)=>s+m.cents,0)});
    let offset=0;
    const slices=parts.map((p,i)=>{const share=p.cents/sum*100,svg=`<circle cx="100" cy="100" r="78" fill="none" stroke="${colors[i]}" stroke-width="24" pathLength="100" stroke-dasharray="${share} ${100-share}" stroke-dashoffset="${-offset}"><title>${e(p.name)}：¥ ${money(p.cents)}（${share.toFixed(1)}%）</title></circle>`;offset+=share;return svg;}).join('');
    return `<div class="donut-layout"><div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="各窗口正净消费占比">${slices}</svg><div class="donut-center"><strong>${positive.length}</strong><span>个消费窗口</span></div></div><div class="legend">${parts.map((p,i)=>`<div class="legend-row"><i class="dot" style="--series:${colors[i]}"></i><span class="name">${e(p.name)}</span><strong>${(p.cents/sum*100).toFixed(1)}%<small>¥ ${money(p.cents)}</small></strong></div>`).join('')}</div></div>${annual.merchants.some(m=>m.cents<0)?'<p class="muted chart-values">负净消费不参与占比，金额保留在窗口排行中。</p>':''}`;
  }
  function table(rows,excluded=false){
    if(!rows.length)return '<p class="empty">没有相关记录</p>';
    return `<div class="table-wrap"><table><thead><tr><th>时间</th><th>交易 / 统计归属</th><th>窗口</th><th>金额（元）</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${e(r.time)}</td><td>${e(r.type)}<small>${e(r.status)} · ${excluded?(r.exclusionReason?e('不计入：'+r.exclusionReason):/pharos\s+printing|校园打印/i.test(r.merchant)?'不计入：校园打印':'不计入净消费'):(r.cents<0?'已计入扣款':'已计入返还抵扣')}</small></td><td>${e(r.merchant)}</td><td>${money(r.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderMerchant(){
    const item=annual.merchants[selected];
    $('merchant-select').value=String(selected);
    document.querySelectorAll('.merchant-tag').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
    if(!item){$('merchant-detail').innerHTML='<p class="empty">该年没有符合统计口径的窗口</p>';return;}
    const peak=item.months.reduce((best,m)=>m[1]>best[1]?m:best,item.months[0]);
    $('merchant-detail').innerHTML=`<div class="merchant-metric"><div class="eyebrow">SELECTED WINDOW</div><h3>${e(item.name)}</h3><div class="metric-amount">¥ ${money(item.cents)}</div><p>${periodLabel()}累计净消费</p><div class="mini-facts"><div><strong>${item.count}</strong>笔扣款</div><div><strong>${item.refundCount}</strong>笔返还</div><div><strong>${peak?Number(peak[0].slice(5))+'月':'—'}</strong>消费最高月份</div></div></div><div><div class="section-head"><div><h3>${month?'这个月，在这里花了多少':'每个月，在这里花了多少'}</h3><p>月度净消费 · 元</p></div><span class="eyebrow" style="color:var(--teal)">${periodLabel()}</span></div>${chart(item.months,'line','#047444',item.name+'月度净消费')}</div>`;
  }
  function render(){
    annual=filterPeriod(year,month);
    $('report-year').textContent=month?`${annual.year} 年 ${Number(month)} 月`:annual.year;
    const start=month?`${year.year}-${month}-01`:year.year+'-01-01';
    const end=month?`${year.year}-${month}-${new Date(Date.UTC(Number(year.year),Number(month),0)).getUTCDate()}`:year.year+'-12-31';
    $('period').textContent=`${model.start>start?model.start:start} — ${model.end<end?model.end:end}`;
    $('net-label').textContent=month?'本月净消费':'年度净消费';
    $('ranking-title').textContent=month?'这个月的窗口排行':'这一年的窗口排行';
    $('net').innerHTML=`<small>¥</small>${money(annual.total)}`;
    $('net-note').textContent=`扣款 ${money(annual.gross)} − 返还 ${money(annual.returned)}`;
    $('count').textContent=annual.count;$('windows').textContent=annual.merchants.length;
    const activeMonths=annual.months.filter(([,v])=>v!==0).length;
    $('average').innerHTML=`<small>¥</small>${money(Math.round(annual.total/(annual.months.length||1)))}`;
    $('average-note').textContent=`查询范围内 ${annual.months.length} 个月的平均值`;
    $('count-note').textContent=`${annual.included.length-annual.count} 笔返还已抵扣`;
    $('window-note').textContent=`${activeMonths} 个月有净消费`;
    $('monthly').innerHTML=chart(annual.months,chartType,'#044384','所选期间月度净消费');
    $('distribution').innerHTML=donut();
    $('annual-label').textContent=`${periodLabel()}窗口详情`;
    $('merchant-select').innerHTML=annual.merchants.map((m,i)=>`<option value="${i}">${e(m.name)}</option>`).join('');
    $('merchant-select').disabled=!annual.merchants.length;
    $('merchant-tags').innerHTML=annual.merchants.map((m,i)=>`<button class="merchant-tag" data-index="${i}" aria-pressed="${i===selected}">${e(m.name)}</button>`).join('');
    document.querySelectorAll('.merchant-tag').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.index);renderMerchant();});
    const maximum=Math.max(...annual.merchants.map(m=>Math.abs(m.cents)),1);
    $('ranking-count').textContent=`全部 ${annual.merchants.length} 个窗口 · 按${month?'本月':'年度'}净消费排序`;
    $('ranking').innerHTML=annual.merchants.map((m,i)=>`<div class="rank"><span class="rank-index">${String(i+1).padStart(2,'0')}</span><div class="rank-name">${e(m.name)}<small>${m.count} 笔扣款 · ${m.refundCount} 笔返还</small></div><span class="rank-money">¥ ${money(m.cents)}</span><div class="rank-track"><div class="rank-fill" style="width:${Math.abs(m.cents)/maximum*100}%;${m.cents<0?'background:var(--gold)':''}"></div></div></div>`).join('')||'<p class="empty">暂无窗口消费</p>';
    $('included-label').textContent=`已计入净消费的明细 · ${annual.included.length} 条`;
    $('excluded-label').textContent=`未计入净消费的其他明细 · ${annual.excluded.length} 条`;
    $('included').innerHTML=table(annual.included);$('excluded').innerHTML=table(annual.excluded,true);
    renderMerchant();
  }
  function monthsMenu(){
    $('month-filter').innerHTML='<option value="">全部月份</option>'+year.months.map(([m])=>`<option value="${m.slice(5)}">${Number(m.slice(5))} 月</option>`).join('');
    $('month-filter').value=month;
  }
  $('year-filter').innerHTML=[...model.years].reverse().map(y=>`<option value="${y.year}">${y.year} 年</option>`).join('');
  $('year-filter').value=year.year;
  $('year-filter').onchange=()=>{year=model.years.find(y=>y.year===$('year-filter').value);month='';selected=0;monthsMenu();render();};
  $('month-filter').onchange=()=>{month=$('month-filter').value;selected=0;render();};
  $('merchant-select').onchange=()=>{selected=Number($('merchant-select').value);renderMerchant();};
  document.querySelectorAll('[data-chart]').forEach(button=>button.onclick=()=>{chartType=button.dataset.chart;document.querySelectorAll('[data-chart]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('monthly').innerHTML=chart(annual.months,chartType,'#044384','所选期间月度净消费');});
  $('print').onclick=()=>window.print();
  monthsMenu();render();
}

function reportHTML(summary){
  const model=reportModel(summary);
  const serialized=JSON.stringify(model).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  // HTML parsing normalizes CRLF before CSP hashing, including on Windows.
  const script=`{const model=${serialized};(${reportApp.toString()})(model,${filterPeriod.toString()});(${personalityApp.toString()})(model,${createEatTI.toString()});}`.replace(/\r\n?/g,'\n');
  const hash=crypto.createHash('sha256').update(script).digest('base64');
  const atlas=fs.readFileSync(path.join(__dirname,'assets/eatti-characters-cartoon.png')).toString('base64');
  const western=fs.readFileSync(path.join(__dirname,'assets/eatti-western-steak.png')).toString('base64');
  const css=fs.readFileSync(path.join(__dirname,'theme.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'personality.css'),'utf8');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>DKU · 年度消费报告</title><style>${css}</style></head><body>
  <header class="topbar"><div class="brand"><span class="brand-mark">D.</span><div>DKU ANNUAL EAT<small>CAMPUS LIFE, IN NUMBERS</small></div></div><span class="topbar-note">校园生活 / 年度消费报告</span></header>
  <svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><image id="eat-character-atlas" width="1254" height="1254" href="data:image/png;base64,${atlas}"/><image id="eat-character-western" width="1" height="1" href="data:image/png;base64,${western}"/></defs></svg>
  <nav class="report-navigation" aria-label="报告与趣味扩展"><button id="show-report" aria-pressed="true" aria-controls="report-view">年度消费报告</button><button id="show-eat" aria-pressed="false" aria-controls="eat-view">EatTI · 饭格彩蛋</button></nav>
  <main class="page" id="report-view"><div class="page-heading"><div><div class="eyebrow">YOUR YEAR AT A GLANCE</div><h1><span id="report-year"></span>，花在校园的时光。</h1><p id="period" class="muted"></p></div><div class="controls"><div><label class="sr-only" for="year-filter">报告年份</label><select id="year-filter"></select></div><div><label class="sr-only" for="month-filter">报告月份</label><select id="month-filter"></select></div><button id="print" class="secondary">打印 / 保存 PDF</button></div></div>
  ${model.complete?'':'<p class="notice">部分数据报告：采集尚未完成，以下金额不代表所选期间总额。</p>'}<noscript><p class="notice">请在支持 JavaScript 的浏览器中打开此报告以查看图表。</p></noscript>
  <section class="kpis" aria-label="年度概览"><div class="kpi primary"><div id="net-label" class="kpi-label">年度净消费</div><div id="net" class="kpi-value"></div><div id="net-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label">消费笔数</div><div id="count" class="kpi-value"></div><div id="count-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label">消费窗口</div><div id="windows" class="kpi-value"></div><div id="window-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label">月均净消费</div><div id="average" class="kpi-value"></div><div id="average-note" class="kpi-note"></div></div></section>
  <div class="chart-grid"><section class="card chart-panel"><div class="section-head"><div><h2>消费的月度节奏</h2><p>每月净消费 · 元</p></div><div class="segmented" aria-label="图表类型"><button data-chart="bar" aria-pressed="true">柱状图</button><button data-chart="line" aria-pressed="false">折线图</button></div></div><div id="monthly"></div></section><section class="card chart-panel"><div class="section-head"><div><h2>钱都花在哪里</h2><p>各窗口正净消费占比</p></div></div><div id="distribution"></div></section></div>
  <section class="card explorer"><div class="explorer-head"><div class="explorer-title"><div class="eyebrow muted">EXPLORE BY WINDOW</div><h2 id="annual-label" style="margin-top:8px"></h2></div><div><label class="control-label" for="merchant-select">选择一个窗口</label><select id="merchant-select"></select></div></div><div id="merchant-tags" class="merchant-tags" role="group" aria-label="当年窗口标签"></div><div id="merchant-detail" class="explorer-body" aria-live="polite"></div></section>
  <section class="card"><div class="section-head"><div><h2 id="ranking-title">这一年的窗口排行</h2><p id="ranking-count"></p></div><span class="eyebrow muted">TOTAL SPENDING</span></div><div id="ranking" class="ranking-list"></div></section>
  <details class="card records"><summary id="included-label"></summary><div id="included"></div></details><details class="card records"><summary id="excluded-label"></summary><div id="excluded"></div></details>
  </main>
  <main id="eat-view" class="eat-page" hidden aria-label="EatTI 趣味饮食人格">
    <header class="eat-masthead"><div><div class="eat-logo">Eat<span>TI.</span></div><p>胃有自己的主意。</p></div><div class="eat-edition"><span class="eat-kicker">CAMPUS APPETITE CLUB</span><strong>校园饭格观察所 / 趣味番外</strong></div></header>
    <div class="eat-toolbar"><h1>从饭票里，认领另一个你。</h1><div class="controls"><div><label for="eat-year">饭格年份</label><select id="eat-year"></select></div><div><label for="eat-month">饭格月份</label><select id="eat-month"></select></div><button id="eat-print">打印饭格 / 保存 PDF</button></div></div>
    <p id="eat-sample" class="eat-sample" role="status"></p><p class="eat-sample">食堂营业时间 08:00–19:30 · 营业时段外记录单独标注</p>
    <div id="eat-result"></div>
    <details class="eat-atlas"><summary>展开饭格图鉴 · ${createEatTI().types.length} 位食堂居民</summary><p>先检查各角色的匹配条件，再从符合条件的候选中挑选最多 6 位最匹配的角色；不足 6 位按实际数量展示，不补位，不限定角色类别。下面是全部角色设定，不代表你已匹配。</p><div id="eat-gallery" class="eat-gallery"></div></details>
    <details class="eat-method"><summary>这些饭格是怎么来的？</summary><p>只读已采集账单，从已通过统计清洗的扣款中，按商户名称识别餐饮窗口。充值、退款、打印、疑似全额冲正及用途不明的商户不参与；折扣返还不另算一次吃饭。角色只描述校园卡可见的消费习惯，不推断健康、财富或真实心理人格。</p><p>营业时间按 08:00–19:30。早餐 08:00–09:59，午餐 10:00–13:59，下午加餐 14:00–15:59，晚餐 16:00–19:30（包含 19:30 这一分钟）。其余记录单独归入营业时段外，不解读为夜宵，也不删除。商户实际营业时间可能不同，可据此核对。</p><p>角色覆盖窗口偏好、路线、时段、花费、消费节奏和周末。窗口偏好须至少 4 笔且占比 ≥15%；固定小时须至少 6 笔且占比 ≥50%；周末须至少 6 笔且占比 ≥40%；其他规则在图鉴中列出。符合条件才进入候选，最终最多显示 6 位，没有合适的角色就不展示。</p><p>候选按「实际占比 ÷ 对应门槛」排序：窗口偏好 15%、固定小时 50%、周末 40%、双窗口 80%；守护者用最高窗口占比 ÷60%，探险家用其他窗口占比 ÷60%，漫游者设为 1。时段和花费先取笔数最多档，再分别以五档均分的 20%、三档均分的 1/3 为参照。并列按图鉴顺序；双窗口角色替代漫游者，避免重复。排序仅是本项目的趣味规则，不是心理测评概率。</p><p>至少 6 笔餐饮扣款、3 个消费日才展示组合；记录不足时不强行凑满六种类型。小额消费可能是饮品或小食，多笔刷卡不等于多顿饭，校外饮食也不在这份数据里。</p><p id="eat-coverage"></p></details>
    ${model.complete?'':'<p class="notice">部分数据饭格：采集尚未完成，角色仅反映目前已取得的记录。</p>'}
    <footer class="eat-footer"><span>有据可循的脑洞 · 仅供娱乐</span><span>DKU ANNUAL EAT / 独立扩展，不参与主线统计</span></footer>
  </main><script>${script}</script></body></html>`;
}
module.exports={reportHTML,reportModel,filterPeriod};
