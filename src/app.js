'use strict';
const token='LOCAL_APP_TOKEN';
const $=id=>document.getElementById(id);
const currentYear=Number(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}).slice(0,4));
$('year').innerHTML='<option value="all">全部年份（2022 年至今）</option>';
for(let y=currentYear;y>=2022;y--){const option=document.createElement('option');option.value=y;option.textContent=y===currentYear?`${y} 年至今`:`${y} 年`;$('year').append(option);}
let history=[],rendered='',stopped=false,failures=0;
async function api(path,body){
  const response=await fetch(path,{method:body?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{'X-DKU-App':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok){const body=await response.json();const error=new Error(body.error||'本机服务未就绪');error.status=response.status;throw error;}
  return response;
}
function link(label,url,download){const a=document.createElement('a');a.textContent=label;a.href=url;a.className='button';if(download)a.download=download;else{a.target='_blank';a.rel='noopener';}return a;}
function showReport(){
  const item=history.find(item=>item.id===$('history').value);
  if(!item)return;
  $('downloads').replaceChildren(link('查看报告 / EatTI',item.reportURL),link('保存 HTML',item.reportURL+'?download=1',item.reportName),link('导出 JSON',item.dataURL,item.file));
  $('downloads').querySelectorAll('a').forEach((a,i)=>{if(i)a.classList.add('secondary');});
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
    option.textContent=`${index===0?'最近 · ':''}${item.start} — ${item.end}（${new Date(item.savedAt).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} 保存）`;
    $('history').append(option);
  }
  if(previousLatest===history[0]?.id&&history.some(item=>item.id===selection))$('history').value=selection;
  $('result').hidden=!history.length;
  $('empty-history').hidden=!!history.length;
  $('empty-history').textContent='暂无报告';
  showReport();
}
$('history').onchange=showReport;
$('start').onclick=async()=>{
  $('start').disabled=true;$('status').hidden=false;
  try{await api('/api/start',{year:$('year').value==='all'?'all':Number($('year').value)});$('status').textContent='正在打开学校登录页面…';}catch(error){$('status').textContent=error.message;$('start').disabled=false;}
};
$('cancel').onclick=async()=>{try{await api('/api/cancel',{});$('status').textContent='正在取消…';}catch(error){$('status').textContent=error.message;}};
$('quit').onclick=async()=>{
  try{await api('/api/quit',{});stopped=true;disconnect('工具已退出。已保存的报告仍可通过「查看报告.html」离线打开。');}
  catch(error){$('status').hidden=false;$('status').textContent=error.message;}
};
function disconnect(message){$('status').hidden=false;$('status').textContent=message;$('progress').hidden=true;for(const id of ['start','year','cancel','quit'])$(id).disabled=true;}
async function poll(){
  if(location.protocol==='file:'){
    disconnect('采集新数据请双击「启动.cmd」；已有报告可在下方打开。');
    $('offline-link').hidden=false;$('empty-history').hidden=true;return;
  }
  if(stopped)return;
  try{
    const state=await (await api('/api/status')).json();failures=0;
    const busy=['preparing','login','collecting'].includes(state.phase);
    $('start').disabled=busy;$('year').disabled=busy;$('quit').disabled=false;$('cancel').disabled=!['login','collecting'].includes(state.phase);
    $('status').textContent=state.message;
    $('status').hidden=state.phase==='ready';$('progress').hidden=!busy;
    $('history-warning').textContent=(state.warnings||[]).join('\n');
    $('history-warning').hidden=!state.warnings?.length;
    if(state.pages){$('progress').max=state.pages;$('progress').value=state.page||0;}else{$('progress').max=1;$('progress').value=state.phase==='complete'?1:0;}
    showHistory(state);
  }catch(error){
    failures++;
    disconnect(error.status===403?'工具可能已重新启动，当前页面的连接已过期。请刷新此页恢复连接；已保存的报告不受影响。':'本机采集服务未连接。已保存的数据仍在：双击「查看报告.html」离线查看；双击「启动.cmd」恢复采集。');
  }
  if(!stopped)setTimeout(poll,failures?Math.min(1000*2**Math.min(failures,4),15000):1500);
}
void poll();
