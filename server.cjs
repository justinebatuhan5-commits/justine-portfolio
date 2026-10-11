'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=__dirname;
const files=new Map([['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/script.js','script.js'],['/validation.js','validation.js'],['/assets/justine-profile.png','assets/justine-profile.png'],['/assets/student-hero.png','assets/student-hero.png']]);
files.set('/assets/favicon.svg','assets/favicon.svg');
files.set('/assets/favicon.png','assets/favicon.png');
files.set('/access.js','access.js');
files.set('/access-config.js','access-config.js');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.apk':'application/vnd.android.package-archive'};
const securityHeaders={
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action mailto:",
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Cache-Control':'no-store'
};
function createServer(){return http.createServer(async(request,response)=>{
 for(const [key,value] of Object.entries(securityHeaders))response.setHeader(key,value);
 const fail=(code,message)=>{response.writeHead(code,{'Content-Type':'text/plain; charset=utf-8'});response.end(request.method==='HEAD'?undefined:message);};
 if(!/^((localhost|127\.0\.0\.1)(:\d+)?)$/.test(request.headers.host||'')){fail(403,'Forbidden');return;}
 if(!['GET','HEAD'].includes(request.method)){response.setHeader('Allow','GET, HEAD');fail(405,'Method not allowed');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{fail(400,'Invalid URL');return;}
 const relative=files.get(pathname);if(!relative){fail(404,'Not found');return;}
 try{
  const resolved=await fs.realpath(path.join(root,relative));
  if(!resolved.startsWith(root+path.sep)){fail(403,'Forbidden');return;}
  if(path.extname(resolved)==='.apk')response.setHeader('Content-Disposition','attachment; filename="Sound-Diary.apk"');
  const data=await fs.readFile(resolved);response.writeHead(200,{'Content-Type':mime[path.extname(resolved)],'Content-Length':data.length});response.end(request.method==='HEAD'?undefined:data);
 }catch{fail(404,'Not found');}
});}
if(require.main===module)createServer().listen(4173,'127.0.0.1',()=>console.log('Portfolio preview: http://127.0.0.1:4173'));
module.exports={createServer,securityHeaders};
