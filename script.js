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


const contactForm=document.getElementById('contact-form');
const contactFields={name:document.getElementById('sender-name'),email:document.getElementById('sender-email'),message:document.getElementById('sender-message')};
function contactValues(){return Object.fromEntries(Object.entries(contactFields).map(([key,field])=>[key,field.value]));}
function showFieldError(key,error){document.getElementById(key+'-error').textContent=error||'';contactFields[key].setAttribute('aria-invalid',String(Boolean(error)));}
Object.entries(contactFields).forEach(([key,field])=>{field.addEventListener('blur',()=>{if(field.value)showFieldError(key,FormValidation.validate(contactValues()).errors[key]);});field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')showFieldError(key,FormValidation.validate(contactValues()).errors[key]);document.getElementById('form-status').textContent='';});});
contactForm.addEventListener('submit',event=>{event.preventDefault();const result=FormValidation.validate(contactValues());Object.keys(contactFields).forEach(key=>showFieldError(key,result.errors[key]));const formStatus=document.getElementById('form-status');if(!result.valid){formStatus.textContent='Please check the highlighted fields.';contactFields[Object.keys(result.errors)[0]].focus();return;}formStatus.textContent='Opening your email app. Review and send the draft there.';location.href=FormValidation.buildMailto(result.data);});
