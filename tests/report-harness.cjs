const vm=require('node:vm');
// Minimal DOM surface for exercising the report's render and filter events in Node.
module.exports=function renderReport(html,stored={}){
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',dataset:{},attributes:{},listeners:{},before(node){node.beforeTarget=this;},getAttribute(k){return this.attributes[k];},setAttribute(k,v){this.attributes[k]=v;},addEventListener(type,fn){this.listeners[type]=fn;}});return elements.get(id);};
  const markup=html.slice(0,html.lastIndexOf('<script>')),texts=[],aria=[];
  for(const match of markup.matchAll(/<image id="([^"]+)"[^>]* href="([^"]+)"/g))element(match[1]).attributes.href=match[2];
  for(const [index,match] of [...markup.matchAll(/<([\w-]+)\b([^>]*\bdata-en="([^"]*)"[^>]*)>([^<]*)<\/\1>/g)].entries()){
    const el=element(/\bid="([^"]*)"/.exec(match[2])?.[1]||'text-'+index);el.dataset.en=match[3];el.textContent=match[4];texts.push(el);
  }
  for(const [index,match] of [...markup.matchAll(/<[\w-]+\b([^>]*\bdata-en-aria="([^"]*)"[^>]*)>/g)].entries()){
    const el=element(/\bid="([^"]*)"/.exec(match[1])?.[1]||'aria-'+index);el.dataset.enAria=match[2];el.attributes['aria-label']=/aria-label="([^"]*)"/.exec(match[1])?.[1];aria.push(el);
  }
  const charts=['bar','line'].map(type=>({...element(type),dataset:{chart:type}}));
  const document={documentElement:{},getElementById:element,querySelectorAll(selector){
    if(selector==='[data-en]')return texts;
    if(selector==='[data-en-aria]')return aria;
    if(selector==='[data-chart]')return charts;
    if(selector==='.merchant-tag')return [...element('merchant-tags').innerHTML.matchAll(/data-index="(\d+)"/g)].map(m=>{const b=element('tag-'+m[1]);b.dataset.index=m[1];return b;});
    throw new Error('Unexpected selector: '+selector);
  }};
  const script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const window={printCalls:0,print(){this.printCalls++;}};
  const getComputedStyle=()=>({getPropertyValue(name){return new RegExp(name+':([^;}]+)').exec(html)?.[1]||'';}});
  const localStorage={getItem:key=>stored[key],setItem(key,value){stored[key]=value;}};
  vm.runInNewContext(script,{document,window,localStorage,getComputedStyle,Image:class {}},{timeout:2000});
  return {element,charts,window,document,stored};
};
