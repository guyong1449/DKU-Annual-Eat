const path=require('node:path');
const os=require('node:os');
function browserCandidates(platform=process.platform,env=process.env,home=os.homedir()){
  if(platform==='darwin')return ['Google Chrome.app/Contents/MacOS/Google Chrome','Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    .flatMap(app=>['/Applications',path.posix.join(home,'Applications')].map(base=>path.posix.join(base,app)));
  if(platform==='win32')return ['Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe']
    .flatMap(app=>[env.PROGRAMFILES,env.LOCALAPPDATA,env['PROGRAMFILES(X86)']].filter(Boolean).map(base=>path.win32.join(base,app)));
  return [];
}
const launcherFile=(platform=process.platform)=>platform==='darwin'?'启动.command':'启动.cmd';
module.exports={browserCandidates,launcherFile};
