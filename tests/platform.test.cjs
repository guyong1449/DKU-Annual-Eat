const {test}=require('node:test');
const assert=require('node:assert/strict');
const {browserCandidates,launcherFile}=require('../scripts/platform.cjs');
test('macOS finds native Chrome and Edge in system and user Applications folders',()=>{
  const candidates=browserCandidates('darwin',{},'/Users/test user');
  assert.ok(candidates.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  assert.ok(candidates.includes('/Users/test user/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'));
  assert.ok(candidates.every(file=>!file.includes('\\')&&!file.endsWith('.exe')));
  assert.equal(launcherFile('darwin'),'启动.command');
});
test('Windows browser discovery keeps existing install paths and supports 64-bit Edge',()=>{
  const candidates=browserCandidates('win32',{PROGRAMFILES:'C:\\Program Files',LOCALAPPDATA:'C:\\Users\\a\\AppData\\Local','PROGRAMFILES(X86)':'C:\\Program Files (x86)'});
  assert.ok(candidates.includes('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  assert.ok(candidates.includes('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'));
  assert.ok(candidates.includes('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'));
  assert.equal(launcherFile('win32'),'启动.cmd');
});
test('unsupported platforms do not guess a browser installation',()=>{
  assert.deepEqual(browserCandidates('linux',{},'/home/test'),[]);
});
