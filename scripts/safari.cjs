const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');

const executeFile = promisify(execFile);
const errors = {
  automation:'请在“系统设置 → 隐私与安全性 → 自动化”中允许启动程序控制 Safari，然后重试',
  javascript:'请在 Safari 开发者设置中开启“允许来自 Apple Events 的 JavaScript”，然后重试',
  'window-closed':'Safari 采集窗口已关闭，请重新开始采集',
  'tab-changed':'请在 Safari 采集窗口中仅保留原来的一个标签页，然后重试',
  'window-creation':'未能创建独立 Safari 窗口，请重试',
  'page-reloading':'Execution context was destroyed (Safari navigation)'
};

class SafariBrowser {
  constructor({origins, execute = executeFile}) {
    this.origins = origins.map(origin => new URL(origin).origin);
    this.execute = execute;
    this.windows = new Set();
    this.opening = new Set();
    this.closing = false;
  }
  isConnected() { return !this.closing; }
  async command(operation, windowId, extra = {}) {
    if (operation !== 'open' && !this.windows.has(windowId)) throw new Error('Safari 窗口不属于本工具');
    let stdout;
    try {
      ({stdout} = await this.execute('/usr/bin/osascript', ['-l', 'JavaScript', path.join(__dirname, 'safari.jxa'),
        JSON.stringify({operation, windowId, ...extra})], {timeout:25000, maxBuffer:32 * 1024 * 1024, windowsHide:true}));
    } catch (error) {
      const detail = String(error.stderr || '');
      if (/-1743|not authori[sz]ed|not permitted to send Apple events/i.test(detail)) throw new Error(errors.automation);
      if (/JavaScript.*Apple.*[Ee]vents|Apple.*[Ee]vents.*JavaScript|JavaScript.*Apple.*事件|Apple.*事件.*JavaScript/i.test(detail)) throw new Error(errors.javascript);
      if (error.killed || error.code === 'ETIMEDOUT') throw new Error('Safari 操作超时，请检查权限提示后重试');
      throw new Error('Safari 操作失败，请检查浏览器和自动化权限后重试');
    }
    let response;
    try { response = JSON.parse(stdout.trim()); } catch { throw new Error('Safari 返回了无效结果，请重试'); }
    if (!response.ok) throw new Error(errors[response.code] || response.message || 'Safari 操作失败，请重试');
    return response.value;
  }
  openPage(url) {
    if (this.closing) return Promise.reject(new Error(errors['window-closed']));
    const opening = this.createPage(url);
    this.opening.add(opening);
    return opening.finally(() => this.opening.delete(opening));
  }
  async createPage(url) {
    if (!this.origins.includes(new URL(url).origin)) throw new Error('Safari 页面地址不在允许范围内');
    const windowId = await this.command('open');
    if (!Number.isSafeInteger(windowId) || windowId <= 0) throw new Error(errors['window-creation']);
    this.windows.add(windowId);
    try {
      if (this.closing) throw new Error(errors['window-closed']);
      // Test the permission on our blank page, before the user starts school sign-in.
      await this.command('evaluate', windowId, {expression:'1', origins:this.origins, allowBlank:true});
      await this.command('navigate', windowId, {url});
      return {targetId:windowId, sessionId:windowId};
    } catch (error) {
      await this.closePage(windowId).catch(() => {});
      throw error;
    }
  }
  getTargetURL(targetId) { return this.command('url', targetId); }
  evaluate(expression, sessionId) {
    return this.command('evaluate', sessionId, {expression, origins:this.origins});
  }
  async releasePage() {}
  async showPage(url) { await this.openPage(url); }
  async closePage(windowId) {
    try { await this.command('close', windowId); }
    finally { this.windows.delete(windowId); }
  }
  async close() {
    this.closing = true;
    await Promise.allSettled([...this.opening]);
    await Promise.allSettled([...this.windows].map(windowId => this.closePage(windowId)));
  }
}

module.exports = {SafariBrowser, errors};
