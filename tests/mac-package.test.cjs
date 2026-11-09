const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {findPython}=require('../scripts/package-mac.cjs');
for(const arch of ['arm64','x64']){
  const archive=process.env['DKU_MAC_ZIP_'+arch.toUpperCase()];
  test(`macOS ${arch} ZIP preserves executable modes, architecture and manifest integrity`,{skip:!archive},()=>{
    const result=spawnSync(findPython(),[path.join(__dirname,'../scripts/mac-archive.py'),'verify',archive],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},windowsHide:true,timeout:60000});
    assert.equal(result.status,0,result.stderr);
    const verified=JSON.parse(result.stdout);
    assert.equal(verified.arch,arch);assert.equal(verified.executableModes,'0755');
    const checksum=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    assert.equal(fs.readFileSync(archive+'.sha256','utf8').split(' ')[0],checksum);
  });
}
