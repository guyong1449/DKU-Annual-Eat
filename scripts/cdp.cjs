// Minimal CDP client for the isolated browser started by this application.
class CDP {
  constructor(socket) {
    this.socket=socket; this.next=0; this.pending=new Map();
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      const entry=this.pending.get(message.id);
      if(!entry)return;
      this.pending.delete(message.id);clearTimeout(entry.timer);
      if(message.error)entry.reject(new Error(message.error.message));else entry.resolve(message.result);
    });
    socket.addEventListener('close',()=>{
      for(const entry of this.pending.values()){clearTimeout(entry.timer);entry.reject(new Error('专用浏览器已关闭'));}
      this.pending.clear();
    });
  }
  static async connect(url) {
    const socket=new WebSocket(url);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{socket.close();reject(new Error('连接专用浏览器超时'));},10000);
      socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
      socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('无法连接专用浏览器'));},{once:true});
    });
    return new CDP(socket);
  }
  send(method,params={},sessionId) {
    if(this.socket.readyState!==WebSocket.OPEN)return Promise.reject(new Error('专用浏览器未连接'));
    return new Promise((resolve,reject)=>{
      const id=++this.next;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('浏览器操作超时'));},25000);
      this.pending.set(id,{resolve,reject,timer});
      this.socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
    });
  }
  async evaluate(expression,sessionId) {
    const response=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false},sessionId);
    if(response.exceptionDetails){
      const details=response.exceptionDetails;
      const message=(details.exception?.description||details.text||'页面执行失败，请刷新校园卡页面后重试').split('\n')[0];
      throw new Error(message.replace(/^(?:Error|TypeError):\s*/,''));
    }
    return response.result?.value;
  }
}
module.exports={CDP};
