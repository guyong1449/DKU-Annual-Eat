'use strict';

// A self-contained, read-only extension. Serialized into the offline report.
// Copy is available in full Chinese (with light English accents) and full English;
// the report toolbar toggles between them.
function createEatTI() {
  // Axis keys stay stable for matching; display tags carry the flavour.
  const axisTags={
    '路线':['巡饭路线','ROUTE'],
    '时段':['开饭钟点','MEAL CLOCK'],
    '花费':['消费档位','TICKET SIZE'],
    '偏好':['心头好','GO-TO'],
    '节奏':['干饭节奏','RHYTHM'],
    '日历':['周末档期','WEEKEND'],
    '时间核对':['时间边界','EDGE WATCH']
  };
  const tagOf=axis=>axisTags[axis]||[axis,''];
  const DEEP_GREEN='#1f5b46';
  const types = [
    {id:'ROAM',axis:'路线',name:'雨露均沾',en:'The Counter Hopper',quote:'主场？整个食堂',quoteEn:'Why pick just one?',story:'这家想试，那家也舍不得错过。别人有固定饭搭子，你有一整张食堂地图，走到哪儿，哪儿就可能是今日最爱。',storyEn:'You collect food counters like other people collect playlists. Why stick to one hit when the whole dining hall is on shuffle?',prop:'map',rule:'去过至少 4 个窗口，谁都不是绝对主场。',ruleEn:'At least 4 windows visited, and no absolute favourite.'},
    {id:'HOME',axis:'路线',name:'老主顾',en:'The One Spot Loyalist',quote:'认准一家，谁劝都没用',quoteEn:'Same spot. Every time.',story:'别人的午饭是选择题，你的更像填空题：还是那家。走到熟悉的窗口前，连排队都透着一种笃定。',storyEn:'You know your spot, and your spot knows the drill. Call it loyalty, call it excellent taste — either way, you\'re coming back.',prop:'shield',rule:'最常去的窗口占了 60% 以上。',ruleEn:'One window takes 60% of your swipes.'},
    {id:'MIXD',axis:'路线',name:'尝鲜客',en:'The Curious Regular',quote:'专一可以，死板不行',quoteEn:'Loyal, with a wild side.',story:'常去的窗口负责安心，偶尔换一家负责惊喜。你很懂老地方的好，也舍不得放过隔壁飘来的香味。',storyEn:'You\'ve got your reliable favorite, sure. But every now and then, curiosity wins and lunch takes an unexpected turn.',prop:'bag',rule:'有常去的窗口，也常换换口味。',ruleEn:'A usual window, plus regular detours.'},
    {id:'DAWN',axis:'时段',name:'早餐起跑员',en:'The Breakfast Believer',quote:'早饭这事，绝不迟到',quoteEn:'Breakfast gets first dibs.',story:'别人还在被窝里跟闹钟讨价还价，你已经朝早餐窗口出发。新的一天可以有很多变数，但先吃点东西这件事，你很有主见。',storyEn:'You\'re not here to romanticize mornings; you\'re here for breakfast. Whatever the day throws at you, at least it starts with a good bite.',prop:'sun',rule:'08:00–09:59 的刷卡最多。',ruleEn:'Most swipes land 08:00–09:59.'},
    {id:'NOON',axis:'时段',name:'正午干饭王',en:'The Lunch Hour MVP',quote:'到了中午，吃饭最大',quoteEn:'Noon is non-negotiable.',story:'课表再满，中午总得给饭留个位置。人一到食堂，今天最重要的会议正式开始：吃饭。',storyEn:'Classes, deadlines, group projects — whatever. When lunchtime rolls around, you know exactly where your priorities lie.',prop:'clock',rule:'11:00–13:00 的刷卡最多。',ruleEn:'Most swipes land 11:00–13:00.'},
    {id:'DUSK',axis:'时段',name:'傍晚开饭派',en:'The Dinner Devotee',quote:'忙完了？开饭！',quoteEn:'Dinner is your daily exhale.',story:'白天被课程和待办挤得满满当当，傍晚终于轮到饭香出场。端起餐盘那一刻，今天就有了个挺像样的收尾。',storyEn:'Your favorite way to wind down comes with a tray. Dinner is the part where the day\'s chaos finally takes a back seat.',prop:'bowl',rule:'17:00–19:30 的刷卡最多。',ruleEn:'Most swipes land 17:00–19:30.'},
    {id:'EDGE',axis:'时间核对',name:'错峰干饭侠',en:'The Off Peak Diner',quote:'谁规定饭要按点吃？',quoteEn:'Your clock, your cravings.',story:'午餐过了 13 点、晚餐过了 18 点半，再从容走向窗口。人潮散一点，节奏慢一点，错开最热闹的时候，这顿饭也有了自己的时区。',storyEn:'Lunch after one, or dinner after half past six: you prefer a quieter trip to the counter. With fewer people and a little more time, your meal follows its own clock.',prop:'ticket',rule:'13:01–16:59 与 18:31 之后的刷卡合计最多',ruleEn:'Swipes at 13:01–16:59 and after 18:30 together lead all meal groups'},
    {id:'SAVE',axis:'花费',name:'小额快乐家',en:'The Small Spend Pro',quote:'花得少，快乐照样满格',quoteEn:'Small bill. Solid win.',story:'账单上的数字小小的，干饭的快乐可没缩水。精打细算也是一种本事，你总能让小小一笔花得挺值。',storyEn:'You know how to keep a food run light on the wallet. Big satisfaction doesn\'t always need a big receipt.',prop:'calculator',rule:'单笔 ≤¥15 的刷卡最多。',ruleEn:'Most swipes cost ¥15 or less.'},
    {id:'JUST',axis:'花费',name:'刚刚好',en:'The Sweet Spot Expert',quote:'不上头，刚刚好',quoteEn:'Right in the sweet spot.',story:'十几二十块的一餐，是你最熟悉的舒适区。既不用为了省钱纠结半天，也不用每顿都搞出大场面，吃得自在就很不错。',storyEn:'You\'re somewhere between bargain hunting and going all out. Enough to enjoy yourself, without making a whole production out of lunch.',prop:'tray',rule:'单笔 ¥15–30 的刷卡最多。',ruleEn:'Most swipes cost between ¥15 and ¥30.'},
    {id:'TREAT',axis:'花费',name:'嚼嚼嚼',en:'The Treat Yourself Type',quote:'吃顿好的，理直气壮',quoteEn:'A little extra? Absolutely.',story:'三十块往上的单子，你刷得挺有底气。普通的一顿饭到了你这里，也值得认真安排点仪式感。',storyEn:'If you\'re getting a meal, you might as well make it count. Who says an ordinary Tuesday can\'t feel like a special occasion?',prop:'crown',rule:'单笔 ≥¥30 的刷卡占比达到 15%',ruleEn:'At least 15% of swipes cost ¥30 or more'}
  ];
  const windowTypes = [
    ['WEIGH','严肃称重中','The Plate Curator','这盘，我说了算','My plate, my rules.','夹子一拿，今日菜单就由你亲自设计。这个来一点，那个再加两块，端上秤的瞬间，才知道自己的灵感到底值几两。','You\'re the artist, and the serving tongs are your paintbrush. A little of this, a lot of that — and the scale gets the final say.','scale',/自选称重|Weigh-and-Pay/i,'自选称重'],
    ['LEAF','沙拉派','The Crunch Enthusiast','今天也要脆生生','Keep it fresh.','绿的、红的、脆的，堆成一碗看着就开心。比起轰轰烈烈的重口味，你更懂那种清清爽爽的满足感：咔嚓一口，整个人都像刷新了一遍。','Some people need a reset button. Yours comes with crunchy greens, colorful toppings, and a fork. Fresh food, fresh mood.','leaf',/轻食|沙拉|Salad/i,'轻食沙拉'],
    ['SIP','吨吨吨','The Sip Specialist','快乐，先喝一口','Sip happens.','难熬的下午，需要一个可以握在手里的小确幸。水果的甜、茶的香，或是一杯冰冰凉凉的快乐水，吸管一插，平平无奇的一天突然有了点盼头。','A good drink can turn a random Tuesday into a pretty decent day. You\'ve mastered the art of finding happiness at the bottom of a cup.','cup',/饮料水果|Juice Bar|芒疯了|茉沏|奶茶|茶饮/i,'饮料茶饮'],
    ['BAKE','咖啡面包搭子','The Caffeine Companion','今日电量，正在回升','Powered by coffee and crumbs.','咖啡香一飘过来，困意就先退了半步。再配上一口松软或酥脆的烘焙点心，早八的疲惫、下午的倦意，都有了一个香喷喷的缓冲区。','Your survival kit smells like fresh coffee and warm pastries. Some days, a little caffeine and something buttery are all the motivation you need.','bread',/咖啡|烘焙|Rolling Pin/i,'咖啡烘焙'],
    ['NOOD','我来两碗','The Slurp Therapist','烦恼先放，面先嗦','Slurp first. Think later.','有些日子，安慰不用多说，一碗热面就够了。挑起一筷子，吸溜一口，汤里的热气扑上来，好像连那些乱七八糟的心事都被顺手捋平了。','Some problems need a plan. Others just need noodles, a little steam, and one extremely satisfying slurp. You know which kind of day calls for a bowl.','noodles',/面档|面馆|面食/i,'面档'],
    ['WEST','刀叉仪式派','The Western Plate Enthusiast','今天这顿，西餐上桌','Make mine a Western plate.','牛排、意面、烤肉配土豆，西餐窗口总有你惦记的一盘。刀叉就位，酱汁拌匀，慢慢切、慢慢吃；换个口味的快乐，就藏在这一口西式风味里。','Steak, pasta, or roast meat with potatoes: the Western counter always has a plate you look forward to. Set out your knife and fork, take your time, and enjoy a change of flavour.','fork',/西式风味|Taste of the Occident/i,'西式风味'],
    ['SPICE','麻辣江湖客','The Chili Daredevil','这一碗，有点江湖气','Bring on the heat.','麻辣烫的江湖里，豆皮、丸子、蔬菜各有各的戏份。等热气腾腾的一大碗端上来，什么烦恼都先靠边站——今天的头等大事，是痛痛快快吃个过瘾。','Your idea of comfort food comes with a little kick. A steaming bowl, a generous mix of favorites, and enough flavor to make the whole afternoon feel more alive.','pepper',/麻辣烫|Malatang/i,'麻辣烫'],
    ['WOK','铁板氛围组','The Sizzle Chaser','滋啦一声，开饭信号！','Cue the sizzle.','还没看到菜，先听见一声「滋啦」。热油碰上铁板，香气跟着往外跑，连等待都变成了开饭前的预告片。你喜欢的，就是这种热热闹闹、刚出锅的鲜活劲儿。','For you, the best meals come with sound effects. That first glorious sizzle is basically a dinner bell, and the smoky, piping-hot goodness is worth the hype.','pan',/特色铁板|Teppanyaki/i,'特色铁板'],
    ['HALAL','清真常客','The Halal Flavor Fan','这一口，熟得很','You know what hits the spot.','那股熟悉的香味一出现，你就知道这顿稳了。走近清真窗口，像是跟一位老朋友碰了面，不用太多寒暄，喜欢的味道自然会替你接上话。','There\'s something special about flavors that feel like old friends. One familiar aroma, one comforting meal, and everything just falls into place.','ticket',/清真餐厅|Zartar/i,'清真餐厅'],
    ['ROAST','烧腊拼饭','The Roast Fanatic','这层油光，谁顶得住','Resistance is pointless.','烧腊最犯规的地方，是它还没入口就开始诱惑人。油亮亮的烧肉、焦香的边角、浇在米饭上的酱汁，光是想想，筷子都快拿不稳了。','You came for lunch, but the glossy, golden roasts stole the show. Crispy edges, savory sauce, and rice soaking up every last drop? Say less.','flag',/港式烧腊|烧腊/i,'港式烧腊'],
    ['SET','省心套餐','The Combo Meal Champ','搭配好了？就它！','Decision made. Lunch saved.','面对一长排选项，大脑宣布提前下班。还好套餐早已安排妥当：主食、配菜，各就各位。你只管端起餐盘，好好享受这份不用纠结的快乐。','Why turn lunch into a whole decision-making marathon? A complete meal, zero overthinking, and you\'re already on to the good part.','bento',/中式套餐/i,'中式套餐']
  ];
  for(const [id,name,en,quote,quoteEn,story,storyEn,prop,,label] of windowTypes) types.push({id,axis:'偏好',name,en,quote,quoteEn,story,storyEn,prop,rule:`${label}窗口至少刷过 4 次，且占本期消费的 15% 以上。`,ruleEn:'At least 4 swipes at this window, and 15% of your total.'});
  types.push(
    {id:'RHYT',axis:'节奏',name:'准点到场',en:'The Clockwork Diner',quote:'滴答，干饭时间到',quoteEn:'Right on cue.',story:'你的胃好像偷偷和时钟签了协议。那个熟悉的整点一到，脑海里就自动响起开饭铃，别人还在琢磨下一步干什么，你已经把吃饭安排得明明白白。',storyEn:'Your schedule has a secret recurring event: food o\'clock. No calendar invite, no reminder needed. Somehow, you always show up right on cue.',prop:'metronome',rule:'同一小时的刷卡至少 6 次，且占 25% 以上。',ruleEn:'One clock hour takes 25% of your swipes (at least 6).'},
    {id:'WEEK',axis:'日历',name:'周末觅食家',en:'The Weekend Foodie',quote:'休息日，胃不休息',quoteEn:'Weekends taste better.',story:'周末的校园慢了半拍，你的觅食雷达反而更活跃。没有课程表在后面催着跑，吃什么、什么时候吃，都能多一点自己的节奏。毕竟周末嘛，总得留点时间给好吃的。',storyEn:'While the rest of campus hits snooze, your appetite has other plans. No rush, no packed schedule — just good food and the freedom to enjoy it your way.',prop:'calendar',rule:'周六日的刷卡至少 6 次，且占比达到 20%',ruleEn:'At least 6 weekend swipes, making up 20% or more of the total'},
    {id:'PAIR',axis:'路线',name:'宠粉双窗口',en:'The Double Regular',quote:'两家都爱，怎么了？',quoteEn:'Two favorites. Zero drama.',story:'两个窗口被你排进了长期轮值表。今天宠这家，明天去那家，谁也别想独占你的饭卡。',storyEn:'Some people have one go-to. You\'ve got two headliners, and neither is playing second fiddle.',prop:'duo',rule:'两个窗口合计占了 80% 以上。',ruleEn:'The top two windows cover 80% of your swipes.'}
  );
  types.push({id:'TEA',axis:'时段',name:'午后补给',en:'The Afternoon Grazer',quote:'下午不加点，亏了',quoteEn:'Snack o\'clock is sacred.',story:'午饭已经是上半场，晚饭还没开赛。你偏偏擅长在两顿之间，给自己加一段好吃的中场休息。',storyEn:'That mid-afternoon slump never stood a chance. A little pick-me-up is practically your specialty, and your timing is impeccable.',prop:'cup',rule:'13:01–16:59 的刷卡占比达到 15%',ruleEn:'At least 15% of swipes land 13:01–16:59'});
  const shortText=value=>value.replace(/[。.]+$/,'');
  const palette=[['#044384','#e8eff8'],['#047444','#edf5e9'],['#044384','#eaf2f5'],['#047444','#e5f1eb'],['#044384','#edf0f7'],['#047444','#e6f1f0'],['#825c1d','#f5efdf']];
  types.forEach((t,i)=>{[t.color,t.tint]=palette[i%palette.length];for(const key of ['quote','quoteEn','rule','ruleEn'])t[key]=shortText(t[key]);});
  const service={open:8*60,close:19*60+30};
  const minuteOf=row=>Number(row.time.slice(11,13))*60+Number(row.time.slice(14,16));
  const slot=row=>{
    const minute=minuteOf(row);
    return minute<service.open||minute>service.close?5:minute<10*60?0:minute<11*60?1:minute<=13*60?2:minute<17*60?3:4;
  };
  const pct = (n,total) => total ? (n/total*100).toFixed(1) : '0.0';
  const money = cents => (cents/100).toFixed(2);
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Conservative name-based recognition; ambiguous shops are not treated as meals.
  const isDining = name => windowTypes.some(t=>t[8].test(name)) || /Harbour Deli|零点自选|Late Diner|餐厅|食堂/i.test(name);

  const i18n={
    zh:{
      tagline:'胃有自己的主意',
      edition:'干饭档案 · 年度番外',
      claim:'CLAIM ANOTHER YOU FROM THE RECEIPTS',
      title:'从账单里，认领另一个你',
      allYears:'全部已采集年份',allMonths:'全部月份',
      print:'打印饭格 / 保存 PDF',
      cardBtn:'导出卡片',longBtn:'导出长图',
      scopeAll:'全部年份',
      shareFooter:'DKU ANNUAL EAT · 校园卡年度消费报告',
      cardFile:'dku-eatti-card',longFile:'dku-eatti-long',
      partial:'部分数据饭格：采集尚未完成，角色仅反映目前已取得的记录。',
      introKicker:'YOUR DINING FLAVOURS · 饭格登场',
      introTitle:'你的饭格，<br>不止一面',
      introSub:'One appetite, more than one flavour.',
      receiptsKicker:'BEHIND THE SCENES · 数据幕后',
      receiptsTitle:'三组数字，还原你的饭格',
      receiptsSub:'按餐饮扣款笔数分布',
      receiptsSubAccent:'Share of dining swipes',
      stillCooking:'STILL COOKING · 还在锅里',
      cookingTitle:'饭格还在酝酿中',
      cookingCta:'换个年份，或选择「全部已采集年份」再看看。',
      noSeatKicker:'NO SEAT TODAY · 今日空席',
      noSeatTitle:'这次还没有合适的饭格',
      noSeatBody:'当前记录没凑齐可展示的角色，换个时段再看看。',
      atlasSummary:'饭格图鉴 · 25 位食堂居民',
      methodSummary:'这些饭格是怎么来的？ · HOW IT WORKS',
      method1:'饭格只读你自己采集的校园卡账单：按窗口名字认饭，充值、退款、打印不掺进来，用途不明的也不算。',
      method2:'早餐 08:00–09:59，上午加餐 10:00–10:59，午餐 11:00–13:00，下午加餐 13:01–16:59，晚餐 17:00–19:30；其余归入餐段外。午后补给和嚼嚼嚼达到 15% 即可匹配；窗口角色要在这个窗口至少刷 4 次、占比 15% 以上，其余门槛都写在图鉴里。谁达标谁上场，最多 6 位，凑不够就不凑——图个乐。',
      lineupLabel:n=>`你的 ${n} 个饮食角色`,
      introBody:n=>`25 位食堂居民里，这 ${n} 位最像你的干饭日常。`,
      cookingBody:(c,d)=>`这段时间识别到 ${c} 笔餐饮扣款，覆盖 ${d} 天。至少需要 6 笔、3 个消费日才会开匹配。`,
      sample:(scope,c,d)=>`${scope} / ${c} 笔餐饮扣款 / ${d} 个消费日`,
      coverage:(skipped,done)=>`有 ${skipped} 笔非餐饮或用途不明的扣款没有参与饭格。${done?'':'采集尚未完成，以下是部分画像。'}`,
      distLabels:['巡饭足迹','开饭钟点','消费档位'],
      timeParts:['早餐 08:00–09:59','上午加餐 10:00–10:59','午餐 11:00–13:00','下午加餐 13:01–16:59','晚餐 17:00–19:30','餐段外（08:00 前 / 19:30 后）'],
    },
    en:{
      tagline:'The stomach has plans of its own.',
      edition:'Your dining dossier',
      claim:'CLAIM ANOTHER YOU FROM THE RECEIPTS',
      title:'Claim another you from the receipts.',
      allYears:'All collected years',allMonths:'All months',
      print:'Print flavours / save PDF',
      cardBtn:'Export card',longBtn:'Export long',
      scopeAll:'All years',
      shareFooter:'DKU ANNUAL EAT · campus card annual report',
      cardFile:'dku-eatti-card',longFile:'dku-eatti-long',
      partial:'Partial-data flavours: collection is still in progress, so the cards only reflect what has been collected so far.',
      introKicker:'YOUR DINING FLAVOURS',
      introTitle:'One appetite,<br>more than one flavour.',
      introSub:'',
      receiptsKicker:'BEHIND THE SCENES',
      receiptsTitle:'Three data slices behind your flavours',
      receiptsSub:'Share of dining swipes',
      receiptsSubAccent:'',
      stillCooking:'STILL COOKING',
      cookingTitle:'Still simmering',
      cookingCta:'Try another year, or pick “All collected years”.',
      noSeatKicker:'NO SEAT TODAY',
      noSeatTitle:'No flavour match this time',
      noSeatBody:'Nothing to show for this period — try another range.',
      atlasSummary:'The atlas · 25 canteen residents',
      methodSummary:'HOW IT WORKS',
      method1:'Flavour cards read only the campus-card receipts you collected: windows are recognised by name, and recharges, refunds, printing and mystery merchants never join in.',
      method2:'Breakfast 08:00–09:59; morning bites 10:00–10:59; lunch 11:00–13:00; afternoon bites 13:01–16:59; dinner 17:00–19:30; all other times go into off hours. Afternoon and ≥¥30 characters need a 15% share. Window characters need at least 4 swipes and a 15% share — every threshold lives in the atlas. Qualifiers only, six max, no padding. Just for fun.',
      lineupLabel:n=>`Your ${n} dining characters`,
      introBody:n=>`Out of 25 canteen residents, these ${n} resemble your daily graze the most.`,
      cookingBody:(c,d)=>`${c} dining swipes across ${d} days so far — it takes 6 swipes over 3 days to start matching.`,
      sample:(scope,c,d)=>`${scope} · ${c} dining swipes · ${d} days`,
      coverage:(skipped,done)=>`${skipped} non-dining or unclear charges stayed out of the picture.${done?'':' Collection is still in progress — this is a partial portrait.'}`,
      distLabels:['Route map','Meal clock','Ticket size'],
      timeParts:['Breakfast 08:00–09:59','Morning bites 10:00–10:59','Lunch 11:00–13:00','Afternoon bites 13:01–16:59','Dinner 17:00–19:30','Off hours (before 08:00 / after 19:30)'],
    }
  };

  function analyze(included) {
    const expenses=included.filter(r=>r.cents<0), rows=expenses.filter(r=>isDining(r.merchant));
    const count=rows.length, days=new Set(rows.map(r=>r.time.slice(0,10))).size;
    const result={count,days,skipped:expenses.length-count,roles:[],candidates:[],distributions:[]};
    if(!count) return {...result,ready:false};
    const merchants=new Map(), times=Array(i18n.zh.timeParts.length).fill(0), amounts=[0,0,0];
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
    const routeParts=ranked.slice(0,5).map(([name,n])=>({zh:name,en:name,count:n}));
    if(ranked.length>5)routeParts.push({zh:`其他 ${ranked.length-5} 个餐饮窗口`,en:`${ranked.length-5} other dining counters`,count:ranked.slice(5).reduce((n,p)=>n+p[1],0)});
    result.distributions=[
      {color:types[0].color,parts:routeParts},
      {color:types[3].color,parts:i18n.zh.timeParts.map((label,i)=>({zh:label,en:i18n.en.timeParts[i],count:times[i]}))},
      {color:types[7].color,parts:['≤ ¥15','¥15–30','≥ ¥30'].map((band,i)=>({zh:band,en:band,count:amounts[i]}))}
    ];
    const distributionColors=[['#044384','#2c669e','#568ab7','#82afcf','#accbe2','#d4e5f1'],['#047444','#218855','#52a779','#80bf9c','#afdbbf','#d7ebdf'],['#044384','#689ccc','#c0d8ed']];
    result.distributions.forEach((d,i)=>d.parts.forEach((p,j)=>{p.color=distributionColors[i][j];}));
    const dates=[...new Set(rows.map(r=>r.time.slice(0,10)))].sort();
    result.years=[...new Set(dates.map(date=>date.slice(0,4)))];
    let streak=0,run=0;
    dates.forEach((date,i)=>{
      run=i&&Date.parse(date+'T00:00:00Z')-Date.parse(dates[i-1]+'T00:00:00Z')===86400000?run+1:1;
      streak=Math.max(streak,run);
    });
    result.facts={largest:rows.reduce((best,row)=>row.cents<best.cents?row:best),streak,weekends:rows.filter(r=>[0,6].includes(new Date(r.time.slice(0,10)+'T00:00:00Z').getUTCDay())).length};
    if(count<6 || days<3) return {...result,ready:false};
    const route=share>=.6?'HOME':ranked.length>=4&&share<.4?'ROAM':'MIXD';
    // Ties resolve consistently in the displayed order.
    const time=times.indexOf(Math.max(...times)), amount=amounts.indexOf(Math.max(...amounts));
    const slotZh=['早餐','上午加餐','午餐','下午加餐','晚餐','餐段外'], slotEn=['Breakfast','Morning bites','Lunch','Afternoon bites','Dinner','Off hours'];
    const role=(id,evidence,headline)=>({...types.find(t=>t.id===id),evidence:{zh:shortText(evidence.zh),en:shortText(evidence.en)},headline});
    const candidates=[
      role(route,
        {zh:`去过 ${ranked.length} 个窗口，最勤的那家「${top[0]}」占 ${pct(top[1],count)}%。`,en:`You hit ${ranked.length} windows, and “${top[0]}” leads with ${top[1]} swipes — ${pct(top[1],count)}% of the total.`},
        {zh:`${ranked.length} 个窗口 · 主场 ${pct(top[1],count)}%`,en:`${ranked.length} windows · top one ${pct(top[1],count)}%`}),
      role(['DAWN','EDGE','NOON','TEA','DUSK','EDGE'][time],
        {zh:`${i18n.zh.timeParts[time]}${time===3?'贡献了':'是你的主场：'}${times[time]} 次刷卡，占 ${pct(times[time],count)}%。`,en:`${i18n.en.timeParts[time]} accounts for ${times[time]} of your swipes — ${pct(times[time],count)}%.`},
        {zh:`${slotZh[time]} · ${pct(times[time],count)}%`,en:`${slotEn[time]} · ${pct(times[time],count)}%`}),
      role(['SAVE','JUST','TREAT'][amount],
        {zh:`${['≤ ¥15','¥15–30','≥ ¥30'][amount]} 的消费${amount===2?'有':'最多：'}${amounts[amount]} 次，占 ${pct(amounts[amount],count)}%，平均每笔 ¥${money(gross/count)}。`,en:`${amounts[amount]} swipes ${['at ¥15 or under','between ¥15 and ¥30','at ¥30 or more'][amount]} — ${pct(amounts[amount],count)}% of the total, averaging ¥${money(gross/count)}.`},
        {zh:`${['≤ ¥15','¥15–30','≥ ¥30'][amount]} · ${pct(amounts[amount],count)}%`,en:`${['≤ ¥15','¥15–30','≥ ¥30'][amount]} · ${pct(amounts[amount],count)}%`})
    ];
    // Rank qualifying candidates by support / threshold, not psychological probability.
    candidates[0].score=route==='HOME'?share/.6:route==='ROAM'?(1-share)/.6:1;
    candidates[1].score=(times[time]/count)/(time===3?.15:.2);
    candidates[2].score=(amounts[amount]/count)/(amount===2?.15:1/3);
    // Off-peak is a separate comparison across late lunch and late dinner.
    if(time===1||time===5)candidates.splice(1,1);
    const add=(id,n,threshold,evidence,headline)=>candidates.push({...role(id,evidence,headline),score:(n/count)/threshold});
    const lateDinner=rows.filter(r=>minuteOf(r)>18*60+30).length;
    const lateCount=times[3]+lateDinner;
    const dinnerOnTime=rows.filter(r=>minuteOf(r)>=17*60&&minuteOf(r)<=18*60+30).length;
    const earlyHours=rows.filter(r=>minuteOf(r)<service.open).length;
    if(lateCount&&lateCount>=Math.max(times[0],times[1],times[2],dinnerOnTime,earlyHours))add('EDGE',lateCount,.2,
      {zh:`13:01–16:59 与 18:31 之后合计 ${lateCount} 次刷卡，占 ${pct(lateCount,count)}%，在各餐段中最多`,en:`13:01–16:59 and after 18:30 total ${lateCount} swipes (${pct(lateCount,count)}%), leading all meal groups`},
      {zh:`错峰 · ${pct(lateCount,count)}%`,en:`Off peak · ${pct(lateCount,count)}%`});
    if(time!==3&&times[3]/count>=.15)add('TEA',times[3],.15,
      {zh:`${i18n.zh.timeParts[3]}贡献了 ${times[3]} 次刷卡，占 ${pct(times[3],count)}%`,en:`${i18n.en.timeParts[3]} accounts for ${times[3]} swipes — ${pct(times[3],count)}%`},
      {zh:`下午加餐 · ${pct(times[3],count)}%`,en:`Afternoon bites · ${pct(times[3],count)}%`});
    if(amount!==2&&amounts[2]/count>=.15)add('TREAT',amounts[2],.15,
      {zh:`单笔 ≥¥30 的消费有 ${amounts[2]} 次，占 ${pct(amounts[2],count)}%`,en:`${amounts[2]} swipes cost ¥30 or more — ${pct(amounts[2],count)}%`},
      {zh:`≥ ¥30 · ${pct(amounts[2],count)}%`,en:`≥ ¥30 · ${pct(amounts[2],count)}%`});
    for(const [index,w] of windowTypes.entries()) {
      const [id]=w, label=w[9], n=rows.filter(r=>w[8].test(r.merchant)).length;
      if(n>=4 && n/count>=.15) add(id,n,.15,
        {zh:`${label}窗口贡献了 ${n} 次刷卡，占 ${pct(n,count)}%。`,en:`The ${['Weigh-and-Pay','salad','drinks','coffee and bakery','noodle','Western food','Malatang','Teppanyaki','halal','Cantonese roast','Chinese combo'][index]} window served you ${n} times — ${pct(n,count)}% of your swipes.`},
        {zh:`${n} 次 · ${pct(n,count)}%`,en:`${n} swipes · ${pct(n,count)}%`});
    }
    const hours=Array(24).fill(0);
    const weekends=result.facts.weekends;
    for(const r of rows) {
      if(slot(r)!==5)hours[Number(r.time.slice(11,13))]++;
    }
    const peakHour=hours.indexOf(Math.max(...hours)), peakCount=hours[peakHour];
    if(peakCount>=6 && peakCount/count>=.25) add('RHYT',peakCount,.25,
      {zh:`${String(peakHour).padStart(2,'0')}:00 前后最热闹：${peakCount} 次刷卡，占 ${pct(peakCount,count)}%。`,en:`Around ${String(peakHour).padStart(2,'0')}:00 you logged ${peakCount} swipes — ${pct(peakCount,count)}% of the total.`},
      {zh:`${String(peakHour).padStart(2,'0')} 点档 · ${pct(peakCount,count)}%`,en:`${String(peakHour).padStart(2,'0')}:00 · ${pct(peakCount,count)}%`});
    if(weekends>=6 && weekends/count>=.2) add('WEEK',weekends,.2,
      {zh:`周末刷了 ${weekends} 次，占 ${pct(weekends,count)}%。`,en:`Weekends took ${weekends} swipes — ${pct(weekends,count)}% of your total.`},
      {zh:`周末 · ${pct(weekends,count)}%`,en:`Weekend · ${pct(weekends,count)}%`});
    if(ranked.length>=2 && share<.6 && (top[1]+ranked[1][1])/count>=.8) {
      const index=candidates.findIndex(t=>t.id==='MIXD');
      if(index!==-1)candidates.splice(index,1);
      const n=top[1]+ranked[1][1];
      add('PAIR',n,.8,
        {zh:`「${top[0]}」和「${ranked[1][0]}」两家合计 ${n} 次，占 ${pct(n,count)}%。`,en:`“${top[0]}” and “${ranked[1][0]}” together take ${n} swipes — ${pct(n,count)}%.`},
        {zh:`两窗口 · ${pct(n,count)}%`,en:`Top two · ${pct(n,count)}%`});
    }
    result.candidates=candidates.sort((a,b)=>b.score-a.score || types.findIndex(t=>t.id===a.id)-types.findIndex(t=>t.id===b.id));
    result.roles=result.candidates.slice(0,6);
    return {...result,ready:true};
  }

  function avatar(type,lang='zh') {
    const label=escape(lang==='zh'?type.name+'的小人插画':type.en+' illustration');
    return `<svg class="eat-avatar" viewBox="0 0 1 1" role="img" aria-label="${label}"><use href="#eat-character-${type.id}"/></svg>`;
  }

  // Lineup cards flip on hover (or tap); the dossier sits on the back, no waiting.
  function lineupCard(t,i,lang) {
    const name=lang==='zh'?t.name:t.en;
    return `<button type="button" class="eat-flip" style="--role:${t.color};--tint:${t.tint}" aria-expanded="false" aria-label="${escape(name)}"><span class="eat-flip-inner"><span class="eat-flip-face eat-front"><span class="eat-orbit">- ${String(i+1).padStart(2,'0')} -</span>${avatar(t,lang)}<strong>${escape(name)}</strong></span><span class="eat-flip-face eat-back"><strong class="eat-back-name">${escape(name)}</strong><span class="eat-dossier"><b>「${lang==='zh'?t.quote:t.quoteEn}」</b><i>${escape(lang==='zh'?t.headline.zh:t.headline.en)}</i></span></span></span></button>`;
  }

  function render(result,lang='zh') {
    const T=i18n[lang];
    if(!result.ready) return `<div class="eat-empty"><span class="eat-kicker">${T.stillCooking}</span><h2>${T.cookingTitle}</h2><p>${T.cookingBody(result.count,result.days)}</p><p>${T.cookingCta}</p></div>`;
    if(!result.roles.length) return `<div class="eat-empty"><span class="eat-kicker">${T.noSeatKicker}</span><h2>${T.noSeatTitle}</h2><p>${T.noSeatBody}</p></div>`;
    const lineup=result.roles.map((t,i)=>lineupCard(t,i,lang)).join('');
    const cards=result.roles.map(t=>{
      return `<article class="eat-role" style="--role:${t.color};--tint:${t.tint}"><div class="eat-card-art">${avatar(t,lang)}</div><div class="eat-card-copy"><span class="eat-card-id">${t.id}</span><h3>${lang==='zh'?t.name:t.en}</h3><p class="eat-quote">“${lang==='zh'?t.quote:t.quoteEn}”</p><p class="eat-story">${lang==='zh'?t.story:t.storyEn}</p><p class="eat-evidence">${escape(lang==='zh'?t.evidence.zh:t.evidence.en)}</p></div></article>`;
    }).join('');
    return `<section class="eat-intro"><div><span class="eat-kicker">${T.introKicker}</span><h2>${T.introTitle}</h2><p class="eat-en">${T.introSub}</p><p>${T.introBody(result.roles.length)}</p><div class="eat-badges">${result.roles.map(t=>`<span>${escape(lang==='zh'?t.name:t.en)}</span>`).join('')}</div></div><div class="eat-lineup" aria-label="${T.lineupLabel(result.roles.length)}">${lineup}</div></section>
      <div class="eat-cards">${cards}</div>
      ${distributionsHTML(result,lang)}`;
  }
  function distributionsHTML(result,lang='zh',showHeading=true){
    const T=i18n[lang];
    if(!result.count)return `<p class="empty">${lang==='zh'?'这段期间没有餐饮扣款':'No dining charges in this period'}</p>`;
    const dists=result.distributions.map((d,i)=>`<article><h3>${T.distLabels[i]}${lang==='zh'?`<small class="eat-en"> ${['ROUTE MAP','MEAL CLOCK','TICKET SIZE'][i]}</small>`:''}</h3><div class="eat-stack" aria-hidden="true">${d.parts.filter(p=>p.count).map(p=>`<span style="width:${p.count/result.count*100}%;background:${p.color}"></span>`).join('')}</div><ul>${d.parts.map(p=>`<li><span><i class="distribution-dot" style="background:${p.color}" aria-hidden="true"></i>${escape(lang==='zh'?p.zh:p.en)}</span><strong style="color:${d.color}">${pct(p.count,result.count)}% <small>· ${p.count} ${lang==='zh'?'次':'swipes'}</small></strong></li>`).join('')}</ul></article>`).join('');
    const heading=showHeading?`<div class="eat-section-title"><div><span class="eat-kicker">${T.receiptsKicker}</span><h2>${T.receiptsTitle}</h2></div><p>${T.receiptsSub}${T.receiptsSubAccent?`<span class="eat-en">${T.receiptsSubAccent}</span>`:''}</p></div>`:'';
    return `<section class="eat-distribution">${heading}<div class="eat-dist-grid">${dists}</div></section>`;
  }
  function gallery(lang='zh') {
    return types.map(t=>{const rule=lang==='zh'?t.rule:t.ruleEn;return `<article style="--role:${t.color};--tint:${t.tint}">${avatar(t,lang)}<span class="eat-card-id">${t.id}</span><h3>${lang==='zh'?t.name:t.en}</h3><p class="eat-quote">“${lang==='zh'?t.quote:t.quoteEn}”</p><p class="eat-story">${lang==='zh'?t.story:t.storyEn}</p><p class="eat-rule">${rule}</p></article>`;}).join('');
  }
  // Standalone share images embed the same illustrations as the page.
  const SVG_NS='http'+'://www.w3.org/2000/svg';
  const SHARE_FAM='Arial,Helvetica,Microsoft YaHei,PingFang SC,sans-serif';
  const SHARE_SERIF="Georgia,'Noto Serif SC','Songti SC',SimSun,serif";
  function shareCharWidth(ch,fs){
    if(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60\u3000-\u303F·—…]/.test(ch))return fs;
    if(ch===' ')return fs*.3;
    return fs*.56;
  }
  function shareWidth(text,fs,weight=400){
    let w=0;
    for(const ch of text)w+=shareCharWidth(ch,fs);
    return weight>=600?w*1.03:w;
  }
  function shareWrap(text,fs,weight,maxWidth,maxLines){
    const lines=[];let line='';
    const tokens=[];
    for(const token of String(text).match(/(?:[¥￥]\s*)?\d+(?:[.,:–/-]\d+)*%?|[A-Za-z]+(?:['’.-][A-Za-z]+)*|\s+|./gu)||[]){
      if(tokens.length&&/^[，。！？、；：.,!?;:%）)」”’]$/.test(token))tokens[tokens.length-1]+=token;
      else tokens.push(token);
    }
    for(const token of tokens){
      if(line&&shareWidth(line+token,fs,weight)>maxWidth){lines.push(line.trimEnd());line=token.trimStart();}
      else line+=token;
    }
    if(line)lines.push(line.trimEnd());
    if(lines.length>maxLines){
      const kept=lines.slice(0,maxLines);
      kept[maxLines-1]=kept[maxLines-1].replace(/[\s.。,，、!！?？;；:：…]+$/,'')+'…';
      return kept;
    }
    return lines;
  }
  function shareText(x,y,fs,weight,fill,text,options={}){
    const {anchor='',italic=false,spacing=0,family=SHARE_FAM,opacity=1}=options;
    return `<text x="${x}" y="${y}" font-family="${family}" font-size="${fs}" font-weight="${weight}" fill="${fill}"${anchor?` text-anchor="${anchor}"`:''}${italic?' font-style="italic"':''}${spacing?` letter-spacing="${spacing}"`:''}${opacity<1?` opacity="${opacity}"`:''}>${escape(text)}</text>`;
  }
  function shareAvatar(type,x,y,size,illustrations){
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1 1"><image href="${illustrations[type.id]||''}" width="1" height="1" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  function distributionShareSVG(result,lang,yOffset,options={}){
    const {blue='#044384',green='#047444',deepGreen=DEEP_GREEN,paper='#f3f6fa',muted='#526176',ink='#172641',idPrefix='eat-share'}=options;
    const height=112+Math.max(1,...result.distributions.map(d=>d.parts.length))*52;
    const parts=[`<rect x="48" y="${yOffset}" width="984" height="${height}" rx="20" fill="white"/>`];
    const push=s=>parts.push(s),en=lang==='en',alphas=[1,.84,.68,.52,.36,.2];
    if(!result.count)push(shareText(72,yOffset+95,21,400,muted,en?'No dining charges in this period':'这段期间没有餐饮扣款'));
    result.distributions.forEach((d,i)=>{
      const x=72+i*320,width=284,clipId=`${idPrefix}-${i}`;
      push(shareText(x,yOffset+42,21,500,ink,i18n[lang].distLabels[i]));
      push(`<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${yOffset+64}" width="${width}" height="12" rx="6"/></clipPath></defs><g clip-path="url(#${clipId})"><rect x="${x}" y="${yOffset+64}" width="${width}" height="12" fill="${paper}"/>`);
      let offset=0;
      d.parts.forEach((p,j)=>{
        if(!p.count)return;
        const w=width*p.count/result.count;
        push(`<rect x="${x+offset}" y="${yOffset+64}" width="${Math.max(0,w-1.5)}" height="12" fill="${i===1?green:p.color}"${i===1?` fill-opacity="${alphas[j]}"`:''}/>`);
        offset+=w;
      });
      push('</g>');
      d.parts.forEach((p,j)=>{
        const y=yOffset+112+j*52;
        push(`<rect x="${x}" y="${y-10}" width="7" height="7" rx="2" fill="${i===1?green:p.color}"${i===1?` fill-opacity="${alphas[j]}"`:''}/>`);
        const labels=i===1&&j===5?(en?['Outside meal slots','Before 08:00 / after 19:30']:['餐段外','08:00 前 / 19:30 后']):shareWrap(en?p.en:p.zh,15,400,166,2);
        labels.forEach((line,k)=>push(shareText(x+14,y+k*19,15,400,muted,line)));
        push(shareText(x+width,y,14,500,i===1?deepGreen:blue,`${pct(p.count,result.count)}% · ${p.count}`,{anchor:'end'}));
      });
    });
    return {svg:parts.join(''),height};
  }
  function shareSVG(result,lang,scope,kind,illustrations={}){
    if(!result.ready||!result.roles.length)return {svg:'',width:0,height:0};
    const T=i18n[lang],en=lang==='en',card=kind==='card';
    const NAVY='#044384',GREEN='#047444',INK='#172641',MUTED='#526176',PAPER='#f3f6fa',LINE='#dce3ec';
    const parts=[],push=s=>parts.push(s);
    const chart=distributionShareSVG(result,lang,378);
    const roleY=378+chart.height+20,columns=card?2:1,gap=24,width=card?480:984,inset=card?24:32;
    const textInset=card?inset:240,contentWidth=width-textInset-inset;
    const layouts=result.roles.map(type=>{
      const title=shareWrap(en?type.en:type.name,card?28:32,600,contentWidth,3);
      const english=en?type.id:type.en;
      const quote=shareWrap(`“${en?type.quoteEn:type.quote}”`,22,600,contentWidth,4);
      const story=shareWrap(en?type.storyEn:type.story,21,400,contentWidth,20);
      const evidence=shareWrap(en?type.evidence.en:type.evidence.zh,18,400,contentWidth,8);
      const nameY=card?272:112,englishY=(card?nameY:72)+title.length*34,quoteY=englishY+40;
      const storyY=quoteY+quote.length*30+24,dividerY=storyY+(story.length-1)*30+30,evidenceY=dividerY+34;
      return {type,title,english,quote,story,evidence,nameY,englishY,quoteY,storyY,dividerY,evidenceY,height:evidenceY+(evidence.length-1)*25+28};
    });
    let cursor=roleY;
    for(let i=0;i<layouts.length;i+=columns){
      const row=layouts.slice(i,i+columns),height=Math.max(...row.map(layout=>layout.height));
      row.forEach((layout,j)=>{layout.x=48+j*(width+gap);layout.y=cursor;layout.height=height;});
      cursor+=height+gap;
    }
    const height=cursor+50;
    push(`<rect width="1080" height="${height}" fill="${PAPER}"/>`);
    push(shareText(72,100,64,700,'#061942','Eat',{family:SHARE_SERIF,italic:true}));
    push(shareText(196,100,64,700,GREEN,'TI.',{family:SHARE_SERIF}));
    push(shareText(72,144,22,400,MUTED,T.tagline));
    const years=[...new Set(scope.match(/\b\d{4}\b/g)||result.years||[])];
    const yearLabel=years.length>1?`${years[0]}–${years.at(-1)}`:years[0]||'';
    push(shareText(1008,88,26,400,INK,yearLabel+(en?'':' 年'),{anchor:'end'}));
    push(shareText(1008,124,16,600,MUTED,'THE FLAVOUR FILES',{anchor:'end',spacing:2}));
    push(`<line x1="72" y1="174" x2="1008" y2="174" stroke="${LINE}"/>`);
    push(`<rect x="48" y="190" width="984" height="168" rx="20" fill="white"/>`);
    push(shareText(72,222,18,500,MUTED,'FUN FACTS',{spacing:2}));
    const facts=result.facts;
    const highlights=[
      [en?'Largest charge':'单笔最高',`¥ ${money(-facts.largest.cents)}`,facts.largest.time.slice(0,10)],
      [en?'Longest daily streak':'最长连续消费',`${facts.streak} ${en?'days':'天'}`,`${result.days} ${en?'active days':'个消费日'}`],
      [en?'Weekend share':'周末消费占比',`${pct(facts.weekends,result.count)}%`,`${facts.weekends} ${en?'swipes':'次'}`]
    ];
    highlights.forEach(([label,value,sub],i)=>{
      const x=72+i*320;
      push(shareText(x,256,18,400,MUTED,label));
      push(shareText(x,298,28,500,i===1?GREEN:NAVY,value));
      push(shareText(x,330,16,400,MUTED,sub));
    });
    push(chart.svg);
    layouts.forEach((layout,index)=>{
      const {type:t,x,y}=layout,tx=x+textInset;
      const tint=t.color===GREEN?'rgba(4,116,68,.07)':t.tint;
      push(`<rect x="${x}" y="${y}" width="${width}" height="${layout.height}" rx="28" fill="${tint}" stroke="${LINE}"/>`);
      push(shareAvatar(t,card?x+(width-184)/2+32:x+28,card?y+22:y+(layout.height-176)/2,card?184:176,illustrations));
      push(shareText(tx,y+(card?236:72),18,400,t.color,t.id,{spacing:2}));
      if(!card)push(shareText(x+width-28,y+50,32,500,'#d5deea',String(index+1).padStart(2,'0'),{anchor:'end',family:SHARE_SERIF,italic:true}));
      layout.title.forEach((line,j)=>push(shareText(tx,y+layout.nameY+j*34,card?28:32,600,t.color,line)));
      if(!en)push(shareText(card?tx:x+width-inset,y+layout.englishY,18,400,MUTED,layout.english,{opacity:.65,anchor:card?'':'end'}));
      layout.quote.forEach((line,j)=>push(shareText(card?tx:x+width-inset,y+layout.quoteY+j*30,22,600,t.color,line,{anchor:card?'':'end'})));
      layout.story.forEach((line,j)=>push(shareText(tx,y+layout.storyY+j*30,21,400,INK,line)));
      push(`<line x1="${tx}" y1="${y+layout.dividerY}" x2="${x+width-inset}" y2="${y+layout.dividerY}" stroke="${t.color}" stroke-dasharray="3 3"/>`);
      layout.evidence.forEach((line,j)=>push(shareText(tx,y+layout.evidenceY+j*25,18,400,MUTED,line)));
    });
    push(shareText(540,height-24,18,400,MUTED,T.shareFooter,{anchor:'middle',spacing:2}));
    return {svg:`<svg xmlns="${SVG_NS}" width="1080" height="${height}" viewBox="0 0 1080 ${height}">${parts.join('')}</svg>`,width:1080,height};
  }

  return {types,axisTags,tagOf,service,isDining,analyze,avatar,render,distributionsHTML,gallery,distributionShareSVG,shareSVG,i18n};
}

function personalityApp(model,eat,language,saveImage,range,imageExports) {
  const $=id=>document.getElementById(id);
  let year=model.years.at(-1)?.year||'',month='',lang=language.lang,latest={ready:false,count:0,days:0,roles:[],distributions:[]};
  // Tap-to-flip for touch and keyboard: hover handles pointer devices, click toggles.
  const deck=$('eat-result');
  if(deck.addEventListener)deck.addEventListener('click',event=>{
    const card=event.target && event.target.closest ? event.target.closest('.eat-flip') : null;
    if(!card)return;
    card.classList.toggle('eat-flipped');
    card.setAttribute('aria-expanded',card.classList.contains('eat-flipped')?'true':'false');
  });
  function chrome() {
    const T=eat.i18n[lang];
    $('eat-tagline').textContent=T.tagline;$('eat-edition').textContent=T.edition;
    $('eat-claim').textContent=T.claim;$('eat-title').textContent=T.title;
    $('eat-card').textContent=T.cardBtn;$('eat-long').textContent=T.longBtn;$('eat-print').textContent=T.print;
    $('eat-atlas-summary').textContent=T.atlasSummary;
    $('eat-method-summary').textContent=T.methodSummary;
    $('eat-method-body').innerHTML=`<p>${T.method1}</p><p>${T.method2}</p>`;
    const partial=$('eat-partial');
    if(partial)partial.textContent=T.partial;
  }
  function render() {
    const included=range.current?model.years.flatMap(y=>y.included).filter(r=>r.time.slice(0,10)>=range.current.start&&r.time.slice(0,10)<=range.current.end):model.years.filter(y=>!year||y.year===year).flatMap(y=>y.included).filter(r=>!month||r.time.slice(5,7)===month);
    $('eat-year').disabled=!!range.current;$('eat-month').disabled=!!range.current||!year;
    const result=eat.analyze(included);
    const T=eat.i18n[lang];
    $('eat-result').innerHTML=eat.render(result,lang);
    latest=result;
    $('eat-gallery').innerHTML=eat.gallery(lang);
    $('eat-sample').textContent=T.sample(scopeText(),result.count,result.days);
    $('eat-coverage').textContent=T.coverage(result.skipped,model.complete);
  }
  function months() {
    const T=eat.i18n[lang];
    const keys=year?model.years.find(y=>y.year===year).months.map(([m])=>m.slice(5)):[];
    $('eat-month').innerHTML=`<option value="">${T.allMonths}</option>`+keys.map(m=>`<option value="${m}">${Number(m)} ${lang==='zh'?'月':''}</option>`).join('');
    $('eat-month').value=month;$('eat-month').disabled=!year;
    $('eat-year').innerHTML=`<option value="">${T.allYears}</option>`+[...model.years].reverse().map(y=>`<option value="${y.year}">${y.year}${lang==='zh'?' 年':''}</option>`).join('');
    $('eat-year').value=year;
  }
  function scopeText(){return range.current?`${range.current.start} — ${range.current.end}`:year?(lang==='zh'?year+' 年'+(month?' '+Number(month)+' 月':''):year+(month?'-'+month:'')):eat.i18n[lang].scopeAll;}
  function downloadImage(kind){
    if(!latest.ready)return;
    const illustrations=Object.fromEntries(eat.types.map(type=>[type.id,$('eat-character-'+type.id).getAttribute('href')]));
    const share=eat.shareSVG(latest,lang,scopeText(),kind,illustrations);
    if(!share.svg)return;
    return imageExports.run('eat-'+kind,$('eat-'+kind),()=>saveImage(share,(kind==='card'?eat.i18n[lang].cardFile:eat.i18n[lang].longFile)+`-${range.current?range.current.start+'_'+range.current.end:(year||'all')+(month?'-'+month:'')}.png`));
  }
  $('eat-card').onclick=()=>downloadImage('card');
  $('eat-long').onclick=()=>downloadImage('long');
  $('eat-print').onclick=()=>window.print();

  function show(fun) {
    $(fun?'eat-card':'report-card').before($('range-panel'));
    $('report-view').hidden=fun;$('eat-view').hidden=!fun;
    $('show-report').setAttribute('aria-pressed',String(!fun));$('show-eat').setAttribute('aria-pressed',String(fun));
  }
  $('show-report').onclick=()=>show(false);$('show-eat').onclick=()=>show(true);
  $('eat-year').onchange=()=>{year=$('eat-year').value;month='';months();render();};
  $('eat-month').onchange=()=>{month=$('eat-month').value;render();};
  language.onChange(()=>{lang=language.lang;chrome();months();render();});
  range.onChange(()=>{months();render();});
  chrome();months();render();show(false);
}

module.exports={createEatTI,personalityApp};
