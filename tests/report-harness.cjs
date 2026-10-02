const vm=require('node:vm');
// Minimal DOM surface for exercising the report's render and filter events in Node.
module.exports=function renderReport(html){
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}});return elements.get(id);};
  const charts=['bar','line'].map(type=>({...element(type),dataset:{chart:type}}));
  const document={getElementById:element,querySelectorAll(selector){
    if(selector==='[data-chart]')return charts;
    if(selector==='.merchant-tag')return [...element('merchant-tags').innerHTML.matchAll(/data-index="(\d+)"/g)].map(m=>{const b=element('tag-'+m[1]);b.dataset.index=m[1];return b;});
    throw new Error('Unexpected selector: '+selector);
  }};
  const script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
  vm.runInNewContext(script,{document,window:{print(){}}},{timeout:2000});
  return {element,charts};
};
