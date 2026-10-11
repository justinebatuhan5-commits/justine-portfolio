const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(isOwner){
 const nodes=new Map(),calls=[];
 const element=()=>({value:'',hidden:false,children:[],listeners:{},addEventListener(n,f){this.listeners[n]=f},replaceChildren(){this.children=[]},append(...x){this.children.push(...x)},checkValidity(){return true},reportValidity(){},showModal(){},close(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const project=element();project.dataset={requestProject:'evaluation-studio'};
 const context={window:{PortfolioAccessConfig:{url:'https://example.supabase.co',publicKey:'public'}},document:{getElementById:get,querySelectorAll:()=>[project],createElement:element},AbortSignal,URL,Date,setTimeout,FormValidation:{},fetch:async(path)=>{
  calls.push(path);
  const data=path.endsWith('/verify')?{access_token:'test',user:{id:'visitor-id',email:'person@example.com'}}:path.endsWith('/portfolio_is_owner')?isOwner:[];
  return {ok:true,status:200,json:async()=>data};
 }};
 vm.runInNewContext(fs.readFileSync('access.js','utf8'),context);
 const login=async()=>{get('access-email').value='person@example.com';get('access-code').value='123456';await get('access-verify').listeners.click();};
 return {get,calls,project,login};
}
test('Manage shows no visitor fields and rejects a verified non-owner',async()=>{
 const s=setup(false);s.get('access-manage').listeners.click();
 assert.equal(s.get('access-request-fields').hidden,true);
 await s.login();assert.match(s.get('access-status').textContent,/not an administrator/);
 assert.equal(s.calls.some(x=>x.includes('portfolio_access_requests?')),false);
 assert.equal(s.get('access-refresh').disabled,true);
});
test('Request reveals fields after verification and queries only selected project for signed-in user',async()=>{
 const s=setup(false);s.project.listeners.click();assert.equal(s.get('access-request-fields').hidden,true);
 await s.login();assert.equal(s.get('access-request-fields').hidden,false);
 assert(s.calls.some(x=>x.includes('user_id=eq.visitor-id&project=eq.evaluation-studio')));
});
test('Verified owner in Manage can load inbox without visitor form',async()=>{
 const s=setup(true);s.get('access-manage').listeners.click();await s.login();
 assert.equal(s.get('access-request-fields').hidden,true);
 assert.equal(s.get('access-refresh').disabled,false);
 assert(s.calls.some(x=>x.includes('portfolio_access_requests?')&&!x.includes('user_id=eq.')));
});
