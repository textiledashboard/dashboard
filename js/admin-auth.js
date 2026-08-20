(function(){
'use strict';
const SESSION_KEY='revampTextile.admin.session';
const ATTEMPT_KEY='revampTextile.admin.attempts';
const LOCK_KEY='revampTextile.admin.lockUntil';
const PASSWORD_HASH='bc6571e53459c61c90819cc325e3cf177a55132b2cdfe7af95738aa002a3c72f';
const MAX_ATTEMPTS=5;
const LOCK_TIME=15*60*1000;
const topButton=document.querySelector('.topbar .data-button');
const uploadButton=document.querySelector('.upload-nav-button');
if(!topButton||!uploadButton)return;

document.body.classList.add('admin-locked');
const modal=document.createElement('div');
modal.className='admin-login-modal';
modal.setAttribute('aria-hidden','true');
modal.innerHTML='<section class="admin-login-card" role="dialog" aria-modal="true" aria-labelledby="adminLoginTitle"><button class="admin-login-close" aria-label="Close admin login">×</button><div class="admin-lock-icon">⌑</div><span class="overline">RESTRICTED ACCESS</span><h2 id="adminLoginTitle">Dashboard Administrator</h2><p>Enter the administrator password to access data upload and update tools.</p><form id="adminLoginForm"><label for="adminPassword">Password</label><div class="admin-password-wrap"><input id="adminPassword" type="password" autocomplete="current-password" required placeholder="Enter admin password"><button type="button" id="toggleAdminPassword" aria-label="Show password">Show</button></div><small id="adminLoginMessage" aria-live="polite"></small><button class="admin-submit" type="submit">Unlock data administration</button></form><div class="admin-security-note">Your login remains active only in this browser tab.</div></section>';
document.body.appendChild(modal);
const form=document.getElementById('adminLoginForm');
const password=document.getElementById('adminPassword');
const message=document.getElementById('adminLoginMessage');
let logoutButton=null;

function authenticated(){return sessionStorage.getItem(SESSION_KEY)==='1'}
function lockedFor(){return Math.max(0,Number(localStorage.getItem(LOCK_KEY)||0)-Date.now())}
function formatTime(ms){const min=Math.ceil(ms/60000);return min+' minute'+(min===1?'':'s')}
async function sha256(value){
  if(!window.crypto||!window.crypto.subtle)throw new Error('Secure password verification is unavailable in this browser.');
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function setMessage(text,error){message.textContent=text;message.className=error?'error':'success'}
function showLogin(){
  const remaining=lockedFor();
  setMessage(remaining?'Too many failed attempts. Try again in '+formatTime(remaining)+'.':'',Boolean(remaining));
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  setTimeout(()=>password.focus(),30);
}
function hideLogin(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');password.value=''}
function setUi(){
  const active=authenticated();
  document.body.classList.toggle('admin-locked',!active);
  document.body.classList.toggle('admin-unlocked',active);
  topButton.innerHTML=active?'⇧ &nbsp;Upload data':'🔒 &nbsp;Admin login';
  topButton.setAttribute('aria-label',active?'Upload dashboard data':'Admin login');
  uploadButton.innerHTML=active?'<i>⇧</i><span>Upload Data</span><em></em>':'<i>🔒</i><span>Admin Login</span><em></em>';
  if(active&&!logoutButton){
    logoutButton=document.createElement('button');logoutButton.className='admin-logout';logoutButton.textContent='Logout';logoutButton.onclick=logout;
    document.querySelector('.top-actions').insertBefore(logoutButton,document.querySelector('.avatar'));
  }else if(!active&&logoutButton){logoutButton.remove();logoutButton=null}
}
function logout(){
  sessionStorage.removeItem(SESSION_KEY);setUi();
  document.querySelector('.data-modal')?.classList.remove('open');
  if(window.notify)window.notify('Admin session ended');
}
async function login(event){
  event.preventDefault();
  const remaining=lockedFor();
  if(remaining){setMessage('Access locked. Try again in '+formatTime(remaining)+'.',true);return}
  const submit=form.querySelector('.admin-submit');submit.disabled=true;submit.textContent='Verifying…';
  try{
    if(await sha256(password.value)===PASSWORD_HASH){
      sessionStorage.setItem(SESSION_KEY,'1');localStorage.removeItem(ATTEMPT_KEY);localStorage.removeItem(LOCK_KEY);
      setMessage('Access granted.',false);setUi();setTimeout(hideLogin,350);
      if(window.notify)window.notify('Data administration unlocked');
    }else{
      const attempts=Number(localStorage.getItem(ATTEMPT_KEY)||0)+1;
      if(attempts>=MAX_ATTEMPTS){localStorage.setItem(LOCK_KEY,String(Date.now()+LOCK_TIME));localStorage.removeItem(ATTEMPT_KEY);setMessage('Too many failed attempts. Access locked for 15 minutes.',true)}
      else{localStorage.setItem(ATTEMPT_KEY,String(attempts));setMessage('Incorrect password. '+(MAX_ATTEMPTS-attempts)+' attempt'+(MAX_ATTEMPTS-attempts===1?'':'s')+' remaining.',true)}
      password.select();
    }
  }catch(error){setMessage(error.message,true)}finally{submit.disabled=false;submit.textContent='Unlock data administration'}
}

document.addEventListener('click',function(event){
  const trigger=event.target.closest('.data-button,.upload-nav-button');
  if(trigger&&!authenticated()){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showLogin()}
},true);
form.addEventListener('submit',login);
modal.querySelector('.admin-login-close').onclick=hideLogin;
modal.addEventListener('click',event=>{if(event.target===modal)hideLogin()});
document.getElementById('toggleAdminPassword').onclick=function(){const show=password.type==='password';password.type=show?'text':'password';this.textContent=show?'Hide':'Show';this.setAttribute('aria-label',show?'Hide password':'Show password')};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.classList.contains('open'))hideLogin()});
new MutationObserver(()=>{const dataModal=document.querySelector('.data-modal');if(dataModal?.classList.contains('open')&&!authenticated())dataModal.classList.remove('open')}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
setUi();
window.dashboardAdmin={isAuthenticated:authenticated,logout};
})();
