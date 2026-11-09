/* Shared by the collector and the local report app. No network or storage access. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = cents => (cents / 100).toFixed(2);

  function amountToCents(text) {
    const value = text.replace(/\s/g, '').replace(/,/g, '');
    const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) throw new Error('无法识别金额：' + text);
    const cents = Number(match[2]) * 100 + Number((match[3] || '').padEnd(2, '0'));
    if (!Number.isSafeInteger(cents)) throw new Error('金额超出支持范围');
    return match[1] === '-' ? -cents : cents;
  }

  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }

  function queryRange(year,today) {
    if(!validDate(today))throw new Error('当前日期无效');
    if(year&&typeof year==='object'){
      const {start,end}=year;
      if(!validDate(start)||!validDate(end))throw new Error('请填写有效的开始和结束日期');
      if(start>end)throw new Error('开始日期不能晚于结束日期');
      if(start<'2022-01-01'||end>today)throw new Error('日期范围需在 2022-01-01 至今天之间');
      return {start,end,label:'custom'};
    }
    const current=Number(today.slice(0,4));
    if(year!=='all'&&(!Number.isInteger(year)||year<2022||year>current))throw new Error('请选择 2022 年起的年份或全部年份');
    return {start:year==='all'?'2022-01-01':`${year}-01-01`,end:year==='all'||year===current?today:`${year}-12-31`,label:String(year)};
  }

  function validateRecord(row) {
    if (!row || typeof row !== 'object' || !['id','time','type','merchant','status'].every(key => typeof row[key] === 'string')) {
      throw new Error('交易字段不完整');
    }
    if (!row.id || !row.merchant || !Number.isSafeInteger(row.cents)) throw new Error('交易号、商户或金额无效');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row.time) || !validDate(row.time.slice(0, 10)) || Number(row.time.slice(11, 13)) > 23 || Number(row.time.slice(14)) > 59) {
      throw new Error('交易时间无效');
    }
    return {id:row.id, time:row.time, type:row.type, merchant:row.merchant, cents:row.cents, status:row.status};
  }

  function parsePage(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table.nyu-table');
    if (!table) throw new Error('未返回交易表格。请刷新校园卡页面并完成登录后重试。');
    const headings = Array.from(table.querySelectorAll('thead th')).map(el => el.textContent.trim());
    if (headings.length !== 5 || !/创建时间|Creation|Date|Time/i.test(headings[0]) || !/金额|Amount/i.test(headings[3])) {
      throw new Error('学校交易表头已变化，已停止采集');
    }
    const rows = [];
    for (const tr of table.querySelectorAll('tbody tr')) {
      const cells = Array.from(tr.children).filter(el => el.tagName === 'TD');
      if (cells.length === 1 && cells[0].getAttribute('colspan') === '5' && cells[0].textContent.trim() === '暂无交易记录') continue;
      if (cells.length !== 5) throw new Error('出现无法识别的交易行，已停止采集');
      const values = cells.map(el => el.innerHTML.replace(/<br\s*\/?\s*>/gi, ' ')).map(value => {
        const node = doc.createElement('span'); node.innerHTML = value; return node.textContent.replace(/\s+/g, ' ').trim();
      });
      const time = /^(\d{4})[.-](\d{2})[.-](\d{2})\s+(\d{2}:\d{2})$/.exec(values[0]);
      const identity = /^(.*?)\s*(?:交易号|Transaction\s*(?:No\.?|ID))\s*[:：]\s*(\S+)$/i.exec(values[1]);
      if (!time || !identity) throw new Error('无法识别交易时间或交易号，已停止采集');
      rows.push(validateRecord({id:identity[2], time:`${time[1]}-${time[2]}-${time[3]} ${time[4]}`, type:identity[1].trim(), merchant:values[2], cents:amountToCents(values[3]), status:values[4]}));
    }
    const pager = /Page\s*(\d+)\s*\/\s*(\d+)/i.exec(doc.body.textContent);
    if (!pager && rows.length) throw new Error('未找到分页信息，无法保证记录完整');
    const page = pager ? Number(pager[1]) : 1;
    const pages = pager ? Number(pager[2]) : 1;
    if (page < 1 || pages < 1 || page > pages || pages > 3000 || rows.length > 6) throw new Error('分页信息异常');
    return {page, pages, rows};
  }

  function uniqueRecords(records) {
    const seen = new Map();
    for (const input of records) {
      const row = validateRecord(input);
      if (seen.has(row.id) && JSON.stringify(seen.get(row.id)) !== JSON.stringify(row)) throw new Error('同一交易号出现不同记录，已停止统计');
      seen.set(row.id, row);
    }
    return [...seen.values()].sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  }

  function validateDataset(input) {
    if (!input || input.version !== VERSION || input.source !== 'dkucard' || !Array.isArray(input.records)) throw new Error('请选择本工具导出的 DKU JSON 数据');
    if (input.records.length > 18000) throw new Error('数据量超出支持范围');
    const {start, end, account, complete} = input;
    if (!validDate(start) || !validDate(end) || start > end || typeof account !== 'string' || typeof complete !== 'boolean') throw new Error('查询范围或完整性标记无效');
    if (Number(start.slice(0, 4)) < 2000 || Number(end.slice(0, 4)) > 2100) throw new Error('查询年份超出支持范围');
    const records = uniqueRecords(input.records);
    if (records.some(row => row.time.slice(0, 10) < start || row.time.slice(0, 10) > end)) throw new Error('返回记录超出所选日期范围，已停止统计');
    return {version:VERSION, source:'dkucard', start, end, account, complete, records};
  }

  function isPrinting(row) {
    return /^(?:pharos\s+printing(?:\s+校园打印)?|校园打印)$/i.test(row.merchant.trim());
  }

  function isExpense(row) {
    return !isPrinting(row) && /^(交易成功|成功|Success|Successful|Transaction successful)$/i.test(row.status) && /^(Expense\s*消费|消费|Expense)$/i.test(row.type) && row.cents < 0;
  }

  function isRefund(row) {
    return !isPrinting(row) && /^(交易成功|成功|Success|Successful|Transaction successful)$/i.test(row.status) && /^(Expense Canceled(?:\s*消费冲正)?|消费冲正|Refund(?:\s*退款)?|退款|Discount Refund(?:\s*折扣返还)?|折扣返还)$/i.test(row.type) && row.cents > 0;
  }

  function summarize(input) {
    const data = validateDataset(input);
    const reversed = new Set();
    const candidates = new Map();
    const minute = row => Number(row.time.slice(11,13))*60+Number(row.time.slice(14));
    // Source timestamps have minute precision; consider same-minute charges first.
    const ordered = [...data.records].sort((a,b) => a.time.localeCompare(b.time) || Number(isExpense(b))-Number(isExpense(a)) || a.id.localeCompare(b.id));
    for (const row of ordered) {
      const key = JSON.stringify([row.time.slice(0,10),row.merchant.trim(),Math.abs(row.cents)]);
      if (isExpense(row)) {
        const queue = candidates.get(key) || [];
        queue.push(row); candidates.set(key,queue);
      } else if ((isRefund(row) || isExpense({...row,cents:-row.cents})) && !/Discount Refund|折扣返还/i.test(row.type)) {
        const queue = candidates.get(key);
        while (queue?.length && minute(row)-minute(queue[0])>5) queue.shift();
        if (queue?.length) {
          reversed.add(queue.shift().id); reversed.add(row.id);
        }
      }
    }
    const expenses = data.records.filter(row => isExpense(row) && !reversed.has(row.id));
    const refunds = data.records.filter(row => isRefund(row) && !reversed.has(row.id));
    const excluded = data.records.filter(row => reversed.has(row.id) || (!isExpense(row) && !isRefund(row))).map(row => reversed.has(row.id) ? {...row,exclusionReason:'疑似全额退款（同商户同日 5 分钟内等额收支）'} : row);
    const months = new Map(), merchants = new Map(), years = new Map();
    for (let year = Number(data.start.slice(0, 4)); year <= Number(data.end.slice(0, 4)); year++) {
      years.set(String(year), {year:String(year), total:0, merchants:new Map()});
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        if (key >= data.start.slice(0, 7) && key <= data.end.slice(0, 7)) months.set(key, 0);
      }
    }
    let total = 0, gross = 0, returned = 0;
    for (const row of [...expenses,...refunds]) {
      const amount = -row.cents;
      total += amount;
      if (isRefund(row)) returned += row.cents; else gross += amount;
      if (![total,gross,returned].every(Number.isSafeInteger)) throw new Error('汇总金额超出支持范围');
      months.set(row.time.slice(0, 7), (months.get(row.time.slice(0, 7)) || 0) + amount);
      const item = merchants.get(row.merchant) || {name:row.merchant, cents:0, count:0, refundCount:0};
      item.cents += amount;
      if (isRefund(row)) item.refundCount++; else item.count++;
      merchants.set(row.merchant, item);
      const annual = years.get(row.time.slice(0, 4));
      annual.total += amount;
      const tag = annual.merchants.get(row.merchant) || {name:row.merchant, cents:0, count:0, refundCount:0};
      tag.cents += amount;
      if (isRefund(row)) tag.refundCount++; else tag.count++;
      annual.merchants.set(row.merchant, tag);
    }
    const ranked = values => [...values].sort((a,b) => b.cents-a.cents || a.name.localeCompare(b.name));
    return {data, expenses, refunds, excluded, total, gross, returned, months:[...months], merchants:ranked(merchants.values()), years:[...years.values()].map(annual => ({...annual, merchants:ranked(annual.merchants.values())})), max:expenses.reduce((best,row) => !best || row.cents < best.cents ? row : best, null)};
  }

  function reportHTML(input) {
    return require('./report.js').reportHTML(summarize(input));
  }

  const api = {VERSION, escapeHTML, money, amountToCents, validDate, queryRange, validateRecord, parsePage, uniqueRecords, validateDataset, isExpense, isRefund, summarize, reportHTML};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKUAnnual = api;
})(typeof window === 'undefined' ? globalThis : window);
