const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const root=path.resolve(__dirname,'..');
const nodeVersion='24.14.0';
// Official https://nodejs.org/dist/v24.14.0/SHASUMS256.txt checksums.
const checksums={x64:'313fa40c0d7b18575821de8cb17483031fe07d95de5994f6f435f3b345f85c66',arm64:'88d36e8109736a2fa9bdc596f2cf507a3c52c69cdf96e54f8acd473ec14be853'};
const files=['启动.cmd','查看报告.html','LICENSE','README.md','package.json','dist/index.html',
  'scripts/start.cjs','scripts/launch.cjs','scripts/cdp.cjs','scripts/library.cjs','scripts/build.cjs','scripts/platform.cjs',
  'src/app.js','src/index.html','src/core.js','src/collector.js','src/report.js','src/language.js','src/share.js','src/theme.css',
  'src/personality.js','src/personality.css',...require('../src/personality.js').createEatTI().types.map(({id})=>`src/assets/characters/${id}.png`)];
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function powershell(command,env){
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{
    env:{...process.env,...env},encoding:'utf8',windowsHide:true,timeout:120000
  });
  if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'Archive operation failed');
}
async function build(arch=process.arch){
  if(process.platform!=='win32')throw new Error('Build this Windows package on Windows.');
  if(!checksums[arch])throw new Error('Supported architectures: x64, arm64.');
  require('./build.cjs');
  const privateDir=path.join(root,'private');fs.mkdirSync(privateDir,{recursive:true});
  const cache=path.join(privateDir,'package-cache');fs.mkdirSync(cache,{recursive:true});
  const nodeName=`node-v${nodeVersion}-win-${arch}`;
  const archive=path.join(cache,nodeName+'.zip');
  const source=`https://nodejs.org/dist/v${nodeVersion}/${nodeName}.zip`;
  if(!fs.existsSync(archive)||sha(archive)!==checksums[arch]){
    console.log('Downloading verified Node.js runtime from nodejs.org...');
    const response=await fetch(source,{signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`Runtime download failed: ${response.status}`);
    const partial=archive+'.part';
    try{
      await pipeline(response.body,fs.createWriteStream(partial));
      if(sha(partial)!==checksums[arch])throw new Error('Runtime checksum mismatch. Package was not built.');
      fs.renameSync(partial,archive);
    }finally{if(fs.existsSync(partial))fs.unlinkSync(partial);}
  }
  const staging=fs.mkdtempSync(path.join(privateDir,'package-build-'));
  try{
    powershell("$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:DKU_ARCHIVE -DestinationPath $env:DKU_EXTRACT",{DKU_ARCHIVE:archive,DKU_EXTRACT:path.join(staging,'node')});
    const product=path.join(staging,'DKU-Annual-Eat');
    for(const file of files){const dest=path.join(product,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
    fs.mkdirSync(path.join(product,'runtime'));
    for(const file of ['node.exe','LICENSE'])fs.copyFileSync(path.join(staging,'node',nodeName,file),path.join(product,'runtime',file));
    fs.writeFileSync(path.join(product,'使用说明.txt'),[
      'DKU Annual Eat · 免安装版','',
      '1. 完整解压此文件夹（不要直接在压缩包里运行）。',
      '2. 双击「启动.cmd」，无需安装 Node.js。需要电脑已安装 Chrome 或 Edge。',
      '3. 点击「采集新数据」，在学校页面完成登录。',
      '4. 下次直接打开「查看报告.html」；打开后可收藏，离线也能看。','',
      '数据和登录会话只保存在本机 private 文件夹。请保留该文件夹，不要分享。',
      '二维码只适合链接到下载页；本版本面向 Windows 电脑，不能在手机上运行。',
      '源代码与说明：https://github.com/guyong1449/DKU-Annual-Eat',
      `包含 Node.js ${nodeVersion} (${arch})，许可见 runtime/LICENSE。`
    ].join('\r\n'),'utf8');
    const version=require('../package.json').version;
    const manifest={version,platform:'win32',arch,nodeVersion,nodeSource:source,nodeArchiveSha256:checksums[arch],
      files:[...files,'runtime/node.exe','runtime/LICENSE','使用说明.txt'].map(file=>({file,sha256:sha(path.join(product,file))}))};
    fs.writeFileSync(path.join(product,'release-manifest.json'),JSON.stringify(manifest,null,2),'utf8');
    const release=path.join(root,'release');fs.mkdirSync(release,{recursive:true});
    const name=`DKU-Annual-Eat-${version}-win-${arch}.zip`;
    const temp=path.join(staging,name),output=path.join(release,name);
    powershell("$ErrorActionPreference='Stop'; Compress-Archive -LiteralPath $env:DKU_PRODUCT -DestinationPath $env:DKU_OUTPUT -CompressionLevel Optimal",{DKU_PRODUCT:product,DKU_OUTPUT:temp});
    fs.copyFileSync(temp,output);
    fs.writeFileSync(output+'.sha256',`${sha(output)}  ${name}\n`,'utf8');
    console.log(`Built ${output} (${(fs.statSync(output).size/1024/1024).toFixed(1)} MiB)`);
    return output;
  }finally{
    const resolved=path.resolve(staging);
    if(path.dirname(resolved)!==path.resolve(privateDir)||!path.basename(resolved).startsWith('package-build-'))throw new Error('Invalid staging cleanup path');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}
if(require.main===module)build(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={files,checksums,nodeVersion,build};
