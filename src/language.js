'use strict';

// Embedded in both the launcher and saved reports, including offline copies.
function createLanguage(){
  let lang='zh';
  try{lang=(localStorage.getItem('dku-lang')||localStorage.getItem('eatti-lang'))==='en'?'en':'zh';}catch{}
  const listeners=[];
  const t=(zh,en)=>lang==='zh'?zh:en;
  function apply(){
    document.documentElement.lang=lang==='zh'?'zh-CN':'en';
    document.querySelectorAll('[data-en]').forEach(el=>{
      if(el.dataset.zh===undefined)el.dataset.zh=el.textContent;
      el.textContent=t(el.dataset.zh,el.dataset.en);
    });
    document.querySelectorAll('[data-en-aria]').forEach(el=>{
      if(el.dataset.zhAria===undefined)el.dataset.zhAria=el.getAttribute('aria-label');
      el.setAttribute('aria-label',t(el.dataset.zhAria,el.dataset.enAria));
    });
    const button=document.getElementById('language-toggle');
    button.textContent=t('English','中文');
    button.setAttribute('aria-label',t('Switch to English','切换为中文'));
    button.onclick=()=>set(lang==='zh'?'en':'zh');
  }
  function set(next){
    lang=next==='en'?'en':'zh';
    try{localStorage.setItem('dku-lang',lang);}catch{}
    apply();listeners.forEach(fn=>fn());
  }
  apply();
  return {get lang(){return lang;},t,set,onChange(fn){listeners.push(fn);}};
}

module.exports={createLanguage};
