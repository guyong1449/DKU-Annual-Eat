// Browser-only cases: run with DKUAnnual, DKUCollector and a native DOMParser.
(function () {
  const table = body => `<table class="nyu-table"><thead><tr><th>创建时间</th><th>名称/交易号</th><th>对方</th><th>金额/明细</th><th>状态</th></tr></thead><tbody>${body}</tbody></table>`;
  const row = '<tr><td>2025.09.01<br>12:30</td><td>Expense 消费<br>交易号: synthetic-1</td><td>测试 &amp; 商户</td><td><span> - 13.50</span></td><td>交易成功</td></tr>';
  const results=[];
  const check=(name,condition)=>{if(!condition)throw new Error(name);results.push(name);};
  const rejects=(name,html)=>{let failed=false;try{DKUAnnual.parsePage(html);}catch{failed=true;}check(name,failed);};
  const page=DKUAnnual.parsePage(table(row)+'<b class="fontred">1/1</b><span>Page 1/1</span>');
  check('br-separated date and identity',page.rows[0].time==='2025-09-01 12:30' && page.rows[0].id==='synthetic-1');
  check('amount and HTML entities',page.rows[0].cents===-1350 && page.rows[0].merchant==='测试 & 商户');
  check('observed empty-page placeholder',DKUAnnual.parsePage(table('<tr><td colspan="5">暂无交易记录</td></tr>')).rows.length===0);
  const englishTable = body => table(body).replace('创建时间','Creation Time').replace('名称/交易号','Type / Transaction ID').replace('对方','Merchant').replace('金额/明细','Amount').replace('状态','Status');
  for(const text of ['No transaction records','No records found','No transactions found.','No data available']){
    check('English empty page '+text,DKUAnnual.parsePage(englishTable(`<tr><td colspan="5">${text}</td></tr>`)).rows.length===0);
  }
  const englishRow=row.replace('Expense 消费','Expense').replace('交易号:','Transaction Number:').replace('交易成功','Transaction Successful!');
  const englishPage=DKUAnnual.parsePage(englishTable(englishRow)+'Page 2 of 2');
  check('English identity and pagination',englishPage.page===2 && englishPage.pages===2 && englishPage.rows[0].id==='synthetic-1');
  const englishSummary=DKUAnnual.summarize({version:1,source:'dkucard',start:'2025-09-01',end:'2025-09-01',account:'all',complete:true,records:englishPage.rows});
  check('observed English success status contributes to spending',englishSummary.total===1350 && englishSummary.expenses.length===1);
  rejects('unknown English placeholder',englishTable('<tr><td colspan="5">Access denied</td></tr>'));
  rejects('login page','<h1>Duke Log In</h1>');
  rejects('missing pager',table(row));
  rejects('unknown colspan is not silently empty',table('<tr><td colspan="5">查询失败</td></tr>'));
  rejects('changed columns',table('<tr><td>2025.09.01</td><td>13.50</td></tr>'));
  rejects('invalid date',table(row.replace('2025.09.01','2025.02.30'))+'Page 1/1');
  rejects('invalid page count',table(row)+'Page 1/3001');
  const doc=new DOMParser().parseFromString('<base href="https://dkucard.dukekunshan.edu.cn/dku/english"><form action="https://other.example/dku/searchmydtl"></form><form id="english-query" action="/dku/searchmydtl"><input name="_csrf" value="synthetic"></form>','text/html');
  check('query form is independent of translated IDs',DKUCollector.findSearchForm(doc).id==='english-query');
  return results;
})();
