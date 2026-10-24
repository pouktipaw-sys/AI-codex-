export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const token=sessionStorage.getItem('flow-token');
 const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const error=await response.json().catch(()=>({detail:'Request failed'}));throw new Error(typeof error.detail==='string'?error.detail:'Invalid request')}
 return response.json();
}
