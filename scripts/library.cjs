const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const core=require('../src/core.js');
const {launcherFile}=require('./platform.cjs');

function atomicWrite(file,content){
  const temp=file+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
  try{fs.writeFileSync(temp,content,'utf8');fs.renameSync(temp,file);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}

class ReportLibrary{
  constructor(directory){
    this.directory=directory;
    this.manifest=path.join(directory,'report-library.json');
    this.items=[];this.warnings=[];
    fs.mkdirSync(path.join(directory,'library'),{recursive:true});
    let previous=[];
    if(fs.existsSync(this.manifest)){
      try{previous=JSON.parse(fs.readFileSync(this.manifest,'utf8'));if(!Array.isArray(previous))throw new Error();previous=previous.filter(item=>item&&typeof item==='object');}
      catch{this.warnings.push('历史索引损坏，已从原始 JSON 恢复；原报告和数据仍保留。');previous=[];}
    }
    const used=new Set();
    for(const file of fs.readdirSync(directory).filter(file=>/^dku-[a-zA-Z0-9._-]+\.json$/.test(file))){
      try{
        const data=this.readFile(file);
        const old=previous.find(item=>item.file===file&&/^[a-f0-9]{48}$/.test(item.id)&&!used.has(item.id));
        const id=old?.id||crypto.randomBytes(24).toString('hex');used.add(id);
        const savedAt=fs.statSync(path.join(directory,file)).mtime.toISOString();
        this.items.push({id,file,savedAt,start:data.start,end:data.end,count:data.records.length});
      }catch{this.warnings.push(`${file} 未通过完整性检查，未加入历史列表；原文件未改动。`);}
    }
    this.items.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||b.file.localeCompare(a.file));
    atomicWrite(this.manifest,JSON.stringify(this.items,null,2));
  }
  readFile(file){
    const data=core.validateDataset(JSON.parse(fs.readFileSync(path.join(this.directory,file),'utf8')));
    if(!data.complete)throw new Error('采集尚未完整');
    return data;
  }
  get(id){return this.items.find(item=>item.id===id);}
  data(id){const item=this.get(id);if(!item)throw new Error('报告不存在');return this.readFile(item.file);}
  list(){return this.items.map(item=>({...item,reportName:item.file.replace(/\.json$/,'.html'),reportURL:'/report/'+item.id,dataURL:'/data/'+item.id}));}
  html(id){return fs.readFileSync(path.join(this.directory,'library',id+'.html'),'utf8');}
  render(item){atomicWrite(path.join(this.directory,'library',item.id+'.html'),core.reportHTML(this.data(item.id)));}
  save(input,label){
    const data=core.validateDataset(input);
    if(!data.complete)throw new Error('采集尚未完整，未保存为正式报告');
    if(!/^(all|custom|\d{4})$/.test(label))throw new Error('范围无效');
    const id=crypto.randomBytes(24).toString('hex');
    const savedAt=new Date().toISOString();
    const file=`dku-${label}-${savedAt.replace(/[:.]/g,'-')}-${id.slice(0,8)}.json`;
    const html=core.reportHTML(data);
    // Save the source first: an interrupted render can be recovered on next launch.
    atomicWrite(path.join(this.directory,file),JSON.stringify(data,null,2));
    atomicWrite(path.join(this.directory,'library',id+'.html'),html);
    const item={id,file,savedAt,start:data.start,end:data.end,count:data.records.length};
    this.items.unshift(item);
    atomicWrite(this.manifest,JSON.stringify(this.items,null,2));
    return this.list()[0];
  }
  publish(origin,{refresh=false}={}){
    for(const item of this.items){
      if(refresh||!fs.existsSync(path.join(this.directory,'library',item.id+'.html')))this.render(item);
    }
    const e=core.escapeHTML;
    const cards=this.items.map(item=>`<article><h2>${e(item.start)} — ${e(item.end)}</h2><p>保存于 ${e(new Date(item.savedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}))} · ${item.count} 条记录</p><nav><a href="library/${item.id}.html">查看报告 / EatTI</a><a href="library/${item.id}.html" download="${e(item.file.replace(/\.json$/,'.html'))}">保存 HTML</a><a href="${encodeURIComponent(item.file)}" download>导出 JSON</a></nav></article>`).join('');
    atomicWrite(path.join(this.directory,'home.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>DKU Annual Eat · 我的报告</title><style>body{margin:0;background:#f3f6fa;color:#172641;font:16px/1.7 'Segoe UI','Microsoft YaHei',sans-serif}main{max-width:960px;margin:auto;padding:40px 20px}h1{color:#044384}article,.intro{background:white;border:1px solid #dce3ec;border-radius:16px;padding:24px;margin:20px 0}h2{font-size:19px;margin:0}p{color:#627085}nav{display:flex;flex-wrap:wrap;gap:16px}a{color:#044384;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #047444;outline-offset:4px}code{overflow-wrap:anywhere}</style></head><body><main><h1>我的校园消费报告</h1><section class="intro"><strong>收藏此页：退出工具、重启电脑后也能查看。</strong><p>报告与数据保存在这台电脑，阅读历史报告无需登录、无需联网。最新数据截至 ${e(this.items[0]?.end||'尚未采集')}，不会自动同步学校流水。</p><p>需要更新数据时，双击项目中的「${e(launcherFile())}」，再点击「采集新数据」。浏览器书签不能启动本地程序。</p><nav><a href="${e(origin)}">打开采集工具（需先启动）</a><a href="../README.md">使用说明</a></nav></section>${this.warnings.map(w=>`<p>${e(w)}</p>`).join('')}${cards||'<article>还没有已保存的报告。请启动工具完成第一次采集。</article>'}</main></body></html>`);
  }
}
module.exports={ReportLibrary,atomicWrite};
