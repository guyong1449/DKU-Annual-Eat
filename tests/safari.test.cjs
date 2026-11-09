const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {SafariBrowser, errors} = require('../scripts/safari.cjs');
const {browserOptions} = require('../scripts/browser.cjs');
const {collectInBrowser} = require('../scripts/collection.cjs');
const campus = 'https://dkucard.dukekunshan.edu.cn';
const runner = fs.readFileSync(path.join(__dirname, '../scripts/safari.jxa'), 'utf8');

function safariHarness() {
  let nextId = 100, denied = false;
  const windows = [], calls = [], scripts = [];
  function tab(initialURL) {
    let url = initialURL;
    const context = vm.createContext({location:{origin:new URL(url).origin}, AbortController, URL,
      document:{readyState:'complete',baseURI:campus+'/dku/english',forms:[{
        getAttribute:() => '/dku/searchmydtl', querySelector:() => ({})
      }], querySelector:() => ({})}});
    context.window = context;
    return {context, get url() { return () => url; }, set url(value) { url = value; context.location.origin = new URL(url).origin; }};
  }
  function makeWindow(url) {
    const id = nextId++, tabs = [tab(url)];
    const window = {id:() => id, tabs:() => tabs, close() { windows.splice(windows.indexOf(window), 1); }};
    windows.push(window);
    return window;
  }
  const personal = makeWindow('https://example.com/personal');
  const safari = {
    running:() => true,
    windows:() => windows,
    Document:({url}) => ({make:() => makeWindow(url)}),
    activate() {},
    doJavaScript(script, {in:target}) {
      if (denied) throw new Error('Enable Allow JavaScript from Apple Events');
      scripts.push(script);
      return vm.runInContext(script, target.context);
    }
  };
  const context = vm.createContext({Application:name => {assert.equal(name,'com.apple.Safari'); return safari;}});
  vm.runInContext(runner, context);
  const execute = async (executable, args, options) => {
    assert.equal(executable, '/usr/bin/osascript');
    assert.deepEqual(args.slice(0,2), ['-l','JavaScript']);
    assert.equal(path.basename(args[2]), 'safari.jxa');
    assert.equal(options.timeout, 25000);
    calls.push(JSON.parse(args[3]));
    try { return {stdout:vm.runInContext(`run(${JSON.stringify([args[3]])})`, context)}; }
    catch (error) { throw Object.assign(new Error('osascript failed'), {stderr:error.message}); }
  };
  const browser = new SafariBrowser({origins:[campus,'http://127.0.0.1:1234'], execute});
  return {browser, execute, windows, personal, calls, scripts, denyJavaScript() {denied=true;}};
}

test('Mac discovery falls back to Safari and offers it alongside the installed Chromium browser', () => {
  assert.deepEqual(browserOptions('darwin', () => false), [{id:'safari',name:'Safari'}]);
  assert.deepEqual(browserOptions('win32', () => false), []);
  const options = browserOptions('darwin', file => file.includes('Google Chrome'));
  assert.deepEqual(options.map(option => option.id), ['chromium','safari']);
  assert.equal(options[0].name,'Google Chrome');
});

test('Safari transport executes expressions and round-trips JSON only in its own window', async () => {
  const app = safariHarness();
  const page = await app.browser.openPage(campus+'/dku/index');
  assert.deepEqual(app.calls.map(call => call.operation), ['open','evaluate','navigate']);
  assert.equal(await app.browser.getTargetURL(page.targetId), campus+'/dku/index');
  const value = {text:'中文 "quoted"\nnext', cents:-1234};
  assert.deepEqual(await app.browser.evaluate(JSON.stringify(value), page.sessionId), value);
  await assert.rejects(() => app.browser.evaluate('1', app.personal.id()), /不属于/);
  await assert.rejects(() => app.browser.openPage('https://example.com'), /允许范围/);
  await app.browser.showPage('http://127.0.0.1:1234/report/example');
  await app.browser.close();
  assert.deepEqual(app.windows, [app.personal]);
});

test('Safari checks origin again before JavaScript, detects changed tabs and handles closed windows', async () => {
  const app = safariHarness(), page = await app.browser.openPage(campus+'/dku/index');
  const window = app.windows.find(window => window.id() === page.targetId);
  const count = app.scripts.length;
  window.tabs()[0].url = 'https://dkucard.dukekunshan.edu.cn.evil.example/';
  await assert.rejects(() => app.browser.evaluate('1', page.sessionId), /Execution context was destroyed/);
  assert.equal(app.scripts.length, count);
  window.tabs().push({});
  await assert.rejects(() => app.browser.getTargetURL(page.targetId), /原来的一个标签页/);
  window.close();
  await assert.rejects(() => app.browser.getTargetURL(page.targetId), /窗口已关闭/);
  await app.browser.close();
  assert.deepEqual(app.windows, [app.personal]);
});

test('Safari permission failures are actionable and a failed setup closes only its new window', async () => {
  const app = safariHarness();
  app.denyJavaScript();
  await assert.rejects(() => app.browser.openPage(campus+'/dku/index'), new RegExp(errors.javascript));
  assert.deepEqual(app.windows, [app.personal]);
  assert.equal(app.browser.windows.size, 0);
  for (const [stderr, message] of [['Not authorized to send Apple events to Safari. (-1743)',errors.automation],
    ['Allow JavaScript from Apple Events',errors.javascript]]) {
    const browser = new SafariBrowser({origins:[campus], execute:async () => {throw Object.assign(new Error('failed'),{stderr});}});
    await assert.rejects(() => browser.openPage(campus+'/dku/index'), new RegExp(message));
  }
});

test('shared collection runs through the Safari bridge and aborts without returning partial data', async () => {
  const data = {version:1,source:'dkucard',start:'2026-01-01',end:'2026-01-31',account:'所有账户',complete:true,
    records:[{id:'test',time:'2026-01-02 10:30',type:'Expense',merchant:'Dining',cents:-1200,status:'Successful'}]};
  const sources = `window.DKUCollector={browserReader:()=>null,collect:async()=>(${JSON.stringify(data)})};`;
  for (const cancel of [false,true]) {
    const app = safariHarness(), page = await app.browser.openPage(campus+'/dku/index');
    let cancelled = false, clock = 0;
    const options = {client:app.browser,...page,sources,start:data.start,end:data.end,
      getTargetURL:() => app.browser.getTargetURL(page.targetId), now:() => clock,
      cancelled:() => cancelled, pause:async ms => {clock+=ms;cancelled=cancel;}};
    if (cancel) await assert.rejects(() => collectInBrowser(options), /取消/);
    else assert.deepEqual(await collectInBrowser(options), data);
    const context = app.windows.find(window => window.id() === page.targetId).tabs()[0].context;
    assert.equal(context.__dkuAppAbort.signal.aborted,true);
    assert.equal(context.__dkuAppData,undefined);
    await app.browser.close();
  }
});

test('quitting Safari while a window opens waits for and closes the owned window', async () => {
  const app = safariHarness();
  let finish;
  const pending = new Promise(resolve => {finish=resolve;});
  const browser = new SafariBrowser({origins:[campus], execute:async (...args) => {
    if (JSON.parse(args[1].at(-1)).operation === 'open') await pending;
    return app.execute(...args);
  }});
  const opening = browser.openPage(campus+'/dku/index');
  const rejected = assert.rejects(() => opening, /窗口已关闭/);
  const closing = browser.close();
  finish();
  await Promise.all([rejected, closing]);
  assert.deepEqual(app.windows, [app.personal]);
  assert.equal(browser.isConnected(),false);
  await assert.rejects(() => browser.openPage(campus), /窗口已关闭/);
});
