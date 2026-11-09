'use strict';

function createImageExporter(){
  const pending=new Map();
  function sync(button,key){
    const busy=pending.has(key);
    button.disabled=busy;button.setAttribute('aria-busy',String(busy));
    if(busy)pending.get(key).add(button);
  }
  async function run(key,button,task){
    if(pending.has(key)){sync(button,key);return;}
    const buttons=new Set([button]);pending.set(key,buttons);sync(button,key);
    try{return await task();}
    finally{pending.delete(key);buttons.forEach(button=>sync(button,key));}
  }
  return {sync,run,get size(){return pending.size;}};
}

function saveShareImage(share,filename){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onerror=()=>reject(new Error('Unable to render image'));
    image.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=share.width;canvas.height=share.height;
        canvas.getContext('2d').drawImage(image,0,0,share.width,share.height);
        canvas.toBlob(blob=>{
          if(!blob){reject(new Error('Unable to encode image'));return;}
          const link=document.createElement('a');
          link.href=URL.createObjectURL(blob);link.download=filename;link.click();
          setTimeout(()=>{URL.revokeObjectURL(link.href);resolve();},1000);
        },'image/png');
      }catch(error){reject(error);}
    };
    image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(share.svg);
  });
}

module.exports={createImageExporter,saveShareImage};
