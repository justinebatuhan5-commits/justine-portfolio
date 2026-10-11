'use strict';
var FormValidation=(()=>{
 const singleLineControls=/[\u0000-\u001f\u007f]/;
 const messageControls=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
 function validate(values){
  const data={name:String(values.name||'').trim(),email:String(values.email||'').trim(),message:String(values.message||'').trim()};
  const errors={};
  if(data.name.length<2||data.name.length>100||singleLineControls.test(data.name))errors.name='Enter a name between 2 and 100 characters.';
  if(data.email.length>254||singleLineControls.test(data.email)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))errors.email='Enter a valid email address, such as name@example.com.';
  if(data.message.length<10||data.message.length>3000||messageControls.test(data.message))errors.message='Enter a message between 10 and 3,000 characters.';
  for(const key of Object.keys(data)){try{encodeURIComponent(data[key]);}catch{errors[key]='Remove unsupported characters and try again.';}}
  return {data,errors,valid:Object.keys(errors).length===0};
 }
 function buildMailto(values){const result=validate(values);if(!result.valid)throw new Error('Invalid contact details');const {name,email,message}=result.data;return 'mailto:Justinebatuhan017@gmail.com?subject='+encodeURIComponent('Portfolio message from '+name)+'&body='+encodeURIComponent(message+'\n\nFrom: '+name+'\nEmail: '+email);}
 return {validate,buildMailto};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FormValidation;
