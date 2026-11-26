const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist','extension');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {reportHTML,reportModel,filterPeriod,createReportRange,reportApp,groupCounters}=require('../src/report.js');
const {createLanguage}=require('../src/language.js');
const {createEatTI,personalityApp}=require('../src/personality.js');
const {createImageExporter,saveShareImage}=require('../src/share.js');
function build(){
  fs.mkdirSync(output,{recursive:true});
  for(const file of ['manifest.json','storage.js','background.js','content.js','app.html','app.js','extension.css'])fs.copyFileSync(path.join(root,'extension',file),path.join(output,file));
  for(const file of ['core.js','collector.js','theme.css'])fs.copyFileSync(path.join(root,'src',file),path.join(output,file));
  fs.writeFileSync(path.join(output,'language.js'),createLanguage.toString()+'\n','utf8');
  const runtime=[groupCounters,reportModel,filterPeriod,createReportRange,reportApp,createLanguage,createEatTI,personalityApp,createImageExporter,saveShareImage].map(fn=>fn.toString()).join('\n');
  new vm.Script(runtime);fs.writeFileSync(path.join(output,'report-runtime.js'),runtime,'utf8');
  fs.copyFileSync(path.join(root,'extension/report-entry.js'),path.join(output,'report-entry.js'));
  const model=reportModel({data:{start:'2026-01-01',end:'2026-12-31',complete:true,records:[]},years:[]});
  const template=reportHTML({data:{start:model.start,end:model.end,complete:true,records:[]},years:[]});
  const serialized=JSON.stringify(model).replace(/</g,'\\u003c');
  fs.writeFileSync(path.join(output,'offline-template.html'),template.replace('const model='+serialized,'const model=__DKU_REPORT_MODEL__'),'utf8');
  const page=template.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,'')
    .replace(/<script>[\s\S]*?<\/script>/,'<script src="core.js"></script><script src="storage.js"></script><script src="report-runtime.js"></script><script src="report-entry.js"></script>')
    .replace('</head>','<link rel="stylesheet" href="extension.css"></head>');
  fs.writeFileSync(path.join(output,'report.html'),page,'utf8');
  fs.copyFileSync(path.join(root,'LICENSE'),path.join(output,'LICENSE'));
  fs.copyFileSync(path.join(root,'docs/extension.md'),path.join(output,'README.md'));
  for(const file of fs.readdirSync(output).filter(file=>file.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(output,file),'utf8'),{filename:file});
  console.log('Built '+output);
  if(process.argv.includes('--zip')){
    const version=require('../package.json').version;
    const release=path.join(root,'release','v'+version);fs.mkdirSync(release,{recursive:true});
    const archive=path.join(release,`DKU-Annual-Eat-${version}-extension.zip`);
    const files=['manifest.json','storage.js','background.js','content.js','app.html','app.js','extension.css','core.js','collector.js','theme.css','language.js','report-runtime.js','report-entry.js','offline-template.html','report.html','LICENSE','README.md'];
    const result=spawnSync('python',['-c','import json,pathlib,sys,zipfile; source=pathlib.Path(sys.argv[1]); archive=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED); [archive.write(source/name,name) for name in json.loads(sys.argv[3])]; archive.close()',output,archive,JSON.stringify(files)],{encoding:'utf8',windowsHide:true});
    if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'ZIP build failed');
    console.log('Packaged '+archive);
  }
}
if(require.main===module)build();
module.exports={build,output};
