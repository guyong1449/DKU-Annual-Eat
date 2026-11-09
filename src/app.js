'use strict';
const token='LOCAL_APP_TOKEN';
const $=id=>document.getElementById(id);
const language=createLanguage(),t=language.t;
const imageExports=createImageExporter();
const currentYear=Number(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}).slice(0,4));
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
function years(){
  const selection=$('year').value||'2026';
  $('year').replaceChildren();
  const all=document.createElement('option');all.value='all';all.textContent=t('全部年份（2022 年至今）','All years (2022–present)');$('year').append(all);
  for(let y=currentYear;y>=2022;y--){const option=document.createElement('option');option.value=y;option.textContent=y===currentYear?t(`${y} 年至今`,`${y} to date`):t(`${y} 年`,String(y));$('year').append(option);}
  for(const [value,zh,en] of [['month','本月','This month'],['30','最近 30 天','Last 30 days'],['custom','自定义日期','Custom dates']]){const option=document.createElement('option');option.value=value;option.textContent=t(zh,en);$('year').append(option);}
  $('year').value=selection;
}
years();
for(const id of ['collection-start','collection-end']){ $(id).min='2022-01-01';$(id).max=today; }
$('collection-start').value='2026-01-01';$('collection-end').value=today;
$('year').onchange=()=>{
  const value=$('year').value;
  $('collection-dates').hidden=!['custom','month','30'].includes(value);
  if(value==='month'){$('collection-start').value=today.slice(0,7)+'-01';$('collection-end').value=today;}
  if(value==='30'){const from=new Date(today+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-29);$('collection-start').value=from.toISOString().slice(0,10);$('collection-end').value=today;}
};
for(const id of ['collection-start','collection-end'])$(id).onchange=()=>{$('year').value='custom';};
let history=[],rendered='',stopped=false,failures=0,lastState;
async function api(path,body){
  const response=await fetch(path,{method:body?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{'X-DKU-App':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){const body=await response.json();const error=new Error(body.error||'本机服务未就绪');error.status=response.status;throw error;}
  return response;
}
function link(label,url,download){const a=document.createElement('a');a.textContent=label;a.href=url;a.className='button';if(download)a.download=download;else{a.target='_blank';a.rel='noopener';}return a;}
function showReport(){
  const item=history.find(item=>item.id===$('history').value);
  if(!item)return;
  const exports=['card','long'].map(kind=>{
    const button=document.createElement('button');button.type='button';button.className='secondary share-button';
    const key=item.id+':'+kind;imageExports.sync(button,key);
    button.textContent=kind==='card'?t('导出卡片','Export card'):t('导出长图','Export long image');
    button.onclick=()=>imageExports.run(key,button,()=>exportSaved(item,kind));return button;
  });
  const html=link(t('保存 HTML','Save HTML'),item.reportURL+'?download=1',item.reportName),json=link(t('导出 JSON','Export JSON'),item.dataURL,item.file);
  html.classList.add('secondary');json.classList.add('secondary');
  $('downloads').replaceChildren(link(t('查看报告 / EatTI','View report / EatTI'),item.reportURL),...exports,html,json);
}
async function exportSaved(item,kind){
  $('export-status').hidden=false;$('export-status').textContent=t('正在生成图片…','Preparing image…');
  let frame;
  try{
    const response=await fetch(item.reportURL);
    if(!response.ok)throw new Error('report unavailable');
    const html=await response.text();
    frame=document.createElement('iframe');frame.hidden=true;frame.title='Image export';
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('report load timed out')),15000);
      frame.onload=()=>{clearTimeout(timer);resolve();};
      frame.onerror=()=>{clearTimeout(timer);reject(new Error('report unavailable'));};
      frame.srcdoc=html;document.body.append(frame);
    });
    // Reuse the saved report's renderer, filters and typography.
    const share=frame.contentWindow.dkuReport.share(kind);
    await saveShareImage(share,share.filename);
    $('export-status').hidden=imageExports.size===1;
  }catch{
    $('export-status').textContent=t('图片生成失败，请打开报告后重试。','Image export failed. Open the report and try again.');
  }finally{
    frame?.remove();
  }
}
function showHistory(state){
  const signature=JSON.stringify(state.history);
  if(signature===rendered)return;
  const selection=$('history').value;
  const previousLatest=history[0]?.id;
  history=state.history||[];rendered=signature;
  $('history').replaceChildren();
  for(const [index,item] of history.entries()){
    const option=document.createElement('option');option.value=item.id;
    const date=new Date(item.savedAt).toLocaleString(t('zh-CN','en-US'),{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    option.textContent=`${index===0?t('最近 · ','Latest · '):''}${item.start} — ${item.end} (${t(date+' 保存','saved '+date)})`;
    $('history').append(option);
  }
  if(previousLatest===history[0]?.id&&history.some(item=>item.id===selection))$('history').value=selection;
  $('result').hidden=!history.length;
  $('empty-history').hidden=!!history.length;
  $('empty-history').textContent=t('暂无报告','No saved reports');
  showReport();
}
$('history').onchange=showReport;
$('start').onclick=async()=>{
  $('start').disabled=true;$('status').hidden=false;
  try{
    const custom=['custom','month','30'].includes($('year').value),start=$('collection-start').value,end=$('collection-end').value;
    if(custom&&(!start||!end||start>end||start<'2022-01-01'||end>today))throw new Error(t('请填写有效的起止日期，范围为 2022-01-01 至今天','Enter valid dates between 2022-01-01 and today'));
    await api('/api/start',custom?{year:'custom',start,end}:{year:$('year').value==='all'?'all':Number($('year').value)});$('status').textContent=t('正在打开学校登录页面…','Opening the campus sign-in page…');
  }catch(error){$('status').textContent=collectionError(error.message);$('start').disabled=false;}
};
$('cancel').onclick=async()=>{try{await api('/api/cancel',{});$('status').textContent=t('正在取消…','Cancelling…');}catch(error){$('status').textContent=t(error.message,'Unable to cancel. Please try again.');}};
$('quit').onclick=async()=>{
  try{await api('/api/quit',{});stopped=true;disconnect(t('工具已退出。下次启动后可继续查看已保存的报告。','Tool closed. Your saved reports will be available next time.'));}
  catch(error){$('status').hidden=false;$('status').textContent=t(error.message,'Unable to close the tool. Please try again.');}
};
function disconnect(message){$('status').hidden=false;$('status').textContent=message;$('progress').hidden=true;for(const id of ['start','year','collection-start','collection-end','cancel','quit'])$(id).disabled=true;}
async function poll(){
  if(location.protocol==='file:'){
    disconnect(t('请使用桌面启动器打开工具。','Use the desktop launcher to open the tool.'));
    $('empty-history').hidden=true;return;
  }
  if(stopped)return;
  try{
    const state=await (await api('/api/status')).json();lastState=state;failures=0;
    const busy=['preparing','login','collecting'].includes(state.phase);
    $('start').disabled=busy;$('year').disabled=busy;$('quit').disabled=false;$('cancel').disabled=!['login','collecting'].includes(state.phase);
    $('collection-start').disabled=busy;$('collection-end').disabled=busy;
    showStatus(state);
    $('status').hidden=state.phase==='ready';$('progress').hidden=!busy;
    $('history-warning').textContent=t((state.warnings||[]).join('\n'),'Some saved files could not be loaded. Please check the files in the report library.');
    $('history-warning').hidden=!state.warnings?.length;
    if(state.pages){$('progress').max=state.pages;$('progress').value=state.page||0;}else{$('progress').max=1;$('progress').value=state.phase==='complete'?1:0;}
    showHistory(state);
  }catch(error){
    failures++;
    disconnect(error.status===403?t('工具可能已重新启动，当前页面的连接已过期。请刷新此页恢复连接；已保存的报告不受影响。','This connection has expired. Refresh the page to reconnect; saved reports are available.'):t('本机采集服务未连接，请使用桌面启动器重新打开工具。','Local service disconnected. Restart the tool with the desktop launcher.'));
  }
  if(!stopped)setTimeout(poll,failures?Math.min(1000*2**Math.min(failures,4),15000):1500);
}
function showStatus(state){
  const messages={ready:'Ready',preparing:'Preparing the browser…',login:'Sign in on the campus page. Collection will continue automatically when it is ready.',collecting:`Collecting records${state.pages?' · '+(state.page||0)+' / '+state.pages:''}…`,complete:'Collection complete. Your report is ready.'};
  $('status').textContent=state.phase==='error'?collectionError(state.message):t(state.message,messages[state.phase]||state.message);
}
function collectionError(message){
  const messages={
    '已取消':'Collection cancelled.',
    '已取消，未生成部分报告。':'Collection cancelled. No partial report was saved.',
    '等待登录超过 10 分钟，请点击开始重试':'Sign-in timed out after 10 minutes. Start collection again.',
    '校园卡页面反复跳转，请完成登录后重试':'The campus page keeps reloading. Finish signing in and try again.',
    '采集超过 30 分钟，请缩小范围后重试':'Collection timed out after 30 minutes. Choose a shorter date range and try again.',
    '专用浏览器已关闭':'The dedicated browser was closed. Reopen the tool and try again.',
    '专用浏览器未连接':'The dedicated browser is disconnected. Reopen the tool and try again.',
    '浏览器正在准备、已关闭或已有采集任务。请重新启动工具后重试。':'The browser is unavailable or another collection is running. Wait for it to finish or reopen the tool.',
    '未返回交易表格。请刷新校园卡页面并完成登录后重试。':'The campus site returned no transaction table. Refresh the campus page and sign in again.',
    '学校交易表头已变化，已停止采集':'The campus transaction columns have changed. Collection stopped.',
    '出现无法识别的交易行，已停止采集':'The campus site returned an unrecognized transaction row. Collection stopped.',
    '无法识别交易时间或交易号，已停止采集':'A transaction date or ID could not be read. Collection stopped.',
    '未找到分页信息，无法保证记录完整':'Pagination information is missing. Collection stopped to avoid an incomplete report.',
    '分页信息异常':'The campus site returned invalid pagination information.',
    '页码或总页数发生变化，请重新采集':'The page number or total page count changed. Start collection again.',
    '中间页记录不完整，已停止采集':'A transaction page is incomplete. Start collection again.',
    '出现空页，已停止采集':'An unexpected empty transaction page was returned. Start collection again.',
    '分页出现重复交易号，可能有新交易插入，请重新采集':'Transaction pages overlap, possibly because new records were added. Start collection again.',
    '采集期间记录发生变化，请重新采集':'Transactions changed during collection. Start collection again.',
    '查询超过 20 秒，请稍后重试':'The campus query timed out after 20 seconds. Try again later.',
    '连接中断或登录已过期，请刷新校园卡页面并完成登录后重试':'The campus connection was interrupted or sign-in expired. Refresh the campus page and sign in again.',
    '未找到校园卡查询表单，请刷新校园卡页面并登录':'The campus query form is missing. Refresh the campus page and sign in again.',
    '页面缺少校验信息，请刷新校园卡页面并登录':'The campus page is missing its verification token. Refresh it and sign in again.',
    '查询入口已变化':'The campus query endpoint has changed.'
  };
  return t(message,messages[message]||message);
}
language.onChange(()=>{years();rendered='';if(lastState){showHistory(lastState);showStatus(lastState);}});
void poll();
