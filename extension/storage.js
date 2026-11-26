'use strict';
// IndexedDB belongs to the extension origin; it is never synchronized to an account.
globalThis.DKUStore = (() => {
  let opening;
  function database() {
    return opening ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('dku-annual-eat', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('reports', {keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { opening = null; reject(request.error); };
    });
  }
  async function transact(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reports', mode);
      const request = operation(tx.objectStore('reports'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('本地报告保存失败'));
    });
  }
  async function save(input) {
    const data = DKUAnnual.validateDataset(input);
    if (!data.complete) throw new Error('采集尚未完成，未保存部分报告');
    const item = {id:crypto.randomUUID(), savedAt:new Date().toISOString(), data};
    await transact('readwrite', store => store.add(item));
    return item.id;
  }
  async function list() {
    const items = await transact('readonly', store => store.getAll());
    return items.sort((a,b) => b.savedAt.localeCompare(a.savedAt)).map(({id,savedAt,data}) =>
      ({id,savedAt,start:data.start,end:data.end,count:data.records.length}));
  }
  async function get(id) {
    const item = await transact('readonly', store => store.get(id));
    if (!item) throw new Error('报告不存在，请回到报告库重新选择');
    return {...item,data:DKUAnnual.validateDataset(item.data)};
  }
  return {save,list,get};
})();
