const crypto = require('node:crypto');
const core = require('../src/core.js');
const {findSearchForm} = require('../src/collector.js');

const campusOrigin = 'https://dkucard.dukekunshan.edu.cn';
const navigationError = /Execution context was destroyed|Cannot find (?:default execution )?context|Inspected target navigated/i;

async function collectInBrowser({client, targetId, sessionId, sources, start, end,
  cancelled = () => false, onState = () => {},
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now}) {
  const jobId = crypto.randomBytes(12).toString('hex');
  let runId = jobId + '-0';
  const inspect = `(() => {
    if(location.origin!==${JSON.stringify(campusOrigin)})return {ready:false};
    const form = (${findSearchForm.toString()})();
    return {ready:document.readyState==='complete' && !!(form?.querySelector('input[name=_csrf]') && document.querySelector('table.nyu-table')),
      runId:window.__dkuAppRun, progress:window.__dkuAppProgress};
  })()`;
  let started = false, restarts = 0, collectionDeadline = 0;
  let loginDeadline = now() + 10 * 60 * 1000;

  function restart() {
    started = false;
    loginDeadline = now() + 10 * 60 * 1000;
    if (++restarts > 3) throw new Error('校园卡页面反复跳转，请完成登录后重试');
    runId = jobId + '-' + restarts;
  }

  try {
    while (!collectionDeadline || now() < collectionDeadline) {
      if (cancelled()) throw new Error('已取消');
      const {targetInfo} = await client.send('Target.getTargetInfo', {targetId});
      const url = new URL(targetInfo.url);
      let page = {ready:false};
      if (url.origin === campusOrigin) {
        try {
          page = await client.evaluate(inspect, sessionId);
        } catch (error) {
          if (!navigationError.test(error.message)) throw error;
        }
      }
      if (!page?.ready) {
        if (started) restart();
        if (now() >= loginDeadline) throw new Error('等待登录超过 10 分钟，请点击开始重试');
        onState({phase:'login', message:'请完成校园卡登录，页面就绪后会自动继续采集。'});
        await pause(750);
        continue;
      }
      if (started && page.runId !== runId) restart();
      if (!started) {
        try {
          await client.evaluate(`if(location.origin===${JSON.stringify(campusOrigin)}){\n${sources}\n}`, sessionId);
          await client.evaluate(`(() => {
            if(location.origin!==${JSON.stringify(campusOrigin)})return;
            window.__dkuAppRun=${JSON.stringify(runId)};
            window.__dkuAppAbort?.abort();
            window.__dkuAppAbort=new AbortController();
            window.__dkuAppProgress={phase:'collecting'};
            const update=progress=>{if(window.__dkuAppRun===${JSON.stringify(runId)})window.__dkuAppProgress=progress;};
            try{
              DKUCollector.collect({start:${JSON.stringify(start)},end:${JSON.stringify(end)},account:'所有账户',
                signal:window.__dkuAppAbort.signal,
                readPage:DKUCollector.browserReader({start:${JSON.stringify(start)},end:${JSON.stringify(end)},accountValue:'',signal:window.__dkuAppAbort.signal}),
                progress:p=>update({phase:'collecting',...p})
              }).then(data=>{if(window.__dkuAppRun===${JSON.stringify(runId)}){window.__dkuAppData=data;update({phase:'complete'});}})
                .catch(error=>update({phase:'error',message:error.message}));
            }catch(error){update({phase:'error',message:error.message});}
          })();`, sessionId);
        } catch (error) {
          if (!navigationError.test(error.message)) throw error;
          restart();
          await pause(750);
          continue;
        }
        started = true;
        collectionDeadline ||= now() + 30 * 60 * 1000;
        onState({phase:'collecting', message:'登录成功，正在读取交易记录…'});
      } else {
        const progress = page.progress;
        if (progress?.phase === 'error') throw new Error(progress.message);
        if (progress?.phase === 'complete') {
          try {
            const data = await client.evaluate('window.__dkuAppData', sessionId);
            if (cancelled()) throw new Error('已取消');
            if (data) return core.validateDataset(data);
          } catch (error) {
            if (!navigationError.test(error.message)) throw error;
          }
          restart();
          continue;
        }
        if (!progress) {
          restart();
          continue;
        }
        onState({...progress, phase:'collecting', message:`正在读取 ${progress.page || 0} / ${progress.pages || '?'} 页，共 ${progress.count || 0} 条记录。`});
      }
      await pause(750);
    }
    throw new Error('采集超过 30 分钟，请缩小范围后重试');
  } finally {
    try {
      const {targetInfo} = await client.send('Target.getTargetInfo', {targetId});
      if (new URL(targetInfo.url).origin === campusOrigin) {
        await client.evaluate(`if(location.origin===${JSON.stringify(campusOrigin)} && window.__dkuAppRun?.startsWith(${JSON.stringify(jobId+'-')})){window.__dkuAppAbort?.abort();delete window.__dkuAppData;}`, sessionId);
      }
    } catch {}
  }
}

module.exports = {collectInBrowser};
