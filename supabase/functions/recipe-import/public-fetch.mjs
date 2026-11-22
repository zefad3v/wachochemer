import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {BlockList,isIP} from 'node:net';
import {Readable} from 'node:stream';
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(address,prefix,'ipv6');
export function publicAddress(address){
 if(isIP(address)===4)return !blocked.check(address,'ipv4');
 // Only global IPv6 unicast; reject mapped IPv4, local and documentation ranges.
 return isIP(address)===6 && /^[23]/i.test(address) && !blocked.check(address,'ipv6');
}
// Pin the validated DNS result to the actual TLS connection, keeping hostname verification.
export async function publicFetch(url,{signal}={}){
 const addresses=await lookup(url.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(row=>!publicAddress(row.address)))throw Error('source');
 const chosen=addresses[0];
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',signal,agent:false,headers:{Accept:'text/html'},
   lookup:(_host,options,callback)=>options.all?callback(null,[chosen]):callback(null,chosen.address,chosen.family)},res=>{
    const headers=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
    resolve(new Response(Readable.toWeb(res),{status:res.statusCode,headers}));
   });
  req.on('error',reject);req.end();
 });
}
