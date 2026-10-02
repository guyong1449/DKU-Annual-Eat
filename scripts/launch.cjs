const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
if(Number(process.versions.node.split('.')[0])<22){
  console.error('Node.js 22+ is required. Please use the portable download.');process.exit(1);
}
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'private'),{recursive:true});
const output=fs.openSync(path.join(root,'private','launcher.log'),'a');
const child=spawn(process.execPath,[path.join(__dirname,'start.cjs')],{
  cwd:root,detached:true,windowsHide:true,stdio:['ignore',output,output,'ipc']
});
fs.closeSync(output);
let finished=false;
const timer=setTimeout(()=>finish('Startup timed out. See private/launcher.log.'),45000);
function finish(error){
  if(finished)return;finished=true;clearTimeout(timer);
  if(child.connected)child.disconnect();child.unref();
  if(error){console.error(error);process.exitCode=1;}
  else console.log('DKU Annual Eat is ready.');
}
child.on('message',message=>{
  if(message?.type==='ready')finish();
  if(message?.type==='error')finish(message.message);
});
child.on('error',error=>finish(error.message));
child.on('exit',()=>{if(!finished)finish('Startup failed. See private/launcher.log.');});
