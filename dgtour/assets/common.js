const USER_STORAGE_KEY='dgtour_user_id';

function getUser(){
  const id=localStorage.getItem(USER_STORAGE_KEY);
  if(!id)return null;
  return ACCOUNTS.find(a=>a.id===id)||null;
}
function setUser(id){localStorage.setItem(USER_STORAGE_KEY,id);}
function logoutUser(){
  localStorage.removeItem(USER_STORAGE_KEY);
  location.href='index.html';
}
function requireUser(){
  const u=getUser();
  if(!u){location.href='index.html';return null;}
  return u;
}

let tTimer;
function toast(msg){
  const el=document.getElementById('toastEl');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(tTimer);
  tTimer=setTimeout(()=>el.classList.remove('show'),2000);
}

function openDrawer(){
  document.getElementById('drawer').classList.add('open');
  document.getElementById('dOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('dOverlay').classList.remove('open');
  document.body.style.overflow='';
}

function setActiveBottomNav(key){
  const nav=document.getElementById('bottomNav');
  if(!nav)return;
  nav.querySelectorAll('.bnav-a').forEach(b=>b.classList.remove('active'));
  const activeBtn=nav.querySelector(`[data-nav="${key}"]`);
  if(activeBtn)activeBtn.classList.add('active');
}
