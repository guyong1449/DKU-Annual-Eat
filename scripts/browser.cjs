const fs = require('node:fs');
const path = require('node:path');
const {spawn, execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {CDP} = require('./cdp.cjs');
const {SafariBrowser} = require('./safari.cjs');
const {browserCandidates} = require('./platform.cjs');
const executeFile = promisify(execFile);

function browserOptions(platform = process.platform, exists = fs.existsSync) {
  const executable = browserCandidates(platform).find(exists);
  const options = executable ? [{id:'chromium', name:executable.includes('Edge') ? 'Microsoft Edge' : 'Google Chrome', executable}] : [];
  if (platform === 'darwin') options.push({id:'safari', name:'Safari'});
  return options;
}

async function openDashboard({browser, profile, url, debug = false}) {
  if (!browser) throw new Error('未找到 Chrome 或 Edge，请先安装其中一个浏览器');
  if (browser.id === 'safari') {
    await executeFile('/usr/bin/open', ['-b', 'com.apple.Safari', url], {timeout:10000});
    return;
  }
  const args = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'];
  if (debug) args.push('--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0');
  const child = spawn(browser.executable, [...args, url], {stdio:'ignore', detached:true, windowsHide:false});
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
}

async function createBrowser({browser, profile, origin, onDisconnect}) {
  if (browser.id === 'safari') return new SafariBrowser({origins:[origin, 'https://dkucard.dukekunshan.edu.cn']});
  await openDashboard({browser, profile, url:origin, debug:true});
  const deadline = Date.now() + 30000;
  let client;
  while (Date.now() < deadline) {
    try {
      const [port, socketPath] = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/);
      if (!/^\d+$/.test(port) || !socketPath.startsWith('/devtools/browser/')) throw new Error('Browser not ready');
      client = await CDP.connect(`ws://127.0.0.1:${port}${socketPath}`);
      break;
    } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  if (!client) throw new Error('专用浏览器未就绪。请关闭本工具的专用窗口，再双击启动。');
  client.socket.addEventListener('close', onDisconnect);
  return {
    isConnected:() => client.socket.readyState === WebSocket.OPEN,
    async openPage(url) {
      const {targetId} = await client.send('Target.createTarget', {url});
      const {sessionId} = await client.send('Target.attachToTarget', {targetId, flatten:true});
      return {targetId, sessionId};
    },
    async getTargetURL(targetId) { return (await client.send('Target.getTargetInfo', {targetId})).targetInfo.url; },
    evaluate:(expression, sessionId) => client.evaluate(expression, sessionId),
    async releasePage({sessionId}) { await client.send('Target.detachFromTarget', {sessionId}); },
    async showPage(url) {
      const {targetId} = await client.send('Target.createTarget', {url});
      await client.send('Target.activateTarget', {targetId});
    },
    async close() { await client.send('Browser.close'); }
  };
}

module.exports = {browserOptions, openDashboard, createBrowser};
