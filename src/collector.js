(function (root) {
  'use strict';
  const core = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.DKUAnnual;

  // readPage and pause are injectable so completeness and cancellation can be tested offline.
  async function collect({start, end, account, readPage, signal, progress = () => {}, pause = () => new Promise(resolve => setTimeout(resolve, 300))}) {
    core.validateDataset({version:1, source:'dkucard', start, end, account, complete:false, records:[]});
    const check = () => { if (signal?.aborted) throw new Error('采集已取消，未生成报告'); };
    check();
    const first = await readPage(1);
    const records = [], ids = new Set();
    for (let page = 1; page <= first.pages; page++) {
      check();
      if (page > 1) await pause();
      check();
      const result = page === 1 ? first : await readPage(page);
      check();
      if (result.page !== page || result.pages !== first.pages) throw new Error('页码或总页数发生变化，请重新采集');
      if (page < first.pages && result.rows.length !== 6) throw new Error('中间页记录不完整，已停止采集');
      if (first.pages > 1 && result.rows.length === 0) throw new Error('出现空页，已停止采集');
      for (const row of result.rows) {
        if (ids.has(row.id)) throw new Error('分页出现重复交易号，可能有新交易插入，请重新采集');
        ids.add(row.id); records.push(row);
      }
      progress({page, pages:first.pages, count:records.length});
    }
    // Detect new transactions shifting offsets while the query was being read.
    await pause(); check();
    const finalFirst = await readPage(1); check();
    if (JSON.stringify(finalFirst) !== JSON.stringify(first)) throw new Error('采集期间记录发生变化，请重新采集');
    return core.validateDataset({version:1, source:'dkucard', start, end, account, complete:true, records});
  }

  function browserReader({form, start, end, accountValue, signal}) {
    if (location.origin !== 'https://dkucard.dukekunshan.edu.cn') throw new Error('请在 DKU 校园卡网站运行');
    const endpoint = new URL(form.getAttribute('action'), location.href);
    if (endpoint.origin !== location.origin || endpoint.pathname !== '/dku/searchmydtl') throw new Error('查询入口已变化');
    const fields = new URLSearchParams(new FormData(form));
    if (!fields.get('_csrf')) throw new Error('页面缺少校验信息，请刷新校园卡页面并登录');
    fields.set('startdate', start.replace(/-/g, '.'));
    fields.set('enddate', end.replace(/-/g, '.'));
    fields.set('accid', accountValue);
    return async page => {
      const body = new URLSearchParams(fields);
      body.set('pageNo', String(page)); body.set('pager.offset', String((page - 1) * 6));
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal?.addEventListener('abort', cancel, {once:true});
      if (signal?.aborted) controller.abort();
      const timer = setTimeout(cancel, 20000);
      try {
        const response = await fetch(endpoint.href, {method:'POST', body, headers:{'X-Requested-With':'XMLHttpRequest'}, credentials:'same-origin', redirect:'error', cache:'no-store', signal:controller.signal});
        if (!response.ok) throw new Error(`查询失败（HTTP ${response.status}）。请刷新校园卡页面并登录后重试。`);
        const html = await response.text();
        if (html.length > 2000000) throw new Error('响应过大，已停止采集');
        return core.parsePage(html);
      } catch (error) {
        if (signal?.aborted) throw new Error('采集已取消，未生成报告');
        if (error.name === 'AbortError') throw new Error('查询超过 20 秒，请稍后重试');
        if (error instanceof TypeError) throw new Error('连接中断或登录已过期，请刷新校园卡页面并完成登录后重试');
        throw error;
      } finally {
        clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      }
    };
  }
  const api = {collect, browserReader};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKUCollector = api;
})(typeof window === 'undefined' ? globalThis : window);
