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

const REGIONS=[
  {n:'철원',c:'#1b4bab',l:36,t:3},{n:'양양',c:'#1b4bab',l:64,t:9},
  {n:'홍천',c:'#1b4bab',l:49,t:14},{n:'정선',c:'#1b4bab',l:65,t:23},
  {n:'가평',c:'#be185d',l:43,t:11},{n:'평창',c:'#1b4bab',l:60,t:23},
  {n:'삼척',c:'#1b4bab',l:75,t:21},{n:'영월',c:'#1b4bab',l:61,t:29},
  {n:'태백',c:'#1b4bab',l:72,t:29},
  {n:'연천',c:'#be185d',l:33,t:4},{n:'강화',c:'#be185d',l:23,t:20},
  {n:'태안',c:'#0d7b6d',l:19,t:40},{n:'제천',c:'#0d7b6d',l:57,t:30},
  {n:'단양',c:'#0d7b6d',l:60,t:33},{n:'예산',c:'#0d7b6d',l:30,t:41},
  {n:'괴산',c:'#0d7b6d',l:48,t:37},{n:'보령',c:'#0d7b6d',l:24,t:50},
  {n:'보은',c:'#0d7b6d',l:47,t:46},{n:'영동',c:'#0d7b6d',l:48,t:54},
  {n:'옥천',c:'#0d7b6d',l:44,t:51},
  {n:'영주',c:'#c2410c',l:64,t:37},{n:'울진',c:'#c2410c',l:80,t:33},
  {n:'의성',c:'#c2410c',l:66,t:50},{n:'안동',c:'#c2410c',l:67,t:44},
  {n:'영덕',c:'#c2410c',l:79,t:48},{n:'청도',c:'#c2410c',l:67,t:67},
  {n:'거창',c:'#c2410c',l:51,t:67},{n:'고령',c:'#c2410c',l:58,t:66},
  {n:'김제',c:'#1a7a35',l:31,t:64},{n:'고창',c:'#1a7a35',l:27,t:73},
  {n:'임실',c:'#1a7a35',l:39,t:67},{n:'남원',c:'#1a7a35',l:41,t:74}
];

function getCurLevelIdx(exp){
  for(let i=LEVELS.length-1;i>=0;i--){if(exp>=LEVELS[i].minExp)return i;}
  return 0;
}
