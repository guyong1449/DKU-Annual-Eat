'use strict';
importScripts('core.js', 'storage.js');
const campusURL = 'https://dkucard.dukekunshan.edu.cn/dku/index';
const campusOrigin = new URL(campusURL).origin;
const busy = job => ['login','collecting'].includes(job?.phase);
const getJob = async () => (await chrome.storage.session.get('job')).job;
const setJob = job => chrome.storage.session.set({job});
const today = () => new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Shanghai'});

async function openCampus(collectible = false) {
  const tabs = await chrome.tabs.query({url:campusOrigin+'/*'});
  const tab = tabs.find(tab => tab.active) || tabs[0];
  if (tab) {
    // Tabs opened before installation do not contain the content script yet.
    // A new tab reuses the same browser session without refreshing the user's page.
    const ready = !collectible || await chrome.tabs.sendMessage(tab.id,{type:'ping'}).then(() => true,() => false);
    if (ready) return chrome.tabs.update(tab.id, {active:true});
  }
  return chrome.tabs.create({url:campusURL});
}
async function currentJob() {
  const job = await getJob();
  if (busy(job) && Date.now() > job.deadline) {
    await setJob({...job,phase:'error',message:job.phase==='login'?'等待登录超过 10 分钟，请重新采集':'采集超过 30 分钟，请缩小范围后重试'});
    void chrome.tabs.sendMessage(job.tabId, {type:'abort',id:job.id}).catch(() => {});
    return getJob();
  }
  return job;
}
function isCampus(sender) {
  return sender.frameId === 0 && sender.tab?.id !== undefined &&
    typeof sender.url === 'string' && new URL(sender.url).origin === campusOrigin;
}
async function route(message, sender) {
  const type = message?.type;
  const dashboard = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('app.html');
  if (['state','start','cancel','open-campus'].includes(type)) {
    if (!dashboard) throw new Error('请从插件工具页操作');
    const job = await currentJob();
    if (type === 'state') return {job:job || {phase:'ready'},history:await DKUStore.list()};
    if (type === 'open-campus') { await openCampus(); return {}; }
    if (type === 'cancel') {
      if (busy(job)) {
        await setJob({...job,phase:'cancelled',message:'已取消，未生成部分报告'});
        void chrome.tabs.sendMessage(job.tabId,{type:'abort',id:job.id}).catch(() => {});
      }
      return {};
    }
    if (busy(job)) throw new Error('已有采集任务，请先等待完成或取消');
    const range = DKUAnnual.queryRange(message.range, today());
    const tab = await openCampus(true);
    const next = {id:crypto.randomUUID(),tabId:tab.id,phase:'login',start:range.start,end:range.end,
      deadline:Date.now()+10*60*1000,message:'请在校园卡标签页完成登录和 MFA，插件会自动继续采集'};
    await setJob(next);
    void chrome.tabs.sendMessage(tab.id,{type:'collect',job:next}).catch(() => {});
    return {};
  }
  if (!isCampus(sender)) throw new Error('无效的校园卡页面');
  const job = await currentJob();
  if (!busy(job) || job.tabId !== sender.tab.id) return {};
  if (type === 'resume') return {job:job.phase==='login'?job:undefined};
  if (message.id !== job.id) return {};
  if (type === 'begin' && job.phase === 'login') {
    await setJob({...job,phase:'collecting',deadline:Date.now()+30*60*1000,message:'登录成功，正在读取交易记录…'});
    return {accepted:true};
  }
  if (job.phase !== 'collecting') return {};
  if (type === 'progress') {
    const {page,pages,count} = message;
    if (![page,pages,count].every(Number.isSafeInteger) || page<1 || pages<page || pages>3000 || count<0 || count>18000) throw new Error('采集进度无效');
    await setJob({...job,page,pages,count});
  } else if (type === 'complete') {
    const data = DKUAnnual.validateDataset(message.data);
    if (!data.complete || data.start !== job.start || data.end !== job.end) throw new Error('采集范围或完整性不匹配');
    const reportId = await DKUStore.save(data);
    await setJob({...job,phase:'complete',reportId,count:data.records.length,message:'采集完成，报告已保存'});
  } else if (type === 'failed') {
    await setJob({...job,phase:'error',message:String(message.error || '采集失败').slice(0,500)});
  }
  return {};
}
// Short event handlers are serialized; the page owns the long-running collection.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  queue = queue.then(() => route(message,sender)).then(result => respond({ok:true,...result}),
    error => respond({ok:false,error:error.message}));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => {
  queue = queue.then(async () => {
    const job = await getJob();
    if (busy(job) && job.tabId === tabId) await setJob({...job,phase:'error',message:'校园卡标签页已关闭，请重新采集'});
  }).catch(() => {});
});
chrome.tabs.onUpdated.addListener((tabId,change) => {
  if (change.status !== 'loading') return;
  queue = queue.then(async () => {
    const job = await getJob();
    if (job?.phase === 'collecting' && job.tabId === tabId)
      await setJob({...job,phase:'error',message:'采集期间页面发生跳转或刷新，请完成登录后重新采集'});
  }).catch(() => {});
});
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('app.html');
  const tabs = await chrome.tabs.query({url});
  if (tabs[0]) await chrome.tabs.update(tabs[0].id,{active:true});
  else await chrome.tabs.create({url});
});
