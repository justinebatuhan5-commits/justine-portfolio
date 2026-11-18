'use strict';
(()=>{
 if(!location.search||!window.history||typeof window.history.replaceState!=='function')return;
 const params=new URLSearchParams(location.search);
 const trackingKeys=new Set(['fbclid','gclid','gbraid','wbraid','dclid','msclkid','igshid','ttclid','twclid','li_fat_id','yclid','mc_cid','mc_eid']);
 let changed=false;
 for(const key of [...params.keys()]){
  const lower=key.toLowerCase();
  if(trackingKeys.has(lower)||lower.startsWith('utm_')){
   params.delete(key);
   changed=true;
  }
 }
 if(!changed)return;
 const query=params.toString();
 const cleanUrl=location.pathname+(query?'?'+query:'')+location.hash;
 try{window.history.replaceState(window.history.state,'',cleanUrl);}catch{}
})();
const themeButton=document.getElementById('theme-toggle');
let theme='light';try{theme=localStorage.getItem('portfolio-theme')==='dark'?'dark':'light';}catch{}
function applyTheme(){document.documentElement.dataset.theme=theme;themeButton.setAttribute('aria-label',`Switch to ${theme==='light'?'dark':'light'} theme`);document.querySelector('meta[name="theme-color"]').content=theme==='light'?'#ffffff':'#20242b';}
applyTheme();themeButton.addEventListener('click',()=>{theme=theme==='light'?'dark':'light';applyTheme();try{localStorage.setItem('portfolio-theme',theme);}catch{}});
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab){tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;const panel=document.getElementById(item.getAttribute('aria-controls'));panel.hidden=!active;panel.classList.remove('panel-enter');if(active){void panel.offsetWidth;panel.classList.add('panel-enter');}});}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTab(tabs[next]);tabs[next].focus();});});
const pageTabs={about:'about-tab',resume:'resume-tab',work:'portfolio-tab',portfolio:'portfolio-tab',contact:'contact-tab'};
if(pageTabs[location.hash.slice(1)])selectTab(document.getElementById(pageTabs[location.hash.slice(1)]));
document.querySelector('.wordmark').addEventListener('click',()=>selectTab(document.getElementById('about-tab')));
const status=document.getElementById('copy-status');let statusTimer;
function showToast(text){clearTimeout(statusTimer);status.textContent=text;statusTimer=setTimeout(()=>status.textContent='',5000);}
document.querySelectorAll('.discord-copy,[data-contact="Discord"]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('justinebatuhan');showToast('Discord username copied: justinebatuhan');}catch{showToast('Discord username: justinebatuhan');}}));

document.getElementById('year').textContent=new Date().getFullYear();
const projectFilters=[...document.querySelectorAll('[data-filter]')];
projectFilters.forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.filter;projectFilters.forEach(filter=>filter.setAttribute('aria-pressed',String(filter===button)));let shown=0;document.querySelectorAll('.gallery-card[data-category]').forEach(card=>{const visible=category==='all'||card.dataset.category===category;card.hidden=!visible;if(visible)shown++;});document.getElementById('portfolio-empty').hidden=shown>0;}));
// These are local action counts, not unique visitors or confirmed app activity.
const activityKey='portfolio-project-activity-v2';
const activityCooldown=24*60*60*1000;
const trackedProjects=[
 {id:'beach-club',card:document.querySelector('a.gallery-card[data-category="web"]'),action:'uses'},
 {id:'sound-diary',card:document.querySelector('.sound-diary-card'),action:'downloads'},
 {id:'evaluation-studio',card:document.querySelector('.evaluation-card'),action:'uses'},
 ...[...document.querySelectorAll('.gallery-card[data-project-id]')].map(card=>({
  id:card.dataset.projectId,
  card,
  action:card.dataset.projectAction==='uses'?'uses':'downloads'
 }))
].filter(project=>project.card);
let projectActivity={};
function readActivity(){
 try{
  const raw=localStorage.getItem(activityKey);
  if(!raw)return {};
  const saved=JSON.parse(raw);
  const clean={};
  trackedProjects.forEach(({id})=>{
   clean[id]={};
   ['interactions','downloads','uses'].forEach(metric=>{
    const value=saved?.[id]?.[metric];
    clean[id][metric]=Number.isSafeInteger(value)&&value>=0?value:0;
    const last=saved?.[id]?.[metric+'At'];
    clean[id][metric+'At']=Number.isSafeInteger(last)&&last>=0?last:0;
   });
  });
  return clean;
 }catch{return {};}
}
projectActivity=readActivity();
const activityNumber=new Intl.NumberFormat('en');
function renderActivity(){
 trackedProjects.forEach(({id,card})=>card.querySelectorAll('[data-metric]').forEach(counter=>{
  counter.textContent=activityNumber.format(projectActivity[id]?.[counter.dataset.metric]||0);
 }));
}
trackedProjects.forEach(({id,card,action})=>{
 const stats=document.createElement('dl');
 stats.className='project-activity';
 stats.setAttribute('aria-label','Project activity in this browser');
 [['interactions','Interactions','Project card clicks'],[action,action==='downloads'?'Download clicks':'Uses (opens)',action==='downloads'?'APK download clicks; completion is not tracked':'Live project opens; activity on the other site is not tracked']].forEach(([metric,label,description])=>{
  const item=document.createElement('div');
  item.title=description;
  const name=document.createElement('dt');name.textContent=label;
  const count=document.createElement('dd');count.dataset.metric=metric;count.textContent='0';
  item.append(name,count);stats.append(item);
 });
 card.querySelector('h3').after(stats);
 const record=event=>{
  if(event.type==='auxclick'&&event.button!==1)return;
  const saved=readActivity();
  const current=saved[id]||projectActivity[id]||{interactions:0,downloads:0,uses:0};
  const now=Date.now();
  const countOnce=metric=>{
   const last=current[metric+'At'];
   if(last&&now-last<activityCooldown)return;
   current[metric]=Math.min(Number.MAX_SAFE_INTEGER,current[metric]+1);
   current[metric+'At']=now;
  };
  countOnce('interactions');
  if(card.matches('a')||event.target?.closest?.('[data-app-download]')||event.type==='portfolio-approved-action')countOnce(action);
  projectActivity={...projectActivity,...saved,[id]:current};
  try{localStorage.setItem(activityKey,JSON.stringify(projectActivity));}catch{}
  renderActivity();
 };
 card.addEventListener('click',record);
 card.addEventListener('auxclick',record);
 document.addEventListener('portfolio-approved-action',event=>{
  if(event.detail.project===id)record(event);
 });
});
renderActivity();
window.addEventListener('storage',event=>{
 if(event.key===activityKey||event.key===null){projectActivity=readActivity();renderActivity();}
});
const activityNote=document.createElement('p');
activityNote.className='activity-note';
activityNote.textContent='Activity in this browser · Each action counts once per 24 hours. Uses count project opens; downloads count clicks.';
document.querySelector('.portfolio-gallery').after(activityNote);

function resolveAppDownloadUrl(rawPath){
 if(!rawPath)return null;
 try{
  const parsed=new URL(rawPath,window.location.href);
  if(!['http:','https:','file:'].includes(parsed.protocol))return null;
  return parsed.href;
 }catch{return null;}
}
function isLocalPreviewUrl(){
 return location.protocol==='file:'||location.hostname==='127.0.0.1'||location.hostname==='localhost';
}
(()=>{
 if(typeof PortfolioQRCode==='undefined')return;
 const qrDialog=document.getElementById('qr-dialog');
 const qrTitle=document.getElementById('qr-dialog-title');
 const qrDesc=document.getElementById('qr-dialog-desc');
 const qrStage=document.getElementById('qr-dialog-stage');
 const qrUrlEl=document.getElementById('qr-dialog-url');
 const qrNote=document.getElementById('qr-dialog-note');
 const qrDownload=document.getElementById('qr-dialog-download');
 const qrCopy=document.getElementById('qr-dialog-copy');
 const qrSave=document.getElementById('qr-dialog-save');
 const qrClose=document.getElementById('qr-dialog-close');
 let activeApp=null;

 function openQrDialog(app){
  if(!qrDialog)return;
  activeApp=app;
  qrTitle.textContent=app.name;
  qrDesc.textContent=app.subtitle||'Scan this QR code with your phone camera to download directly.';
  qrStage.replaceChildren(PortfolioQRCode.createSvgElement(app.url,{margin:4,sizePx:240,label:`QR code to download ${app.name}`}));
  qrUrlEl.textContent=app.url;
  const notes=[];
  if(app.missingFile)notes.push(`File pending: place your APK at ${app.rawPath} to enable downloads.`);
  if(isLocalPreviewUrl())notes.push('Local preview link shown. Once hosted online, this QR code automatically uses your live site URL so phones can scan and download it.');
  if(notes.length){
   qrNote.textContent=notes.join(' ');
   qrNote.hidden=false;
  }else{
   qrNote.hidden=true;
  }
  qrDownload.href=app.url;
  qrDownload.setAttribute('download',app.filename);
  qrDialog.showModal();
 }

 if(qrClose)qrClose.addEventListener('click',()=>qrDialog.close());
 if(qrDialog)qrDialog.addEventListener('click',event=>{if(event.target===qrDialog)qrDialog.close();});
 if(qrDownload)qrDownload.addEventListener('click',event=>{
  if(!activeApp)return;
  if(activeApp.missingFile){
   event.preventDefault();
   showToast(`Upload ${activeApp.rawPath} first so visitors can download ${activeApp.name}.`);
   return;
  }
  if(activeApp.projectId)document.dispatchEvent(new CustomEvent('portfolio-approved-action',{detail:{project:activeApp.projectId}}));
 });
 if(qrCopy)qrCopy.addEventListener('click',async()=>{
  if(!activeApp)return;
  try{
   await navigator.clipboard.writeText(activeApp.url);
   showToast(`Download link copied: ${activeApp.url}`);
  }catch{
   showToast(`Download link: ${activeApp.url}`);
  }
 });
 if(qrSave)qrSave.addEventListener('click',()=>{
  if(!activeApp)return;
  const svgMarkup=PortfolioQRCode.toSvgString(activeApp.url,{margin:4,sizePx:512,label:`QR code to download ${activeApp.name}`});
  const blobUrl=URL.createObjectURL(new Blob([svgMarkup],{type:'image/svg+xml;charset=utf-8'}));
  const link=document.createElement('a');
  const slug=activeApp.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'app';
  link.href=blobUrl;
  link.download=`${slug}-qr.svg`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(blobUrl),60000);
 });

 document.querySelectorAll('[data-app-qr]').forEach(card=>{
  const rawPath=card.dataset.downloadPath||card.querySelector('[data-app-download]')?.getAttribute('href')||'';
  const url=resolveAppDownloadUrl(rawPath);
  if(!url)return;
  const app={
   projectId:card.dataset.projectId||'',
   name:card.dataset.appName||'App Download',
   subtitle:card.dataset.appSubtitle||'',
   rawPath,
   url,
   filename:card.dataset.downloadFilename||(rawPath.split('/').pop()||'app.apk'),
   missingFile:false
  };
  const mount=card.querySelector('[data-qr-mount]');
  if(mount){
   mount.replaceChildren(PortfolioQRCode.createSvgElement(url,{margin:4,label:`QR code to download ${app.name}`}));
  }
  card.querySelectorAll('[data-qr-open]').forEach(btn=>btn.addEventListener('click',()=>openQrDialog(app)));
  const downloadLink=card.querySelector('[data-app-download]');
  if(downloadLink){
   downloadLink.href=url;
   downloadLink.setAttribute('download',app.filename);
   downloadLink.addEventListener('click',event=>{
    if(app.missingFile){
     event.preventDefault();
     showToast(`Upload ${app.rawPath} first so visitors can download ${app.name}.`);
    }
   });
  }
  if(location.protocol.startsWith('http')&&new URL(url).origin===location.origin){
   fetch(url,{method:'HEAD'}).then(res=>{
    if(res.status===404)app.missingFile=true;
   }).catch(()=>{});
  }
 });
})();


const contactForm=document.getElementById('contact-form');
const contactFields={name:document.getElementById('sender-name'),email:document.getElementById('sender-email'),message:document.getElementById('sender-message')};
function contactValues(){return Object.fromEntries(Object.entries(contactFields).map(([key,field])=>[key,field.value]));}
function showFieldError(key,error){document.getElementById(key+'-error').textContent=error||'';contactFields[key].setAttribute('aria-invalid',String(Boolean(error)));}
Object.entries(contactFields).forEach(([key,field])=>{field.addEventListener('blur',()=>{if(field.value)showFieldError(key,FormValidation.validate(contactValues()).errors[key]);});field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')showFieldError(key,FormValidation.validate(contactValues()).errors[key]);document.getElementById('form-status').textContent='';});});
contactForm.addEventListener('submit',event=>{event.preventDefault();const result=FormValidation.validate(contactValues());Object.keys(contactFields).forEach(key=>showFieldError(key,result.errors[key]));const formStatus=document.getElementById('form-status');if(!result.valid){formStatus.textContent='Please check the highlighted fields.';contactFields[Object.keys(result.errors)[0]].focus();return;}formStatus.textContent='Opening your email app. Review and send the draft there.';location.href=FormValidation.buildMailto(result.data);});
