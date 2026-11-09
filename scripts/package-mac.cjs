const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const {files:windowsFiles,nodeVersion}=require('./package.cjs');
const root=path.resolve(__dirname,'..');
const checksums={arm64:'a1a54f46a750d2523d628d924aab61758a51c9dad3e0238beb14141be9615dd3',x64:'f2879eb810e25993a0578e5d878930266fd2eafcffe9f2839b3d8db354d4879e'};
const files=[...windowsFiles.filter(file=>file!=='启动.cmd'),'启动.command'];
const securityGuide='安全性设置方法.png';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function findPython(){
  for(const candidate of [process.env.DKU_PYTHON,'python3','python'].filter(Boolean)){
    const result=spawnSync(candidate,['-c','import sys;sys.exit(0 if sys.version_info >= (3,9) else 1)'],{windowsHide:true,stdio:'ignore',timeout:5000});
    if(result.status===0)return candidate;
  }
  throw new Error('Building the Mac ZIP requires Python 3.9+ (standard library only). Set DKU_PYTHON if needed.');
}
function archiveTool(python,args){
  const result=spawnSync(python,[path.join(__dirname,'mac-archive.py'),...args],{encoding:'utf8',windowsHide:true,env:{...process.env,PYTHONUTF8:'1'},timeout:180000});
  if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'Archive operation failed');
  if(result.stdout.trim())console.log(result.stdout.trim());
}
async function build(arch){
  if(!checksums[arch])throw new Error('Choose arm64 (Apple silicon) or x64 (Intel).');
  const python=findPython();require('./build.cjs');
  const privateDir=path.join(root,'private');fs.mkdirSync(privateDir,{recursive:true});
  const cache=path.join(privateDir,'package-cache');fs.mkdirSync(cache,{recursive:true});
  const nodeName=`node-v${nodeVersion}-darwin-${arch}`;
  const runtimeArchive=path.join(cache,nodeName+'.tar.gz');
  const source=`https://nodejs.org/dist/v${nodeVersion}/${nodeName}.tar.gz`;
  if(!fs.existsSync(runtimeArchive)||sha(runtimeArchive)!==checksums[arch]){
    console.log(`Downloading official macOS ${arch} runtime...`);
    const response=await fetch(source,{signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`Download failed: ${response.status}`);
    const partial=runtimeArchive+'.part';
    try{
      await pipeline(response.body,fs.createWriteStream(partial));
      if(sha(partial)!==checksums[arch])throw new Error('Official runtime checksum mismatch');
      fs.renameSync(partial,runtimeArchive);
    }finally{if(fs.existsSync(partial))fs.unlinkSync(partial);}
  }
  const staging=fs.mkdtempSync(path.join(privateDir,'mac-package-build-'));
  try{
    const product=path.join(staging,'DKU-Annual-Eat');
    for(const file of files){
      const destination=path.join(product,file);fs.mkdirSync(path.dirname(destination),{recursive:true});
      if(file.endsWith('.command'))fs.writeFileSync(destination,fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),'utf8');
      else fs.copyFileSync(path.join(root,file),destination);
    }
    fs.copyFileSync(path.join(root,'docs','macos',securityGuide),path.join(product,securityGuide));
    archiveTool(python,['extract',runtimeArchive,nodeName,product,arch]);
    fs.writeFileSync(path.join(product,'使用说明.txt'),[
      `DKU Annual Eat · macOS ${arch==='arm64'?'Apple 芯片 / Apple silicon':'Intel'} · Portable`,'',
      '需要 macOS 13.5+ 和 Chrome 或 Edge；Safari 不支持自动采集。',
      'Requires macOS 13.5+ and Chrome or Edge for collection.','',
      '1. 用访达完整解压 ZIP，保留整个文件夹。',
      '   Extract the complete ZIP in Finder and keep the folder intact.',
      '2. 双击「启动.command」，无需安装 Node.js 或 Python。',
      '   Double-click 启动.command. Node.js is included; Python is not required.',
      '3. 点击「采集新数据」，在学校页面登录。',
      '   Click Collect new data and sign in on the school page.',
      '4. 查看历史报告时直接打开「查看报告.html」。','',
      '   Open 查看报告.html to view saved reports offline.','',
      '数据与登录会话只保存在本机 private 文件夹；更新程序时保留该文件夹。',
      'Records and the browser session are stored locally in private/. Keep it when updating.','',
      '更新时先退出旧工具并备份 private/，将新版解压到新文件夹，再把旧版 private/ 复制到新版目录后启动。',
      'To update, exit the old tool and back up private/, extract the new ZIP into a separate folder, copy private/ into it, then launch.','',
      '本包未完成 Apple Developer ID 签名、公证及 Mac 真机验收。',
      'This package is unsigned, unnotarized, and not yet verified on a physical Mac.','',
      '首次被系统拦截时 / If macOS blocks the first launch',
      `图示见同目录「${securityGuide}」。`,
      `For the illustrated steps, open ${securityGuide} in this folder.`,
      '确认下载来自本项目的 GitHub Releases，且 ZIP 校验值与附带的 .sha256 一致。',
      'Check that the ZIP came from this project’s GitHub Releases and matches its .sha256 file.',
      '1. 先双击一次「启动.command」，让系统显示拦截提示。',
      '   Try opening 启动.command once so macOS shows the blocked-file notice.',
      '2. 打开「系统设置」→「隐私与安全性」，向下滚动至「安全性」。',
      '   Open System Settings → Privacy & Security and scroll to Security.',
      '3. 找到刚被阻止的「启动.command」或「node」，点击「仍要打开」。',
      '   Find the notice for the blocked 启动.command or node and click Open Anyway.',
      '4. 在随后提示中点击「打开」，完成系统要求的验证，再双击「启动.command」。',
      '   Click Open in the confirmation, complete any authentication requested, then launch 启动.command again.',
      '如果随后单独拦截 runtime/node，对该文件重复上述批准，再重新运行「启动.command」。',
      'If runtime/node is blocked separately, repeat the approval for that file and run 启动.command again.',
      '系统会保存该文件的打开许可。每次使用仍从「启动.command」启动。',
      'macOS saves an exception for that file. Continue using 启动.command to start the tool.',
      'Apple 官方步骤 / Apple instructions: https://support.apple.com/102445','',
      '启动失败请查看 private/launcher.log；Apple 芯片和 Intel 必须下载对应版本。',
      'For launch errors, see private/launcher.log. Use the package matching your Mac’s processor.',
      `内置 Node.js ${nodeVersion}；运行环境许可见 runtime/LICENSE。`
    ].join('\n'),'utf8');
    const version=require('../package.json').version;
    const manifest={version,platform:'darwin',arch,minimumOS:'13.5',nodeVersion,nodeSource:source,nodeArchiveSha256:checksums[arch],
      validation:'cross-built; native macOS launch and school login not verified',
      files:[...files,securityGuide,'runtime/node','runtime/LICENSE','runtime/architecture','使用说明.txt'].map(file=>({file,sha256:sha(path.join(product,file))}))};
    fs.writeFileSync(path.join(product,'release-manifest.json'),JSON.stringify(manifest,null,2),'utf8');
    const name=`DKU-Annual-Eat-${version}-mac-${arch}.zip`;
    const temp=path.join(staging,name);archiveTool(python,['pack',product,temp]);archiveTool(python,['verify',temp]);
    const release=path.join(root,'release');fs.mkdirSync(release,{recursive:true});
    const output=path.join(release,name);fs.copyFileSync(temp,output);
    fs.writeFileSync(output+'.sha256',`${sha(output)}  ${name}\n`,'utf8');
    console.log(`Built ${output} (${(fs.statSync(output).size/1024/1024).toFixed(1)} MiB)`);
    return output;
  }finally{
    const resolved=path.resolve(staging);
    if(path.dirname(resolved)!==path.resolve(privateDir)||!path.basename(resolved).startsWith('mac-package-build-'))throw new Error('Invalid staging cleanup path');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}
if(require.main===module)(async()=>{for(const arch of process.argv[2]?[process.argv[2]]:['arm64','x64'])await build(arch);})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={build,checksums,files,findPython};
