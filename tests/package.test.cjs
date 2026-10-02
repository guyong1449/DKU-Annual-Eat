const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const archive=process.env.DKU_PACKAGE_ZIP;
test('portable ZIP includes verified runtime and only declared application files, without personal data',{skip:!archive},()=>{
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`
    $ErrorActionPreference='Stop'
    [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip=[IO.Compression.ZipFile]::OpenRead($env:DKU_PACKAGE_ZIP)
    try {
      $entries=@(foreach($entry in $zip.Entries) {
        if($entry.Name -eq '') { continue }
        $stream=$entry.Open()
        try {
          if($entry.Name -eq 'release-manifest.json') {
            $reader=[IO.StreamReader]::new($stream)
            $manifest=$reader.ReadToEnd() | ConvertFrom-Json
          } else {
            $sha=[Security.Cryptography.SHA256]::Create()
            try { $hash=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
            @{file=$entry.FullName.Replace('\\','/');sha256=$hash}
          }
        } finally { $stream.Dispose() }
      })
      @{manifest=$manifest;entries=$entries} | ConvertTo-Json -Depth 8 -Compress
    } finally { $zip.Dispose() }
  `],{encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(result.status,0,result.stderr);
  const {manifest,entries}=JSON.parse(result.stdout);
  assert.equal(manifest.platform,'win32');
  assert.equal(manifest.nodeArchiveSha256,require('../scripts/package.cjs').checksums[manifest.arch]);
  const actual=new Map(entries.map(item=>[item.file.replace(/^DKU-Annual-Eat\//,''),item.sha256]));
  assert.equal(actual.size,manifest.files.length);
  for(const item of manifest.files){assert.equal(actual.get(item.file),item.sha256,item.file);assert.doesNotMatch(item.file,/(^|\/)(private|\.git|browser-session)(\/|$)/);}
  for(const required of ['runtime/node.exe','runtime/LICENSE','启动.cmd','scripts/launch.cjs','dist/index.html'])assert.ok(actual.has(required),required);
  const sha=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  assert.equal(fs.readFileSync(archive+'.sha256','utf8').split(' ')[0],sha);
});
