const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const {createServer}=require('./server.cjs');
test('preview serves approval interface but denies former public APK route',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const get=path=>new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port,path},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject));
 try{
  assert.equal((await get('/access.js')).status,200);
  assert.equal((await get('/access-config.js')).status,200);
  assert.equal((await get('/assets/downloads/Sound-Diary.apk')).status,404);
  const home=await get('/');assert.equal(home.status,200);
  assert(!home.body.includes('href="assets/downloads/Sound-Diary.apk"'));
  assert(!home.body.includes('href="https://instructor-evaluation-helper'));
  assert(home.body.includes('data-request-project="evaluation-studio"'));
  assert(home.body.includes('data-request-project="sound-diary"'));
  assert(home.body.includes('href="https://www.santafbeachclub.com/frontend/index"'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('public configuration uses a publishable key and no unprotected project link',()=>{
 const config=fs.readFileSync('access-config.js','utf8');
 assert(config.includes("publicKey:'sb_publishable_"));assert(!config.includes('sb_secret_'));assert(config.includes("evaluationUrl:'https://instructor-evaluation-helper.cozy-wood-7455.chatgpt.site'"));
});
