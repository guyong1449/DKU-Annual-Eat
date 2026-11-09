const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const {files:windowsFiles,nodeVersion}=require('./package.cjs');
const root=path.resolve(__dirname,'..');
const checksums={arm64:'a1a54f46a750d2523d628d924aab61758a51c9dad3e0238beb14141be9615dd3',x64:'f2879eb810e25993a0578e5d878930266fd2eafcffe9f2839b3d8db354d4879e'};
const files=[...windowsFiles.filter(file=>file!=='启动.cmd'),'启动.command'];
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
    archiveTool(python,['extract',runtimeArchive,nodeName,product,arch]);
    fs.writeFileSync(path.join(product,'使用说明.txt'),[
      `DKU Annual Eat · macOS ${arch==='arm64'?'Apple 芯片':'Intel'}免安装版`,'',
      '需要 macOS 13.5+ 和 Chrome 或 Edge；Safari 不支持自动采集。',
      '1. 用访达完整解压 ZIP，保留整个文件夹。',
      '2. 双击「启动.command」，无需安装 Node.js 或 Python。',
      '3. 点击「采集新数据」，在学校页面登录。',
      '4. 查看历史报告时直接打开「查看报告.html」。','',
      '数据与登录会话只保存在本机 private 文件夹；更新程序时保留该文件夹。',
      '本包未完成 Apple Developer ID 签名、公证及 Mac 真机验收。',
      '如果 macOS 拦截启动，请核对来源与校验值，并参阅 Apple 官方说明：',
      'https://support.apple.com/102445',
      '不要关闭 Gatekeeper 或移除整个目录的隔离属性。',
      '启动失败请查看 private/launcher.log；Apple 芯片和 Intel 必须下载对应版本。',
      `内置 Node.js ${nodeVersion}；运行环境许可见 runtime/LICENSE。`
    ].join('\n'),'utf8');
    const version=require('../package.json').version;
    const manifest={version,platform:'darwin',arch,minimumOS:'13.5',nodeVersion,nodeSource:source,nodeArchiveSha256:checksums[arch],
      validation:'cross-built; native macOS launch and school login not verified',
      files:[...files,'runtime/node','runtime/LICENSE','runtime/architecture','使用说明.txt'].map(file=>({file,sha256:sha(path.join(product,file))}))};
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
