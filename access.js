'use strict';
(()=>{
 const config=window.PortfolioAccessConfig||{};
 const ready=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url||'')&&Boolean(config.publicKey);
 const dialog=document.getElementById('access-dialog');
 const form=document.getElementById('access-form');
 const notice=document.getElementById('access-status');
 const results=document.getElementById('access-results');
 const email=document.getElementById('access-email');
 const code=document.getElementById('access-code');
 const projectField=document.getElementById('access-project');
 const details=document.getElementById('access-request-fields');
 const sendCode=document.getElementById('access-send-code');
 const verify=document.getElementById('access-verify');
 const submit=document.getElementById('access-submit');
 const refresh=document.getElementById('access-refresh');
 const signout=document.getElementById('access-signout');
 let session=null,owner=false,busy=false;
 const names={'sound-diary':'Sound Diary','evaluation-studio':'Evaluation Studio'};
 function message(text){notice.textContent=text;}
 function state(){
  email.disabled=Boolean(session)||busy||!ready;
  code.disabled=Boolean(session)||busy||!ready;
  sendCode.disabled=Boolean(session)||busy||!ready;
  verify.disabled=Boolean(session)||busy||!ready;
  submit.disabled=!session||busy||owner;
  refresh.disabled=!session||busy;
  signout.hidden=!session;signout.disabled=busy;
  details.hidden=owner;
 }
 async function api(path,options={}){
  const response=await fetch(config.url+path,{...options,headers:{apikey:config.publicKey,...(session?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json',...options.headers}});
  if(!response.ok){
   if(response.status===401){session=null;owner=false;state();}
   throw new Error(response.status===401?'Your session expired. Verify your email again.':'The request could not be completed. Check your connection and try again.');
  }
  return response.status===204?null:response.json();
 }
 async function task(action){
  if(busy)return;busy=true;state();
  try{await action();}catch(error){message(error.message);}finally{busy=false;state();}
 }
 function open(project){
  projectField.value=project||'sound-diary';results.replaceChildren();
  document.getElementById('access-title').textContent=project?'Request project access':'Manage project access';
  message(ready?'Verify your email, then send your request. Justine reviews each request personally.':'Access requests are not available yet. Please contact Justine by email.');
  state();dialog.showModal();
  if(session)task(loadRequests);
 }
 document.querySelectorAll('[data-request-project]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.requestProject)));
 document.getElementById('access-manage').addEventListener('click',()=>open(null));
 document.getElementById('access-close').addEventListener('click',()=>dialog.close());
 sendCode.addEventListener('click',()=>task(async()=>{
  if(!email.checkValidity()){email.reportValidity();return;}
  await api('/auth/v1/otp',{method:'POST',body:JSON.stringify({email:email.value.trim(),create_user:true})});
  message('Check your email for the sign-in code. Enter it below.');code.focus();
 }));
 verify.addEventListener('click',()=>task(async()=>{
  if(!email.checkValidity()){email.reportValidity();return;}
  if(!code.checkValidity()){code.reportValidity();return;}
  session=await api('/auth/v1/verify',{method:'POST',body:JSON.stringify({email:email.value.trim(),token:code.value.trim(),type:'email'})});
  if(!session.access_token){session=null;throw new Error('Email verification failed. Request another code.');}
  code.value='';owner=await api('/rest/v1/rpc/portfolio_is_owner',{method:'POST',body:'{}'});
  message(owner?'Signed in as owner. Review and decide on requests below.':'Email verified. You can request access or check your existing request.');
  await loadRequests();
 }));
 signout.addEventListener('click',()=>task(async()=>{
  try{await api('/auth/v1/logout',{method:'POST'});}finally{session=null;owner=false;code.value='';results.replaceChildren();message('Signed out.');}
 }));
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!session||owner)return;
  task(async()=>{
   const values={name:document.getElementById('access-name').value,email:session.user.email,message:document.getElementById('access-reason').value};
   const checked=FormValidation.validate(values);
   if(!checked.valid){message(Object.values(checked.errors).join(' '));return;}
   await api('/rest/v1/rpc/portfolio_request_access',{method:'POST',body:JSON.stringify({p_project:projectField.value,p_name:checked.data.name,p_reason:checked.data.message})});
   message('Request received. Justine will review it. Check your status here after signing in.');
   await loadRequests();
  });
 });
 refresh.addEventListener('click',()=>task(loadRequests));
 async function loadRequests(){
  results.replaceChildren();
  const rows=await api('/rest/v1/portfolio_access_requests?select=id,project,name,email,reason,status,expires_at&order=created_at.desc');
  if(!rows.length){const p=document.createElement('p');p.textContent='No requests yet.';results.append(p);return;}
  rows.forEach(row=>{
   const item=document.createElement('article');item.className='access-request';
   const title=document.createElement('h3');title.textContent=names[row.project]||row.project;
   const status=document.createElement('p');
   const expired=row.expires_at&&Date.parse(row.expires_at)<=Date.now();
   status.textContent='Status: '+(row.status==='approved'&&expired?'expired':row.status)+(row.expires_at?' · Access expires '+new Date(row.expires_at).toLocaleString():'');
   item.append(title,status);
   if(owner){
    const info=document.createElement('p');info.textContent=row.name+' · '+row.email;
    const reason=document.createElement('p');reason.textContent=row.reason;item.append(info,reason);
    [['approved','Approve for 7 days'],['declined','Decline'],['revoked','Revoke']].forEach(([decision,label])=>{
     const button=document.createElement('button');button.type='button';button.className='outline-button';button.textContent=label;
     button.addEventListener('click',()=>task(async()=>{
      await api('/rest/v1/rpc/portfolio_decide_access',{method:'POST',body:JSON.stringify({p_id:row.id,p_status:decision})});
      message('Decision saved. Visitors can check their status here.');await loadRequests();
     }));item.append(button);
    });
   }else if(row.status==='approved'&&!expired){
    const button=document.createElement('button');button.type='button';button.className='outline-button';
    button.textContent=row.project==='sound-diary'?'Download Sound Diary':'Open Evaluation Studio';
    if(row.project==='evaluation-studio'&&!config.evaluationUrl){button.disabled=true;button.textContent='Project access is being configured';}
    button.addEventListener('click',()=>task(async()=>{
     // Recheck approval on the server before delivering access.
     const approved=await api('/rest/v1/rpc/portfolio_has_access',{method:'POST',body:JSON.stringify({p_project:row.project})});
     if(!approved)throw new Error('Access has expired or was revoked.');
     if(row.project==='sound-diary'){
      const response=await fetch(config.url+'/storage/v1/object/authenticated/portfolio-private/Sound-Diary.apk',{headers:{apikey:config.publicKey,Authorization:'Bearer '+session.access_token}});
      if(!response.ok)throw new Error('The download is not available. Please contact Justine.');
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='Sound-Diary.apk';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
     }else{
      const url=new URL(config.evaluationUrl);if(url.protocol!=='https:')throw new Error('Project access is not configured.');
      const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.click();
     }
     document.dispatchEvent(new CustomEvent('portfolio-approved-action',{detail:{project:row.project}}));
    }));item.append(button);
   }
   results.append(item);
  });
 }
 state();
})();
