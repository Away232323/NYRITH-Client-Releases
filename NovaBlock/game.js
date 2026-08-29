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
const LOW_POWER=((navigator.deviceMemory||8)<=4)||((navigator.hardwareConcurrency||8)<=4);

function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dayDiff(a,b){const A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.round((B-A)/86400000)}
function defaultProfile(){return {coins:250,best:0,perfects:0,runs:[],ownedThemes:[0],equippedTheme:0,boosters:{shuffle:2,blast:1},streak:0,lastDaily:'',muted:false}}
function loadProfile(){
 let p=defaultProfile();
 try{p={...p,...JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}}catch{}
 const legacyBest=Number(localStorage.getItem('novaBest')||0);
 p.best=Math.max(Number(p.best)||0,legacyBest);
 p.coins=Math.max(0,Number(p.coins)||0);p.perfects=Math.max(0,Number(p.perfects)||0);p.streak=Math.max(0,Number(p.streak)||0);
 p.ownedThemes=Array.isArray(p.ownedThemes)?p.ownedThemes.filter(n=>Number.isInteger(n)&&n>=0&&n<THEMES.length):[0];
 if(!p.ownedThemes.includes(0))p.ownedThemes.unshift(0);
 p.equippedTheme=p.ownedThemes.includes(Number(p.equippedTheme))?Number(p.equippedTheme):0;
 p.boosters={shuffle:2,blast:1,...(p.boosters||{})};
 p.runs=Array.isArray(p.runs)?p.runs.filter(r=>r&&Number(r.score)>0):[];
 // V4 hatte Bestscore und Runs getrennt. Dadurch konnte BEST 1719 stehen, obwohl Ranking leer war.
 if(p.best>0&&!p.runs.some(r=>Number(r.score)===p.best)){
   p.runs.push({score:p.best,mode:'classic',date:new Date().toISOString(),imported:true});
 }
 p.runs.sort((a,b)=>Number(b.score)-Number(a.score));p.runs=p.runs.slice(0,50);
 return p;
}
let profile=loadProfile();
localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
function saveProfile(){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));refreshMeta()}
function refreshMeta(){
 $('coinCount').textContent=profile.coins;$('shopCoins').textContent=profile.coins;
 $('menuBest').textContent=profile.best;$('rankBest').textContent=profile.best;$('perfectCount').textContent=profile.perfects;$('runCount').textContent=profile.runs.length;
 $('streakCount').textContent=profile.streak;$('dailyStatus').textContent=profile.lastDaily===dateKey()?'Heute erledigt ✓':'Heute noch spielen';
 $('shuffleCount').textContent=profile.boosters.shuffle;$('blastCount').textContent=profile.boosters.blast;$('homeSoundBtn').textContent=profile.muted?'🔇':'🔊';
}

let board=Array(SIZE*SIZE).fill(0),cells=[],pieces=[],score=0,combo=0,themeIndex=profile.equippedTheme,currentMode='classic',busy=false,drag=null,lastGhost=[];
let rushLeft=120,timerId=null,coinsEarned=0,blastArmed=false,deferredPrompt=null,rng=Math.random,audioCtx=null,finished=false;

const audio={
 ctx(){if(profile.muted)return null;if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx},
 noise(duration=.05,volume=.09,freq=1800,type='bandpass'){const c=this.ctx();if(!c)return;const len=Math.max(1,Math.floor(c.sampleRate*duration)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.8);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type=type;f.frequency.value=freq;f.Q.value=.5;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(f).connect(g).connect(c.destination);s.start()},
 thud(freq=82,dur=.06,vol=.055){const c=this.ctx();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(44,c.currentTime+dur);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)},
 snap(){this.noise(.026,.055,3000,'highpass');this.thud(94,.048,.035)},
 clear(n=1){this.thud(105+n*5,.09,.065);this.noise(.10,.11,1150);setTimeout(()=>this.noise(.055,.055,3300,'highpass'),28)},
 combo(){this.noise(.045,.05,3900,'highpass')},perfect(){this.thud(132,.16,.07);this.noise(.18,.10,1250)},fail(){this.thud(88,.18,.075);this.noise(.13,.05,520,'lowpass')}
};
function vibrate(p){try{navigator.vibrate?.(p)}catch{}}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function showToast(t){toast.textContent=t;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1600)}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function dailySeed(){return Number(dateKey().replaceAll('-',''))||1}

function showScreen(name){
 Object.values(screens).forEach(s=>s.classList.add('hidden'));screens[name].classList.remove('hidden');
 document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
 if(name==='shop')renderShop();if(name==='rank')renderRanking();if(name==='home')refreshMeta();
}
function applyTheme(i,flash=false){
 themeIndex=(i+THEMES.length)%THEMES.length;const t=THEMES[themeIndex],st=document.documentElement.style;
 st.setProperty('--bg1',t.bg1);st.setProperty('--bg2',t.bg2);st.setProperty('--empty',t.empty);st.setProperty('--grid',t.grid);t.colors.forEach((c,k)=>st.setProperty(`--c${k+1}`,c));
 themeBadge.textContent=t.name;document.querySelector('meta[name="theme-color"]').setAttribute('content',t.bg1);
 if(flash){const d=document.createElement('div');d.className='themeFlash';d.innerHTML=`<strong>${t.name} THEME!</strong>`;$('app').appendChild(d);setTimeout(()=>d.remove(),680)}
 renderBoard();renderTray();
}
function blockColor(idx){return THEMES[themeIndex].colors[(idx-1+5)%5]}

function buildBoard(){
 boardEl.innerHTML='';cells=[];
 for(let i=0;i<SIZE*SIZE;i++){const c=document.createElement('div');c.className='cell';c.dataset.i=i;c.addEventListener('pointerdown',e=>{if(blastArmed&&board[i]){e.preventDefault();useBlast(i)}});boardEl.appendChild(c);cells.push(c)}
 renderBoard();
}
function renderBoard(){for(let i=0;i<cells.length;i++){const c=cells[i],v=board[i];c.classList.toggle('filled',!!v);c.style.setProperty('--block',v?blockColor(v):'transparent');if(!v)c.classList.remove('clearing','blastTarget')}}
function shapeBounds(shape){return {w:Math.max(...shape.map(p=>p[0]))+1,h:Math.max(...shape.map(p=>p[1]))+1}}
function randomPiece(){return {shapeId:Math.floor(rng()*SHAPES.length),colorIndex:1+Math.floor(rng()*5),used:false,id:Math.random().toString(36).slice(2)}}
function refillPieces(){pieces=[randomPiece(),randomPiece(),randomPiece()];renderTray();saveActive()}
function renderTray(){
 trayEl.innerHTML='';
 pieces.forEach((p,index)=>{
  const slot=document.createElement('div');slot.className='pieceSlot'+(p.used?' used':'');const el=document.createElement('div');el.className='piece';el.dataset.index=index;
  const shape=SHAPES[p.shapeId],b=shapeBounds(shape),unit=window.innerHeight<760?24:28;el.style.gridTemplateColumns=`repeat(${b.w},${unit}px)`;el.style.gridTemplateRows=`repeat(${b.h},${unit}px)`;el.style.setProperty('--block',blockColor(p.colorIndex));
  for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const m=document.createElement('div');if(shape.some(q=>q[0]===x&&q[1]===y))m.className='mini';m.style.gridColumn=x+1;m.style.gridRow=y+1;el.appendChild(m)}
  if(!p.used)el.addEventListener('pointerdown',e=>startDrag(e,index,el));slot.appendChild(el);trayEl.appendChild(slot);
 });
}
function canPlace(shape,row,col){return shape.every(([x,y])=>{const r=row+y,c=col+x;return r>=0&&r<SIZE&&c>=0&&c<SIZE&&!board[r*SIZE+c]})}
function clearGhost(){for(const i of lastGhost){const c=cells[i];if(c){c.classList.remove('ghost','bad');c.style.removeProperty('--ghost')}}lastGhost=[]}
function showGhost(shape,row,col,color,valid){
 clearGhost();
 for(const [x,y] of shape){const r=row+y,c=col+x;if(r>=0&&r<SIZE&&c>=0&&c<SIZE){const i=r*SIZE+c,el=cells[i];el.classList.add(valid?'ghost':'bad');el.style.setProperty('--ghost',color);lastGhost.push(i)}}
}
function boardGeometry(){const rect=boardEl.getBoundingClientRect(),gap=4,pad=7,cell=(rect.width-pad*2-gap*(SIZE-1))/SIZE;return {rect,gap,pad,cell,step:cell+gap}}
function rawCellFromPoint(x,y,shape,g){const b=shapeBounds(shape),pieceW=b.w*g.cell+(b.w-1)*g.gap,pieceH=b.h*g.cell+(b.h-1)*g.gap;return {col:Math.round((x-g.rect.left-g.pad-pieceW/2)/g.step),row:Math.round((y-g.rect.top-g.pad-pieceH/2)/g.step)}}
function placementCenter(row,col,shape,g){const b=shapeBounds(shape),pieceW=b.w*g.cell+(b.w-1)*g.gap,pieceH=b.h*g.cell+(b.h-1)*g.gap;return {x:g.rect.left+g.pad+col*g.step+pieceW/2,y:g.rect.top+g.pad+row*g.step+pieceH/2}}
function nearestPlacement(shape,x,y,g){
 const expand=g.step*1.35;if(x<g.rect.left-expand||x>g.rect.right+expand||y<g.rect.top-expand||y>g.rect.bottom+expand)return {row:-99,col:-99,valid:false};
 const raw=rawCellFromPoint(x,y,shape,g);let best=null,bestD=Infinity;
 for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const row=raw.row+dr,col=raw.col+dc;if(!canPlace(shape,row,col))continue;const p=placementCenter(row,col,shape,g),d=Math.hypot(p.x-x,p.y-y);if(d<bestD){bestD=d;best={row,col,valid:true}}}
 if(best&&bestD<=g.step*1.55)return best;
 return {row:raw.row,col:raw.col,valid:canPlace(shape,raw.row,raw.col)};
}
function startDrag(e,index,el){
 if(busy||blastArmed||pieces[index].used)return;e.preventDefault();audio.ctx();
 const p=pieces[index],clone=el.cloneNode(true),rect=el.getBoundingClientRect(),g=boardGeometry();clone.classList.add('moving');clone.style.width=rect.width+'px';clone.style.height=rect.height+'px';clone.style.left='0';clone.style.top='0';document.body.appendChild(clone);
 drag={index,piece:p,el:clone,row:null,col:null,valid:false,dx:rect.width/2,dy:rect.height/2,g,visualLift:Math.max(68,g.cell*1.7),raf:0,pending:{x:e.clientX,y:e.clientY},lastKey:''};
 scheduleDrag(e);window.addEventListener('pointermove',scheduleDrag,{passive:false});window.addEventListener('pointerup',endDrag,{once:true});window.addEventListener('pointercancel',endDrag,{once:true});
}
function scheduleDrag(e){if(!drag)return;e.preventDefault();drag.pending={x:e.clientX,y:e.clientY};if(drag.raf)return;drag.raf=requestAnimationFrame(()=>{if(!drag)return;drag.raf=0;processDrag(drag.pending.x,drag.pending.y)})}
function processDrag(x,y){
 if(!drag)return;const d=drag,shape=SHAPES[d.piece.shapeId];d.el.style.transform=`translate3d(${x-d.dx}px,${y-d.dy-d.visualLift}px,0) scale(1.08)`;
 const targetY=y-d.visualLift*.82,pos=nearestPlacement(shape,x,targetY,d.g);d.row=pos.row;d.col=pos.col;d.valid=pos.valid;const key=`${d.row}:${d.col}:${d.valid}`;
 if(key!==d.lastKey){d.lastKey=key;showGhost(shape,d.row,d.col,blockColor(d.piece.colorIndex),d.valid)}
}
async function endDrag(e){
 if(!drag)return;window.removeEventListener('pointermove',scheduleDrag);const d=drag;if(d.raf)cancelAnimationFrame(d.raf);if(e&&Number.isFinite(e.clientX))processDrag(e.clientX,e.clientY);clearGhost();drag=null;d.el.remove();if(d.valid)await placePiece(d.index,d.row,d.col)
}

function addScore(n){const mult=currentMode==='rush'?1.25:1;score+=Math.round(n*mult);scoreEl.textContent=score;if(score>profile.best){profile.best=score;bestEl.textContent=profile.best;$('menuBest').textContent=profile.best;$('rankBest').textContent=profile.best;localStorage.setItem('novaBest',String(profile.best))}}
async function placePiece(index,row,col){
 if(busy)return;const p=pieces[index];if(!p)return;const shape=SHAPES[p.shapeId];if(p.used||!canPlace(shape,row,col))return;busy=true;
 shape.forEach(([x,y],k)=>{const i=(row+y)*SIZE+(col+x);board[i]=p.colorIndex;const el=cells[i];el.classList.add('filled','pop');el.style.setProperty('--block',blockColor(p.colorIndex));setTimeout(()=>el.classList.remove('pop'),170+k*4)});
 p.used=true;addScore(shape.length*8);audio.snap();vibrate(10);renderTray();await resolveLines();if(pieces.every(q=>q.used))refillPieces();saveActive();busy=false;setTimeout(checkGameOver,20);
}
function fullLines(){const rows=[],cols=[];for(let r=0;r<SIZE;r++){let ok=true;for(let c=0;c<SIZE;c++)if(!board[r*SIZE+c]){ok=false;break}if(ok)rows.push(r)}for(let c=0;c<SIZE;c++){let ok=true;for(let r=0;r<SIZE;r++)if(!board[r*SIZE+c]){ok=false;break}if(ok)cols.push(c)}return {rows,cols}}
function spawnFragments(el,color,count,budget){if(budget.left<=0)return;const er=el.getBoundingClientRect(),wr=boardWrap.getBoundingClientRect(),x=er.left-wr.left+er.width/2,y=er.top-wr.top+er.height/2;for(let i=0;i<count&&budget.left>0;i++,budget.left--){const f=document.createElement('i');f.className='frag';f.style.left=x+'px';f.style.top=y+'px';f.style.setProperty('--frag',color);const a=Math.random()*Math.PI*2,dist=22+Math.random()*35;f.style.setProperty('--dx',Math.cos(a)*dist+'px');f.style.setProperty('--dy',Math.sin(a)*dist+'px');f.style.setProperty('--rot',(Math.random()*300-150)+'deg');particles.appendChild(f);setTimeout(()=>f.remove(),460)}}
async function resolveLines(){
 const {rows,cols}=fullLines(),lineCount=rows.length+cols.length;if(!lineCount){combo=0;return}const set=new Set();rows.forEach(r=>{for(let c=0;c<SIZE;c++)set.add(r*SIZE+c)});cols.forEach(c=>{for(let r=0;r<SIZE;r++)set.add(r*SIZE+c)});
 combo++;addScore(lineCount*100+set.size*10+(combo-1)*70);comboEl.textContent=lineCount>=3?`MEGA CLEAR +${lineCount}`:combo>1?`COMBO x${combo}`:`+${lineCount} CLEAR`;comboEl.classList.remove('show');void comboEl.offsetWidth;comboEl.classList.add('show');audio.clear(lineCount);if(combo>1)setTimeout(()=>audio.combo(),70);vibrate(lineCount>=2?[18,22,24]:18);
 boardWrap.classList.remove('shake');void boardWrap.offsetWidth;boardWrap.classList.add('shake');clearFlash.classList.remove('pulse');void clearFlash.offsetWidth;clearFlash.classList.add('pulse');
 const budget={left:LOW_POWER?16:30},fragCount=LOW_POWER?1:2;for(const i of set){cells[i].classList.add('clearing');spawnFragments(cells[i],blockColor(board[i]),fragCount,budget)}
 await wait(245);for(const i of set)board[i]=0;renderBoard();const empty=board.every(v=>!v);
 if(empty){addScore(500);profile.perfects++;coinsEarned+=25;audio.perfect();vibrate([24,24,38]);const next=(themeIndex+1)%THEMES.length;if(!profile.ownedThemes.includes(next))profile.ownedThemes.push(next);profile.equippedTheme=next;applyTheme(next,true);showToast('PERFECT CLEAR +500 • +25◆')}
 saveProfile();saveActive();
}
function pieceFitsAnywhere(p){const shape=SHAPES[p.shapeId];for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(canPlace(shape,r,c))return true;return false}
function checkGameOver(){if(finished||busy)return;const active=pieces.filter(p=>!p.used);if(active.some(pieceFitsAnywhere))return;finishGame(false)}

function startGame(mode,restart=false){
 currentMode=mode;finished=false;busy=false;blastArmed=false;coinsEarned=0;combo=0;rushLeft=120;clearInterval(timerId);timerId=null;rng=mode==='daily'?seeded(dailySeed()):Math.random;
 let restored=false;if(mode==='classic'&&!restart){try{const s=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null');if(s&&s.mode==='classic'&&Array.isArray(s.board)&&s.board.length===64&&Array.isArray(s.pieces)){board=s.board;pieces=s.pieces;score=Number(s.score)||0;restored=true}}catch{}}
 if(!restored){board=Array(64).fill(0);score=0;refillPieces()}modeLabel.textContent=mode.toUpperCase();scoreEl.textContent=score;bestEl.textContent=profile.best;timerBadge.classList.toggle('hidden',mode!=='rush');timerBadge.textContent='02:00';applyTheme(profile.equippedTheme);renderBoard();renderTray();showScreen('game');gameOverOverlay.classList.add('hidden');pauseOverlay.classList.add('hidden');
 if(restored)showToast('Classic Run fortgesetzt');if(mode==='rush')startRushTimer();saveActive();
}
function startRushTimer(){clearInterval(timerId);timerId=setInterval(()=>{rushLeft--;const m=Math.floor(rushLeft/60),s=rushLeft%60;timerBadge.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;if(rushLeft<=0){clearInterval(timerId);timerId=null;finishGame(true)}},1000)}
function finishGame(fromTimer=false){
 if(finished)return;finished=true;clearInterval(timerId);timerId=null;busy=true;localStorage.removeItem(ACTIVE_KEY);const bonus=Math.max(1,Math.floor(score/180));coinsEarned+=bonus;
 if(currentMode==='daily'&&profile.lastDaily!==dateKey()){const diff=profile.lastDaily?dayDiff(profile.lastDaily,dateKey()):99;profile.streak=diff===1?profile.streak+1:1;profile.lastDaily=dateKey();coinsEarned+=100}
 profile.coins+=coinsEarned;profile.runs.push({score,mode:currentMode,date:new Date().toISOString()});profile.runs.sort((a,b)=>b.score-a.score);profile.runs=profile.runs.slice(0,50);if(score>profile.best)profile.best=score;saveProfile();renderRanking();
 $('finalScore').textContent=score;$('earnedCoins').textContent=coinsEarned;$('overMode').textContent=(fromTimer?'TIME! • ':'')+currentMode.toUpperCase();gameOverOverlay.classList.remove('hidden');audio.fail();vibrate([45,35,65]);
}
function saveActive(){if(currentMode!=='classic'||finished)return;try{localStorage.setItem(ACTIVE_KEY,JSON.stringify({mode:'classic',board,pieces,score,date:Date.now()}))}catch{}}
function leaveToHome(){clearInterval(timerId);timerId=null;pauseOverlay.classList.add('hidden');gameOverOverlay.classList.add('hidden');showScreen('home');applyTheme(profile.equippedTheme)}

function useShuffle(){if(busy||blastArmed)return;if(profile.boosters.shuffle<=0){showToast('Kein Shuffle mehr');return}profile.boosters.shuffle--;for(let i=0;i<pieces.length;i++)if(!pieces[i].used)pieces[i]=randomPiece();renderTray();saveProfile();saveActive();audio.snap();showToast('Pieces gemischt')}
function armBlast(){if(busy)return;if(profile.boosters.blast<=0){showToast('Kein Blast mehr');return}blastArmed=!blastArmed;$('blastBtn').classList.toggle('armed',blastArmed);for(let i=0;i<64;i++)cells[i].classList.toggle('blastTarget',blastArmed&&!!board[i]);showToast(blastArmed?'Tippe einen Block':'Blast abgebrochen')}
async function useBlast(center){if(!blastArmed||profile.boosters.blast<=0||busy)return;busy=true;blastArmed=false;$('blastBtn').classList.remove('armed');profile.boosters.blast--;const cr=Math.floor(center/8),cc=center%8,remove=[];for(let r=cr-1;r<=cr+1;r++)for(let c=cc-1;c<=cc+1;c++)if(r>=0&&r<8&&c>=0&&c<8&&board[r*8+c])remove.push(r*8+c);const budget={left:12};for(const i of remove){spawnFragments(cells[i],blockColor(board[i]),1,budget);cells[i].classList.add('clearing')}audio.clear(1);await wait(190);for(const i of remove)board[i]=0;renderBoard();saveProfile();saveActive();busy=false;showToast(`${remove.length} Blöcke entfernt`)}

function renderShop(){
 const tg=$('themeShop');tg.innerHTML='';THEMES.forEach((t,i)=>{const owned=profile.ownedThemes.includes(i),equipped=profile.equippedTheme===i,d=document.createElement('article');d.className='shopCard'+(equipped?' equipped':'');d.innerHTML=`<div class="shopPreview" style="--p1:${t.bg1};--p2:${t.bg2}"><i class="shopCube" style="--pc:${t.colors[0]}"></i><i class="shopCube" style="--pc:${t.colors[1]}"></i><i class="shopCube" style="--pc:${t.colors[2]}"></i><i class="shopCube" style="--pc:${t.colors[3]}"></i><i class="shopCube" style="--pc:${t.colors[4]}"></i></div><h3>${t.name}</h3><p>${owned?'Freigeschaltet':t.price+' ◆'}</p><button>${equipped?'AKTIV':owned?'AUSRÜSTEN':'KAUFEN'}</button>`;d.querySelector('button').onclick=()=>{if(equipped)return;if(owned){profile.equippedTheme=i;saveProfile();applyTheme(i);renderShop();return}confirmPurchase(t.name,t.price,()=>{profile.ownedThemes.push(i);profile.equippedTheme=i;saveProfile();applyTheme(i);renderShop()})};tg.appendChild(d)});
 const bg=$('boosterShop');bg.innerHTML='';[{key:'shuffle',icon:'⟳',name:'SHUFFLE',price:180,desc:'Neue Pieces'},{key:'blast',icon:'✹',name:'BLAST',price:260,desc:'Entfernt 3×3'}].forEach(b=>{const d=document.createElement('article');d.className='shopCard boosterCard';d.innerHTML=`<span class="boosterQty">x${profile.boosters[b.key]}</span><div class="boosterBig">${b.icon}</div><h3>${b.name}</h3><p>${b.desc}</p><button>${b.price} ◆</button>`;d.querySelector('button').onclick=()=>confirmPurchase(b.name,b.price,()=>{profile.boosters[b.key]++;saveProfile();renderShop()});bg.appendChild(d)})
}
function confirmPurchase(name,price,action){if(profile.coins<price){showToast('Nicht genug Nova Coins');return}$('confirmTitle').textContent='KAUFEN?';$('confirmText').textContent=`${name} für ${price} Nova Coins`;confirmOverlay.classList.remove('hidden');confirmOverlay._action=()=>{profile.coins-=price;action();confirmOverlay.classList.add('hidden');showToast(`${name} gekauft ✓`)}}
function renderRanking(){
 const list=$('rankList');list.innerHTML='';let runs=[...profile.runs];if(profile.best>0&&!runs.some(r=>Number(r.score)===Number(profile.best)))runs.push({score:profile.best,mode:'classic',date:new Date().toISOString(),imported:true});runs.sort((a,b)=>b.score-a.score);runs=runs.slice(0,10);
 if(!runs.length){list.innerHTML='<div class="emptyRank">Noch keine Runs.<br>Spiel eine Runde und hol Platz #1.</div>';return}
 runs.forEach((r,i)=>{const d=document.createElement('div');d.className='rankRow';let date='BEST IMPORT';if(!r.imported){const dt=new Date(r.date);date=Number.isNaN(dt.getTime())?'RUN':dt.toLocaleDateString('de-DE')}d.innerHTML=`<span class="rankPos">#${i+1}</span><div class="rankInfo"><strong>${String(r.mode||'classic').toUpperCase()}</strong><small>${date}</small></div><span class="rankScore">${Number(r.score)||0}</span>`;list.appendChild(d)})
}

// Navigation / UI
document.querySelectorAll('.modeBtn').forEach(b=>b.addEventListener('click',()=>startGame(b.dataset.mode)));
$('dailyQuickBtn').onclick=()=>startGame('daily');document.querySelectorAll('.navBtn').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));document.querySelectorAll('.backHome').forEach(b=>b.onclick=()=>showScreen('home'));
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));$('themeShop').classList.toggle('hidden',b.dataset.tab!=='themes');$('boosterShop').classList.toggle('hidden',b.dataset.tab!=='boosters')});
$('homeSoundBtn').onclick=()=>{profile.muted=!profile.muted;saveProfile();showToast(profile.muted?'Sound aus':'Sound an')};$('pauseBtn').onclick=()=>{pauseOverlay.classList.remove('hidden');if(timerId)clearInterval(timerId)};$('resumeBtn').onclick=()=>{pauseOverlay.classList.add('hidden');if(currentMode==='rush'&&!timerId)startRushTimer()};$('restartBtn').onclick=()=>{pauseOverlay.classList.add('hidden');startGame(currentMode,true)};$('leaveBtn').onclick=leaveToHome;$('exitGameBtn').onclick=()=>{pauseOverlay.classList.remove('hidden')};$('againBtn').onclick=()=>startGame(currentMode,true);$('overHomeBtn').onclick=leaveToHome;$('shuffleBtn').onclick=useShuffle;$('blastBtn').onclick=armBlast;
$('confirmNo').onclick=()=>confirmOverlay.classList.add('hidden');$('confirmYes').onclick=()=>{const fn=confirmOverlay._action;confirmOverlay._action=null;if(fn)fn()};

// PWA install
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!matchMedia('(display-mode: standalone)').matches)installCard.classList.remove('hidden')});installBtn.onclick=async()=>{if(!deferredPrompt){showToast('Chrome ⋮ → App installieren');return}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installCard.classList.add('hidden')};installClose.onclick=()=>installCard.classList.add('hidden');window.addEventListener('appinstalled',()=>installCard.classList.add('hidden'));
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Start
buildBoard();refreshMeta();renderRanking();applyTheme(profile.equippedTheme);
setTimeout(()=>{ $('studioSplash').classList.remove('active');$('gameSplash').classList.add('active');setTimeout(()=>{$('gameSplash').classList.remove('active');showScreen('home')},760)},900);
})();
