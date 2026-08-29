(() => {
'use strict';

const SIZE=8;
const $=id=>document.getElementById(id);
const screens={home:$('homeScreen'),shop:$('shopScreen'),rank:$('rankScreen'),game:$('gameScreen')};
const boardEl=$('board'),boardWrap=$('boardWrap'),particles=$('particles'),clearFlash=$('clearFlash'),trayEl=$('tray');
const scoreEl=$('score'),bestEl=$('best'),comboEl=$('combo'),themeBadge=$('themeBadge'),timerBadge=$('timerBadge'),modeLabel=$('modeLabel');
const pauseOverlay=$('pauseOverlay'),gameOverOverlay=$('gameOverOverlay'),confirmOverlay=$('confirmOverlay'),toast=$('toast');
const installCard=$('installCard'),installBtn=$('installBtn'),installClose=$('installClose');

const THEMES=[
 {name:'OCEAN',price:0,bg1:'#0b45b9',bg2:'#1da6ef',empty:'#071d555e',grid:'#ffffff18',colors:['#ff3f76','#ffc625','#61e517','#16b6ff','#a656ff']},
 {name:'SUNSET',price:600,bg1:'#7b2a76',bg2:'#ff764d',empty:'#4010445b',grid:'#ffffff1e',colors:['#ffdf25','#ff5b63','#ff902d','#8ee54c','#58dfff']},
 {name:'ICE',price:900,bg1:'#09658c',bg2:'#69dff0',empty:'#06465d5b',grid:'#e4fdff28',colors:['#dffcff','#77e9ff','#35bdf8','#83efd2','#b7d6ff']},
 {name:'CANDY',price:1200,bg1:'#862786',bg2:'#ff78bc',empty:'#4c184d55',grid:'#ffffff20',colors:['#ff4fa3','#ffdc35','#57e7ff','#aaff4f','#c26dff']},
 {name:'FOREST',price:1600,bg1:'#0b644b',bg2:'#45bd72',empty:'#083f325e',grid:'#eaffed20',colors:['#b9f844','#36d97e','#ffda42','#35cbe2','#ff7d75']},
 {name:'NIGHT',price:2100,bg1:'#11133f',bg2:'#303ab1',empty:'#090b295e',grid:'#c9ceff18',colors:['#ff3bab','#727cff','#25ddfb','#c8ff40','#ffdb44']},
 {name:'LAVA',price:2800,bg1:'#5b1221',bg2:'#ef5b25',empty:'#33091062',grid:'#ffd2b81d',colors:['#ffce2f','#ff6b24','#ff344f','#ffd65b','#8fe746']},
 {name:'ROYAL',price:3500,bg1:'#25105f',bg2:'#7048d8',empty:'#16083c62',grid:'#e2d9ff1d',colors:['#ffd84a','#f8f1ff','#9c6cff','#46dbff','#ff5da9']}
];
const SHAPES=[
 [[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[0,1]],[[0,0],[0,1],[0,2]],[[0,0],[0,1],[0,2],[0,3]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[0,1]],
 [[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[2,0],[2,1]],[[0,0],[0,1],[0,2],[1,2]],[[1,0],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[1,1]],[[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[1,1],[1,2]],[[0,0],[1,0],[2,0],[0,1],[2,1]]
];

const PROFILE_KEY='novaProfileV4';
const ACTIVE_KEY='novaActiveRunV4';
function defaultProfile(){
 return {coins:250,best:Number(localStorage.getItem('novaBest')||0),perfects:0,runs:[],ownedThemes:[0],equippedTheme:0,boosters:{shuffle:2,blast:1},streak:0,lastDaily:'',muted:false};
}
function loadProfile(){
 let p=defaultProfile();
 try{p={...p,...JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')};}catch{}
 p.ownedThemes=Array.isArray(p.ownedThemes)?p.ownedThemes:[0];
 if(!p.ownedThemes.includes(0))p.ownedThemes.unshift(0);
 p.boosters={shuffle:2,blast:1,...(p.boosters||{})};
 p.runs=Array.isArray(p.runs)?p.runs:[];
 return p;
}
let profile=loadProfile();
function saveProfile(){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));refreshMeta();}
function refreshMeta(){
 $('coinCount').textContent=profile.coins;$('shopCoins').textContent=profile.coins;
 $('menuBest').textContent=profile.best;$('rankBest').textContent=profile.best;$('perfectCount').textContent=profile.perfects;$('runCount').textContent=profile.runs.length;
 $('streakCount').textContent=profile.streak;
 const today=dateKey();$('dailyStatus').textContent=profile.lastDaily===today?'Heute erledigt ✓':'Heute noch spielen';
 $('shuffleCount').textContent=profile.boosters.shuffle;$('blastCount').textContent=profile.boosters.blast;
 $('homeSoundBtn').textContent=profile.muted?'🔇':'🔊';
}
function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dayDiff(a,b){const A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.round((B-A)/86400000)}

let board=Array(SIZE*SIZE).fill(0),pieces=[],score=0,combo=0,themeIndex=profile.equippedTheme,currentMode='classic',busy=false,drag=null;
let rushLeft=120,timerId=null,coinsEarned=0,blastArmed=false,deferredPrompt=null,rng=Math.random,audioCtx=null;

const audio={
 ctx(){if(profile.muted)return null;if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx},
 noise(duration=.06,volume=.12,freq=1700,type='bandpass'){const c=this.ctx();if(!c)return;const len=Math.max(1,Math.floor(c.sampleRate*duration)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++){const env=Math.pow(1-i/len,1.7);d[i]=(Math.random()*2-1)*env}const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type=type;f.frequency.value=freq;f.Q.value=.55;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(f).connect(g).connect(c.destination);s.start()},
 thud(freq=78,dur=.07,vol=.08){const c=this.ctx();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(42,c.currentTime+dur);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)},
 snap(){this.noise(.032,.075,2800,'highpass');this.thud(92,.055,.045)},
 clear(n=1){this.thud(105+n*6,.11,.09);this.noise(.15,.18,1050,'bandpass');setTimeout(()=>this.noise(.08,.10,3200,'highpass'),32);setTimeout(()=>this.noise(.07,.07,2200,'highpass'),78)},
 combo(){this.noise(.06,.075,3600,'highpass');setTimeout(()=>this.noise(.05,.055,4400,'highpass'),55)},
 perfect(){this.thud(130,.2,.09);for(let i=0;i<5;i++)setTimeout(()=>this.noise(.1,.07,1400+i*650,'bandpass'),i*55)},
 fail(){this.thud(88,.22,.10);setTimeout(()=>this.noise(.18,.08,500,'lowpass'),70)}
};
function vibrate(p){try{navigator.vibrate?.(p)}catch{}}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function showToast(t){toast.textContent=t;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1900)}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function dailySeed(){return Number(dateKey().replaceAll('-',''))||1}

function showScreen(name){
 Object.values(screens).forEach(s=>s.classList.add('hidden'));
 screens[name].classList.remove('hidden');
 document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
 if(name==='shop')renderShop();
 if(name==='rank')renderRanking();
 if(name==='home')refreshMeta();
}
function applyTheme(i,flash=false){
 themeIndex=(i+THEMES.length)%THEMES.length;
 const t=THEMES[themeIndex],st=document.documentElement.style;
 st.setProperty('--bg1',t.bg1);st.setProperty('--bg2',t.bg2);st.setProperty('--empty',t.empty);st.setProperty('--grid',t.grid);
 t.colors.forEach((c,k)=>st.setProperty(`--c${k+1}`,c));
 themeBadge.textContent=t.name;
 document.querySelector('meta[name="theme-color"]').setAttribute('content',t.bg1);
 if(flash){const d=document.createElement('div');d.className='themeFlash';d.innerHTML=`<strong>${t.name} THEME!</strong>`;$('app').appendChild(d);setTimeout(()=>d.remove(),1000)}
 renderBoard();renderTray();
}
function blockColor(idx){return THEMES[themeIndex].colors[(idx-1+5)%5]}

function buildBoard(){
 boardEl.innerHTML='';
 for(let i=0;i<SIZE*SIZE;i++){
  const c=document.createElement('div');c.className='cell';c.dataset.i=i;
  c.addEventListener('pointerdown',e=>{if(blastArmed&&board[i]){e.preventDefault();useBlast(i)}});
  boardEl.appendChild(c);
 }
 renderBoard();
}
function renderBoard(){
 [...boardEl.children].forEach((c,i)=>{const v=board[i];c.classList.toggle('filled',!!v);c.style.setProperty('--block',v?blockColor(v):'transparent');if(!v)c.classList.remove('clearing','blastTarget')});
}
function shapeBounds(shape){return{w:Math.max(...shape.map(p=>p[0]))+1,h:Math.max(...shape.map(p=>p[1]))+1}}
function randomPiece(){return{shapeId:Math.floor(rng()*SHAPES.length),colorIndex:1+Math.floor(rng()*5),used:false,id:Math.random().toString(36).slice(2)}}
function refillPieces(){pieces=[randomPiece(),randomPiece(),randomPiece()];renderTray();saveActive()}
function renderTray(){
 trayEl.innerHTML='';
 pieces.forEach((p,index)=>{
  const slot=document.createElement('div');slot.className='pieceSlot'+(p.used?' used':'');
  const el=document.createElement('div');el.className='piece';el.dataset.index=index;
  const shape=SHAPES[p.shapeId],b=shapeBounds(shape);
  el.style.gridTemplateColumns=`repeat(${b.w},28px)`;el.style.gridTemplateRows=`repeat(${b.h},28px)`;el.style.setProperty('--block',blockColor(p.colorIndex));
  for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const m=document.createElement('div');if(shape.some(q=>q[0]===x&&q[1]===y))m.className='mini';m.style.gridColumn=x+1;m.style.gridRow=y+1;el.appendChild(m)}
  if(!p.used)el.addEventListener('pointerdown',e=>startDrag(e,index,el));
  slot.appendChild(el);trayEl.appendChild(slot);
 });
}
function clearGhost(){[...boardEl.children].forEach(c=>{c.classList.remove('ghost','bad');c.style.removeProperty('--ghost')})}
function canPlace(shape,row,col){return shape.every(([x,y])=>{const r=row+y,c=col+x;return r>=0&&r<SIZE&&c>=0&&c<SIZE&&!board[r*SIZE+c]})}
function boardCellFromPoint(x,y,shape){const rect=boardEl.getBoundingClientRect(),gap=4,pad=7,inner=rect.width-pad*2,cell=(inner-gap*7)/8,b=shapeBounds(shape);return{col:Math.round((x-rect.left-pad-(b.w*cell+(b.w-1)*gap)/2)/(cell+gap)),row:Math.round((y-rect.top-pad-(b.h*cell+(b.h-1)*gap)/2)/(cell+gap))}}
function showGhost(shape,row,col,color,valid){clearGhost();shape.forEach(([x,y])=>{const r=row+y,c=col+x;if(r>=0&&r<SIZE&&c>=0&&c<SIZE){const el=boardEl.children[r*SIZE+c];el.classList.add(valid?'ghost':'bad');el.style.setProperty('--ghost',color)}})}
function startDrag(e,index,el){
 if(busy||blastArmed||pieces[index].used)return;e.preventDefault();audio.ctx();
 const p=pieces[index],clone=el.cloneNode(true),rect=el.getBoundingClientRect();
 clone.classList.add('moving');clone.style.width=rect.width+'px';clone.style.height=rect.height+'px';document.body.appendChild(clone);
 drag={index,piece:p,el:clone,row:null,col:null,valid:false,dx:rect.width/2,dy:rect.height*1.52};moveDrag(e);
 window.addEventListener('pointermove',moveDrag,{passive:false});window.addEventListener('pointerup',endDrag,{once:true});window.addEventListener('pointercancel',endDrag,{once:true});
}
function moveDrag(e){if(!drag)return;e.preventDefault();drag.el.style.left=(e.clientX-drag.dx)+'px';drag.el.style.top=(e.clientY-drag.dy)+'px';const shape=SHAPES[drag.piece.shapeId],pos=boardCellFromPoint(e.clientX,e.clientY-48,shape);drag.row=pos.row;drag.col=pos.col;drag.valid=canPlace(shape,pos.row,pos.col);showGhost(shape,pos.row,pos.col,blockColor(drag.piece.colorIndex),drag.valid)}
async function endDrag(){if(!drag)return;window.removeEventListener('pointermove',moveDrag);clearGhost();const d=drag;drag=null;d.el.remove();if(d.valid)await placePiece(d.index,d.row,d.col)}

async function placePiece(index,row,col){
 if(busy)return;const p=pieces[index],shape=SHAPES[p.shapeId];if(!p||p.used||!canPlace(shape,row,col))return;
 busy=true;shape.forEach(([x,y],k)=>{const i=(row+y)*SIZE+(col+x);board[i]=p.colorIndex;const el=boardEl.children[i];el.classList.add('filled','pop');el.style.setProperty('--block',blockColor(p.colorIndex));setTimeout(()=>el.classList.remove('pop'),230+k*7)});
 p.used=true;addScore(shape.length*8);audio.snap();vibrate(14);renderTray();await resolveLines();
 if(pieces.every(q=>q.used))refillPieces();saveActive();busy=false;setTimeout(checkGameOver,30);
}
function addScore(n){const mult=currentMode==='rush'?1.25:1;score+=Math.round(n*mult);scoreEl.textContent=score;if(score>profile.best){profile.best=score;bestEl.textContent=profile.best;saveProfile()}}
function fullLines(){const rows=[],cols=[];for(let r=0;r<SIZE;r++)if(Array.from({length:SIZE},(_,c)=>board[r*SIZE+c]).every(Boolean))rows.push(r);for(let c=0;c<SIZE;c++)if(Array.from({length:SIZE},(_,r)=>board[r*SIZE+c]).every(Boolean))cols.push(c);return{rows,cols}}
async function resolveLines(){
 const {rows,cols}=fullLines(),lineCount=rows.length+cols.length;if(!lineCount){combo=0;return}
 const set=new Set();rows.forEach(r=>{for(let c=0;c<SIZE;c++)set.add(r*SIZE+c)});cols.forEach(c=>{for(let r=0;r<SIZE;r++)set.add(r*SIZE+c)});
 combo++;addScore(lineCount*115+set.size*13+(combo-1)*95);coinsEarned+=lineCount*3;
 comboEl.textContent=lineCount>=3?`MEGA CLEAR ×${lineCount}`:combo>1?`COMBO ×${combo}`:`+${lineCount} CLEAR`;comboEl.classList.remove('show');void comboEl.offsetWidth;comboEl.classList.add('show');
 audio.clear(lineCount);if(combo>1)setTimeout(()=>audio.combo(),95);vibrate(lineCount>1?[22,25,32]:24);
 boardWrap.classList.remove('shake');void boardWrap.offsetWidth;boardWrap.classList.add('shake');clearFlash.classList.remove('hit');void clearFlash.offsetWidth;clearFlash.classList.add('hit');
 [...set].forEach((i,k)=>setTimeout(()=>{const el=boardEl.children[i];el.classList.add('clearing');spawnFragments(el,blockColor(board[i]),lineCount)},Math.min(k*7,115)));
 await wait(410);set.forEach(i=>board[i]=0);renderBoard();
 if(board.every(v=>!v))await perfectClear();
 saveActive();
}
async function perfectClear(){
 addScore(650);coinsEarned+=75;profile.perfects++;audio.perfect();vibrate([30,28,42,28,65]);
 const next=(themeIndex+1)%THEMES.length;
 if(!profile.ownedThemes.includes(next)){profile.ownedThemes.push(next);showToast(`${THEMES[next].name} freigeschaltet!`)}else showToast('PERFECT CLEAR +75 ◆');
 applyTheme(next,true);saveProfile();await wait(180);
}
function spawnFragments(el,color,power){
 const br=el.getBoundingClientRect(),wr=boardWrap.getBoundingClientRect(),x=br.left-wr.left+br.width/2,y=br.top-wr.top+br.height/2,count=7+Math.min(power,3)*2;
 for(let i=0;i<count;i++){const f=document.createElement('i');f.className='frag';f.style.left=x+'px';f.style.top=y+'px';f.style.setProperty('--frag',color);const a=Math.random()*Math.PI*2,dist=34+Math.random()*58+power*5;f.style.setProperty('--dx',Math.cos(a)*dist+'px');f.style.setProperty('--dy',Math.sin(a)*dist+'px');f.style.setProperty('--rot',(Math.random()*520-260)+'deg');particles.appendChild(f);setTimeout(()=>f.remove(),720)}
}
function pieceFitsAnywhere(p){const s=SHAPES[p.shapeId];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(canPlace(s,r,c))return true;return false}
function checkGameOver(){if(busy)return;const active=pieces.filter(p=>!p.used);if(active.some(pieceFitsAnywhere))return;finishGame(false)}
function finishGame(fromTimer=false){
 clearInterval(timerId);timerId=null;busy=true;localStorage.removeItem(ACTIVE_KEY);
 const bonus=Math.max(1,Math.floor(score/180));coinsEarned+=bonus;
 if(currentMode==='daily'&&profile.lastDaily!==dateKey()){const diff=profile.lastDaily?dayDiff(profile.lastDaily,dateKey()):99;profile.streak=diff===1?profile.streak+1:1;profile.lastDaily=dateKey();coinsEarned+=100}
 profile.coins+=coinsEarned;
 profile.runs.push({score,mode:currentMode,date:new Date().toISOString(),perfects:profile.perfects});
 profile.runs.sort((a,b)=>b.score-a.score);profile.runs=profile.runs.slice(0,50);
 if(score>profile.best)profile.best=score;saveProfile();renderRanking();
 $('finalScore').textContent=score;$('earnedCoins').textContent=coinsEarned;$('overMode').textContent=(fromTimer?'TIME! • ':'')+currentMode.toUpperCase();
 gameOverOverlay.classList.remove('hidden');audio.fail();vibrate([55,45,85]);
}
function saveActive(){
 if(currentMode!=='classic'||busy||gameOverOverlay&&!gameOverOverlay.classList.contains('hidden'))return;
 localStorage.setItem(ACTIVE_KEY,JSON.stringify({board,pieces,score,combo,themeIndex,coinsEarned,ts:Date.now()}));
}
function restoreClassic(){
 try{const s=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null');if(!s||!Array.isArray(s.board)||s.board.length!==64)return false;board=s.board;pieces=s.pieces||[];score=s.score||0;combo=s.combo||0;themeIndex=s.themeIndex??profile.equippedTheme;coinsEarned=s.coinsEarned||0;return pieces.length===3}catch{return false}
}
function startGame(mode){
 currentMode=mode;busy=false;blastArmed=false;clearInterval(timerId);timerId=null;rng=mode==='daily'?seeded(dailySeed()):Math.random;
 board=Array(64).fill(0);pieces=[];score=0;combo=0;coinsEarned=0;themeIndex=profile.equippedTheme;
 let restored=false;if(mode==='classic')restored=restoreClassic();
 applyTheme(themeIndex);buildBoard();if(restored){renderTray();scoreEl.textContent=score;showToast('Run fortgesetzt')}else refillPieces();
 bestEl.textContent=profile.best;modeLabel.textContent=mode.toUpperCase();timerBadge.classList.toggle('hidden',mode!=='rush');
 if(mode==='rush'){rushLeft=120;updateTimer();timerId=setInterval(()=>{rushLeft--;updateTimer();if(rushLeft<=0)finishGame(true)},1000)}
 if(mode==='daily')markDailyVisit();
 gameOverOverlay.classList.add('hidden');pauseOverlay.classList.add('hidden');showScreen('game');refreshMeta();
}
function markDailyVisit(){if(profile.lastDaily!==dateKey())showToast('Daily Run • +100 ◆ beim Abschluss')}
function updateTimer(){const m=Math.floor(rushLeft/60),s=rushLeft%60;timerBadge.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function restartGame(){localStorage.removeItem(ACTIVE_KEY);gameOverOverlay.classList.add('hidden');pauseOverlay.classList.add('hidden');startGame(currentMode)}
function leaveGame(){clearInterval(timerId);timerId=null;if(currentMode==='classic')saveActive();pauseOverlay.classList.add('hidden');gameOverOverlay.classList.add('hidden');busy=false;showScreen('home')}

function useShuffle(){
 if(busy||blastArmed)return;if(profile.boosters.shuffle<=0){showToast('Kein Shuffle mehr • im Shop kaufen');return}
 profile.boosters.shuffle--;pieces=pieces.map(p=>p.used?p:randomPiece());audio.snap();vibrate(18);saveProfile();renderTray();saveActive();showToast('Pieces neu gemischt')
}
function armBlast(){
 if(busy)return;if(profile.boosters.blast<=0){showToast('Kein Blast mehr • im Shop kaufen');return}
 blastArmed=!blastArmed;[...boardEl.children].forEach((c,i)=>c.classList.toggle('blastTarget',blastArmed&&!!board[i]));showToast(blastArmed?'Block antippen → 3×3 BLAST':'Blast abgebrochen')
}
async function useBlast(index){
 if(!blastArmed||busy||!board[index])return;busy=true;blastArmed=false;profile.boosters.blast--;saveProfile();
 const r=Math.floor(index/8),c=index%8,set=new Set();for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const rr=r+y,cc=c+x;if(rr>=0&&rr<8&&cc>=0&&cc<8&&board[rr*8+cc])set.add(rr*8+cc)}
 audio.clear(2);vibrate([25,20,35]);boardWrap.classList.add('shake');set.forEach(i=>{const el=boardEl.children[i];el.classList.add('clearing');spawnFragments(el,blockColor(board[i]),2)});
 await wait(360);set.forEach(i=>board[i]=0);addScore(set.size*20);coinsEarned+=2;renderBoard();busy=false;saveActive();setTimeout(checkGameOver,30)
}

function renderShop(){
 $('shopCoins').textContent=profile.coins;
 const themeShop=$('themeShop');themeShop.innerHTML='';
 THEMES.forEach((t,i)=>{
  const owned=profile.ownedThemes.includes(i),equipped=profile.equippedTheme===i,d=document.createElement('article');
  d.className='shopCard'+(equipped?' equipped':'')+(owned?'':' locked');
  d.innerHTML=`<div class="shopPreview" style="--p1:${t.bg1};--p2:${t.bg2};--pc:${t.colors[1]}"><i class="shopCube"></i><i class="shopCube" style="--pc:${t.colors[0]}"></i><i class="shopCube" style="--pc:${t.colors[3]}"></i><i class="shopCube" style="--pc:${t.colors[2]}"></i><i class="shopCube" style="--pc:${t.colors[4]}"></i></div><h3>${t.name}</h3><p>${owned?'Freigeschaltet':`${t.price} ◆`}</p><button>${equipped?'AKTIV':owned?'AUSRÜSTEN':`KAUFEN • ${t.price} ◆`}</button>`;
  d.querySelector('button').onclick=()=>{if(equipped)return;if(owned){profile.equippedTheme=i;saveProfile();applyTheme(i);renderShop()}else confirmPurchase(`${t.name} Theme`,t.price,()=>{profile.ownedThemes.push(i);profile.equippedTheme=i;saveProfile();applyTheme(i);renderShop()})};
  themeShop.appendChild(d);
 });
 const boosterShop=$('boosterShop');boosterShop.innerHTML='';
 [{key:'shuffle',icon:'⟳',name:'SHUFFLE',desc:'Ersetzt alle unbenutzten Pieces',price:120},{key:'blast',icon:'✹',name:'3×3 BLAST',desc:'Zerstört einen 3×3 Bereich',price:180}].forEach(b=>{
  const d=document.createElement('article');d.className='shopCard boosterCard';d.innerHTML=`<span class="boosterQty">x${profile.boosters[b.key]}</span><div class="boosterBig">${b.icon}</div><h3>${b.name}</h3><p>${b.desc}</p><button>KAUFEN • ${b.price} ◆</button>`;
  d.querySelector('button').onclick=()=>confirmPurchase(b.name,b.price,()=>{profile.boosters[b.key]++;saveProfile();renderShop()});boosterShop.appendChild(d);
 })
}
function confirmPurchase(name,price,action){
 if(profile.coins<price){showToast('Nicht genug Nova Coins');return}
 $('confirmTitle').textContent='KAUFEN?';$('confirmText').textContent=`${name} für ${price} Nova Coins`;confirmOverlay.classList.remove('hidden');
 confirmOverlay._action=()=>{profile.coins-=price;action();confirmOverlay.classList.add('hidden');showToast(`${name} gekauft ✓`)}
}
function renderRanking(){
 const list=$('rankList');list.innerHTML='';const runs=[...profile.runs].sort((a,b)=>b.score-a.score).slice(0,10);
 if(!runs.length){list.innerHTML='<div class="emptyRank">Noch keine abgeschlossenen Runs.<br>Spiel eine Runde und hol Platz #1.</div>';return}
 runs.forEach((r,i)=>{const d=document.createElement('div');d.className='rankRow';const dt=new Date(r.date);d.innerHTML=`<span class="rankPos">#${i+1}</span><div class="rankInfo"><strong>${r.mode.toUpperCase()}</strong><small>${dt.toLocaleDateString('de-DE')}</small></div><span class="rankScore">${r.score}</span>`;list.appendChild(d)})
}

document.querySelectorAll('.modeBtn').forEach(b=>b.addEventListener('click',()=>startGame(b.dataset.mode)));
$('dailyQuickBtn').onclick=()=>startGame('daily');
document.querySelectorAll('.navBtn').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
document.querySelectorAll('.backHome').forEach(b=>b.onclick=()=>showScreen('home'));
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));$('themeShop').classList.toggle('hidden',b.dataset.tab!=='themes');$('boosterShop').classList.toggle('hidden',b.dataset.tab!=='boosters')});
$('homeSoundBtn').onclick=()=>{profile.muted=!profile.muted;saveProfile();showToast(profile.muted?'Sound aus':'Sound an')};
$('pauseBtn').onclick=()=>{pauseOverlay.classList.remove('hidden');if(timerId)clearInterval(timerId)};
$('resumeBtn').onclick=()=>{pauseOverlay.classList.add('hidden');if(currentMode==='rush'&&rushLeft>0){clearInterval(timerId);timerId=setInterval(()=>{rushLeft--;updateTimer();if(rushLeft<=0)finishGame(true)},1000)}};
$('restartBtn').onclick=restartGame;$('againBtn').onclick=restartGame;$('leaveBtn').onclick=leaveGame;$('overHomeBtn').onclick=leaveGame;$('exitGameBtn').onclick=leaveGame;
$('shuffleBtn').onclick=useShuffle;$('blastBtn').onclick=armBlast;
$('confirmNo').onclick=()=>confirmOverlay.classList.add('hidden');$('confirmYes').onclick=()=>confirmOverlay._action?.();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!matchMedia('(display-mode:standalone)').matches)setTimeout(()=>installCard.classList.remove('hidden'),1000)});
installBtn.onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();const c=await deferredPrompt.userChoice;if(c.outcome==='accepted')installCard.classList.add('hidden');deferredPrompt=null}else showToast('Chrome ⋮ → App installieren')};
installClose.onclick=()=>installCard.classList.add('hidden');window.addEventListener('appinstalled',()=>installCard.classList.add('hidden'));
window.addEventListener('beforeunload',saveActive);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()).catch(()=>{});

function startSplash(){
 applyTheme(profile.equippedTheme);refreshMeta();renderRanking();renderShop();buildBoard();
 setTimeout(()=>{$('studioSplash').classList.remove('active');$('gameSplash').classList.add('active')},1250);
 setTimeout(()=>{$('gameSplash').classList.remove('active');showScreen('home')},2500);
}
startSplash();
})();