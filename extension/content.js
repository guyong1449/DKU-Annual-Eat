'use strict';
(() => {
  let running;
  const send = async message => {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw new Error(result?.error || '插件连接已断开，请刷新校园卡页面');
    return result;
  };
  async function collect(job) {
    if (!job || location.origin !== 'https://dkucard.dukekunshan.edu.cn') return;
    while (running) {
      if (running.id === job.id) return;
      running.controller.abort();
      await running.finished;
    }
    const form = DKUCollector.findSearchForm();
    if (!form?.querySelector('input[name=_csrf]') || !document.querySelector('table.nyu-table')) return;
    const controller = new AbortController();
    let finish;
    running = {id:job.id,controller,finished:new Promise(resolve => { finish=resolve; })};
    let timer;
    try {
      const {accepted} = await send({type:'begin',id:job.id});
      if (!accepted) return;
      timer = setTimeout(() => controller.abort(),30*60*1000);
      const pending = [];
      let progressError;
      const data = await DKUCollector.collect({start:job.start,end:job.end,account:'所有账户',signal:controller.signal,
        readPage:DKUCollector.browserReader({form,start:job.start,end:job.end,accountValue:'',signal:controller.signal}),
        progress:progress => pending.push(send({type:'progress',id:job.id,...progress}).catch(error => {
          progressError=error;controller.abort();
        }))});
      await Promise.all(pending);
      if (progressError) throw progressError;
      if (!controller.signal.aborted) await send({type:'complete',id:job.id,data});
    } catch (error) {
      await send({type:'failed',id:job.id,error:error.message}).catch(() => {});
    } finally {
      clearTimeout(timer);running = undefined;finish();
    }
  }
  chrome.runtime.onMessage.addListener((message,_sender,respond) => {
    if (message.type === 'abort' && running?.id === message.id) running.controller.abort();
    if (message.type === 'collect') void collect(message.job);
    respond({received:true});
  });
  void send({type:'resume'}).then(({job}) => collect(job)).catch(() => {});
})();
