'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createEatTI,personalityApp}=require('./personality.js');
const {createLanguage}=require('./language.js');
const {createImageExporter,saveShareImage}=require('./share.js');

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

function filterPeriod(year,month,range){
  if(!month&&!range)return year;
  const source=range?year:[year],base=source.at(-1),prefix=base.year+'-'+month;
  const inRange=r=>range?r.time.slice(0,10)>=range.start&&r.time.slice(0,10)<=range.end:r.time.startsWith(prefix);
  const included=source.flatMap(y=>y.included).filter(inRange).sort((a,b)=>a.time.localeCompare(b.time)),excluded=source.flatMap(y=>y.excluded).filter(inRange);
  const months=source.flatMap(y=>y.months).filter(([m])=>range?m>=range.start.slice(0,7)&&m<=range.end.slice(0,7):m===prefix).map(([m])=>[m,included.filter(r=>r.time.startsWith(m)).reduce((n,r)=>n-r.cents,0)]);
  const merchants=new Map();
  for(const row of included){
    const item=merchants.get(row.merchant)||{name:row.merchant,cents:0,count:0,refundCount:0};
    item.cents-=row.cents;if(row.cents<0)item.count++;else item.refundCount++;
    merchants.set(row.merchant,item);
  }
  const gross=included.reduce((s,r)=>s+Math.max(0,-r.cents),0),returned=included.reduce((s,r)=>s+Math.max(0,r.cents),0);
  return {...base,included,excluded,gross,returned,total:gross-returned,count:included.filter(r=>r.cents<0).length,months,merchants:[...merchants.values()].sort((a,b)=>b.cents-a.cents||a.name.localeCompare(b.name)).map(m=>({...m,months:months.map(([key])=>[key,included.filter(r=>r.merchant===m.name&&r.time.startsWith(key)).reduce((n,r)=>n-r.cents,0)])}))};
}

function createReportRange(model,language){
  const $=id=>document.getElementById(id),listeners=[];
  let current=null;
  const latest=model.years.at(-1).year;
  for(const id of ['range-start','range-end']){$(id).setAttribute('min',model.start);$(id).setAttribute('max',model.end);}
  $('range-start').value=model.start>latest+'-01-01'?model.start:latest+'-01-01';$('range-end').value=model.end;
  const notify=()=>{ $('range-state').textContent=current?`${current.start} — ${current.end}`:'';listeners.forEach(fn=>fn()); };
  const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  function apply(){
    const start=$('range-start').value,end=$('range-end').value;
    if(!valid(start)||!valid(end)||start>end||start<model.start||end>model.end){$('range-error').hidden=false;$('range-error').textContent=language.t(`请填写 ${model.start} 至 ${model.end} 内有效的起止日期`,`Enter valid dates within ${model.start} — ${model.end}`);return;}
    current={start,end};$('range-error').hidden=true;notify();
  }
  $('range-apply').onclick=apply;
  $('range-clear').onclick=()=>{current=null;$('range-error').hidden=true;notify();};
  $('range-all').onclick=()=>{$('range-start').value=model.start;$('range-end').value=model.end;apply();};
  $('range-recent').onclick=()=>{const start=new Date(model.end+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-29);$('range-start').value=[model.start,start.toISOString().slice(0,10)].sort().at(-1);$('range-end').value=model.end;apply();};
  $('range-coverage').textContent=language.t('已有数据：','Available data: ')+model.start+' — '+model.end;
  language.onChange(()=>{$('range-coverage').textContent=language.t('已有数据：','Available data: ')+model.start+' — '+model.end;notify();});notify();
  return {get current(){return current;},onChange(fn){listeners.push(fn);}};
}

// Kept inside the HTML so saved reports work without a server or external libraries.
function reportApp(model,filterPeriod,language,eat,saveImage,range,imageExports){
  const $=id=>document.getElementById(id);
  const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=language.t;
  const monthName=m=>range.current&&range.current.start.slice(0,4)!==range.current.end.slice(0,4)?m:t(Number(m.slice(-2))+'月',['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m.slice(-2))-1]);
  const sourceText=value=>t(value,String(value).replace(/Expense\s*消费/gi,'Expense').replace(/Refund\s*退款/gi,'Refund').replace(/交易成功/g,'Successful').replace(/交易失败/g,'Failed').replace(/充值/g,'Top-up'));
  const money=value=>(value/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const theme=typeof getComputedStyle==='function'?getComputedStyle(document.documentElement):null;
  const color=(name,fallback)=>theme?.getPropertyValue(name).trim()||fallback;
  const palette={blue:color('--navy','#044384'),green:color('--teal','#047444'),ink:color('--ink','#172641'),muted:color('--muted','#627085'),paper:color('--paper','#f3f6fa'),line:color('--line','#dce3ec'),soft:color('--soft','#edf5e9'),gold:color('--gold','#a67424'),lightGreen:color('--light-green','#6fbc4e'),shareGreen:color('--share-green','#047444'),chartGreen:color('--chart-green','#047444'),shareMuted:color('--share-muted','#526176')};
  const colors=[palette.blue,palette.green,'#27849b',palette.lightGreen,'#8ec9bc'];
  let year=model.years[model.years.length-1],annual=year,month='',selected=0,chartType='bar',amountView='count';
  const periodLabel=()=>range.current?`${range.current.start} — ${range.current.end}`:t(`${year.year} 年${month?' '+Number(month)+' 月':''}`,year.year+(month?'-'+month:''));
  function chart(months,type,color,label){
    if(!months.length)return `<p class="empty">${t('暂无月度数据','No monthly data')}</p>`;
    const vals=months.map(x=>x[1]/100),max=Math.max(...vals,1),min=Math.min(...vals,0),pad=(max-min)*.16;
    const high=max+pad,low=min<0?min-pad:0,W=660,H=260,left=55,right=18,top=28,bottom=35;
    const y=v=>top+(high-v)/(high-low)*(H-top-bottom),step=(W-left-right)/vals.length,x=i=>left+step*(i+.5),zero=y(0);
    const grid=Array.from({length:5},(_,i)=>{const value=low+(high-low)*i/4,yy=y(value);return `<line x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}" stroke="#e5eaf1"/><text x="${left-10}" y="${yy+4}" text-anchor="end" fill="#627085" font-size="11">${Math.round(value)}</text>`;}).join('');
    const line=type==='line'?`<polyline points="${vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`:'';
    const marks=vals.map((v,i)=>{const title=`${months[i][0]} · ¥ ${money(months[i][1])}`;return `${type==='bar'?`<rect x="${x(i)-step*.28}" y="${Math.min(y(v),zero)}" width="${step*.56}" height="${Math.max(Math.abs(y(v)-zero),v===0?0:1)}" rx="4" fill="${v<0?'#946621':color}"><title>${e(title)}</title></rect>`:`<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="white" stroke="${color}" stroke-width="2"><title>${e(title)}</title></circle>`}<text x="${x(i)}" y="${v>=0?y(v)-10:y(v)+18}" text-anchor="middle" fill="#172641" font-size="10">${Math.abs(v)>=1000?v.toFixed(0):Number(v.toFixed(2))}</text><text x="${x(i)}" y="${H-10}" text-anchor="middle" fill="#627085" font-size="11">${monthName(months[i][0])}</text>`;}).join('');
    return `<div class="chart-scroll"><svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(label)}${t('，金额单位元',', CNY')}">${grid}<line x1="${left}" y1="${zero}" x2="${W-right}" y2="${zero}" stroke="#a5b2c5"/>${line}${marks}</svg></div><details class="chart-values"><summary>▸ ${t('每月金额','Monthly amounts')}</summary><div class="month-values">${months.map(([m,v])=>`<div>${e(m)}<span>¥ ${money(v)}</span></div>`).join('')}</div></details>`;
  }
  function donut(){
    const positive=annual.merchants.filter(m=>m.cents>0),sum=positive.reduce((s,m)=>s+m.cents,0);
    if(!sum)return `<p class="empty">${t('暂无正净消费，无法计算占比','No positive net spending to calculate shares')}</p>`;
    const parts=positive.slice(0,4);if(positive.length>4)parts.push({name:t(`其他 ${positive.length-4} 个窗口`,`${positive.length-4} other counters`),cents:positive.slice(4).reduce((s,m)=>s+m.cents,0)});
    let offset=0;
    const point=(radius,angle)=>`${100+radius*Math.cos(angle)} ${100+radius*Math.sin(angle)}`;
    const slices=parts.map((p,i)=>{
      const share=p.cents/sum,from=offset/sum*Math.PI*2-Math.PI/2;
      offset+=p.cents;
      const to=offset/sum*Math.PI*2-Math.PI/2,large=share>.5?1:0;
      const title=`<title>${e(p.name)}: ¥ ${money(p.cents)} (${(share*100).toFixed(1)}%)</title>`;
      if(parts.length===1)return `<circle cx="100" cy="100" r="78" fill="none" stroke="${colors[i]}" stroke-width="24">${title}</circle>`;
      return `<path d="M ${point(90,from)} A 90 90 0 ${large} 1 ${point(90,to)} L ${point(66,to)} A 66 66 0 ${large} 0 ${point(66,from)} Z" fill="${colors[i]}">${title}</path>`;
    }).join('');
    return `<div class="donut-layout"><div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="${t('各窗口正净消费占比','Share of positive net spending by counter')}">${slices}</svg><div class="donut-center"><strong>${positive.length}</strong><span>${t('个消费窗口','dining counters')}</span></div></div><div class="legend">${parts.map((p,i)=>`<div class="legend-row"><i class="dot" style="--series:${colors[i]}"></i><span class="name">${e(p.name)}</span><strong>${(p.cents/sum*100).toFixed(1)}%<small>¥ ${money(p.cents)}</small></strong></div>`).join('')}</div></div>${annual.merchants.some(m=>m.cents<0)?`<p class="muted chart-values">${t('负净消费不参与占比，金额保留在窗口排行中。','Negative net amounts appear in the ranking and are excluded from these shares.')}</p>`:''}`;
  }
  function table(rows,excluded=false){
    if(!rows.length)return `<p class="empty">${t('没有相关记录','No records')}</p>`;
    return `<div class="table-wrap"><table><thead><tr><th>${t('时间','Time')}</th><th>${t('交易 / 统计归属','Transaction / treatment')}</th><th>${t('窗口','Counter')}</th><th>${t('金额（元）','Amount (CNY)')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${e(r.time)}</td><td>${e(sourceText(r.type))}<small>${e(sourceText(r.status))} · ${excluded?t(r.exclusionReason?e('不计入：'+r.exclusionReason):/pharos\s+printing|校园打印/i.test(r.merchant)?'不计入：校园打印':'不计入净消费',/printing|打印/i.test(r.merchant)?'Excluded: campus printing':'Excluded from net spending'):t(r.cents<0?'已计入扣款':'已抵扣',r.cents<0?'Included charge':'Deducted refund')}</small></td><td>${e(r.merchant)}</td><td>${money(r.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function spendingFacts(a,concise=false){
    const spend=a.included.filter(r=>r.cents<0);
    const perDay={},dayCounts={},week=[0,0,0,0,0,0,0];let biggest=null;
    spend.forEach(r=>{
      const d=r.time.slice(0,10);
      perDay[d]=(perDay[d]||0)-r.cents;
      dayCounts[d]=(dayCounts[d]||0)+1;
      week[new Date(d+'T00:00:00Z').getUTCDay()]++;
      if(!biggest||r.cents<biggest.cents)biggest=r;
    });
    const dayList=Object.entries(perDay).sort((x,y)=>y[1]-x[1]);
    const dayKeys=Object.keys(perDay).sort();
    const wdNames=t(['周日','周一','周二','周三','周四','周五','周六'],['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
    const topWd=week.indexOf(Math.max(...week));
    const maxMonth=a.months.reduce((b,m)=>m[1]>(b?b[1]:-1)?m:b,null);
    let streak=0,cur=0,streakStart='',streakEnd='';
    dayKeys.forEach((d,i)=>{
      cur=i&&Date.parse(d+'T00:00:00Z')-Date.parse(dayKeys[i-1]+'T00:00:00Z')===86400000?cur+1:1;
      if(cur>streak){streak=cur;streakStart=dayKeys[i-cur+1];streakEnd=d;}
    });
    const totalSpend=-spend.reduce((s,r)=>s+r.cents,0);
    const times=[...spend].sort((a,b)=>a.time.slice(11).localeCompare(b.time.slice(11))||a.time.localeCompare(b.time));
    const items=[];
    if(biggest)items.push([t('单笔最高','Largest charge'),`¥ ${money(-biggest.cents)}`,`${biggest.merchant} · ${biggest.time}`]);
    if(dayList[0])items.push([t('单日最高','Biggest spending day'),`¥ ${money(dayList[0][1])}`,dayList[0][0].replace(/-/g,'/')]);
    if(streak)items.push([t('最长连续消费','Longest daily streak'),t(`${streak} 天`,`${streak} days`),`${streakStart} — ${streakEnd}`]);
    if(spend.length)items.push([t('最常消费的星期','Busiest weekday'),wdNames[topWd],`${(week[topWd]/spend.length*100).toFixed(1)}% · ${week[topWd]} ${t('次','charges')}`]);
    if(times.length)items.push([t('最早的一笔','Earliest swipe'),times[0].time.slice(11,16),`${times[0].time.slice(0,10)} · ${times[0].merchant}`]);
    if(times.length)items.push([t('最晚的一笔','Latest swipe'),times[times.length-1].time.slice(11,16),`${times[times.length-1].time.slice(0,10)} · ${times[times.length-1].merchant}`]);
    if(maxMonth&&maxMonth[1]>0)items.push([t('单月最高','Biggest month'),`¥ ${money(maxMonth[1])}`,monthName(maxMonth[0])]);
    if(spend.length){
      items.push([t('平均每次','Average charge'),`¥ ${money(Math.round(totalSpend/spend.length))}`,concise?t(`${spend.length} 次`,`${spend.length} charges`):t(`${spend.length} 次消费 · 按扣款计算`,`${spend.length} charges · before refunds`)]);
      const sorted=spend.map(r=>-r.cents).sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
      const median=sorted.length%2?sorted[mid]:Math.round((sorted[mid-1]+sorted[mid])/2);
      items.push([t('单笔中位数','Median charge'),`¥ ${money(median)}`,concise?'':t('一半扣款不超过这个金额','Half of your charges were at or below this amount')]);
      const small=spend.filter(r=>-r.cents<=1500),smallTotal=-small.reduce((n,r)=>n+r.cents,0);
      if(small.length)items.push([t('小额消费累计','Small charges add up'),`¥ ${money(smallTotal)}`,concise?t(`${small.length} 次 · ≤¥15 · ${(smallTotal/totalSpend*100).toFixed(1)}%`,`${small.length} charges · ≤¥15 · ${(smallTotal/totalSpend*100).toFixed(1)}%`):t(`≤¥15 的 ${small.length} 笔 · 占扣款 ${(smallTotal/totalSpend*100).toFixed(1)}%`,`${small.length} charges ≤¥15 · ${(smallTotal/totalSpend*100).toFixed(1)}% of spending`)]);
      let run=0,best=0,last='',loyalty;
      spend.forEach(r=>{run=r.merchant===last?run+1:1;last=r.merchant;if(run>best){best=run;loyalty=r;}});
      items.push([t('连刷同一窗口','Longest counter streak'),t(`${best} 次`,`${best} swipes`),`${loyalty.merchant} · ${concise?'':t('截至','through')+' '}${loyalty.time.slice(0,10)}`]);
      const weekend=week[0]+week[6];
      items.push([t('周末消费占比','Weekend share'),`${(weekend/spend.length*100).toFixed(1)}%`,concise?t(`${weekend} 次`,`${weekend} charges`):t(`${weekend} 笔发生在周六、周日`,`${weekend} charges on Saturdays and Sundays`)]);
      items.push([t('消费日均','Average per active day'),`¥ ${money(Math.round(totalSpend/dayKeys.length))}`,concise?t(`${dayKeys.length} 天`,`${dayKeys.length} days`):t(`${dayKeys.length} 个有消费的日期 · 按扣款计算`,`${dayKeys.length} active days · before refunds`)]);
      const prices=new Map();sorted.forEach(n=>prices.set(n,(prices.get(n)||0)+1));
      const common=[...prices].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0],ties=[...prices.values()].filter(n=>n===common[1]).length;
      items.push([t('最常见的单笔金额','Most common charge'),`¥ ${money(common[0])}`,t(`${common[1]} ${concise?'次':'笔'}${ties>1?' · '+ties+' 个金额并列':''}`,`${common[1]} charges${ties>1?' · '+ties+' tied amounts':''}`)]);
      const busy=Object.keys(dayCounts).sort((a,b)=>dayCounts[b]-dayCounts[a]||perDay[b]-perDay[a]||a.localeCompare(b))[0];
      items.push([t('单日刷卡最多','Most swipes in a day'),t(`${dayCounts[busy]} 次`,`${dayCounts[busy]} swipes`),`${busy} · ¥ ${money(perDay[busy])}`]);
    }
    const limits=[500,1000,1500,2000,3000,5000,Infinity],labels=['≤¥5','¥5–10','¥10–15','¥15–20','¥20–30','¥30–50','>¥50'];
    const bins=limits.map((upper,i)=>({upper,label:labels[i],count:0,cents:0}));
    spend.forEach(r=>{const bin=bins.find(b=>-r.cents<=b.upper);bin.count++;bin.cents-=r.cents;});
    const prices=spend.map(r=>-r.cents).sort((a,b)=>a-b);
    const quantile=p=>{if(!prices.length)return 0;const at=(prices.length-1)*p,i=Math.floor(at);return Math.round(prices[i]+(prices[Math.min(i+1,prices.length-1)]-prices[i])*(at-i));};
    return {items,week,bins,totalSpend,count:spend.length,q1:quantile(.25),q3:quantile(.75),median:quantile(.5),p90:quantile(.9)};
  }
  function funFactsHTML(a){
    const {items}=spendingFacts(a);
    return items.map(([label,value,sub])=>`<div class="fact"><span class="fact-label">${e(label)}</span><span class="fact-value">${e(value)}</span><span class="fact-sub">${e(sub)}</span></div>`).join('')||`<p class="empty">${t('这段期间没有消费记录','No spending in this period')}</p>`;
  }
  function amountChart(stats,view,frame='class="chart-svg"'){
    const amount=view==='total',values=stats.bins.map(b=>amount?b.cents/100:b.count);
    const tick=Math.max(1,Math.ceil(Math.max(...values,1)/4)),max=tick*4;
    const W=800,H=210,left=48,step=104,base=164,top=26;
    const barOpacities=[1,.84,.7,.56,.43,.31,.2];
    const grid=Array.from({length:5},(_,i)=>{const y=base-i/4*(base-top);return `<line x1="${left}" y1="${y}" x2="780" y2="${y}" stroke="${palette.line}"/><text x="36" y="${y+4}" text-anchor="end" fill="${palette.muted}" font-size="12">${i*tick}</text>`;}).join('');
    const bars=stats.bins.map((b,i)=>{
      const x=left+step*(i+.5),height=values[i]/max*(base-top);
      const title=`${b.label} · ${b.count} ${t('笔','charges')} · ¥${money(b.cents)}`;
      return `${height?`<rect x="${x-27}" y="${base-height}" width="54" height="${height}" rx="5" fill="${palette.blue}" fill-opacity="${barOpacities[i]}"><title>${e(title)}</title></rect>`:''}<text x="${x}" y="${base-height-9}" text-anchor="middle" fill="${palette.blue}" font-size="14" font-weight="600">${amount?'¥'+money(b.cents):b.count}</text><text x="${x}" y="195" text-anchor="middle" fill="${palette.muted}" font-size="13">${b.label}</text>`;
    }).join('');
    return `<svg ${frame} viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('单笔消费金额分布','Charge amount distribution')} · ${amount?t('累计金额，元','total CNY'):t('消费笔数','number of charges')}" font-family="DengXian,Microsoft YaHei,sans-serif">${grid}${bars}</svg>`;
  }
  function renderHistogram(){
    const stats=spendingFacts(annual);
    const insight=(label,value)=>`<div><span>${label}</span><strong>${value}</strong></div>`;
    $('spending-histogram').innerHTML=`<div class="section-head"><div><h3>${t('单笔消费金额分布','Charge amount distribution')}</h3></div><div class="segmented"><button id="amount-count" aria-pressed="${amountView==='count'}">${t('次数','Count')}</button><button id="amount-total" aria-pressed="${amountView==='total'}">${t('金额','Amount')}</button></div></div><div class="amount-layout"><div class="chart-scroll">${amountChart(stats,amountView)}</div><div class="amount-insights">${insight(t('参与统计','Included charges'),stats.count+' '+t('笔','charges'))}${insight(t('中间 50% 的单笔','Middle 50% of charges'),'¥'+money(stats.q1)+' – '+money(stats.q3))}${insight(t('90% 的单笔不超过','90% of charges at or below'),'¥'+money(stats.p90))}</div></div>`;
    $('amount-count').onclick=()=>{amountView='count';renderHistogram();};
    $('amount-total').onclick=()=>{amountView='total';renderHistogram();};
  }
  function renderMerchant(){
    const item=annual.merchants[selected];
    $('merchant-select').value=String(selected);
    document.querySelectorAll('.merchant-tag').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
    if(!item){$('merchant-detail').innerHTML=`<p class="empty">${t('该年没有符合统计口径的窗口','No eligible counters in this period')}</p>`;return;}
    const peak=item.months.reduce((best,m)=>m[1]>best[1]?m:best,item.months[0]);
    $('merchant-detail').innerHTML=`<div class="merchant-metric"><div class="eyebrow">SELECTED WINDOW</div><h3>${e(item.name)}</h3><div class="metric-amount">¥ ${money(item.cents)}</div><p>${periodLabel()} · ${t('累计净消费','net spending')}</p><div class="mini-facts"><div><strong>${item.count}</strong>${t('次消费','charges')}</div><div><strong>${peak?monthName(peak[0]):'—'}</strong>${t('消费最高月份','peak month')}</div></div></div><div><div class="section-head"><div><h3>${month?t('本月花费','This month'):t('月度花费','Monthly spending')}</h3><p>${t('月度净消费 · 元','Monthly net spending · CNY')}</p></div><span class="eyebrow" style="color:var(--teal);letter-spacing:1px">${periodLabel()}</span></div>${chart(item.months,'line','#047444',item.name+t('月度净消费',' monthly net spending'))}</div>`;
  }
  function render(){
    annual=range.current?filterPeriod(model.years,'',range.current):filterPeriod(year,month);
    $('year-filter').disabled=!!range.current;$('month-filter').disabled=!!range.current;
    $('report-year').textContent=range.current?t('所选时段','Selected dates'):month?periodLabel():annual.year;
    $('report-heading-copy').textContent=range.current?t('的食堂日常',' · Life at the table'):t('，花在食堂的时光',' · A year at the table');
    const start=range.current?.start||(month?`${year.year}-${month}-01`:year.year+'-01-01');
    const end=range.current?.end||(month?`${year.year}-${month}-${new Date(Date.UTC(Number(year.year),Number(month),0)).getUTCDate()}`:year.year+'-12-31');
    $('period').textContent=`${model.start>start?model.start:start} — ${model.end<end?model.end:end}`;
    $('net-label').textContent=range.current?t('期间净消费','Period net spending'):month?t('本月净消费','Monthly net spending'):t('年度净消费','Annual net spending');
    $('ranking-title').textContent=t('窗口排行','Counter ranking');
    $('net').innerHTML=`<small>¥</small>${money(annual.total)}`;
    $('net-note').textContent='';
    $('fun-facts-body').innerHTML=funFactsHTML(annual);
    $('spending-patterns').innerHTML=eat.distributionsHTML(eat.analyze(annual.included),language.lang,false);
    renderHistogram();
    $('count').textContent=annual.count;$('windows').textContent=annual.merchants.length;
    const activeMonths=annual.months.filter(([,v])=>v!==0).length;
    $('average').innerHTML=`<small>¥</small>${money(Math.round(annual.total/(annual.months.length||1)))}`;
    $('average-note').textContent='';
    $('count-note').textContent='';
    $('window-note').textContent=t(`${activeMonths} 个月有净消费`,`${activeMonths} months with net spending`);
    $('monthly').innerHTML=chart(annual.months,chartType,'#044384',t('所选期间月度净消费','Monthly net spending for this period'));
    $('distribution').innerHTML=donut();
    $('annual-label').textContent=periodLabel()+t('窗口详情',' · counter details');
    $('merchant-select').innerHTML=annual.merchants.map((m,i)=>`<option value="${i}">${e(m.name)}</option>`).join('');
    $('merchant-select').disabled=!annual.merchants.length;
    $('merchant-tags').innerHTML=annual.merchants.map((m,i)=>`<button class="merchant-tag" data-index="${i}" aria-pressed="${i===selected}">${e(m.name)}</button>`).join('');
    document.querySelectorAll('.merchant-tag').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.index);renderMerchant();});
    const maximum=Math.max(...annual.merchants.map(m=>Math.abs(m.cents)),1);
    $('ranking-count').textContent=t(`总共 ${annual.merchants.length} 个窗口 · 按${range.current?'期间':month?'本月':'年度'}净消费排序`,`${annual.merchants.length} counters · ranked by ${range.current?'period':month?'monthly':'annual'} net spending`);
    $('ranking').innerHTML=annual.merchants.map((m,i)=>`<div class="rank"><span class="rank-index">${String(i+1).padStart(2,'0')}</span><div class="rank-name">${e(m.name)}<small>${m.count} ${t('次消费','charges')}</small></div><span class="rank-money">¥ ${money(m.cents)}</span><div class="rank-track"><div class="rank-fill" style="width:${Math.abs(m.cents)/maximum*100}%;${m.cents<0?'background:var(--gold)':''}"></div></div></div>`).join('')||`<p class="empty">${t('暂无窗口消费','No counter spending')}</p>`;
    $('included-label').textContent=t(`已计入净消费的明细 · ${annual.included.length} 条`,`Included transactions · ${annual.included.length} records`);
    $('excluded-label').textContent=t(`未计入净消费的其他明细 · ${annual.excluded.length} 条`,`Excluded transactions · ${annual.excluded.length} records`);
    $('included').innerHTML=table(annual.included);$('excluded').innerHTML=table(annual.excluded,true);
    renderMerchant();
  }
  function monthsMenu(){
    $('month-filter').innerHTML=`<option value="">${t('全部月份','All months')}</option>`+year.months.map(([m])=>`<option value="${m.slice(5)}">${monthName(m)}</option>`).join('');
    $('month-filter').value=month;
  }
  function yearsMenu(){ $('year-filter').innerHTML=[...model.years].reverse().map(y=>`<option value="${y.year}">${t(y.year+' 年',y.year)}</option>`).join('');$('year-filter').value=year.year; }
  yearsMenu();
  $('year-filter').value=year.year;
  $('year-filter').onchange=()=>{year=model.years.find(y=>y.year===$('year-filter').value);month='';selected=0;monthsMenu();render();};
  $('month-filter').onchange=()=>{month=$('month-filter').value;selected=0;render();};
  $('merchant-select').onchange=()=>{selected=Number($('merchant-select').value);renderMerchant();};
  document.querySelectorAll('[data-chart]').forEach(button=>button.onclick=()=>{chartType=button.dataset.chart;document.querySelectorAll('[data-chart]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('monthly').innerHTML=chart(annual.months,chartType,'#044384',t('所选期间月度净消费','Monthly net spending for this period'));});
  const SVG_NS='http'+'://www.w3.org/2000/svg';
  const SHARE_FAM='Arial,Helvetica,Microsoft YaHei,PingFang SC,sans-serif';
  const SHARE_SERIF='Georgia,Noto Serif SC,Songti SC,SimSun,serif';
  const SHARE_NUM='Arial,Helvetica,Microsoft YaHei,sans-serif';
  function sText(x,y,fs,weight,fill,text,o={}){const {anchor='',spacing=0,family=SHARE_FAM}=o;return `<text x="${x}" y="${y}" font-family="${family}" font-size="${fs}" font-weight="${weight}" fill="${fill}" style="font-variant-numeric:tabular-nums lining-nums"${anchor?` text-anchor="${anchor}"`:''}${spacing?` letter-spacing="${spacing}"`:''}>${e(text)}</text>`;}
  function sWidth(text,fs,weight=400){let w=0;for(const ch of text)w+=/[\u2E80-\u9FFF\uFF01-\uFF60\u3000-\u303F·—…]/.test(ch)?fs:(ch===' '?fs*.3:fs*.56);return weight>=600?w*1.03:w;}
  function sTrunc(text,fs,max){let w=0,out='';for(const ch of text){w+=sWidth(ch,fs);if(w>max)return out+'…';out+=ch;}return out;}
  function sWrap(text,fs,weight,maxWidth,maxLines){const lines=[];let line='';for(const ch of text){if(line&&sWidth(line+ch,fs,weight)>maxWidth){lines.push(line);line=ch;}else line+=ch;}if(line)lines.push(line);if(lines.length>maxLines){const kept=lines.slice(0,maxLines);kept[maxLines-1]=kept[maxLines-1].replace(/[\s.。,，、!！?？;；:：…]+$/,'')+'…';return kept;}return lines;}
  function annualShareSVG(kind){
    const W=1080,card=kind==='card';
    const {blue:BLUE,ink:INK,paper:PAPER,line:LINE,gold:GOLD}=palette;
    const GREEN=palette.shareGreen,FACTS=GREEN,MUTED=palette.shareMuted,DEEP_GREEN='#1f5b46';
    const stats=spendingFacts(annual,true),facts=stats.items.slice(0,15);
    const positive=annual.merchants.filter(m=>m.cents>0),positiveTotal=positive.reduce((n,m)=>n+m.cents,0);
    const parts=[];const push=s=>parts.push(s);
    const rect=(x,y,w,h,fill='white',radius=20,opacity=1)=>push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"${opacity<1?` fill-opacity="${opacity}"`:''}/>`);
    const text=(x,y,size,weight,color,value,options)=>push(sText(x,y,size,weight,color,card?String(value).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1'):value,options));
    const title=(x,y,label,accent)=>{rect(x,y-17,3,20,accent,1.5);text(x+16,y,21,500,INK,label);};
    const footer=y=>{text(48,y,18,600,BLUE,'DKU ANNUAL EAT');text(1032,y,17,400,MUTED,model.complete?t('校园卡消费报告','Campus card report'):t('部分数据 · 采集尚未完成','Partial data · collection in progress'),{anchor:'end'});};
    const factStep=152,factRows=Math.max(1,Math.ceil(facts.length/3)),factH=88+factRows*factStep;
    const amountY=1048+factH+20,amountH=292;
    const rankY=amountY+amountH+20,rankH=86+Math.max(1,annual.merchants.length)*62;
    const weekY=rankY+rankH+20;
    const dining=eat.analyze(annual.included),patternY=weekY+274;
    const patternH=112+Math.max(1,...dining.distributions.map(d=>d.parts.length))*52;
    const H=card?1580:patternY+patternH+90;
    rect(0,0,W,H,PAPER,0);
    rect(48,42,44,44,BLUE,13);text(70,73,25,700,'white','D.',{anchor:'middle',family:SHARE_SERIF});
    text(108,73,21,500,BLUE,'DKU ANNUAL EAT',{spacing:1.5});
    text(1032,73,23,400,GREEN,periodLabel(),{anchor:'end',family:SHARE_NUM});


    const values=annual.months.map(([,v])=>v);
    function drawMonthly(yOffset){
    rect(48,yOffset,984,264);title(72,yOffset+40,t('每月净消费 · MONTHLY','MONTHLY NET SPENDING'),BLUE);
    const hi=Math.max(...values,0),lo=Math.min(...values,0),span=hi-lo||1;
    const top=yOffset+82,bottom=yOffset+218,zero=bottom-(-lo/span)*(bottom-top),chartW=920,step=chartW/(values.length||1),bw=Math.min(42,step*.5);
    [top,bottom].forEach(y=>push(`<line x1="80" y1="${y}" x2="1000" y2="${y}" stroke="${LINE}"/>`));
    push(`<line x1="80" y1="${zero}" x2="1000" y2="${zero}" stroke="${MUTED}" stroke-opacity=".5"/>`);
    annual.months.forEach(([m,v],i)=>{
      const x=80+step*(i+.5),y=bottom-(v-lo)/span*(bottom-top),h=Math.abs(zero-y);
      if(h)rect(x-bw/2,Math.min(zero,y),bw,h,BLUE,5,Number((1-.65*i/Math.max(1,values.length-1)).toFixed(2)));
      text(x,v<0?y+19:y-10,values.length>8?15:18,400,INK,Math.abs(v)>=1000000?t((v/1000000).toFixed(1)+'万',(v/100000).toFixed(1)+'k'):money(v),{anchor:'middle',family:SHARE_NUM});
      text(x,yOffset+248,18,400,MUTED,monthName(m),{anchor:'middle',family:SHARE_NUM});
    });
    if(!values.length)text(540,yOffset+150,22,400,MUTED,t('暂无月度数据','No monthly data'),{anchor:'middle'});


    }

    function drawDiningPatterns(yOffset){
      push(eat.distributionShareSVG(dining,language.lang,yOffset,{blue:BLUE,green:GREEN,deepGreen:DEEP_GREEN,paper:PAPER,muted:MUTED,ink:INK,idPrefix:'report-share'}).svg);
    }
    function drawFacts(items,yOffset){
      rect(48,yOffset,984,88+Math.max(1,Math.ceil(items.length/3))*factStep);
      title(72,yOffset+42,t('有趣事实 · FUN FACTS','LITTLE DISCOVERIES · FUN FACTS'),FACTS);
      items.forEach(([label,value,sub],i)=>{
        const x=80+i%3*320,y=yOffset+88+Math.floor(i/3)*factStep;
        text(x,y,18,400,MUTED,label);
        text(x,y+40,28,500,i%2?FACTS:BLUE,value,{family:SHARE_NUM});
        sWrap(sub,16,400,272,2).forEach((line,j)=>text(x,y+72+j*24,16,400,MUTED,line.replace(/^[\s·]+/,'')));
      });
      if(!items.length)text(80,yOffset+100,21,400,MUTED,t('这段期间没有消费记录','No spending in this period'));
    }
    if(card){
      push('<g transform="translate(0,-40)">');
      text(48,160,17,400,MUTED,$('period').textContent);
      rect(48,180,984,76,'white',16);
      [[range.current?t('期间净消费','Period net spending'):month?t('本月净消费','Monthly net spending'):t('年度净消费','Annual net spending'),'¥ '+money(annual.total)],[t('消费次数','Charges'),String(annual.count)],[t('活跃消费日','Active days'),String(new Set(annual.included.filter(r=>r.cents<0).map(r=>r.time.slice(0,10))).size)]].forEach(([label,value],i)=>{
        const x=72+i*320;text(x,207,16,400,MUTED,label);text(x,240,24,500,i%2?FACTS:BLUE,value,{family:SHARE_NUM});
      });
      drawMonthly(276);
      drawDiningPatterns(560);
      const cardFactsY=560+patternH+20;
      const labels=[t('单笔最高','Largest charge'),t('单日最高','Biggest spending day'),t('最长连续消费','Longest daily streak'),t('最常消费的星期','Busiest weekday'),t('最早的一笔','Earliest swipe'),t('最晚的一笔','Latest swipe'),t('连刷同一窗口','Longest counter streak'),t('周末消费占比','Weekend share'),t('单日刷卡最多','Most swipes in a day')];
      const highlights=stats.items.filter(([label])=>labels.includes(label)).slice(0,9);
      drawFacts(highlights,cardFactsY);
      footer(1578);
      push('</g>');
      return {svg:`<svg xmlns="${SVG_NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`,width:W,height:H};
    }
    rect(48,110,984,226,BLUE,24);
    text(76,156,21,400,'white',range.current?t('期间净消费 · NET SPENDING','PERIOD NET SPENDING'):month?t('本月净消费 · NET SPENDING','MONTHLY NET SPENDING'):t('年度净消费 · NET SPENDING','ANNUAL NET SPENDING'));
    const net='¥ '+money(annual.total),netSize=Math.min(76,880/sWidth(net,1));
    text(76,248,netSize,400,'white',net,{family:SHARE_NUM});
    text(76,300,19,400,'white',$('period').textContent);
    text(1004,300,18,400,'white',annual.returned?t(`扣款 ¥${money(annual.gross)} / 退款 ¥${money(annual.returned)}`,`Charges ¥${money(annual.gross)} / refunds ¥${money(annual.returned)}`):'CAMPUS LIFE, IN NUMBERS',{anchor:'end'});
    rect(76,322,156,4,GREEN,2,.35);
    [[String(annual.count),t('消费次数','Charges')],[String(annual.merchants.length),t('消费窗口','Counters')],['¥ '+money(Math.round(annual.total/(annual.months.length||1))),month?t('本月净消费','Monthly net spending'):t('月均净消费','Monthly average')]].forEach(([value,label],i)=>{
      const x=48+i*334;rect(x,356,316,94,'white',16);
      text(x+22,389,18,400,i===1?GREEN:MUTED,label);
      text(x+22,428,Math.min(29,270/sWidth(value,1)),400,i===1?GREEN:BLUE,value,{family:SHARE_NUM});
    });

    drawMonthly(470);

    rect(48,754,482,274);title(72,794,t('窗口净消费 · TOP 3','TOP 3 COUNTERS · NET SPENDING'),GREEN);
    const topWindows=annual.merchants.slice(0,3);
    topWindows.forEach((m,i)=>{
      const y=839+i*69;
      text(72,y,20,700,DEEP_GREEN,String(i+1).padStart(2,'0'));
      text(108,y,19,400,INK,sTrunc(m.name,19,210));
      text(506,y,21,400,BLUE,'¥ '+money(m.cents),{anchor:'end',family:SHARE_NUM});
      text(108,y+24,17,400,MUTED,`${m.count} ${t('次','charges')}${m.cents>0&&positiveTotal?' · '+(m.cents/positiveTotal*100).toFixed(1)+'%':''}`);
    });
    if(!topWindows.length)text(72,867,21,400,MUTED,t('暂无窗口消费','No counter spending'));

    rect(550,754,482,274);title(574,794,t('累计净消费 · CUMULATIVE','CUMULATIVE NET SPENDING'),BLUE);
    let acc=0;const cumulative=values.map(v=>(acc+=v));
    const cHi=Math.max(...cumulative,0),cLo=Math.min(...cumulative,0),cSpan=cHi-cLo||1;
    const cx=i=>584+420*i/(cumulative.length-1||1),cy=v=>945-(v-cLo)/cSpan*95;
    const points=cumulative.map((v,i)=>`${cx(i)},${cy(v)}`).join(' ');
    push(`<line x1="584" y1="${cy(0)}" x2="1004" y2="${cy(0)}" stroke="${LINE}"/>`);
    if(cumulative.length){
      push(`<polyline points="${points}" fill="none" stroke="${GREEN}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
      cumulative.forEach((v,i)=>push(`<circle cx="${cx(i)}" cy="${cy(v)}" r="4" fill="white" stroke="${GREEN}" stroke-width="2"/>`));
      text(1004,832,21,400,GREEN,'¥ '+money(annual.total),{anchor:'end',family:SHARE_NUM});
      text(584,980,17,400,MUTED,monthName(annual.months[0][0]));
      text(1004,980,17,400,MUTED,monthName(annual.months.at(-1)[0]),{anchor:'end'});
    }else text(574,867,21,400,MUTED,t('暂无累计数据','No cumulative data'));

    drawFacts(facts,1048);
    {
      rect(48,amountY,984,amountH);title(72,amountY+42,t('单笔消费金额分布','CHARGE AMOUNT DISTRIBUTION'),FACTS);
      push(amountChart(stats,amountView,`x="72" y="${amountY+72}" width="660" height="190"`));
      text(762,amountY+112,17,400,MUTED,t('50% 不超过','50% at or below'));
      text(762,amountY+144,23,400,FACTS,`¥${money(stats.median)}`,{family:SHARE_NUM});
      text(762,amountY+204,17,400,MUTED,t('90% 不超过','90% at or below'));
      text(762,amountY+236,23,400,FACTS,`¥${money(stats.p90)}`,{family:SHARE_NUM});
      rect(48,rankY,984,rankH);title(72,rankY+42,t('全部窗口 · 按净消费排序','ALL COUNTERS · NET SPENDING'),BLUE);
      const max=Math.max(...annual.merchants.map(m=>Math.abs(m.cents)),1);
      annual.merchants.forEach((m,i)=>{
        const y=rankY+86+i*62;
        text(72,y,19,700,DEEP_GREEN,String(i+1).padStart(2,'0'));
        text(112,y,20,400,INK,sTrunc(m.name,20,422));
        text(112,y+22,16,400,MUTED,m.count+t(' 次',' charges'));
        rect(574,y-15,250,12,PAPER,6);
        if(m.cents)rect(574,y-15,Math.abs(m.cents)/max*250,12,m.cents<0?GOLD:BLUE,6);
        text(1004,y,21,400,INK,'¥ '+money(m.cents),{anchor:'end',family:SHARE_NUM});
      });
      if(!annual.merchants.length)text(72,rankY+88,21,400,MUTED,t('暂无窗口消费','No counter spending'));
      rect(48,weekY,984,254);title(72,weekY+42,t('一周偏好','WEEKLY PATTERNS'),palette.chartGreen);
      const weekMax=Math.max(...stats.week,1),names=t(['周日','周一','周二','周三','周四','周五','周六'],['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
      [0,.25,.5,.75,1].forEach(tick=>{const y=weekY+185-tick*102;push(`<line x1="80" y1="${y}" x2="1000" y2="${y}" stroke="${LINE}"/>`);});
      stats.week.forEach((n,i)=>{
        const x=102+i*138,h=n/weekMax*102;
        if(n)rect(x,weekY+185-h,42,h,palette.chartGreen,5,[1,.88,.76,.64,.52,.4,.28][i]);
        text(x+21,weekY+172-h,20,600,INK,String(n),{anchor:'middle'});
        text(x+21,weekY+220,20,400,MUTED,names[i],{anchor:'middle'});
      });
      drawDiningPatterns(patternY);
      footer(H-36);
    }
    return {svg:`<svg xmlns="${SVG_NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`,width:W,height:H};
  }

  window.dkuReport={share:kind=>({...annualShareSVG(kind),filename:`dku-annual-${kind}-${range.current?range.current.start+'_'+range.current.end:annual.year+(month?'-'+month:'')}.png`})};
  function downloadAnnual(kind){
    const share=window.dkuReport.share(kind);
    window.__lastShare=share.svg;
    return imageExports.run('report-'+kind,$('report-'+kind),()=>saveImage(share,share.filename));
  }
  $('report-card').onclick=()=>downloadAnnual('card');
  $('report-long').onclick=()=>downloadAnnual('long');
  $('print').onclick=()=>window.print();
  language.onChange(()=>{yearsMenu();monthsMenu();render();});
  range.onChange(()=>{selected=0;render();});
  monthsMenu();render();
}

function reportHTML(summary){
  const model=reportModel(summary);
  const serialized=JSON.stringify(model).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  // HTML parsing normalizes CRLF before CSP hashing, including on Windows.
  const script=`{const model=${serialized};const language=(${createLanguage.toString()})();const range=(${createReportRange.toString()})(model,language);const eat=(${createEatTI.toString()})();const saveImage=${saveShareImage.toString()};const imageExports=(${createImageExporter.toString()})();(${reportApp.toString()})(model,${filterPeriod.toString()},language,eat,saveImage,range,imageExports);(${personalityApp.toString()})(model,eat,language,saveImage,range,imageExports);}`.replace(/\r\n?/g,'\n');
  const hash=crypto.createHash('sha256').update(script).digest('base64');
  const illustrations=createEatTI().types.map(({id})=>`<image id="eat-character-${id}" width="1" height="1" href="data:image/png;base64,${fs.readFileSync(path.join(__dirname,'assets/characters',id+'.png')).toString('base64')}"/>`).join('');
  const css=fs.readFileSync(path.join(__dirname,'theme.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'personality.css'),'utf8');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title data-en="DKU · Annual spending report">DKU · 年度消费报告</title><style>${css}</style></head><body>
  <header class="topbar"><div class="brand"><span class="brand-mark">D.</span><div>DKU ANNUAL EAT<small>CAMPUS LIFE, IN NUMBERS</small></div></div><div class="topbar-actions"><span class="topbar-note" data-en="Campus life / Annual spending report">校园生活 / 年度消费报告</span><button id="language-toggle" class="secondary" type="button">English</button></div></header>
  <svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${illustrations}</defs></svg>
  <nav class="report-navigation" aria-label="报告与趣味扩展" data-en-aria="Report and dining personalities"><button id="show-report" aria-pressed="true" aria-controls="report-view" data-en="Annual spending report">年度消费报告</button><button id="show-eat" aria-pressed="false" aria-controls="eat-view" data-en="EatTI · Dining personalities">EatTI · 饭格彩蛋</button></nav>

  <main class="page" id="report-view"><div class="page-heading"><div><div class="eyebrow">YOUR YEAR AT A GLANCE</div><h1><span id="report-year"></span><span id="report-heading-copy" data-en=" · A year at the table">，花在食堂的时光</span></h1><p id="period" class="muted"></p></div><div class="controls"><div><label class="sr-only" for="year-filter" data-en="Report year">报告年份</label><select id="year-filter"></select></div><div><label class="sr-only" for="month-filter" data-en="Report month">报告月份</label><select id="month-filter"></select></div><details id="range-panel" class="range-panel"><summary><span data-en="Custom date range">自定义统计日期</span><span id="range-state" class="muted"></span></summary><div class="range-body"><div class="date-fields"><div><label for="range-start" data-en="Start date">开始日期</label><input id="range-start" type="date"></div><span aria-hidden="true">—</span><div><label for="range-end" data-en="End date">结束日期</label><input id="range-end" type="date"></div></div><div class="controls"><button id="range-apply" data-en="Apply dates">应用范围</button><button id="range-clear" class="secondary" data-en="Back to year / month">恢复按年 / 月统计</button><button id="range-recent" class="secondary" data-en="Latest 30 days of data">数据最近 30 天</button><button id="range-all" class="secondary" data-en="All collected data">全部已采集</button></div><p id="range-coverage" class="muted"></p><p id="range-error" role="alert" hidden></p></div></details><button id="report-card" class="share-button" type="button" data-en="Export card">导出卡片</button><button id="report-long" class="share-button" type="button" data-en="Export long image">导出长图</button><button id="print" class="secondary print-button" data-en="Print / Save PDF">打印 / 保存 PDF</button></div></div>
  ${model.complete?'':'<p class="notice" data-en="Partial report: collection is still in progress. Amounts cover the records collected so far.">部分数据报告：采集尚未完成，以下金额不代表所选期间总额。</p>'}<noscript><p class="notice" data-en="Open this report in a browser with JavaScript to view the charts.">请在支持 JavaScript 的浏览器中打开此报告以查看图表。</p></noscript>
  <section class="kpis" aria-label="年度概览" data-en-aria="Spending overview"><div class="kpi primary"><div id="net-label" class="kpi-label">年度净消费</div><div id="net" class="kpi-value"></div><div id="net-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label" data-en="Charges">消费笔数</div><div id="count" class="kpi-value"></div><div id="count-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label" data-en="Dining counters">消费窗口</div><div id="windows" class="kpi-value"></div><div id="window-note" class="kpi-note"></div></div><div class="kpi"><div class="kpi-label" data-en="Monthly average">月均净消费</div><div id="average" class="kpi-value"></div><div id="average-note" class="kpi-note"></div></div></section>
  <div class="chart-grid"><section class="card chart-panel"><div class="section-head"><div><h2 data-en="Spending through the year">消费的月度节奏</h2><p data-en="Monthly net spending · CNY">每月净消费 · 元</p></div><div class="segmented" aria-label="图表类型" data-en-aria="Chart type"><button data-chart="bar" aria-pressed="true" data-en="Bars">柱状图</button><button data-chart="line" aria-pressed="false" data-en="Line">折线图</button></div></div><div id="monthly"></div></section><section class="card chart-panel"><div class="section-head"><div><h2 data-en="Where your money went">钱都花在哪里</h2><p data-en="Share of positive net spending by counter">各窗口正净消费占比</p></div></div><div id="distribution"></div></section></div>
  <section class="card fun-facts"><h2 id="fun-facts-summary" data-en="Little discoveries · FUN FACTS">数据里的高光时刻 · FUN FACTS</h2><div id="spending-histogram" class="amount-distribution"></div><div id="fun-facts-body" class="facts-grid"></div></section>
  <section id="spending-patterns" class="card spending-patterns" aria-label="餐饮消费分布" data-en-aria="Dining spending patterns"></section>
  <section class="card explorer"><div class="explorer-head"><div class="explorer-title"><div class="eyebrow muted">EXPLORE BY WINDOW</div><h2 id="annual-label" style="margin-top:8px"></h2></div><div><label class="control-label" for="merchant-select" data-en="Choose a counter">选择窗口</label><select id="merchant-select"></select></div></div><div id="merchant-tags" class="merchant-tags" role="group" aria-label="当年窗口标签" data-en-aria="Counters in this period"></div><div id="merchant-detail" class="explorer-body" aria-live="polite"></div></section>
  <section class="card"><div class="section-head"><div><h2 id="ranking-title" data-en="Counter ranking">窗口排行</h2><p id="ranking-count"></p></div><span class="eyebrow muted">TOTAL SPENDING</span></div><div id="ranking" class="ranking-list"></div></section>
  <details class="card records"><summary id="included-label"></summary><div id="included"></div></details><details class="card records"><summary id="excluded-label"></summary><div id="excluded"></div></details>
  </main>
  <main id="eat-view" class="eat-page" hidden aria-label="EatTI 趣味饮食人格" data-en-aria="EatTI dining personalities">
    <header class="eat-masthead"><div><div class="eat-logo">Eat <span>TI.</span></div><p id="eat-tagline"></p></div><div class="eat-edition"><span class="eat-kicker">THE FLAVOUR FILES</span><strong id="eat-edition"></strong></div></header>
    <div class="eat-toolbar"><div><span class="eat-kicker" id="eat-claim"></span><h1 id="eat-title"></h1></div><div class="controls"><div><select id="eat-year" aria-label="年份" data-en-aria="Year"></select></div><div><select id="eat-month" aria-label="月份" data-en-aria="Month"></select></div><button id="eat-card" class="share-button" type="button"></button><button id="eat-long" class="share-button" type="button"></button><button id="eat-print" class="print-button" type="button"></button></div></div>
    <p id="eat-sample" class="eat-sample" role="status"></p>
    <div id="eat-result"></div>
    <details class="eat-atlas"><summary id="eat-atlas-summary"></summary><div id="eat-gallery" class="eat-gallery"></div></details>
    <details class="eat-method"><summary id="eat-method-summary"></summary><div id="eat-method-body"></div><p id="eat-coverage"></p></details>
    ${model.complete?'':'<p class="notice" id="eat-partial">部分数据饭格：采集尚未完成，角色仅反映目前已取得的记录。</p>'}
  </main><script>${script}</script></body></html>`;
}
module.exports={reportHTML,reportModel,filterPeriod};
