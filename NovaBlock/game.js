(() => {
  'use strict';
  const SIZE=8;
  const boardEl=document.getElementById('board');
  const boardWrap=document.getElementById('boardWrap');
  const particles=document.getElementById('particles');
  const trayEl=document.getElementById('tray');
  const scoreEl=document.getElementById('score');
  const bestEl=document.getElementById('best');
  const comboEl=document.getElementById('combo');
  const themeBadge=document.getElementById('themeBadge');
  const pauseOverlay=document.getElementById('pauseOverlay');
  const gameOverOverlay=document.getElementById('gameOverOverlay');
  const finalScore=document.getElementById('finalScore');
  const soundBtn=document.getElementById('soundBtn');
  const gameScreen=document.getElementById('gameScreen');
  const studioSplash=document.getElementById('studioSplash');
  const gameSplash=document.getElementById('gameSplash');
  const toast=document.getElementById('toast');
  const installCard=document.getElementById('installCard');
  const installBtn=document.getElementById('installBtn');
  const installClose=document.getElementById('installClose');

  const THEMES=[
    {name:'OCEAN',bg1:'#083da9',bg2:'#1592e9',empty:'#03184955',grid:'#ffffff20',colors:['#ff3d78','#ffc31c','#57e915','#1aa8ff','#a54fff']},
    {name:'SUNSET',bg1:'#782870',bg2:'#ff7043',empty:'#3f0a4755',grid:'#ffffff22',colors:['#ffde21','#ff5a5f','#ff8b2b','#8fe34a','#6bdcff']},
    {name:'ICE',bg1:'#0a5f83',bg2:'#65d9ed',empty:'#003c5650',grid:'#d9fbff30',colors:['#d8fbff','#7eeaff','#36baf7','#89f0d0','#b7d4ff']},
    {name:'CANDY',bg1:'#8d2989',bg2:'#ff74b7',empty:'#4b16484f',grid:'#ffffff24',colors:['#ff4d9d','#ffd62e','#56e1ff','#a9ff4c','#ba69ff']},
    {name:'FOREST',bg1:'#0d5f48',bg2:'#41b86b',empty:'#073d3157',grid:'#e5ffe727',colors:['#b6f53f','#34d67a','#ffd43d','#33c7de','#ff7b72']},
    {name:'NIGHT',bg1:'#11123f',bg2:'#2935a5',empty:'#08092466',grid:'#bfc5ff20',colors:['#ff3aa6','#6d77ff','#25d9f8','#c4ff3b','#ffd641']}
  ];
  const SHAPES=[
    [[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1]],[[0,0],[0,1],[0,2]],[[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[0,1]],
    [[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[2,0],[2,1]],[[0,0],[0,1],[0,2],[1,2]],[[1,0],[1,1],[0,2],[1,2]],
    [[0,0],[1,0],[2,0],[1,1]],[[1,0],[0,1],[1,1],[2,1]],
    [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]]
  ];

  let board=Array(SIZE*SIZE).fill(null), pieces=[], score=0, best=Number(localStorage.getItem('novaBest')||0), combo=0, themeIndex=Number(localStorage.getItem('novaTheme')||0)%THEMES.length, muted=localStorage.getItem('novaMuted')==='1', busy=false, deferredPrompt=null;
  let drag=null, audioCtx=null;
  bestEl.textContent=best;

  const audio={
    ctx(){ if(muted) return null; if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();} if(audioCtx.state==='suspended')audioCtx.resume(); return audioCtx; },
    noise(duration=0.08,volume=.12,filter=1500){const c=this.ctx();if(!c)return;const len=Math.max(1,Math.floor(c.sampleRate*duration)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=buf;f.type='bandpass';f.frequency.value=filter;f.Q.value=.7;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);src.connect(f).connect(g).connect(c.destination);src.start();},
    tone(freq,dur,vol=.05,type='square',slide=0){const c=this.ctx();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),c.currentTime+dur);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur);},
    snap(){this.noise(.035,.055,2400);this.tone(165,.045,.025,'square',-45);},
    break(lines=1){this.noise(.17,.16+Math.min(lines,3)*.025,1200);setTimeout(()=>this.noise(.11,.10,2600),32);this.tone(95,.12,.04,'sawtooth',-30);},
    combo(n){this.tone(290+n*35,.07,.035,'square',100);setTimeout(()=>this.tone(430+n*38,.08,.025,'square',120),65);},
    perfect(){this.noise(.45,.13,800);this.tone(120,.34,.055,'sawtooth',320);setTimeout(()=>this.tone(520,.18,.035,'square',260),100);},
    fail(){this.tone(170,.22,.05,'sawtooth',-80);setTimeout(()=>this.tone(105,.3,.045,'sawtooth',-45),160);}
  };

  function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern)}catch{}}
  function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800)}
  function applyTheme(index,flash=false){themeIndex=(index+THEMES.length)%THEMES.length;const t=THEMES[themeIndex],r=document.documentElement.style;r.setProperty('--bg1',t.bg1);r.setProperty('--bg2',t.bg2);r.setProperty('--empty',t.empty);r.setProperty('--grid',t.grid);t.colors.forEach((c,i)=>r.setProperty(`--c${i+1}`,c));themeBadge.textContent=t.name;document.querySelector('meta[name="theme-color"]').setAttribute('content',t.bg1);localStorage.setItem('novaTheme',themeIndex);if(flash){const f=document.createElement('div');f.className='themeFlash';f.innerHTML=`<strong>${t.name} THEME!</strong>`;document.getElementById('app').appendChild(f);setTimeout(()=>f.remove(),950)}}

  function colorFor(seed){return THEMES[themeIndex].colors[seed%THEMES[themeIndex].colors.length]}
  function buildBoard(){boardEl.innerHTML='';for(let i=0;i<SIZE*SIZE;i++){const c=document.createElement('div');c.className='cell';c.dataset.i=i;boardEl.appendChild(c)}renderBoard()}
  function renderBoard(){[...boardEl.children].forEach((c,i)=>{c.classList.toggle('filled',!!board[i]);c.style.setProperty('--block',board[i]||'transparent');if(!board[i])c.classList.remove('clearing')})}

  function shapeBounds(shape){return {w:Math.max(...shape.map(p=>p[0]))+1,h:Math.max(...shape.map(p=>p[1]))+1}}
  function randomPiece(){const shape=SHAPES[Math.floor(Math.random()*SHAPES.length)].map(p=>[...p]);return {shape,color:colorFor(Math.floor(Math.random()*5)),used:false,id:crypto.randomUUID?.()||Math.random().toString(36)}}
  function refillPieces(){pieces=[randomPiece(),randomPiece(),randomPiece()];renderTray();save()}
  function renderTray(){trayEl.innerHTML='';pieces.forEach((p,index)=>{const slot=document.createElement('div');slot.className='pieceSlot'+(p.used?' used':'');const el=document.createElement('div');el.className='piece';el.dataset.index=index;const b=shapeBounds(p.shape);el.style.gridTemplateColumns=`repeat(${b.w},25px)`;el.style.gridTemplateRows=`repeat(${b.h},25px)`;el.style.setProperty('--block',p.color);for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const m=document.createElement('div');if(p.shape.some(q=>q[0]===x&&q[1]===y))m.className='mini';m.style.gridColumn=x+1;m.style.gridRow=y+1;el.appendChild(m)}if(!p.used)el.addEventListener('pointerdown',e=>startDrag(e,index,el));slot.appendChild(el);trayEl.appendChild(slot)})}

  function clearGhost(){[...boardEl.children].forEach(c=>{c.classList.remove('ghost','bad');c.style.removeProperty('--ghost')})}
  function canPlace(shape,row,col){return shape.every(([x,y])=>{const r=row+y,c=col+x;return r>=0&&r<SIZE&&c>=0&&c<SIZE&&!board[r*SIZE+c]})}
  function boardCellFromPoint(x,y,shape){const rect=boardEl.getBoundingClientRect(),gap=4,pad=7,inner=rect.width-pad*2,cell=(inner-gap*7)/8;const b=shapeBounds(shape);const col=Math.round((x-rect.left-pad-(b.w*cell+(b.w-1)*gap)/2)/(cell+gap));const row=Math.round((y-rect.top-pad-(b.h*cell+(b.h-1)*gap)/2)/(cell+gap));return {row,col}}
  function showGhost(shape,row,col,color,valid){clearGhost();shape.forEach(([x,y])=>{const r=row+y,c=col+x;if(r>=0&&r<SIZE&&c>=0&&c<SIZE){const el=boardEl.children[r*SIZE+c];el.classList.add(valid?'ghost':'bad');el.style.setProperty('--ghost',color)}})}

  function startDrag(e,index,el){if(busy||pieces[index].used)return;e.preventDefault();audio.ctx();const p=pieces[index],clone=el.cloneNode(true),rect=el.getBoundingClientRect();clone.classList.add('moving');clone.style.width=rect.width+'px';clone.style.height=rect.height+'px';document.body.appendChild(clone);drag={index,piece:p,el:clone,row:null,col:null,valid:false,dx:rect.width/2,dy:rect.height*1.45};moveDrag(e);try{el.setPointerCapture?.(e.pointerId)}catch{}window.addEventListener('pointermove',moveDrag,{passive:false});window.addEventListener('pointerup',endDrag,{once:true});window.addEventListener('pointercancel',endDrag,{once:true})}
  function moveDrag(e){if(!drag)return;e.preventDefault();drag.el.style.left=(e.clientX-drag.dx)+'px';drag.el.style.top=(e.clientY-drag.dy)+'px';const pos=boardCellFromPoint(e.clientX,e.clientY-46,drag.piece.shape);drag.row=pos.row;drag.col=pos.col;drag.valid=canPlace(drag.piece.shape,pos.row,pos.col);showGhost(drag.piece.shape,pos.row,pos.col,drag.piece.color,drag.valid)}
  async function endDrag(){if(!drag)return;window.removeEventListener('pointermove',moveDrag);clearGhost();const d=drag;drag=null;d.el.remove();if(d.valid)await placePiece(d.index,d.row,d.col)}

  async function placePiece(index,row,col){if(busy)return;const p=pieces[index];if(!p||p.used||!canPlace(p.shape,row,col))return;busy=true;p.shape.forEach(([x,y],k)=>{const i=(row+y)*SIZE+(col+x);board[i]=p.color;const el=boardEl.children[i];el.classList.add('filled','pop');el.style.setProperty('--block',p.color);setTimeout(()=>el.classList.remove('pop'),240+k*8)});p.used=true;score+=p.shape.length*8;updateScore();audio.snap();vibrate(16);renderTray();await resolveLines();if(pieces.every(q=>q.used))refillPieces();save();busy=false;setTimeout(checkGameOver,40)}

  function fullLines(){const rows=[],cols=[];for(let r=0;r<SIZE;r++)if(Array.from({length:SIZE},(_,c)=>board[r*SIZE+c]).every(Boolean))rows.push(r);for(let c=0;c<SIZE;c++)if(Array.from({length:SIZE},(_,r)=>board[r*SIZE+c]).every(Boolean))cols.push(c);return {rows,cols}}
  async function resolveLines(){const {rows,cols}=fullLines(),lineCount=rows.length+cols.length;if(!lineCount){combo=0;return}const set=new Set();rows.forEach(r=>{for(let c=0;c<SIZE;c++)set.add(r*SIZE+c)});cols.forEach(c=>{for(let r=0;r<SIZE;r++)set.add(r*SIZE+c)});combo++;score+=lineCount*100+set.size*12+(combo-1)*75;updateScore();comboEl.textContent=lineCount>=3?`MEGA CLEAR +${lineCount}`:combo>1?`COMBO x${combo}`:`+${lineCount} CLEAR`;comboEl.classList.remove('show');void comboEl.offsetWidth;comboEl.classList.add('show');audio.break(lineCount);if(combo>1)setTimeout(()=>audio.combo(combo),100);vibrate(lineCount>=2?[28,30,36]:28);boardWrap.classList.remove('shake');void boardWrap.offsetWidth;boardWrap.classList.add('shake');set.forEach(i=>{const el=boardEl.children[i];el.classList.add('clearing');spawnFragments(el,board[i],lineCount)});await wait(330);set.forEach(i=>board[i]=null);renderBoard();const isEmpty=board.every(v=>!v);if(isEmpty){score+=500;updateScore();audio.perfect();vibrate([35,35,45,35,70]);applyTheme(themeIndex+1,true);pieces.forEach((p,i)=>{if(!p.used)p.color=colorFor(i+themeIndex)});renderTray();showToast('PERFECT CLEAR +500!')}save()}
  function spawnFragments(el,color,power){const br=el.getBoundingClientRect(),wr=boardWrap.getBoundingClientRect(),x=br.left-wr.left+br.width/2,y=br.top-wr.top+br.height/2,count=5+Math.min(power,3)*2;for(let i=0;i<count;i++){const f=document.createElement('i');f.className='frag';f.style.left=x+'px';f.style.top=y+'px';f.style.setProperty('--frag',color);const a=Math.random()*Math.PI*2,dist=28+Math.random()*52+power*6;f.style.setProperty('--dx',Math.cos(a)*dist+'px');f.style.setProperty('--dy',Math.sin(a)*dist+'px');f.style.setProperty('--rot',(Math.random()*360-180)+'deg');particles.appendChild(f);setTimeout(()=>f.remove(),700)}}

  function pieceFitsAnywhere(piece){for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(canPlace(piece.shape,r,c))return true;return false}
  function checkGameOver(){const active=pieces.filter(p=>!p.used);if(active.length&&active.some(pieceFitsAnywhere))return;finalScore.textContent=score;gameOverOverlay.classList.remove('hidden');audio.fail();vibrate([70,70,120])}
  function updateScore(){scoreEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('novaBest',best)}}
  function reset(){board=Array(SIZE*SIZE).fill(null);score=0;combo=0;updateScore();gameOverOverlay.classList.add('hidden');pauseOverlay.classList.add('hidden');refillPieces();renderBoard();save()}
  function save(){localStorage.setItem('novaSave',JSON.stringify({board,pieces,score,themeIndex}))}
  function load(){try{const s=JSON.parse(localStorage.getItem('novaSave')||'null');if(s&&Array.isArray(s.board)&&s.board.length===64&&Array.isArray(s.pieces)){board=s.board;pieces=s.pieces;score=Number(s.score)||0;themeIndex=Number(s.themeIndex)||0;return true}}catch{}return false}
  function wait(ms){return new Promise(r=>setTimeout(r,ms))}

  document.getElementById('pauseBtn').onclick=()=>pauseOverlay.classList.remove('hidden');
  document.getElementById('resumeBtn').onclick=()=>pauseOverlay.classList.add('hidden');
  document.getElementById('restartBtn').onclick=()=>reset();
  document.getElementById('againBtn').onclick=()=>reset();
  soundBtn.textContent=muted?'🔇':'🔊';soundBtn.onclick=()=>{muted=!muted;localStorage.setItem('novaMuted',muted?'1':'0');soundBtn.textContent=muted?'🔇':'🔊';if(!muted){audio.ctx();audio.snap()}};

  function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!isStandalone()&&!sessionStorage.getItem('hideInstall'))installCard.classList.remove('hidden')});
  installBtn.onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();const c=await deferredPrompt.userChoice;if(c.outcome==='accepted'){installCard.classList.add('hidden');showToast('Nova Block wird installiert ✅')}deferredPrompt=null}else showToast('Chrome ⋮ → App installieren')};
  installClose.onclick=()=>{installCard.classList.add('hidden');sessionStorage.setItem('hideInstall','1')};
  window.addEventListener('appinstalled',()=>installCard.classList.add('hidden'));

  async function intro(){applyTheme(themeIndex);await wait(1150);studioSplash.classList.remove('active');gameSplash.classList.add('active');await wait(1150);gameSplash.classList.remove('active');await wait(260);studioSplash.classList.add('hidden');gameSplash.classList.add('hidden');gameScreen.classList.remove('hidden');if(!isStandalone()&&!deferredPrompt&&!sessionStorage.getItem('hideInstall'))setTimeout(()=>installCard.classList.remove('hidden'),1800)}

  buildBoard();
  if(!load())refillPieces();else{applyTheme(themeIndex);renderBoard();renderTray();updateScore()}
  if(!pieces.length)refillPieces();
  intro();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
