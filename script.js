'use strict';
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
document.querySelectorAll('.discord-copy,[data-contact="Discord"]').forEach(button=>button.addEventListener('click',async()=>{clearTimeout(statusTimer);try{await navigator.clipboard.writeText('justinebatuhan');status.textContent='Discord username copied: justinebatuhan';}catch{status.textContent='Discord username: justinebatuhan';}statusTimer=setTimeout(()=>status.textContent='',5000);}));

document.getElementById('year').textContent=new Date().getFullYear();
const projectFilters=[...document.querySelectorAll('[data-filter]')];
projectFilters.forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.filter;projectFilters.forEach(filter=>filter.setAttribute('aria-pressed',String(filter===button)));let shown=0;document.querySelectorAll('.gallery-card[data-category]').forEach(card=>{const visible=category==='all'||card.dataset.category===category;card.hidden=!visible;if(visible)shown++;});document.getElementById('portfolio-empty').hidden=shown>0;}));
// These are local action counts, not unique visitors or confirmed app activity.
const activityKey='portfolio-project-activity-v1';
const trackedProjects=[
 {id:'beach-club',card:document.querySelector('a.gallery-card[data-category="web"]'),action:'uses'},
 {id:'sound-diary',card:document.querySelector('a.gallery-card[data-category="app"]'),action:'downloads'},
 {id:'evaluation-studio',card:document.querySelector('.evaluation-card'),action:'uses'}
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
  current.interactions=Math.min(Number.MAX_SAFE_INTEGER,current.interactions+1);
  if(card.matches('a')||event.target.closest('.evaluation-live'))current[action]=Math.min(Number.MAX_SAFE_INTEGER,current[action]+1);
  projectActivity={...projectActivity,...saved,[id]:current};
  try{localStorage.setItem(activityKey,JSON.stringify(projectActivity));}catch{}
  renderActivity();
 };
 card.addEventListener('click',record);
 card.addEventListener('auxclick',record);
});
renderActivity();
window.addEventListener('storage',event=>{
 if(event.key===activityKey||event.key===null){projectActivity=readActivity();renderActivity();}
});
const activityNote=document.createElement('p');
activityNote.className='activity-note';
activityNote.textContent='Activity in this browser · Uses count live-project opens. Downloads count clicks.';
document.querySelector('.portfolio-gallery').after(activityNote);


const contactForm=document.getElementById('contact-form');
const contactFields={name:document.getElementById('sender-name'),email:document.getElementById('sender-email'),message:document.getElementById('sender-message')};
function contactValues(){return Object.fromEntries(Object.entries(contactFields).map(([key,field])=>[key,field.value]));}
function showFieldError(key,error){document.getElementById(key+'-error').textContent=error||'';contactFields[key].setAttribute('aria-invalid',String(Boolean(error)));}
Object.entries(contactFields).forEach(([key,field])=>{field.addEventListener('blur',()=>{if(field.value)showFieldError(key,FormValidation.validate(contactValues()).errors[key]);});field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')showFieldError(key,FormValidation.validate(contactValues()).errors[key]);document.getElementById('form-status').textContent='';});});
contactForm.addEventListener('submit',event=>{event.preventDefault();const result=FormValidation.validate(contactValues());Object.keys(contactFields).forEach(key=>showFieldError(key,result.errors[key]));const formStatus=document.getElementById('form-status');if(!result.valid){formStatus.textContent='Please check the highlighted fields.';contactFields[Object.keys(result.errors)[0]].focus();return;}formStatus.textContent='Opening your email app. Review and send the draft there.';location.href=FormValidation.buildMailto(result.data);});
