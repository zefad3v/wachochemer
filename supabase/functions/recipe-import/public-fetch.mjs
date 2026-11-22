import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(address,prefix,'ipv6');
export function publicAddress(address){
 if(isIP(address)===4)return !blocked.check(address,'ipv4');
 // Only global IPv6 unicast; reject mapped IPv4, local and documentation ranges.
 return isIP(address)===6 && /^[23]/i.test(address) && !blocked.check(address,'ipv6');
}
const MAX_BODY=4_000_000,MAX_WIRE=4_100_000;
export function decodeHttp(bytes){
 let offset=0,status,headers;
 while(true){
  let end=-1;for(let i=offset;i<Math.min(bytes.length-3,offset+65536);i++)if(bytes[i]===13&&bytes[i+1]===10&&bytes[i+2]===13&&bytes[i+3]===10){end=i;break;}
  if(end<0)throw Error('page');
  const lines=new TextDecoder().decode(bytes.subarray(offset,end)).split('\r\n');
  const match=/^HTTP\/1\.[01] (\d{3})\b/.exec(lines.shift());if(!match)throw Error('page');
  status=Number(match[1]);headers=new Headers();
  for(const line of lines){const i=line.indexOf(':');if(i<1)throw Error('page');headers.append(line.slice(0,i),line.slice(i+1).trim());}
  offset=end+4;if(status>=200)break;if(status===101)throw Error('page');
 }
 let body=bytes.subarray(offset);
 const transfer=headers.get('transfer-encoding');
 if(transfer){
  if(transfer.toLowerCase()!=='chunked')throw Error('page');
  const chunks=[];let at=0,size=0;
  while(true){
   let end=at;while(end<body.length-1&&!(body[end]===13&&body[end+1]===10))end++;
   const line=new TextDecoder().decode(body.subarray(at,end));if(!/^[\da-f]+(?:;[^\r\n]*)?$/i.test(line))throw Error('page');
   const length=parseInt(line,16);at=end+2;if(length===0)break;
   if(!Number.isSafeInteger(length)||length>MAX_BODY-size)throw Error('size');
   if(at+length+2>body.length||body[at+length]!==13||body[at+length+1]!==10)throw Error('page');
   chunks.push(body.subarray(at,at+length));size+=length;at+=length+2;
  }
  body=new Uint8Array(size);let pos=0;for(const c of chunks){body.set(c,pos);pos+=c.length;}
 }else if(headers.has('content-length')){
  const length=Number(headers.get('content-length'));if(!Number.isSafeInteger(length)||length<0||length!==body.length)throw Error('page');
 }
 if(body.length>MAX_BODY)throw Error('size');
 return {status,headers,body};
}
// Connect to the vetted IP, then verify TLS and SNI against the original hostname.
// Supabase's older Node compatibility layer does not support HTTPS lookup callbacks.
export async function publicFetch(url,{signal}={}){
 const addresses=await lookup(url.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(row=>!publicAddress(row.address)))throw Error('source');
 let conn;
 const close=()=>{try{conn?.close();}catch{}};
 signal?.throwIfAborted();signal?.addEventListener('abort',close,{once:true});
 try{
  conn=await Deno.connect({hostname:addresses[0].address,port:443});signal?.throwIfAborted();
  conn=await Deno.startTls(conn,{hostname:url.hostname,alpnProtocols:['http/1.1']});signal?.throwIfAborted();
  const request=new TextEncoder().encode('GET '+url.pathname+url.search+' HTTP/1.1\r\nHost: '+url.host+'\r\nAccept: text/html\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n');
  let written=0;while(written<request.length)written+=await conn.write(request.subarray(written));
  const parts=[];let size=0;
  while(true){const buffer=new Uint8Array(32768);const n=await conn.read(buffer);if(n===null)break;size+=n;if(size>MAX_WIRE)throw Error('size');parts.push(buffer.subarray(0,n));}
  const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length;}
  const {status,headers,body}=decodeHttp(bytes);
  if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')throw Error('page');
  return new Response([204,205,304].includes(status)?null:body,{status,headers});
 }finally{signal?.removeEventListener('abort',close);close();}
}
