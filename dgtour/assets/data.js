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
   cards:['강원 정선군','전남 완도군','경남 합천군','충남 태안군','충북 괴산군']}
];

const LEVELS=[
  {name:'여행 새싹', icon:'🏝️',minExp:0,    maxExp:1000},
  {name:'여행 꿈나무',icon:'⛰️',minExp:1000, maxExp:2000},
  {name:'여행 유망주',icon:'🏮',minExp:2000, maxExp:4500},
  {name:'여행 길잡이',icon:'🧭',minExp:4500, maxExp:10000},
  {name:'여행 고수', icon:'🌍',minExp:10000,maxExp:null}
];

const CARD_ICONS={'강원 정선군':'🏔️','전남 신안군':'🌊','충남 보령시':'🏖️','충북 괴산군':'🌾','경북 봉화군':'🌲','전남 완도군':'⛵','경남 합천군':'🌄','충남 태안군':'🌿'};

const PINK='#be185d', NAVY='#1b4bab', PURPLE='#7c3aed', ORANGE='#c2410c', GREEN='#1a7a35';

const REGIONS=[
  /* 강원 (navy) */
  {n:'철원',c:NAVY,l:38,t:3},{n:'양양',c:NAVY,l:66,t:10},
  {n:'홍천',c:NAVY,l:51,t:15},{n:'정선',c:NAVY,l:70,t:23},
  {n:'평창',c:NAVY,l:58,t:26},{n:'삼척',c:NAVY,l:79,t:22},
  {n:'영월',c:NAVY,l:63,t:31},{n:'태백',c:NAVY,l:75,t:31},
  /* 경기·인천 (pink) */
  {n:'연천',c:PINK,l:33,t:4},{n:'가평',c:PINK,l:45,t:12},
  {n:'강화',c:PINK,l:22,t:18},
  /* 충청 (purple) */
  {n:'태안',c:PURPLE,l:18,t:38},{n:'예산',c:PURPLE,l:30,t:40},
  {n:'보령',c:PURPLE,l:22,t:48},{n:'제천',c:PURPLE,l:60,t:31},
  {n:'단양',c:PURPLE,l:65,t:34},{n:'괴산',c:PURPLE,l:50,t:38},
  {n:'보은',c:PURPLE,l:47,t:45},{n:'옥천',c:PURPLE,l:44,t:50},
  /* 경상·부산 (orange) */
  {n:'영주',c:ORANGE,l:66,t:38},{n:'울진',c:ORANGE,l:83,t:34},
  {n:'안동',c:ORANGE,l:70,t:45},{n:'의성',c:ORANGE,l:68,t:51},
  {n:'영덕',c:ORANGE,l:82,t:49},{n:'고령',c:ORANGE,l:60,t:65},
  {n:'청도',c:ORANGE,l:70,t:65},{n:'거창',c:ORANGE,l:53,t:64},
  {n:'함양',c:ORANGE,l:48,t:68},{n:'합천',c:ORANGE,l:58,t:68},
  {n:'산청',c:ORANGE,l:47,t:72},{n:'하동',c:ORANGE,l:43,t:76},
  {n:'밀양',c:ORANGE,l:68,t:76},{n:'부산동구',c:ORANGE,l:77,t:70},
  {n:'부산서구',c:ORANGE,l:72,t:80},{n:'부산영도',c:ORANGE,l:79,t:76},
  /* 전라 (green) */
  {n:'김제',c:GREEN,l:26,t:62},{n:'무주',c:GREEN,l:43,t:60},
  {n:'고창',c:GREEN,l:22,t:70},{n:'임실',c:GREEN,l:38,t:65},
  {n:'순창',c:GREEN,l:33,t:68},{n:'남원',c:GREEN,l:43,t:73},
  {n:'담양',c:GREEN,l:32,t:72},{n:'영광',c:GREEN,l:19,t:74},
  {n:'곡성',c:GREEN,l:37,t:76},{n:'구례',c:GREEN,l:43,t:81},
  {n:'함평',c:GREEN,l:16,t:79},{n:'장흥',c:GREEN,l:24,t:83},
  {n:'고흥',c:GREEN,l:32,t:85},{n:'신안',c:GREEN,l:7,t:78},
  {n:'해남',c:GREEN,l:14,t:87},{n:'완도',c:GREEN,l:22,t:91}
];

/* 실제 행정구역 표기 (지역 상세 페이지 타이틀용) */
const REGION_SIDO={
  철원:'강원특별자치도',양양:'강원특별자치도',홍천:'강원특별자치도',정선:'강원특별자치도',
  평창:'강원특별자치도',삼척:'강원특별자치도',영월:'강원특별자치도',태백:'강원특별자치도',
  연천:'경기도',가평:'경기도',강화:'인천광역시',
  태안:'충청남도',예산:'충청남도',보령:'충청남도',
  제천:'충청북도',단양:'충청북도',괴산:'충청북도',보은:'충청북도',옥천:'충청북도',
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
      {cat:'체험',name:'지역 체험 프로그램',desc:'지역 문화를 직접 체험해볼 수 있어요',discount:'입장권 10% 할인'}
    ],
    mock:true
  };
}

function getCurLevelIdx(exp){
  for(let i=LEVELS.length-1;i>=0;i--){if(exp>=LEVELS[i].minExp)return i;}
  return 0;
}
