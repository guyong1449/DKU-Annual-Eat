'use strict';
(async () => {
  try {
    const {data} = await DKUStore.get(new URL(location.href).searchParams.get('id'));
    const model=reportModel(DKUAnnual.summarize(data));
    const language=createLanguage(),range=createReportRange(model,language),eat=createEatTI(),imageExports=createImageExporter();
    reportApp(model,filterPeriod,language,eat,saveShareImage,range,imageExports);
    personalityApp(model,eat,language,saveShareImage,range,imageExports);
    const nav=document.createElement('nav');nav.className='extension-export';
    const back=document.createElement('a');back.className='button secondary';back.href='app.html';
    const html=document.createElement('button'),json=document.createElement('button'),status=document.createElement('p');status.setAttribute('role','status');
    nav.append(back,html,json,status);document.querySelector('.report-navigation').before(nav);
    function labels(){back.textContent=language.t('报告库','My reports');html.textContent=language.t('保存离线 HTML','Save offline HTML');json.textContent=language.t('导出 JSON','Export JSON');}
    labels();language.onChange(labels);
    const filename=`dku-${data.start}_${data.end}`;
    function download(contents,type,name){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
    json.onclick=()=>download(JSON.stringify(data,null,2),'application/json',filename+'.json');
    html.onclick=async()=>{
      html.disabled=true;status.textContent=language.t('正在生成离线报告…','Preparing offline report…');
      try{
        const response=await fetch('offline-template.html');if(!response.ok)throw new Error('报告模板不可用');
        const template=await response.text();
        const serialized=JSON.stringify(model).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
        const contents=template.replace('__DKU_REPORT_MODEL__',()=>serialized);
        const script=/<script>([\s\S]*?)<\/script>/.exec(contents)[1];
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(script));
        const hash=btoa(String.fromCharCode(...new Uint8Array(digest)));
        download(contents.replace(/script-src 'sha256-[^']+'/,()=>`script-src 'sha256-${hash}'`),'text/html',filename+'.html');
        status.textContent=language.t('已导出，可直接用浏览器离线打开','Exported. Open the HTML in any browser, even offline.');
      }catch(e){status.textContent=e.message;}finally{html.disabled=false;}
    };
  }catch(error){document.querySelector('main').replaceChildren();const p=document.createElement('p');p.className='notice';p.textContent=error.message;document.querySelector('main').append(p);}
})();
