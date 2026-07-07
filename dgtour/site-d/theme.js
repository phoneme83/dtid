/* 시안 D · 공공 미니멀 유니버설 — 전 페이지 공통 주입 스크립트
   (1) 상단 데모 바  (2) 하단 고정 스트립: 전화 문의 + 글자 크게 토글 */
(function(){
  'use strict';
  var BIG_KEY='dtidD_bigFont';

  /* 하단 탭이 없는 페이지(로그인)에서는 스트립을 화면 맨 아래에 붙인다 */
  if(!document.querySelector('.bottom-nav')){
    document.body.classList.add('dtd-no-bnav');
  }

  /* (1) 상단 데모 바 */
  var bar=document.createElement('div');
  bar.className='dtd-demobar';
  bar.innerHTML='<span>시안 D · 공공 미니멀 적용판</span><a href="../sites.html">다른 시안 보기</a>';
  document.body.insertBefore(bar,document.body.firstChild);

  /* (2) 하단 고정 스트립: 전화 탈출구 + 글자 크게 */
  var foot=document.createElement('div');
  foot.className='dtd-foot';
  foot.innerHTML='<a class="dtd-call" href="tel:15880000">📞 전화 문의 1588-0000</a>'+
    '<button type="button" class="dtd-font" aria-pressed="false">가⁺ 글자 크게</button>';
  document.body.appendChild(foot);

  var fontBtn=foot.querySelector('.dtd-font');
  function applyBig(on){
    document.body.classList.toggle('dtd-big',on);
    fontBtn.setAttribute('aria-pressed',on?'true':'false');
    fontBtn.textContent=on?'가⁻ 보통 크기':'가⁺ 글자 크게';
  }
  var saved=false;
  try{saved=localStorage.getItem(BIG_KEY)==='1';}catch(e){}
  applyBig(saved);
  fontBtn.addEventListener('click',function(){
    var on=!document.body.classList.contains('dtd-big');
    try{localStorage.setItem(BIG_KEY,on?'1':'0');}catch(e){}
    applyBig(on);
  });
})();
