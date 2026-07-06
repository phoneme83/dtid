const ACCOUNTS=[
  {id:'user1',name:'이준호',emojiAv:'🇰🇷',avBg:'#fff0f2',
   level:'여행 유망주',levelIcon:'🏮',pillBg:'#eff6ff',pillColor:'#1d4ed8',
   exp:3000,nextExp:4500,barPct:67,barColor:'linear-gradient(90deg,#3b82f6,#7c3aed)',
   cards:['강원 정선군','전남 신안군','충남 보령시']},
  {id:'user2',name:'김민지',emojiAv:'🌸',avBg:'#fdf2f8',
   level:'여행 꿈나무',levelIcon:'🌱',pillBg:'#f0fdf4',pillColor:'#15803d',
   exp:1500,nextExp:2000,barPct:75,barColor:'linear-gradient(90deg,#4ade80,#16a34a)',
   cards:['충북 괴산군','경북 봉화군']},
  {id:'user3',name:'박성준',emojiAv:'🧭',avBg:'#fff7ed',
   level:'여행 길잡이',levelIcon:'🧭',pillBg:'#fff7ed',pillColor:'#c2410c',
   exp:5200,nextExp:10000,barPct:52,barColor:'linear-gradient(90deg,#fb923c,#dc2626)',
   cards:['강원 정선군','전남 완도군','경남 합천군','충남 태안군','충북 괴산군']},
  {id:'user4',name:'최유리',emojiAv:'🌷',avBg:'#f0f9ff',
   level:'여행 새싹',levelIcon:'🏝️',pillBg:'#f0f9ff',pillColor:'#0369a1',
   exp:200,nextExp:1000,barPct:20,barColor:'linear-gradient(90deg,#38bdf8,#0ea5e9)',
   cards:['전남 신안군']},
  {id:'user5',name:'정하늘',emojiAv:'🦅',avBg:'#fefce8',
   level:'여행 고수',levelIcon:'🌍',pillBg:'#fefce8',pillColor:'#a16207',
   exp:15000,nextExp:15000,barPct:100,barColor:'linear-gradient(90deg,#facc15,#ea580c)',
   cards:['강원 정선군','전남 신안군','경남 합천군','전남 완도군']}
];

/* SNS 로그인 버튼 ↔ 테스트 계정 매핑 (실제 인증 없이 지정된 목업 계정으로 로그인) */
const SNS_LOGIN=[
  {key:'naver',label:'네이버',aria:'네이버로 로그인',bg:'#03c75a',fg:'#fff',icon:'N',userId:'user1'},
  {key:'kakao',label:'카카오',aria:'카카오로 로그인',bg:'#fee500',fg:'#3c1e1e',icon:'💬',userId:'user2'},
  {key:'facebook',label:'페이스북',aria:'페이스북으로 로그인',bg:'#1877f2',fg:'#fff',icon:'f',userId:'user3'},
  {key:'google',label:'구글',aria:'구글로 로그인',bg:'#fff',fg:'#111',border:'#ddd',icon:'G',userId:'user4'},
  {key:'apple',label:'애플',aria:'애플로 로그인',bg:'#000',fg:'#fff',icon:'🍎',userId:'user5'}
];

const LEVELS=[
  {name:'여행 새싹', icon:'🏝️',minExp:0,    maxExp:1000},
  {name:'여행 꿈나무',icon:'⛰️',minExp:1000, maxExp:2000},
  {name:'여행 유망주',icon:'🏮',minExp:2000, maxExp:4500},
  {name:'여행 길잡이',icon:'🧭',minExp:4500, maxExp:10000},
  {name:'여행 고수', icon:'🌍',minExp:10000,maxExp:null}
];

const CARD_ICONS={'강원 정선군':'🏔️','전남 신안군':'🌊','충남 보령시':'🏖️','충북 괴산군':'🌾','경북 봉화군':'🌲','전남 완도군':'⛵','경남 합천군':'🌄','충남 태안군':'🌿'};

/* 보관함 카드 상세 슬로건 — 실제 캡처된 3개 외에는 테스트용 임시 문구 */
const CARD_SLOGANS={
  '가평군':'힐링과 행복, 하나되는 가평특별군',
  '강화군':'소통과 화합으로 함께 만드는 강화',
  '거창군':'거창하구나! 구경가세!'
};
function getCardSlogan(name){
  return CARD_SLOGANS[name]||`${name}과 함께하는 여행`;
}

/* 좌표(l,t=중심 %, w,h=클릭 히트박스 %)는 실제 사이트 지도 캡처(assets/img/map-regions.jpg) 위의
   라벨 위치를 그대로 딴 값입니다 — 지도는 캡처 이미지를 배경으로 쓰고, 이 좌표에 투명 버튼만 얹습니다. */
const REGIONS=[
  {n:'철원',l:53.0,t:7.4},{n:'양양',l:67.5,t:10.2},
  {n:'연천',l:29.5,t:15.0},{n:'홍천',l:55.1,t:16.9},{n:'정선',l:79.5,t:16.0},
  {n:'강화',l:17.9,t:23.8},{n:'가평',l:39.3,t:24.7},{n:'평창',l:52.1,t:26.1},
  {n:'삼척',l:88.5,t:23.2},
  {n:'제천',l:38.9,t:32.4},{n:'단양',l:53.8,t:32.8},{n:'영월',l:69.2,t:31.3},{n:'태백',l:86.8,t:30.4},
  {n:'태안',l:18.4,t:35.3},{n:'괴산',l:40.6,t:40.3},{n:'영주',l:78.6,t:40.1},
  {n:'예산',l:20.1,t:42.9},{n:'보은',l:36.3,t:46.0},{n:'영동',l:56.0,t:47.9},{n:'울진',l:88.0,t:45.0},
  {n:'보령',l:19.2,t:49.2},{n:'옥천',l:36.8,t:51.6},{n:'의성',l:67.1,t:53.6},{n:'안동',l:82.1,t:50.6},
  {n:'김제',l:19.2,t:55.3},{n:'무주',l:43.6,t:56.8},{n:'거창',l:56.0,t:57.4},{n:'고령',l:68.4,t:60.1},{n:'영덕',l:86.8,t:56.6},
  {n:'고창',l:14.5,t:61.6},{n:'임실',l:30.3,t:61.1},{n:'남원',l:45.3,t:62.5},{n:'청도',l:85.5,t:63.3},
  {n:'담양',l:12.8,t:67.4},{n:'순창',l:33.3,t:68.6},{n:'함양',l:52.6,t:68.2},
  {n:'합천',l:61.1,t:72.6},{n:'부산동구',l:84.2,t:71.4},
  {n:'영광',l:10.3,t:73.5},{n:'산청',l:47.4,t:74.2},{n:'곡성',l:32.9,t:76.8},{n:'부산영도',l:86.8,t:79.2},
  {n:'함평',l:4.7,t:79.1},{n:'장흥',l:21.4,t:82.6},{n:'하동',l:52.6,t:82.6},{n:'부산서구',l:76.9,t:86.3},
  {n:'신안',l:7.3,t:85.0},{n:'고흥',l:34.2,t:89.8},{n:'구례',l:48.3,t:89.2},{n:'밀양',l:61.1,t:91.2},
  {n:'해남',l:11.5,t:90.8},{n:'완도',l:25.2,t:95.1}
];
REGIONS.forEach(r=>{r.w=6.6+r.n.length*1.35;r.h=3.6;});

/* 실제 행정구역 표기 (지역 상세 페이지 타이틀용) */
const REGION_SIDO={
  철원:'강원특별자치도',양양:'강원특별자치도',홍천:'강원특별자치도',정선:'강원특별자치도',
  평창:'강원특별자치도',삼척:'강원특별자치도',영월:'강원특별자치도',태백:'강원특별자치도',
  연천:'경기도',가평:'경기도',강화:'인천광역시',
  태안:'충청남도',예산:'충청남도',보령:'충청남도',
  제천:'충청북도',단양:'충청북도',괴산:'충청북도',보은:'충청북도',옥천:'충청북도',영동:'충청북도',
  영주:'경상북도',울진:'경상북도',안동:'경상북도',의성:'경상북도',영덕:'경상북도',고령:'경상북도',청도:'경상북도',
  거창:'경상남도',함양:'경상남도',합천:'경상남도',산청:'경상남도',하동:'경상남도',밀양:'경상남도',
  부산동구:'부산광역시',부산서구:'부산광역시',부산영도:'부산광역시',
  김제:'전북특별자치도',무주:'전북특별자치도',고창:'전북특별자치도',임실:'전북특별자치도',순창:'전북특별자치도',남원:'전북특별자치도',
  담양:'전라남도',영광:'전라남도',곡성:'전라남도',구례:'전라남도',함평:'전라남도',장흥:'전라남도',
  고흥:'전라남도',신안:'전라남도',해남:'전라남도',완도:'전라남도'
};
function regionGunLabel(name){
  const busan=['부산동구','부산서구','부산영도'];
  if(busan.includes(name))return name.replace('부산','')+'구';
  return name+'군';
}

/* 지역 방문 TIP + 사용처 목록 (실데이터 보유: 곡성 / 그 외는 목업 예시 데이터) */
const REGION_DETAIL={
  '곡성':{
    tips:[
      '시티투어버스와 관광택시를 이용하면 넓게 분포한 곡성의 관광지를 모두 방문해볼 수 있습니다.',
      '곡성 원도심에 위치한 전통시장 및 관광지는 도보관광을 할 수 있어요!',
      '장소별 휴무일이 다른 경우가 있으니 확인하고 방문하시길 추천드립니다.'
    ],
    festivals:[
      {name:'곡성세계장미축제',month:'5월',date:'2025. 5. 16. ~ 25.'},
      {name:'심청어린이대축제',month:'10월',date:'2025. 10. 23. ~26.(예정)'}
    ],
    phone:'061-362-7461',
    venues:[
      {cat:'관람',name:'압록상상스쿨',desc:'상상이 자라는 체험형 스페이스',discount:'입장권 30%할인'},
      {cat:'식음료',name:'미실란 반한다&카페',desc:'폐교를 리모델링한 공간',discount:'음료에 한해 5%할인'},
      {cat:'식음료',name:'가랑드',desc:'곡성 특산물인 토란으로 만든 디저트',discount:'이용료 5% 할인'},
      {cat:'식음료',name:'멜롱살롱',desc:'곡성 특산품인 신선한 멜론 디저트',discount:'이용료 5% 할인'}
    ]
  }
};
function getRegionDetail(name){
  if(REGION_DETAIL[name])return REGION_DETAIL[name];
  return {
    tips:[
      '도보 또는 대중교통으로 주요 관광지를 편리하게 둘러볼 수 있어요.',
      '장소별 휴무일이 다를 수 있으니 방문 전 확인해주세요.',
      '지역 축제·행사 일정은 방문 전 다시 한 번 확인해주세요.'
    ],
    festivals:[],
    phone:'02-6271-2016',
    venues:[
      {cat:'식음료',name:'지역 대표 맛집',desc:'지역 특산물을 활용한 메뉴를 선보입니다',discount:'이용료 5% 할인'},
      {cat:'체험',name:'지역 체험 프로그램',desc:'지역 문화를 직접 체험해볼 수 있어요',discount:'입장권 10% 할인'},
      {cat:'관람',name:'지역 대표 관광지',desc:'지역을 대표하는 명소예요',discount:'입장료 30% 할인'},
      {cat:'쇼핑',name:'지역 특산물 매장',desc:'지역 특산품을 구매할 수 있어요',discount:'구매 시 10% 할인'},
      {cat:'숙박',name:'지역 숙박 시설',desc:'편안한 하룻밤을 보낼 수 있어요',discount:'숙박료 5% 할인'},
      {cat:'기타',name:'지역 안내소',desc:'여행 정보를 안내해드려요',discount:'기념품 증정'}
    ],
    mock:true
  };
}

/* 실제 사이트 지역코드(mtpcDoCd=시/도 코드, signguCd=시/군/구 코드) — 실 소스코드에서 그대로 추출 */
const REGION_CODES={
  철원:{do:'51',sig:'51780'},양양:{do:'51',sig:'51830'},정선:{do:'51',sig:'51770'},삼척:{do:'51',sig:'51230'},
  태백:{do:'51',sig:'51190'},홍천:{do:'51',sig:'51720'},평창:{do:'51',sig:'51760'},영월:{do:'51',sig:'51750'},
  연천:{do:'41',sig:'41800'},가평:{do:'41',sig:'41820'},강화:{do:'28',sig:'28710'},
  태안:{do:'44',sig:'44825'},예산:{do:'44',sig:'44810'},보령:{do:'44',sig:'44180'},
  제천:{do:'43',sig:'43150'},단양:{do:'43',sig:'43800'},괴산:{do:'43',sig:'43760'},보은:{do:'43',sig:'43720'},옥천:{do:'43',sig:'43730'},영동:{do:'43',sig:'43740'},
  영주:{do:'47',sig:'47210'},안동:{do:'47',sig:'47170'},영덕:{do:'47',sig:'47770'},청도:{do:'47',sig:'47820'},고령:{do:'47',sig:'47830'},의성:{do:'47',sig:'47730'},울진:{do:'47',sig:'47930'},
  거창:{do:'48',sig:'48880'},합천:{do:'48',sig:'48890'},산청:{do:'48',sig:'48860'},하동:{do:'48',sig:'48850'},밀양:{do:'48',sig:'48270'},함양:{do:'48',sig:'48870'},
  부산동구:{do:'26',sig:'26170'},부산영도:{do:'26',sig:'26200'},부산서구:{do:'26',sig:'26140'},
  김제:{do:'52',sig:'52210'},무주:{do:'52',sig:'52730'},고창:{do:'52',sig:'52790'},임실:{do:'52',sig:'52750'},남원:{do:'52',sig:'52190'},순창:{do:'52',sig:'52770'},
  담양:{do:'12',sig:'12710'},영광:{do:'12',sig:'12830'},함평:{do:'12',sig:'12820'},곡성:{do:'12',sig:'12720'},신안:{do:'12',sig:'12870'},해남:{do:'12',sig:'12790'},
  장흥:{do:'12',sig:'12770'},구례:{do:'12',sig:'12730'},고흥:{do:'12',sig:'12740'},완도:{do:'12',sig:'12850'}
};

/* 메인 상단 탭(실제 사이트 카테고리명 그대로) */
const TOP10_TABS=['주간 TOP10','즐거운 체험','다양한 볼거리','숙박 고민 끝!','식도락 여행','특산물을 찾아서'];

/* 탭별 카드 — '주간 TOP10'은 실제 캡처 화면 데이터, 나머지는 예시(mock) 데이터 */
const TOP10_ITEMS={
  '주간 TOP10':[
    {tag:'관람',name:'영동와인터널',discount:'입장요금 2,000원 할인'},
    {tag:'체험',name:'단양하스카이워크',discount:'전망대 30% 할인/체험비 20%'},
    {tag:'관람',name:'다누리 아쿠아리움',discount:'입장료 50% 할인'},
    {tag:'식음료',name:'정선 파크로쉐리조트 앤 웰니스',discount:'정가 대비 10% 할인'},
    {tag:'체험',name:'평창 대관령코스터',discount:'이용권 할인(전 시즌 20%)'}
  ],
  mock:[
    {tag:'체험',name:'지역 체험 프로그램',discount:'예시 데이터'},
    {tag:'식음료',name:'지역 대표 맛집',discount:'예시 데이터'},
    {tag:'숙박',name:'지역 숙박 시설',discount:'예시 데이터'}
  ]
};
function getTop10Items(tab){return TOP10_ITEMS[tab]||TOP10_ITEMS.mock;}

/* FAQ — 실제 사이트 문구 그대로 */
const FAQS=[
  {q:'디지털 관광주민증이란?',
   a:'디지털 관광주민증은 인구감소 위기를 겪고 있는 지역의 관광 활성화를 위해 한국관광공사가 운영하는 서비스입니다. 디지털 관광주민증으로 지역 여행에 필요한 다양한 혜택을 받고, 지역 경제도 살리는 착한 여행을 떠나 보세요!'},
  {q:'어떻게 발급받나요?',
   a:'디지털 관광주민증은 대한민국 구석구석 회원이라면 누구나 무료로 발급받을 수 있습니다.<br><br>한국관광공사가 운영하는 관광 통합 서비스 ‘투어패스원’에 소셜 로그인한 뒤, 대한민국 구석구석 회원가입 및 서비스 이용약관에 동의합니다. 이후 본인 인증을 완료하고 거주지를 확인한 후, 원하는 지역의 관광주민증을 발급받으면 됩니다.<br><br>발급이 완료되면 모바일에서 바로 관광주민증을 확인하고 다양한 혜택을 이용할 수 있습니다.'},
  {q:'어떻게 사용하나요?',
   a:'디지털 관광주민증 혜택은 총 3가지 방법으로 이용할 수 있습니다.<br><br>첫째, 관광주민증 발급 후 마이페이지에 생성되는 ‘나의 통합 관광주민증 QR’을 사용하는 방법입니다. 가맹점에 있는 QR 리더기에 나의 QR을 스캔하면 혜택이 자동으로 적용되며, 직원에게 QR을 직접 제시해 확인 후 이용할 수도 있습니다.<br><br>둘째, 가맹점 3km 이내에서 모바일 쿠폰을 발급받아 사용하는 방법입니다. 발급된 쿠폰을 가맹점 직원에게 제시하면 할인 및 혜택을 받을 수 있습니다.<br><br>셋째, 가맹점에 비치된 혜택업체 QR을 직접 스캔하는 방법입니다. 내 스마트폰으로 QR을 스캔하면 쿠폰이 발급되며, 이를 직원에게 제시하여 혜택을 이용할 수 있습니다.'},
  {q:'어떤 혜택이 있나요?',
   a:'식음료, 관람, 체험, 쇼핑, 숙박 등 지역 여행에 필요한 다양한 혜택을 받을 수 있으며, 지역사랑 철도여행 이벤트를 통해 코레일 열차 할인 쿠폰도 제공됩니다.<br><br>자세한 지역별 혜택 내용은 디지털 관광주민증 홈페이지에서 확인할 수 있습니다.'}
];

/* 인기 여행 콘텐츠(인스타그램) — 실제 게시물 캡션/링크, 이미지는 저작권상 색상 타일로 대체 */
const INSTA_POSTS=[
  {cap:'여름꽃',color:'#f9a8d4',url:'https://www.instagram.com/p/DaReMYDE6GS/'},
  {cap:'완도',color:'#60a5fa',url:'https://www.instagram.com/p/DaJvnNmkzoC/'},
  {cap:'나만의 바다',color:'#38bdf8',url:'https://www.instagram.com/reel/DZ_cVuJTnGO/'},
  {cap:'여름혜택',color:'#fb923c',url:'https://www.instagram.com/p/DZ3uKfiCQhO/'},
  {cap:'담양',color:'#4ade80',url:'https://www.instagram.com/p/DZq3zNVkybT/'},
  {cap:'신규지역소개',color:'#a78bfa',url:'https://www.instagram.com/p/DZltgPZEyJI/'},
  {cap:'6월 혜택지',color:'#f87171',url:'https://www.instagram.com/reel/DZbYepzzCjF/'},
  {cap:'삼척',color:'#22d3ee',url:'https://www.instagram.com/p/DZTq7tjE3Cg/'},
  {cap:'페스타',color:'#facc15',url:'https://www.instagram.com/p/DZBpa32nwYM/'},
  {cap:'밀양추천',color:'#fb7185',url:'https://www.instagram.com/p/DZJYozXk4eC/'},
  {cap:'조용한여행 in 안동',color:'#818cf8',url:'https://www.instagram.com/reel/DY3WeUPTfiE/'},
  {cap:'거창 여행 BEST4',color:'#34d399',url:'https://www.instagram.com/reel/DYdnHDiE-Xb/'},
  {cap:'극락도락이다',color:'#fbbf24',url:'https://www.instagram.com/p/DYTTGWADAfv/'},
  {cap:'청정고원 평창',color:'#93c5fd',url:'https://www.instagram.com/p/DYvx9KZE-9d/'}
];

/* 메인 하단 이벤트 카드 — 실제 사이트 문구 그대로 */
const MAIN_EVENTS=[
  {title:'담양 디지털관광주민증 오픈기념! 담양 고향사랑기부하고 혜택받자!',date:'2026.07.01~2026.07.21',start:'2026-07-01',end:'2026-07-21',color:'#84cc16'},
  {title:'디지털 관광주민이라면 보령에서 혜택과 체험을 함께 즐겨요',date:'2026.07.03~2026.08.02',start:'2026-07-03',end:'2026-08-02',color:'#0ea5e9'}
];
function getEventStatus(ev,today){
  const t=today.getTime(),s=new Date(ev.start).getTime(),e=new Date(ev.end).getTime();
  if(t<s)return 'upcoming';
  if(t>e)return 'ended';
  return 'ongoing';
}
function eventCoversDate(ev,d){
  const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  return t>=new Date(ev.start).getTime()&&t<=new Date(ev.end).getTime();
}

/* 시/도별 지역 목록(실제 사이트 "다른 지역보기" 탭용) — REGION_SIDO를 역으로 그룹핑 */
function getSidoGroups(){
  const groups={};
  Object.keys(REGION_SIDO).forEach(name=>{
    const sido=REGION_SIDO[name];
    (groups[sido]=groups[sido]||[]).push(name);
  });
  return groups;
}
const SIDO_SHORT={강원특별자치도:'강원',경기도:'경기',인천광역시:'인천',충청남도:'충남',충청북도:'충북',
  경상북도:'경북',경상남도:'경남',부산광역시:'부산',전북특별자치도:'전북',전라남도:'전남'};

/* 지역 리뷰(여행 노하우) — 지역별 실제 후기 없이 공통 예시 데이터를 지역명에 맞춰 생성 */
const REVIEW_NAMES=['선경님','안효근님','동슈동슈님','동동밈a님','수호님','여상윤님','거미님','김정수님','김소연님','wewework님','쪼쪼님','호웅이님','모안님','어름치님','솔이엄마님','모모457님'];
function getRegionReviews(name){
  const seedTexts=[
    `${name} 여행 정말 좋았어요, 또 가고싶네요!`,
    `디지털 관광주민증 혜택 받아서 알뜰하게 여행하고 왔어요`,
    `${name}은 언제 가도 매력있는 곳 같아요`,
    `가족들이랑 다녀왔는데 다들 만족했어요`,
    `현지 맛집 추천받아서 잘 먹고 왔습니다`
  ];
  return seedTexts.map((t,i)=>({name:REVIEW_NAMES[(name.length+i)%REVIEW_NAMES.length],text:t,likes:(i*7+name.length)%5}));
}

/* 활동이력 — 실제 사이트 캡처 데이터 그대로 */
const HISTORY_ITEMS=[
  {ico:'🎉',title:'지역 관광주민증 발급',date:'2026.06.08',desc:'(광주 완도군) 지역 관광주민증 발급',exp:20},
  {ico:'🎉',title:'지역 관광주민증 발급',date:'2026.06.08',desc:'(광주 고흥군) 지역 관광주민증 발급',exp:20},
  {ico:'🎟️',title:'지역 가맹점 이용',date:'2025.10.29',desc:"(충북 단양군) '고수동굴'에서 할인 혜택 제공 쿠폰을 사용했습니다.",exp:500},
  {ico:'🎉',title:'지역 관광주민증 발급',date:'2025.10.01',desc:'(충남 보령시) 지역 관광주민증 발급',exp:20},
  {ico:'🎟️',title:'지역 가맹점 이용',date:'2025.09.27',desc:"(광주 곡성군) '곡성 섬진강 천문대'에서 관람료 500원 할인 쿠폰을 사용했습니다.",exp:500}
];

/* 즐겨찾는 혜택 가맹점 카테고리(실제 코드) */
const FAV_CATS=[
  {code:'',label:'전체'},{code:'FDRK',label:'식음료'},{code:'VWNG',label:'관람'},
  {code:'EXPRN',label:'체험'},{code:'SHPN',label:'쇼핑'},{code:'STAYNG',label:'숙박'},{code:'ETC',label:'기타'}
];

/* 대한민국 반값여행(지역사랑 휴가지원) 참여 16개 지역 — 실제 외부 사이트로 검증된 URL
   (신청하러 가기: 지역별 전용 반값여행 사이트, 실제 접속 확인함 / 인기여행지 모아보기: 구석구석 지역 목록) */
const TOUR50_REGIONS=[
  {name:'평창',sido:'강원특별자치도',applyUrl:'https://pc.halftrip.kr/',status:'closed'},
  {name:'횡성',sido:'강원특별자치도',applyUrl:'https://hs.halftrip.kr/',status:null},
  {name:'영월',sido:'강원특별자치도',applyUrl:'https://halftour.kr/',status:null},
  {name:'제천',sido:'충청북도',applyUrl:'https://jctour.kr/',status:null},
  {name:'거창',sido:'경상남도',applyUrl:'https://geochangtour.kr/',status:null},
  {name:'고창',sido:'전북특별자치도',applyUrl:'https://gochangtrip.co.kr/',status:null},
  {name:'합천',sido:'경상남도',applyUrl:'https://hctour.kr/',status:'closed'},
  {name:'밀양',sido:'경상남도',applyUrl:'https://mybanhada.com/',status:null},
  {name:'영암',sido:'전라남도',applyUrl:'https://yeongam.go.kr/oneplusone',status:null},
  {name:'하동',sido:'경상남도',applyUrl:'https://hadongtrip.kr/index.php',status:'closed'},
  {name:'강진',sido:'전라남도',applyUrl:'https://gangjintour.com/main/main.html',status:null},
  {name:'남해',sido:'경상남도',applyUrl:'https://namhae.go.kr/',status:'closed'},
  {name:'해남',sido:'전라남도',applyUrl:'https://haenam50.kr/index',status:null},
  {name:'고흥',sido:'전라남도',applyUrl:'https://tour.goheung.go.kr/front/M0000361/content/view.do',status:'closed'},
  {name:'완도',sido:'전라남도',applyUrl:'https://wandotrip.kr/index.php',status:'open'},
  {name:'영광',sido:'전라남도',applyUrl:'https://yeonggwang.go.kr/travel',status:'open'}
];
/* 인기여행지 모아보기 — 실제 사이트는 지역 선택이 URL 파라미터가 아니라
   choiceSigungu() JS 팝업으로 처리되어 지역별 딥링크가 존재하지 않음(확인됨).
   그래서 모든 지역이 동일하게 대한민국 구석구석의 실제 canonical 지역 메인 주소로 연결됨. */
const AREA_LIST_URL='https://korean.visitkorea.or.kr/main/area.do';

function getCurLevelIdx(exp){
  for(let i=LEVELS.length-1;i>=0;i--){if(exp>=LEVELS[i].minExp)return i;}
  return 0;
}
