const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {ReportLibrary}=require('../scripts/library.cjs');
const data={version:1,source:'dkucard',start:'2025-01-01',end:'2025-12-31',account:'所有账户',complete:true,records:[]};
function directory(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dku-library-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;
}
test('legacy snapshots are restored with stable links and readable offline reports after restart',t=>{
  const dir=directory(t);const source=JSON.stringify(data);
  fs.writeFileSync(path.join(dir,'dku-2025-old.json'),source);
  fs.writeFileSync(path.join(dir,'dku-2025-old.html'),'original report');
  const first=new ReportLibrary(dir);first.publish('http://127.0.0.1:47836',{refresh:true});
  const item=first.list()[0];assert.equal(item.count,0);
  assert.match(first.html(item.id),/EatTI/);
  const home=fs.readFileSync(path.join(dir,'home.html'),'utf8');
  assert.ok(home.includes(`library/${item.id}.html`));assert.ok(!home.includes('<script'));
  const second=new ReportLibrary(dir);assert.deepEqual(second.list(),first.list());
  assert.deepEqual(second.data(item.id),data);
  assert.equal(fs.readFileSync(path.join(dir,'dku-2025-old.json'),'utf8'),source);
  assert.equal(fs.readFileSync(path.join(dir,'dku-2025-old.html'),'utf8'),'original report');
});
test('malformed and incomplete data never replace a valid snapshot; unrelated files are ignored',t=>{
  const dir=directory(t);
  fs.writeFileSync(path.join(dir,'dku-good.json'),JSON.stringify(data));
  fs.writeFileSync(path.join(dir,'dku-broken.json'),'{');
  fs.writeFileSync(path.join(dir,'dku-partial.json'),JSON.stringify({...data,complete:false}));
  fs.writeFileSync(path.join(dir,'app-instance.json'),'{}');
  const library=new ReportLibrary(dir);
  assert.equal(library.list().length,1);assert.equal(library.warnings.length,2);
  assert.throws(()=>library.save({...data,complete:false},'2025'),/完整/);
  assert.equal(library.list().length,1);
  assert.throws(()=>library.data('../app-instance.json'),/不存在/);
});
test('new snapshots survive restart and do not overwrite old data or links',t=>{
  const dir=directory(t);const library=new ReportLibrary(dir);
  const old=library.save(data,'2025');const fresh=library.save({...data,end:'2026-01-01'},'all');
  library.publish('http://127.0.0.1:47836');
  assert.notEqual(old.id,fresh.id);assert.notEqual(old.file,fresh.file);
  const restored=new ReportLibrary(dir);assert.equal(restored.list().length,2);
  assert.equal(restored.data(old.id).end,'2025-12-31');
  assert.equal(restored.data(fresh.id).end,'2026-01-01');
  assert.ok(fs.readFileSync(path.join(dir,'home.html'),'utf8').includes(fresh.id));
});
test('a damaged index is rebuilt from source files without deleting sources',t=>{
  const dir=directory(t);
  fs.writeFileSync(path.join(dir,'dku-old.json'),JSON.stringify(data));
  fs.writeFileSync(path.join(dir,'report-library.json'),'broken');
  const restored=new ReportLibrary(dir);assert.equal(restored.list().length,1);
  assert.match(restored.warnings[0],/索引损坏/);
  assert.deepEqual(restored.data(restored.items[0].id),data);
});
