'use strict';

// A self-contained, read-only extension. Serialized into the offline report.
function createEatTI() {
  const types = [
    {id:'ROAM',axis:'路线',name:'食堂探险家',quote:'胃已开启全图探索，禁止原地刷新。',story:'别人的校园地图标教学楼，你的地图标哪里能吃。窗口多到像在集邮，每刷一次卡，胃里的探险队就插下一面小旗：这片食堂，朕来过！',color:'#236b56',tint:'#e6eee0',prop:'map',rule:'至少 4 个餐饮窗口，且最常去窗口的笔数占比低于 40%。'},
    {id:'HOME',axis:'路线',name:'本命窗口守护者',quote:'菜单可以换季，本命窗口不能换籍。',story:'账单翻来覆去，总有那个熟悉的窗口出镜。照这个出场率，它该给你颁个常驻嘉宾证了。别问今天去哪吃，导航已经懒得重新计算路线。',color:'#236b56',tint:'#e6eee0',prop:'shield',rule:'最常去窗口的笔数占比达到 60%。'},
    {id:'MIXD',axis:'路线',name:'熟路漫游者',quote:'根据地不能丢，新菜单也不能放过。',story:'熟悉的窗口负责兜底，临时起意负责加戏。你的胃像一个有编制的探险家：平时按路线巡逻，偶尔出门考察，吃完还知道回家。',color:'#236b56',tint:'#e6eee0',prop:'bag',rule:'未达到「守护者」或「探险家」条件的路线组合。'},
    {id:'DAWN',axis:'时段',name:'早餐开机员',quote:'八点食堂开门，我的胃抢先登录。',story:'你的饭票常在早餐时段打卡。别人还在加载今天，你的胃已经按下启动键：叮，开饭成功！这一天的第一场重要会议，地点在餐盘旁边。',color:'#047444',tint:'#edf5e9',prop:'sun',rule:'08:00–09:59 的餐饮扣款笔数最多。'},
    {id:'NOON',axis:'时段',name:'午饭准点选手',quote:'上午可以有变数，中午必须有饭数。',story:'午间记录在你的账单里稳坐主场。仿佛上午的一切都在为这一刻铺垫：电脑可以稍后响应，胃发来的会议邀请必须优先处理。议题只有一个——开饭。',color:'#047444',tint:'#edf5e9',prop:'clock',rule:'10:00–13:59 的餐饮扣款笔数最多。'},
    {id:'DUSK',axis:'时段',name:'日落干饭家',quote:'夕阳负责落山，我负责干饭收官。',story:'傍晚饭票高频出镜，像给一天安排了固定大结局。晚霞在天上营业，你的胃在食堂续订下一集：今日份折腾到此为止，接下来请碳水发表总结陈词！',color:'#047444',tint:'#edf5e9',prop:'bowl',rule:'16:00–19:30 的餐饮扣款笔数最多（包含 19:30 这一分钟）。'},
    {id:'EDGE',axis:'时间核对',name:'边界时间观察员',quote:'食堂打烊了，这张小票还在加戏？',story:'有些记录的时间跑到了营业范围外，连小票侦探都扶了扶眼镜：这集有伏笔！先核对交易时间和窗口安排，真相揭晓前，暂不授予你半夜翻墙干饭的虚构勋章。',color:'#044384',tint:'#e8eff8',prop:'ticket',rule:'08:00 前或 19:30 后的餐饮扣款笔数最多；仅标注时间边界，不解读为夜宵或早饭。'},
    {id:'SAVE',axis:'花费',name:'饭票精算师',quote:'饭票走小额路线，快乐申请超大份。',story:'小额扣款在账单里排起长队，像一支轻装上阵的干饭特种队。可能是饮料、小食，也可能是简餐；金额不大，出场很勤，主打一个把日常拆成好多口快乐。',color:'#685294',tint:'#ece5f4',prop:'calculator',rule:'单笔不超过 ¥15 的餐饮扣款笔数最多。'},
    {id:'JUST',axis:'花费',name:'刚刚好享食家',quote:'胃说可以，钱包说这集我也能看。',story:'你的常见饭票落在中间档，像胃和钱包开完会后的联合声明：今日方案通过，双方暂无补充意见。点单现场自带一种稳稳拿捏、刚好开饭的从容。',color:'#685294',tint:'#ece5f4',prop:'tray',rule:'单笔高于 ¥15、低于 ¥30 的餐饮扣款笔数最多。'},
    {id:'TREAT',axis:'花费',name:'犒劳自己派',quote:'请注意，饭票里的大场面正在入场。',story:'较高金额的扣款经常登场，小票都像自带红毯。可能是给自己加戏，也可能是一起结账；账单只知道金额比较有排面，至于谁是这顿的主角，得听你现场解说。',color:'#685294',tint:'#ece5f4',prop:'crown',rule:'单笔至少 ¥30 的餐饮扣款笔数最多。'}
  ];
  const windowTypes = [
    ['WEIGH','称重建筑师','一夹一铲，给餐盘盖个三室一厅。','称重窗口是你的高频施工现场：这里打地基，那里封个顶，最后再给配菜留个观景位。秤是监理，夹子是吊车，今天这盘饭有没有超预算，上秤见分晓。','scale',/自选称重|Weigh-and-Pay/i],
    ['LEAF','轻食花园长','别人端饭，我端一座迷你植物园。','轻食沙拉窗口在账单里反复露脸，仿佛你的饭卡办了花园年票。脑内小剧场已经响起园长广播：各位叶片请站好，沙拉酱即将进场！具体种了什么，账单暂不剧透。','leaf',/轻食|沙拉|Salad/i],
    ['SIP','饮料续杯官','杯子一到手，今日支线任务就有了。','饮料水果和茶饮窗口常来账单里串门，存在感堪比固定片尾彩蛋。仿佛走两步就触发支线：前方发现补给点！至于杯里装什么、要几分甜，饭卡负责保密。','cup',/饮料水果|Juice Bar|芒疯了|茉沏|奶茶|茶饮/i],
    ['BAKE','咖啡烘焙驻民','闻到香气，导航自动重新规划路线。','咖啡烘焙窗口在你的账单里像个常用书签。脑内雷达一响：附近出现香气，请求靠站！面包和咖啡谁是主角暂且不论，这个窗口的出镜率已经够拍连续剧了。','bread',/咖啡|烘焙|Rolling Pin/i],
    ['NOOD','面档牵挂人','生活千头万绪，先来一碗捋捋。','面档反复出现在账单里，像一部迟迟不舍得完结的追更作品。现实的线头太多，胃里的编剧只想先安排熟悉窗口登场：今日剧情请沿着筷子方向展开。','noodles',/面档|面馆|面食/i],
    ['WEST','西式换台手','高帽一戴，食堂频道切到西餐台。','西式窗口在你的路线里反复返场，牛排小剧场当场开演：主厨帽升起，叉子准备，今日份仪式感申请登台！角色负责摆造型，你到底点了什么，账单留作悬念。','fork',/西式风味|Taste of the Occident/i],
    ['SPICE','麻辣召唤师','窗口一出现，脑内自动响起战斗曲。','麻辣烫窗口在你的账单里存在感拉满，仿佛每次刷卡都能召唤一支配菜战队。海带请就位，丸子请报数！这只是角色的小剧场，真实辣度和阵容，只有你有发布权。','pepper',/麻辣烫|Malatang/i],
    ['WOK','铁板现场听众','滋啦一声，今日开饭演唱会正式开始。','铁板窗口反复登场，像是你的常驻演出场馆。锅铲当指挥，铁板当舞台，香气负责气氛组；还没等小票谢幕，脑内观众已经举起筷子喊安可。','pan',/特色铁板|Teppanyaki/i],
    ['HALAL','清真窗口常客','这条去窗口的路，导航见了都想下班。','这个窗口在账单里反复签到，熟悉程度堪比校园里的老坐标。要给饭卡拍纪录片，这里少说也得有个专属机位：各位观众，我们又到这一站了！','ticket',/清真餐厅|Zartar/i],
    ['ROAST','烧腊应援团','应援不打榜，路过刷一张。','烧腊窗口收到了你一连串刷卡应援，账单快排成演唱会签到墙。脑内横幅已经拉好：今日主角，请闪亮登场！至于具体为谁举筷，这份饭票决定保留神秘感。','flag',/港式烧腊|烧腊/i],
    ['SET','套餐省心官','选择题做到头了，这顿直接交套餐卷。','中式套餐窗口经常出现在你的路线里，像给纠结现场派来一位救援队长。选项已经组好队，饭卡只需到场盖章：本次点单会议提前结束，请各位立即进入开饭环节。','bento',/中式套餐/i]
  ];
  for(const [id,name,quote,story,prop] of windowTypes) types.push({id,axis:'偏好',name,quote,story,prop,color:'#396b80',tint:'#e2edf0',rule:'对应餐饮窗口至少 4 笔，且占本期餐饮扣款的 15% 以上（含 15%）。'});
  types.push(
    {id:'RHYT',axis:'节奏',name:'生物饭钟',quote:'闹钟还没响，胃已经在门口穿鞋了。',story:'你的刷卡记录在某个小时特别扎堆，像胃偷偷承包了报时业务。到了那个时间段，脑内广播准时上线：各部门注意，开饭议程即将开始，请无关纠结暂时退场。',color:'#9a514e',tint:'#f4e4dd',prop:'metronome',rule:'营业时段内同一整点小时段至少 6 笔，且占本期餐饮扣款的 50% 以上（含 50%）。'},
    {id:'WEEK',axis:'日历',name:'周末饭搭子',quote:'周末可以放假，食堂支线不能断更。',story:'周六日的小票在记录里相当活跃，像给周末装了固定更新提醒。闹钟休息了，饭卡还在认真营业：本周特别篇上线，主演是你，取景地还是熟悉的食堂。',color:'#9a514e',tint:'#f4e4dd',prop:'calendar',rule:'周六日餐饮扣款至少 6 笔，且占本期餐饮扣款的 40% 以上（含 40%）。'},
    {id:'PAIR',axis:'路线',name:'双窗口轮班长',quote:'两大窗口轮流上桌，我端水端得很忙。',story:'两个窗口承包了大部分账单，像一档双主角长期连载。今天谁先出场，胃里的选角导演正在开会。路线不用太复杂，两位老搭档已经把食堂宇宙撑得热热闹闹。',color:'#236b56',tint:'#e6eee0',prop:'duo',rule:'最常去的两个窗口合计占比至少 80%，且单个窗口均低于 60%；替代同样符合的「熟路漫游者」。'}
  );
  types.push({id:'TEA',axis:'时段',name:'下午加餐搭子',quote:'午饭刚退场，胃：要不加个番外？',story:'下午时段的饭票最抢镜，像给午饭和晚饭之间硬塞了一集特别篇。时间还没走到晚餐，胃里的编剧已经举手：我这里还有个小故事，需要一个窗口配合出演。',prop:'cup',rule:'14:00–15:59 的餐饮扣款笔数最多。'});
  for(const t of types) {
    const green=['时段','节奏','日历'].includes(t.axis);
    t.color=green?'#047444':'#044384';t.tint=green?'#edf5e9':'#e8eff8';
  }
  const service={open:8*60,close:19*60+30};
  const slot=row=>{
    const minute=Number(row.time.slice(11,13))*60+Number(row.time.slice(14,16));
    return minute<service.open||minute>service.close?4:minute<10*60?0:minute<14*60?1:minute<16*60?2:3;
  };
  const pct = (n,total) => total ? (n/total*100).toFixed(1) : '0.0';
  const money = cents => (cents/100).toFixed(2);
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Conservative name-based recognition; ambiguous shops are not treated as meals.
  const isDining = name => windowTypes.some(t=>t[5].test(name)) || /Harbour Deli|零点自选|Late Diner|餐厅|食堂/i.test(name);

  function analyze(included) {
    const expenses=included.filter(r=>r.cents<0), rows=expenses.filter(r=>isDining(r.merchant));
    const count=rows.length, days=new Set(rows.map(r=>r.time.slice(0,10))).size;
    const result={count,days,skipped:expenses.length-count,roles:[],candidates:[],distributions:[]};
    if(count<6 || days<3) return {...result,ready:false};
    const merchants=new Map(), times=[0,0,0,0,0], amounts=[0,0,0];
    let gross=0;
    for(const row of rows) {
      merchants.set(row.merchant,(merchants.get(row.merchant)||0)+1);
      const cents=-row.cents;
      times[slot(row)]++;
      amounts[cents<=1500?0:cents<3000?1:2]++;
      gross+=cents;
    }
    const ranked=[...merchants].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const top=ranked[0], share=top[1]/count;
    const route=share>=.6?'HOME':ranked.length>=4&&share<.4?'ROAM':'MIXD';
    // Ties resolve consistently in the displayed order, and are disclosed below.
    const time=times.indexOf(Math.max(...times)), amount=amounts.indexOf(Math.max(...amounts));
    const timeNames=['早餐 08:00–09:59','午餐 10:00–13:59','下午加餐 14:00–15:59','晚餐 16:00–19:30','营业时段外（早于 08:00 / 晚于 19:30）'];
    const amountNames=['≤ ¥15','¥15–30（不含端点）','≥ ¥30'];
    const role=(id,evidence,note)=>({...types.find(t=>t.id===id),evidence,note});
    const candidates=[
      role(route,`去过 ${ranked.length} 个餐饮窗口；最常去的「${top[0]}」有 ${top[1]} 笔，占 ${pct(top[1],count)}%。`,`窗口数按账单名称计算，不等于菜品种类。`),
      role(['DAWN','NOON','TEA','DUSK','EDGE'][time],`${timeNames[time]}有 ${times[time]} 笔，占 ${pct(times[time],count)}%，是记录最多的时段。`,times.filter(n=>n===times[time]).length>1?'存在并列，按早餐、午餐、下午加餐、晚餐、营业时段外顺序展示。':'按 08:00–19:30 营业范围划分；刷卡时间不等于实际进餐时间。'),
      role(['SAVE','JUST','TREAT'][amount],`${amountNames[amount]} 的饭票有 ${amounts[amount]} 笔，占 ${pct(amounts[amount],count)}%；单笔平均 ¥${money(gross/count)}。`,amounts.filter(n=>n===amounts[amount]).length>1?'存在并列，按低、中、高金额档顺序展示。':'按扣款原额分档；饮品、小食和代付也可能在内，不等于每餐花费。')
    ];
    // Rank qualifying candidates by support / threshold, not psychological probability.
    candidates[0].score=route==='HOME'?share/.6:route==='ROAM'?(1-share)/.6:1;
    candidates[1].score=(times[time]/count)/.2;
    candidates[2].score=(amounts[amount]/count)/(1/3);
    const add=(id,n,threshold,evidence,note)=>candidates.push({...role(id,evidence,note),score:(n/count)/threshold});
    for(const [id,,,,,pattern] of windowTypes) {
      const n=rows.filter(r=>pattern.test(r.merchant)).length;
      if(n>=4 && n/count>=.15) add(id,n,.15,`对应窗口有 ${n} 笔餐饮扣款，占 ${pct(n,count)}%；达到至少 4 笔、占比 15% 的条件。`,'只依据商户名称识别窗口偏好，不代表购买了某种食品，也不推断健康或宗教信仰。');
    }
    const hours=Array(24).fill(0);
    let weekends=0;
    for(const r of rows) {
      if(slot(r)!==4)hours[Number(r.time.slice(11,13))]++;
      const day=new Date(r.time.slice(0,10)+'T00:00:00Z').getUTCDay();
      if(day===0||day===6)weekends++;
    }
    const peakHour=hours.indexOf(Math.max(...hours)), peakCount=hours[peakHour];
    if(peakCount>=6 && peakCount/count>=.5) add('RHYT',peakCount,.5,`${String(peakHour).padStart(2,'0')}:00–${String(peakHour).padStart(2,'0')}:${peakHour===19?'30':'59'} 有 ${peakCount} 笔，占 ${pct(peakCount,count)}%。`,'仅计营业时段内的记录；时段集中不等于每天准时就餐。');
    if(weekends>=6 && weekends/count>=.4) add('WEEK',weekends,.4,`周六日共 ${weekends} 笔餐饮扣款，占 ${pct(weekends,count)}%。`,'按账单日期计算周末，不判断是否为节假日或是否住校。');
    if(ranked.length>=2 && share<.6 && (top[1]+ranked[1][1])/count>=.8) {
      const index=candidates.findIndex(t=>t.id==='MIXD');
      if(index!==-1)candidates.splice(index,1);
      const n=top[1]+ranked[1][1];
      add('PAIR',n,.8,`「${top[0]}」和「${ranked[1][0]}」合计 ${n} 笔，占 ${pct(n,count)}%；最常去的单个窗口占 ${pct(top[1],count)}%。`,'两个窗口常出现，不表示实际按天轮流就餐。');
    }
    result.candidates=candidates.sort((a,b)=>b.score-a.score || types.findIndex(t=>t.id===a.id)-types.findIndex(t=>t.id===b.id));
    result.roles=result.candidates.slice(0,6);
    result.distributions=[
      {label:'路线足迹',color:types[0].color,parts:[{label:top[0],count:top[1]},{label:'其他餐饮窗口',count:count-top[1]}]},
      {label:'开饭时区',color:types[3].color,parts:timeNames.map((label,i)=>({label,count:times[i]}))},
      {label:'饭票面额',color:types[7].color,parts:amountNames.map((label,i)=>({label,count:amounts[i]}))}
    ];
    return {...result,ready:true};
  }

  // Crop the generated atlas at its actual transparent gutters; preserve the PNG.
  function avatar(type) {
    if(type.id==='WEST') return `<svg class="eat-avatar" viewBox="0 0 1 1" role="img" aria-label="${escape(type.name)}的小人插画"><use href="#eat-character-western"/></svg>`;
    const index=types.findIndex(t=>t.id===type.id);
    const row=Math.floor(index/5), col=index%5, gutters=[0,270,507,757,997,1254];
    const columns=[[0,250,520,752,1003,1254],[0,250,501,735,1012,1254],[0,254,535,752,1003,1254],[0,250,519,752,1003,1254],[0,250,501,736,1005,1254]][row];
    const x=columns[col], y=gutters[row], width=columns[col+1]-x, height=gutters[row+1]-y;
    const frame=`${x} ${y} ${width} ${height}`;
    return `<svg class="eat-avatar" viewBox="${frame}" role="img" aria-label="${escape(type.name)}的小人插画"><svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${frame}" overflow="hidden"><use href="#eat-character-atlas"/></svg></svg>`;
  }

  function render(result) {
    if(!result.ready) return `<div class="eat-empty"><span class="eat-kicker">STILL COOKING</span><h2>饭格还在酝酿中</h2><p>这段时间识别到 ${result.count} 笔餐饮扣款，覆盖 ${result.days} 天。至少需要 6 笔、3 个消费日，才能开始匹配角色。</p><p>换个年份，或选择「全部已采集年份」再看看。</p></div>`;
    if(!result.roles.length) return '<div class="eat-empty"><h2>这次还没有合适的饭格</h2><p>当前记录未匹配到合适角色，暂不展示角色卡片。</p></div>';
    return `<section class="eat-intro"><div><span class="eat-kicker">YOUR DINING FLAVOURS</span><h2>你的饭格，<br>不止一面。</h2><p>${types.length} 位食堂居民里，<br>这 ${result.roles.length} 位最像你的干饭日常。</p><div class="eat-badges">${result.roles.map(t=>`<span>${escape(t.name)}</span>`).join('')}</div></div><div class="eat-lineup" aria-label="你的 ${result.roles.length} 个饮食角色">${result.roles.map((t,i)=>`<div style="--role:${t.color};--tint:${t.tint}"><span class="eat-orbit">${String(i+1).padStart(2,'0')} / ${t.axis}</span>${avatar(t)}<strong>${t.id}</strong></div>`).join('')}</div></section>
      <div class="eat-section-title"><h2>你的干饭搭子，其实都是你</h2><span>本次匹配 ${result.roles.length} 位 · 最多展示 6 位，不凑数</span></div>
      <div class="eat-cards">${result.roles.map((t,i)=>`<article class="eat-role" style="--role:${t.color};--tint:${t.tint}"><div class="eat-card-art"><span class="eat-role-code">${t.id}</span><span class="eat-role-axis">${t.axis}角色</span>${avatar(t)}</div><div class="eat-card-copy"><span class="eat-kicker">FLAVOUR ${String(i+1).padStart(2,'0')}</span><h3>${t.name}</h3><p class="eat-quote">“${t.quote}”</p><p>${t.story}</p><details><summary>为什么匹配到我？</summary><p class="eat-evidence">${escape(t.evidence)}</p><p>${escape(t.rule)}</p><p>${escape(t.note)}</p></details></div></article>`).join('')}</div>
      <section class="eat-distribution"><div class="eat-section-title"><div><span class="eat-kicker">THE RECEIPTS SAY</span><h2>饭格背后的三张小票</h2></div><p>按餐饮扣款笔数分布</p></div><div class="eat-dist-grid">${result.distributions.map(d=>`<article><h3>${d.label}</h3><div class="eat-stack" aria-hidden="true">${d.parts.map((p,i)=>`<span style="width:${p.count/result.count*100}%;background:${d.color};opacity:${1-i*.15}"></span>`).join('')}</div><ul>${d.parts.map(p=>`<li><span>${escape(p.label)}</span><strong>${pct(p.count,result.count)}% <small>· ${p.count} 笔</small></strong></li>`).join('')}</ul></article>`).join('')}</div><p class="eat-fine">每张小票各自合计 100%（四舍五入可能有误差）。这是你的消费记录分布，不是性格概率或全校人群排名。</p></section>`;
  }
  function gallery() {
    return types.map(t=>`<article style="--role:${t.color};--tint:${t.tint}">${avatar(t)}<span>${t.id} · ${t.axis}</span><h3>${t.name}</h3><p>${t.rule}</p></article>`).join('');
  }
  return {types,service,isDining,analyze,avatar,render,gallery};
}

function personalityApp(model,create) {
  const eat=create(), $=id=>document.getElementById(id);
  let year='',month='';
  function render() {
    const included=model.years.filter(y=>!year||y.year===year).flatMap(y=>y.included).filter(r=>!month||r.time.slice(5,7)===month);
    const result=eat.analyze(included);
    $('eat-result').innerHTML=eat.render(result);
    $('eat-sample').textContent=`${year?year+' 年':'全部已采集年份'}${month?' · '+Number(month)+' 月':''} / ${result.count} 笔餐饮扣款 / ${result.days} 个消费日`;
    $('eat-coverage').textContent=`数据范围 ${model.start} — ${model.end}。本次有 ${result.skipped} 笔非餐饮或无法确认用途的扣款未参与饭格。${model.complete?'':'采集未完成，当前只是部分数据画像。'}`;
  }
  function months() {
    const keys=year?model.years.find(y=>y.year===year).months.map(([m])=>m.slice(5)):[];
    $('eat-month').innerHTML='<option value="">全部月份</option>'+keys.map(m=>`<option value="${m}">${Number(m)} 月</option>`).join('');
    $('eat-month').value='';$('eat-month').disabled=!year;
  }
  function show(fun) {
    $('report-view').hidden=fun;$('eat-view').hidden=!fun;
    $('show-report').setAttribute('aria-pressed',String(!fun));$('show-eat').setAttribute('aria-pressed',String(fun));
  }
  $('show-report').onclick=()=>show(false);$('show-eat').onclick=()=>show(true);
  $('eat-year').innerHTML='<option value="">全部已采集年份</option>'+[...model.years].reverse().map(y=>`<option value="${y.year}">${y.year} 年</option>`).join('');
  $('eat-year').onchange=()=>{year=$('eat-year').value;month='';months();render();};
  $('eat-month').onchange=()=>{month=$('eat-month').value;render();};
  $('eat-print').onclick=()=>window.print();
  $('eat-gallery').innerHTML=eat.gallery();
  months();render();show(false);
}

module.exports={createEatTI,personalityApp};
