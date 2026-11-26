'use strict';
const $ = id => document.getElementById(id);
const language = createLanguage(), t = language.t;
const today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
let state, signature = '', polling, importResult;
function collectionError(message) {
  const english={
    '分页出现重复交易号，可能有新交易插入，请重新采集':'Transaction pages overlap, possibly because new records were added. Start collection again.',
    '采集期间记录发生变化，请重新采集':'Transactions changed during collection. Start collection again.',
    '校园卡标签页已关闭，请重新采集':'The campus card tab was closed. Start collection again.',
    '采集期间页面发生跳转或刷新，请完成登录后重新采集':'The campus tab was refreshed or navigated away. Finish signing in and start collection again.',
    '等待登录超过 10 分钟，请重新采集':'Sign-in timed out after 10 minutes. Start collection again.',
    '采集超过 30 分钟，请缩小范围后重试':'Collection timed out after 30 minutes. Choose a shorter date range.',
    '已有采集任务，请先等待完成或取消':'A collection is already running. Wait for it to finish or cancel it.',
    '连接中断或登录已过期，请刷新校园卡页面并完成登录后重试':'The connection was interrupted or sign-in expired. Refresh the campus tab, sign in, and try again.',
    '采集尚未完成，未保存部分报告':'Collection is incomplete. No partial report was saved.',
    '请选择本工具导出的 DKU JSON 数据':'Choose a DKU JSON file exported by this tool.',
    '页码或总页数发生变化，请重新采集':'The page number or total page count changed. Start collection again.',
    '中间页记录不完整，已停止采集':'A transaction page is incomplete. Collection stopped.',
    '出现空页，已停止采集':'An unexpected empty transaction page was returned. Collection stopped.',
    '未返回交易表格。请刷新校园卡页面并完成登录后重试。':'No transaction table was returned. Refresh the campus tab, sign in, and try again.',
    '学校交易表头已变化，已停止采集':'The campus transaction columns changed. Collection stopped.',
    '查询超过 20 秒，请稍后重试':'The campus query timed out after 20 seconds. Try again later.'
  };
  return t(message,english[message]||message);
}
function years() {
  const selected = $('year').value || today.slice(0,4);
  $('year').replaceChildren();
  for (const [value,label] of [['all',t('全部年份（2022 年至今）','All years (2022–present)')],
    ...Array.from({length:Number(today.slice(0,4))-2021},(_,i) => {const y=Number(today.slice(0,4))-i;return [String(y),t(y+' 年',String(y))];}),
    ['month',t('本月','This month')],['30',t('最近 30 天','Last 30 days')],['custom',t('自定义日期','Custom dates')]]) {
    const option = document.createElement('option');option.value=value;option.textContent=label;$('year').append(option);
  }
  $('year').value=selected;
}
years();
for (const id of ['start-date','end-date']) { $(id).min='2022-01-01';$(id).max=today; }
$('start-date').value=today.slice(0,4)+'-01-01';$('end-date').value=today;
$('year').onchange=() => {
  const value=$('year').value;$('dates').hidden=!['custom','month','30'].includes(value);
  if(value==='month'){$('start-date').value=today.slice(0,7)+'-01';$('end-date').value=today;}
  if(value==='30'){const date=new Date(today+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-29);$('start-date').value=date.toISOString().slice(0,10);$('end-date').value=today;}
};
async function send(message) {
  const result=await chrome.runtime.sendMessage(message);
  if(!result?.ok)throw new Error(result?.error||t('插件未就绪，请重新打开','Reopen the extension and try again'));
  return result;
}
function error(error) {$('status').textContent=collectionError(error.message);}
function showImport() {
  if(!importResult)return;
  const {saved,failed}=importResult;
  $('import-status').textContent=t(`已导入 ${saved} 份报告`,`Imported ${saved} reports`)+
    (failed.length?'\n'+failed.map(({name,message})=>name+': '+collectionError(message)).join('\n'):'');
}
function render(next) {
  state=next;const job=next.job,busy=['login','collecting'].includes(job.phase);
  for(const id of ['start','year','start-date','end-date'])$(id).disabled=busy;
  $('cancel').hidden=!busy;$('progress').hidden=job.phase!=='collecting';
  if(job.pages){$('progress').max=job.pages;$('progress').value=job.page||0;}else $('progress').removeAttribute('value');
  const en={ready:'Ready to collect',login:'Complete SSO and MFA in the campus card tab. Collection will start automatically.',collecting:`Collecting ${job.page||0} / ${job.pages||'?'} pages · ${job.count||0} records`,complete:'Collection complete. Your report is saved below.',cancelled:'Collection cancelled. No partial report was saved.'};
  $('status').textContent=job.phase==='error'?collectionError(job.message):job.phase==='collecting'?t(`正在读取 ${job.page||0} / ${job.pages||'?'} 页，共 ${job.count||0} 条记录`,en.collecting):t(job.message||'准备就绪',en[job.phase]||job.message);
  const key=JSON.stringify(next.history)+language.lang;
  if(key===signature)return;signature=key;$('history').replaceChildren();$('empty').hidden=!!next.history.length;
  for(const item of next.history){
    const article=document.createElement('article');article.className='card history-item';
    const info=document.createElement('div'),heading=document.createElement('h3'),detail=document.createElement('p');
    heading.textContent=`${item.start} — ${item.end}`;
    detail.textContent=`${item.count} ${t('条记录','records')} · ${new Date(item.savedAt).toLocaleString(t('zh-CN','en-US'))}`;
    info.append(heading,detail);
    const link=document.createElement('a');link.className='button';link.href='report.html?id='+encodeURIComponent(item.id);link.target='_blank';link.rel='noopener';link.textContent=t('查看报告 / Eat TI','View report / Eat TI');
    article.append(info,link);$('history').append(article);
  }
}
async function refresh(){render(await send({type:'state'}));}
async function poll(){try{await refresh();}catch(e){error(e);}polling=setTimeout(poll,1500);}
$('open-campus').onclick=() => send({type:'open-campus'}).catch(error);
$('start').onclick=async() => {
  $('start').disabled=true;
  try{
    const value=$('year').value,range=['custom','month','30'].includes(value)?{start:$('start-date').value,end:$('end-date').value}:value==='all'?'all':Number(value);
    DKUAnnual.queryRange(range,today);await send({type:'start',range});await refresh();
  }catch(e){error(e);$('start').disabled=false;}
};
$('cancel').onclick=async()=>{try{await send({type:'cancel'});await refresh();}catch(e){error(e);}};
$('import').onchange=async()=>{
  const files=[...$('import').files];let saved=0;const failed=[];
  for(const file of files){try{if(file.size>20*1024*1024)throw new Error(t('JSON 文件超过 20 MB','JSON file exceeds 20 MB'));await DKUStore.save(JSON.parse(await file.text()));saved++;}catch(e){failed.push({name:file.name,message:e.message});}}
  importResult={saved,failed};showImport();$('import').value='';await refresh();
};
language.onChange(()=>{years();showImport();if(state)render(state);});
window.addEventListener('pagehide',()=>clearTimeout(polling));
void poll();
