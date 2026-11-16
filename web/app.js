import { AxoStage, CREW, CREW_IDS } from './axo3d.js';
import { genPlan, GOALS, LEVELS, PARQ, JOINTS, EX, bmiOf, bmiInfo, healthFlags } from './plan.js';

/* =====================================================================
   UTILIDADES
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const spec=(cast,frame='full',extra={})=>JSON.stringify({cast:Array.isArray(cast)?cast:[cast],frame,...extra});
const axo=(cast,frame,extra)=>`data-axo='${spec(cast,frame,extra)}'`;
const setAxo=(el,cast,frame,extra)=>{ if(el) el.dataset.axo=spec(cast,frame,extra); };
const vib=n=>{ try{ navigator.vibrate&&navigator.vibrate(n); }catch(e){} };
const mmss=s=>{ s=Math.max(0,Math.round(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const fmtKm=m=>(m/1000).toFixed(2).replace('.',',');
const G={rex:'o',turbo:'o',sol:'a',lua:'a'}, PRO={rex:'ele',turbo:'ele',sol:'ela',lua:'ela'};
const cname=id=>CREW[id].name;

/* ---------- ícones ---------- */
const IC={
  flame:(on=true)=>`<svg viewBox="0 0 24 24"><path d="M12 1.8c1.2 3.6 6.2 5.8 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-2.9 1.5-4.7 2.9-5.9.2 2 1.1 3.1 2.2 3.5C10.6 7.8 10.8 4.6 12 1.8z" fill="${on?'#ff9600':'#d0d0d0'}"/><path d="M12 12.3c.7 1.8 2.9 2.6 2.9 5a2.9 2.9 0 0 1-5.8 0c0-1.6 1-2.7 1.7-3.3.2.9.7 1.4 1.2 1.5-.2-1.2-.1-2.2 0-3.2z" fill="${on?'#ffc800':'#ececec'}"/></svg>`,
  bolt:`<svg viewBox="0 0 24 24"><path d="M13.5 1.5 4 13.5h6.5l-1.5 9 10-12.5h-6.5z" fill="#ffc800" stroke="#e5a400" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  pearl:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12.8" r="8.6" fill="#b79cf2"/><circle cx="12" cy="12" r="8.2" fill="#e8ddff"/><ellipse cx="9.2" cy="9" rx="2.6" ry="1.9" fill="#fff" transform="rotate(-25 9.2 9)"/></svg>`,
  heart:`<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-9.8-9.8C.9 7.6 3.3 4.5 6.6 4.5c2.1 0 3.8 1.2 5.4 3.1 1.6-1.9 3.3-3.1 5.4-3.1 3.3 0 5.7 3.1 4.4 6.7C20 16 12 21 12 21z" fill="#ff4b4b"/></svg>`,
  clock:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#1cb0f6"/><path d="M12 7v5.5l3.5 2" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  pin:`<svg viewBox="0 0 24 24"><path d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22z" fill="#ff6fa3"/><circle cx="12" cy="9.5" r="2.8" fill="#fff"/></svg>`,
  back:`<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close:`<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  guide:`<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  pause:`<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/></svg>`,
  play:`<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>`,
  skip:`<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zM15 5h3v14h-3z" fill="currentColor"/></svg>`,
  dumbbell:`<svg viewBox="0 0 24 24"><g fill="#fff"><rect x="1.8" y="8.2" width="3.4" height="7.6" rx="1.4"/><rect x="4.8" y="5.8" width="3.8" height="12.4" rx="1.6"/><rect x="15.4" y="5.8" width="3.8" height="12.4" rx="1.6"/><rect x="18.8" y="8.2" width="3.4" height="7.6" rx="1.4"/><rect x="8" y="10.6" width="8" height="2.8" rx="1"/></g></svg>`,
  shoe:`<svg viewBox="0 0 24 24"><path fill="#fff" d="M2 15.6c0-1.5.6-2.7 1.6-3.5L6 6.7c.3-.6 1-.9 1.6-.6l1.2.6c.5.2.7.8.5 1.3l-.5 1.1c1.6 1.2 3.4 1.7 5.4 1.8l3.5.3c2.4.2 4.3 2.2 4.3 4.6v1.4c0 .6-.5 1.1-1.1 1.1H3.1c-.6 0-1.1-.5-1.1-1.1z"/></svg>`,
  walk:`<svg viewBox="0 0 24 24"><g fill="#fff"><ellipse cx="8" cy="8.6" rx="3.1" ry="4.5"/><ellipse cx="8.2" cy="16.2" rx="2.2" ry="2"/><ellipse cx="16" cy="11.6" rx="3.1" ry="4.5"/><ellipse cx="15.8" cy="19.2" rx="2.2" ry="2"/></g></svg>`,
  leaf:`<svg viewBox="0 0 24 24"><path fill="#fff" d="M20.5 3C11 3 5 7.2 5 14c0 1.9.5 3.4 1.4 4.6L3.5 21.5l1.4 1.4 2.8-2.8c1.2.9 2.8 1.4 4.8 1.4C19 21.5 21.4 13 20.5 3zM11 16.5c1.4-3 3.9-5.6 6.8-7.2-2.4 2-4.4 4.6-5.7 7.6z"/></svg>`,
  star:`<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z"/></svg>`,
  check:`<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chest:`<svg viewBox="0 0 80 70"><ellipse cx="40" cy="64" rx="30" ry="5" fill="rgba(0,0,0,.12)"/><path d="M8 30h64v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#1cb0f6"/><path d="M8 30h64v8H8z" fill="#1899d6"/><path d="M10 27c0-11 13-19 30-19s30 8 30 19v3H10z" fill="#52c5ff"/><rect x="15" y="9" width="9" height="53" rx="3" fill="#ffc800"/><rect x="56" y="9" width="9" height="53" rx="3" fill="#ffc800"/><rect x="6" y="27" width="68" height="7" rx="3" fill="#ffd84d"/><rect x="33" y="26" width="14" height="16" rx="5" fill="#fff" stroke="#ffc800" stroke-width="3"/></svg>`,
  trophy:`<svg viewBox="0 0 80 72"><ellipse cx="40" cy="67" rx="22" ry="4" fill="rgba(0,0,0,.12)"/><path d="M23 10H12c0 10 5 15 12 16M57 10h11c0 10-5 15-12 16" fill="none" stroke="#ffc800" stroke-width="5"/><path d="M22 5h36v15c0 12-8 20-18 20S22 32 22 20z" fill="#ffc800"/><rect x="35" y="38" width="10" height="12" fill="#e5a400"/><rect x="26" y="50" width="28" height="12" rx="4" fill="#e5a400"/><rect x="30" y="54" width="20" height="4" rx="2" fill="#ffd84d"/><path d="M30 10c0 8 2 14 6 18" stroke="#fff3b0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  navHome:`<svg viewBox="0 0 32 32"><path d="M8 14v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V14L16 7z" fill="#ffd6e6"/><path d="M5 15 16 5l11 10" fill="none" stroke="#ff6fa3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="19" width="6" height="9" rx="2" fill="#ff6fa3"/></svg>`,
  navRun:`<svg viewBox="0 0 32 32"><path fill="#1cb0f6" d="M3 21c0-2 .8-3.6 2.1-4.6L8.3 9c.4-.8 1.3-1.2 2.1-.8l1.6.8c.7.3.9 1.1.6 1.7l-.6 1.4c2.1 1.6 4.5 2.3 7.2 2.4l4.6.4c3.2.3 5.7 2.9 5.7 6.1v1.9c0 .8-.7 1.5-1.5 1.5H4.5C3.7 24.4 3 23.7 3 22.9z"/><path d="M4 21.5h24" stroke="#fff" stroke-width="2"/><path d="M13 13.5l2-1.5M15.5 14.8l2-1.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  navCrew:`<svg viewBox="0 0 32 32"><g fill="#ff8fb1" stroke="#2b201b" stroke-width="1.3"><ellipse cx="5" cy="10" rx="4" ry="1.9" transform="rotate(-35 5 10)"/><ellipse cx="3.6" cy="16" rx="3.6" ry="1.8"/><ellipse cx="27" cy="10" rx="4" ry="1.9" transform="rotate(35 27 10)"/><ellipse cx="28.4" cy="16" rx="3.6" ry="1.8"/></g><ellipse cx="16" cy="17" rx="10.5" ry="9" fill="#ffc2d4" stroke="#2b201b" stroke-width="2"/><circle cx="12" cy="16" r="1.7" fill="#2b201b"/><circle cx="20" cy="16" r="1.7" fill="#2b201b"/><path d="M13.5 20q2.5 2.2 5 0" stroke="#2b201b" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`,
  navQuest:`<svg viewBox="0 0 32 32"><path d="M4 14h24v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#ffc800"/><path d="M5 12c0-5 5-8 11-8s11 3 11 8v2H5z" fill="#ffd84d"/><rect x="3" y="12.5" width="26" height="3.5" rx="1.5" fill="#e5a400"/><rect x="13" y="12" width="6" height="7" rx="2" fill="#fff" stroke="#e5a400" stroke-width="1.6"/></svg>`,
  navMe:`<svg viewBox="0 0 32 32"><circle cx="16" cy="11.5" r="6" fill="#ce82ff"/><path d="M5 28c1-6 5.5-9 11-9s10 3 11 9z" fill="#ce82ff"/></svg>`,
  bars:n=>`<svg viewBox="0 0 30 30">${[0,1,2,3].map(i=>`<rect x="${3+i*6.6}" y="${21-i*5}" width="5" height="${6+i*5}" rx="1.6" fill="${i<n?'#ff6fa3':'#e5e5e5'}"/>`).join('')}</svg>`,
};
const NODE_IC={dumbbell:IC.dumbbell,shoe:IC.shoe,walk:IC.walk,leaf:IC.leaf,star:IC.star};

/* ---------- sons (sintetizados, sem arquivos) ---------- */
const SFX={ctx:null,
  init(){ if(!this.ctx){ try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume().catch(()=>{}); },
  tone(f,d=.12,type='sine',v=.14,when=0){ if(!st.sound||!this.ctx) return; try{ const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+when;
    o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.012); g.gain.exponentialRampToValueAtTime(.0008,t+d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+d+.03); }catch(e){} },
  tap(){ this.tone(560,.06,'triangle',.07); }, pop(){ this.tone(700,.08,'triangle',.11); this.tone(1050,.06,'triangle',.06,.04); },
  ok(){ this.tone(784,.1,'triangle',.12); this.tone(1175,.16,'triangle',.12,.08); },
  win(){ [523,659,784,1046,1318].forEach((f,i)=>this.tone(f,.2,'triangle',.13,i*.09)); },
  beep(){ this.tone(880,.09,'square',.05); }, go(){ this.tone(1320,.22,'square',.06); },
  fire(){ [220,330,440,660,880].forEach((f,i)=>this.tone(f,.25,'sawtooth',.05,i*.05)); this.tone(1320,.4,'triangle',.12,.25); },
  sad(){ this.tone(440,.25,'triangle',.1); this.tone(370,.35,'triangle',.1,.2); },
};
document.addEventListener('pointerdown',()=>SFX.init(),{passive:true});

/* =====================================================================
   ESTADO + PERSISTÊNCIA
   ===================================================================== */
const KEY='axogo:v1';
const DEF=()=>({v:1,onboarded:false,profile:{name:'',goal:null,level:null,run:null,age:28,sex:null,height:168,weight:70,parq:{},joints:[],days:[1,3,5],minutes:20,reminder:'18:00',partner:'rex',streakGoal:7,careOk:false},
  done:{},history:{},xp:0,pearls:50,fled:[],fledApplied:0,dayOffset:0,startDate:null,claimed:{},sound:true,seenHome:false});
let st; try{ st=Object.assign(DEF(),JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ st=DEF(); }
st.profile=Object.assign(DEF().profile,st.profile||{});
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(e){} };
let plan = st.onboarded ? genPlan(st.profile) : null;

const DAY=864e5;
const nowD=()=>new Date(Date.now()+st.dayOffset*DAY);
const keyOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayK=()=>keyOf(nowD());
const parseK=k=>{ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d,12); };
const addD=(d,n)=>new Date(d.getTime()+n*DAY);
const isTrain=d=>st.profile.days.includes(d.getDay());
const doneOn=k=>(st.history[k]?.workouts||0)>0;
const pathToday=()=>(st.history[todayK()]?.path||0)>0;

function streak(){
  if(!st.startDate) return 0;
  const start=parseK(st.startDate); let d=parseK(todayK()), s=0, pend=0;
  if(doneOn(keyOf(d))) s=1; else if(!isTrain(d)) pend=1;
  d=addD(d,-1);
  while(d>=start){ const k=keyOf(d); if(doneOn(k)){ s+=1+pend; pend=0; } else if(!isTrain(d)) pend++; else break; d=addD(d,-1); }
  return s;
}
function missed(){
  if(!st.startDate) return 0;
  const start=parseK(st.startDate); let d=addD(parseK(todayK()),-1), m=0;
  while(d>=start){ if(doneOn(keyOf(d))) break; if(isTrain(d)) m++; d=addD(d,-1); }
  return m;
}
const FLEE_ORDER=['turbo','lua','sol','rex'];
function syncDay(){
  const m=missed(), target=Math.min(3,Math.max(0,m-1)), newly=[];
  if(m===0) st.fledApplied=0;
  if(target>st.fledApplied){
    const order=FLEE_ORDER.filter(id=>id!==st.profile.partner && !st.fled.includes(id));
    for(let i=st.fledApplied;i<target && order.length;i++){ const id=order.shift(); st.fled.push(id); newly.push(id); }
    st.fledApplied=target;
  }
  save(); return newly;
}
function crewMood(){ if(doneOn(todayK())) return 'joy'; if(missed()>=1) return 'sad'; return isTrain(nowD())?'happy':'rest'; }
const homeCrew=()=>CREW_IDS.filter(id=>!st.fled.includes(id));
const coachFor=id=>st.fled.includes(id)?st.profile.partner:id;
function happiness(){ const m=crewMood(); return m==='joy'?5:m==='happy'||m==='rest'?4:st.fled.length?1:2; }

function allNodes(){ return plan?plan.units.flatMap(u=>u.nodes):[]; }
function curIndex(){ const a=allNodes(); const i=a.findIndex(n=>!st.done[n.id]); return i<0?a.length:i; }
function hist(k=todayK()){ return st.history[k]||(st.history[k]={workouts:0,path:0,xp:0,mins:0,kcal:0,km:0}); }

function recordActivity(stats,{node=null}={}){
  const t=todayK(), first=!doneOn(t), before=streak();
  const h=hist(t); h.workouts++; if(node) h.path++; h.xp+=stats.xp; h.mins+=Math.round(stats.secs/60); h.kcal+=Math.round(stats.kcal); h.km+=stats.km||0;
  st.xp+=stats.xp; if(node) st.done[node.id]=t;
  st.fledApplied=0;
  const returned = st.fled.length ? st.fled.shift() : null;
  save();
  return {first,before,after:streak(),returned};
}

/* =====================================================================
   NAVEGAÇÃO, FOLHAS (SHEETS) E AVISOS
   ===================================================================== */
const appEl=$('#app'), screensEl=$('#screens');
const stage=new AxoStage($('#stage'),appEl);
stage.setLayer(screensEl);
const SCREENS={};
let cur=null;
function go(name,params={},dir='fwd'){
  closeSheet(true);
  const el=document.createElement('div'); el.className='screen s-'+name;
  screensEl.appendChild(el);
  const cleanup=SCREENS[name](params,el);
  if(cur){ const old=cur; try{ old.cleanup&&old.cleanup(); }catch(e){}
    if(dir==='none') old.el.remove(); else { old.el.classList.add('leave-'+dir); if(dir==='fade'||dir==='up') old.el.setAttribute('data-axo-off',''); setTimeout(()=>old.el.remove(),360); }
    if(dir!=='none') el.classList.add('enter-'+dir); }
  cur={name,el,cleanup,params};
}
let sheetEl=null;
function openSheet(html,{mount,onClose}={}){
  closeSheet(true);
  const L=document.createElement('div'); L.className='sheet-layer';
  L.innerHTML=`<div class="sheet"><div class="grab"></div>${html}</div>`;
  appEl.appendChild(L); sheetEl=L; L._onClose=onClose;
  requestAnimationFrame(()=>requestAnimationFrame(()=>L.classList.add('open')));
  L.addEventListener('click',e=>{ if(e.target===L) closeSheet(); });
  stage.setLayer(L);
  mount&&mount(L);
  return L;
}
function closeSheet(instant=false){
  if(!sheetEl) return; const L=sheetEl; sheetEl=null; stage.setLayer(screensEl);
  L._onClose&&L._onClose();
  if(instant){ L.remove(); return; }
  L.classList.remove('open'); setTimeout(()=>L.remove(),340);
}
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; $('#toasts').appendChild(t); setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),320); },2300); }
function typeText(el,text,done){
  if(!el) return; let i=0; el.textContent=''; const caret=document.createElement('span'); caret.className='caret';
  const total=text.length; const id=setInterval(()=>{
    if(!el.isConnected){ clearInterval(id); return; }
    i=Math.min(total,i+2); el.textContent=text.slice(0,i); if(i<total) el.appendChild(caret);
    if(i>=total){ clearInterval(id); done&&done(); }
  },28);
  el.parentElement&&el.parentElement.addEventListener('click',()=>{ i=total; },{once:true});
}
function confetti(el,n=40){ const c=document.createElement('div'); c.className='confetti';
  const cols=['#ff6fa3','#1cb0f6','#ffc800','#58cc02','#ce82ff','#ff9600'];
  for(let i=0;i<n;i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length];
    p.style.animationDuration=(2.2+Math.random()*2.5)+'s'; p.style.animationDelay=(-Math.random()*3)+'s'; c.appendChild(p); }
  el.prepend(c); }

/* =====================================================================
   SPLASH + BOAS-VINDAS
   ===================================================================== */
SCREENS.splash=(p,el)=>{
  el.classList.add('splash');
  el.innerHTML=`<div class="axo-slot" ${axo({id:'rex',anim:'cheer',mood:'joy'},'tall')}></div><div class="logo">Axo<span>Go</span></div>`;
  const t=setTimeout(()=>{ if(st.onboarded) enterApp('fade'); else go('welcome',{},'fade'); },2100);
  return ()=>clearTimeout(t);
};
SCREENS.welcome=(p,el)=>{
  el.innerHTML=`<div class="welcome">
    <div class="axo-slot" ${axo([{id:'turbo',anim:'happy',x:-2.15,z:-0.9,ry:0.3},{id:'lua',anim:'happy',x:2.15,z:-0.9,ry:-0.3},{id:'sol',anim:'idle',x:-0.8,z:-0.2,ry:0.12},{id:'rex',anim:'wave',x:0.8,z:0.3,ry:-0.12}],'full',{zoom:1.12})}></div>
    <div class="logo">Axo<span>Go</span></div>
    <p>Treinos rapidinhos, corridas guiadas e uma turma de axolotes torcendo por você!</p></div>
    <div class="foot"><button class="btn" data-go>Começar</button><button class="btn outline" data-how>Como funciona?</button></div>`;
  $('[data-go]',el).onclick=()=>{ SFX.ok(); go('intro1'); };
  $('[data-how]',el).onclick=()=>{ SFX.tap(); openSheet(`<div class="sh-head"><h2>Como o AxoGo funciona</h2><p>Simples assim:</p></div>
    <div class="scroll"><div class="how">
      <div class="card"><div class="e">🗺️</div><div><b>Siga a trilha</b><span>Cada bolinha é um treino montado pro seu nível, idade e saúde.</span></div></div>
      <div class="card"><div class="e">🔥</div><div><b>Acenda sua ofensiva</b><span>Treine nos dias que você escolheu. Descanso planejado não quebra a sequência.</span></div></div>
      <div class="card"><div class="e">🦎</div><div><b>Cuide da turma</b><span>Treinou: os axolotes ficam felizes. Sumiu: eles ficam tristes e fogem de casa!</span></div></div>
      <div class="card"><div class="e">💤</div><div><b>Recupere 100%</b><span>Todo treino termina com trote regenerativo e alongamento pra evitar câimbras.</span></div></div>
    </div></div><div class="foot"><button class="btn" data-x>Entendi!</button></div>`,{mount:L=>$('[data-x]',L).onclick=()=>closeSheet()}); };
};

/* =====================================================================
   ONBOARDING
   ===================================================================== */
const OB_FLOW=['intro1','intro2','nome','objetivo','nivel','corrida','idade','corpo','saude','articulacoes','cuidado','dias','tempo','horario','parceiro','gerando','plano','turma','meta'];
const OB_Q=['nome','objetivo','nivel','corrida','idade','corpo','saude','articulacoes','cuidado','dias','tempo','horario','parceiro'];
function obSkip(id){ const p=st.profile; if(id==='articulacoes') return !p.parq.q6; if(id==='cuidado'){ const f=healthFlags(p); return !(f.care||f.caution); } return false; }
function obNext(id){ let i=OB_FLOW.indexOf(id)+1; while(i<OB_FLOW.length&&obSkip(OB_FLOW[i])) i++; return OB_FLOW[i]; }
function obPrev(id){ let i=OB_FLOW.indexOf(id)-1; while(i>0&&obSkip(OB_FLOW[i])) i--; return i<0?'welcome':OB_FLOW[i]; }
function obProg(id){ const l=OB_Q.filter(x=>!obSkip(x)); const i=l.indexOf(id); return i<0?100:Math.round((i+1)/(l.length+1)*100); }
let lastProg=0;
function animProg(el,p){ const i=$('.prog i',el); if(!i) return; i.style.width=Math.max(4,lastProg)+'%'; requestAnimationFrame(()=>requestAnimationFrame(()=>{ i.style.width=Math.max(4,p)+'%'; })); lastProg=p; }

function qScreen(el,id,{say,body,valid=()=>true,mount,cta='Continuar',onNext,coach='rex'}){
  el.innerHTML=`<div class="ob-top"><button class="icon-btn" data-back>${IC.back}</button><div class="prog"><i></i></div></div>
    <div class="coach-row"><div class="axo-slot" ${axo({id:coach,anim:'talk'},'bust')}></div><div class="bubble left"><span class="tw"></span></div></div>
    <div class="scroll"><div class="ob-body">${body}</div></div>
    <div class="foot"><button class="btn" data-next>${cta}</button></div>`;
  animProg(el,obProg(id));
  typeText($('.tw',el),say,()=>setAxo($('.coach-row .axo-slot',el),{id:coach,anim:'idle'},'bust'));
  const nb=$('[data-next]',el); const upd=()=>{ nb.disabled=!valid(); }; upd();
  $('[data-back]',el).onclick=()=>{ SFX.tap(); go(obPrev(id),{},'back'); };
  nb.onclick=()=>{ if(!valid()) return; SFX.ok(); save(); (onNext||(()=>go(obNext(id))))(); };
  mount&&mount(el,upd);
}
function bindSingle(el,sel,attr,set,upd){ $$(sel,el).forEach(b=>b.onclick=()=>{ $$(sel,el).forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); set(b.dataset[attr]); SFX.pop(); vib(8); upd(); }); }
const optsHTML=(items,selected)=>`<div class="opts stagger">${items.map((o,i)=>`<button class="opt ${String(o.v)===String(selected)?'sel':''}" style="--i:${i}" data-v="${o.v}"><span class="em">${o.e}</span><span class="t">${o.t}${o.s?`<span class="sub">${o.s}</span>`:''}</span>${o.tag?`<span class="tag">${o.tag}</span>`:''}</button>`).join('')}</div>`;

function heroTalk(el,id,text,{anim='wave',back=true,cta='Continuar'}={}){
  el.innerHTML=`<div class="ob-top">${back?`<button class="icon-btn" data-back>${IC.back}</button>`:'<span style="width:40px"></span>'}<div class="prog" style="visibility:hidden"><i></i></div></div>
    <div class="hero-talk"><div class="bubble down"><span class="tw"></span></div><div class="axo-slot" ${axo({id:'rex',anim:'talk'},'full')}></div></div>
    <div class="foot"><button class="btn" data-next>${cta}</button></div>`;
  typeText($('.tw',el),text,()=>setAxo($('.hero-talk .axo-slot',el),{id:'rex',anim},'full'));
  $('[data-back]',el)&&($('[data-back]',el).onclick=()=>{ SFX.tap(); go(obPrev(id),{},'back'); });
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go(obNext(id)); };
}
SCREENS.intro1=(p,el)=>heroTalk(el,'intro1','Oi! Eu sou o Rex 😎 e essa é a minha turma de axolotes!',{anim:'wave'});
SCREENS.intro2=(p,el)=>heroTalk(el,'intro2','Vou te fazer umas perguntinhas pra montar um treino que é a sua cara. Leva só 1 minutinho!',{anim:'happy'});

SCREENS.nome=(p,el)=>{ const P=st.profile; qScreen(el,'nome',{
  say:'Primeiro: como posso te chamar?',
  body:`<input class="field" maxlength="20" placeholder="Seu nome ou apelido" value="${esc(P.name)}" autocomplete="given-name" enterkeyhint="next">`,
  valid:()=>P.name.trim().length>0,
  mount:(el,upd)=>{ const i=$('input',el); i.oninput=()=>{ P.name=i.value; upd(); }; i.onkeydown=e=>{ if(e.key==='Enter') $('[data-next]',el).click(); }; }
});};
SCREENS.objetivo=(p,el)=>{ const P=st.profile; qScreen(el,'objetivo',{
  say:`Prazer, ${P.name.trim()}! Qual é o seu maior objetivo?`,
  body:optsHTML(Object.entries(GOALS).map(([k,g])=>({v:k,e:g.emoji,t:g.label})),P.goal),
  valid:()=>!!P.goal, mount:(el,upd)=>bindSingle(el,'.opt','v',v=>P.goal=v,upd)
});};
SCREENS.nivel=(p,el)=>{ const P=st.profile; qScreen(el,'nivel',{
  say:'Quanto você se exercita hoje? Sem vergonha, viu!',
  body:optsHTML([['Quase nada','Estou começando do zero'],['Pouco','1 a 2 vezes por semana'],['Regular','3 a 4 vezes por semana'],['Muito','5 ou mais vezes por semana']].map((o,i)=>({v:i,e:IC.bars(i+1),t:o[0],s:o[1]})),P.level),
  valid:()=>P.level!==null, mount:(el,upd)=>bindSingle(el,'.opt','v',v=>P.level=+v,upd)
});};
SCREENS.corrida=(p,el)=>{ const P=st.profile; qScreen(el,'corrida',{
  say:'E corrida, como anda?',
  body:optsHTML([['🚶','Ainda não corro','Prefiro começar caminhando'],['🏃','Corro um pouquinho','Até 1 km sem parar'],['💨','Corro de boa','De 1 a 5 km'],['🏅','Sou corredor(a)','Mais de 5 km']].map((o,i)=>({v:i,e:o[0],t:o[1],s:o[2]})),P.run),
  valid:()=>P.run!==null, mount:(el,upd)=>bindSingle(el,'.opt','v',v=>P.run=+v,upd)
});};
function rangeFill(r){ const p=(r.value-r.min)/(r.max-r.min)*100; r.style.setProperty('--p',p+'%'); }
SCREENS.idade=(p,el)=>{ const P=st.profile; qScreen(el,'idade',{
  say:'Me conta um pouco sobre você.',
  body:`<div class="card stagger"><h4>Idade</h4><div class="stepper"><button class="round-btn" data-d="-1">−</button><div class="val"><span data-age>${P.age}</span><small>anos</small></div><button class="round-btn" data-d="1">+</button></div><input type="range" min="16" max="90" value="${P.age}"></div>
    <div class="card"><h4>Sexo biológico</h4><div class="chips">${[['f','Feminino'],['m','Masculino'],['x','Prefiro não dizer']].map(([v,t])=>`<button class="chip ${P.sex===v?'sel':''}" data-v="${v}">${t}</button>`).join('')}</div>
    <p class="note">Usamos só pra calcular sua frequência cardíaca ideal e o gasto de calorias.</p></div>`,
  valid:()=>!!P.sex,
  mount:(el,upd)=>{ const r=$('input[type=range]',el), out=$('[data-age]',el); rangeFill(r);
    const set=v=>{ P.age=Math.max(16,Math.min(90,v)); r.value=P.age; out.textContent=P.age; rangeFill(r); };
    r.oninput=()=>set(+r.value); $$('[data-d]',el).forEach(b=>b.onclick=()=>{ set(P.age+ +b.dataset.d); SFX.tap(); });
    bindSingle(el,'.chip','v',v=>P.sex=v,upd); }
});};
SCREENS.corpo=(p,el)=>{ const P=st.profile;
  const bmiHTML=()=>{ const b=bmiOf(P), i=bmiInfo(b); return `<div style="display:flex;justify-content:space-between;align-items:baseline"><h4 style="margin:0">Seu IMC</h4><b style="font-size:22px;font-weight:900">${b.toFixed(1).replace('.',',')}</b></div><div class="bmi-bar"><i style="left:${(i.pos*100).toFixed(1)}%"></i></div><p class="note" style="margin-top:4px">Faixa: <b style="color:${i.color}">${i.label}</b>. Isso só ajuda a escolher exercícios mais gentis com as articulações.</p>`; };
  qScreen(el,'corpo',{
  say:'Agora altura e peso. Fica só entre a gente! 🤫',
  body:`<div class="card stagger"><h4>Altura</h4><div class="stepper"><button class="round-btn" data-h="-1">−</button><div class="val"><span data-hv>${P.height}</span><small>cm</small></div><button class="round-btn" data-h="1">+</button></div><input type="range" data-hr min="130" max="215" value="${P.height}"></div>
    <div class="card"><h4>Peso</h4><div class="stepper"><button class="round-btn" data-w="-1">−</button><div class="val"><span data-wv>${P.weight}</span><small>kg</small></div><button class="round-btn" data-w="1">+</button></div><input type="range" data-wr min="35" max="200" step="0.5" value="${P.weight}"></div>
    <div class="card" data-bmi>${bmiHTML()}</div>`,
  mount:(el)=>{ const hr=$('[data-hr]',el), wr=$('[data-wr]',el); [hr,wr].forEach(rangeFill);
    const ref=()=>{ $('[data-hv]',el).textContent=P.height; $('[data-wv]',el).textContent=String(P.weight).replace('.',','); hr.value=P.height; wr.value=P.weight; rangeFill(hr); rangeFill(wr); $('[data-bmi]',el).innerHTML=bmiHTML(); };
    hr.oninput=()=>{ P.height=+hr.value; ref(); }; wr.oninput=()=>{ P.weight=+wr.value; ref(); };
    $$('[data-h]',el).forEach(b=>b.onclick=()=>{ P.height=Math.max(130,Math.min(215,P.height+ +b.dataset.h)); ref(); SFX.tap(); });
    $$('[data-w]',el).forEach(b=>b.onclick=()=>{ P.weight=Math.max(35,Math.min(200,P.weight+ +b.dataset.w)); ref(); SFX.tap(); }); }
});};
SCREENS.saude=(p,el)=>{ const P=st.profile; const qs=PARQ.filter(q=>!q.onlyIf||q.onlyIf(P));
  qScreen(el,'saude',{
  say:'Sua segurança vem primeiro 💗 Responda com sinceridade:',
  body:`<div class="stagger">${qs.map((q,i)=>`<div class="card q-card" style="--i:${i}"><p>${q.text}</p><div class="yn" data-q="${q.id}"><button class="n ${P.parq[q.id]===false?'on':''}" data-a="0">Não</button><button class="y ${P.parq[q.id]===true?'on':''}" data-a="1">Sim</button></div></div>`).join('')}</div>
    <p class="note">Baseado no questionário PAR-Q+, usado por profissionais de educação física antes de começar um treino.</p>`,
  valid:()=>qs.every(q=>typeof P.parq[q.id]==='boolean'),
  mount:(el,upd)=>$$('.yn',el).forEach(g=>$$('button',g).forEach(b=>b.onclick=()=>{ $$('button',g).forEach(x=>x.classList.remove('on')); b.classList.add('on'); P.parq[g.dataset.q]=b.dataset.a==='1'; if(P.parq.q6===false) P.joints=[]; SFX.pop(); upd();
    const next=g.closest('.card').nextElementSibling; if(next&&next.classList.contains('card')){ const sc=$('.scroll',el); sc.scrollTo({top:next.offsetTop-80,behavior:'smooth'}); } }))
});};
SCREENS.articulacoes=(p,el)=>{ const P=st.profile; qScreen(el,'articulacoes',{
  say:'Onde você sente dor ou já teve lesão? Vou adaptar os exercícios.',
  body:`<div class="grid2 stagger">${JOINTS.map((j,i)=>`<button class="tile ${P.joints.includes(j.id)?'sel':''}" style="--i:${i}" data-v="${j.id}"><span class="e">${j.emoji}</span>${j.label}</button>`).join('')}</div>`,
  valid:()=>P.joints.length>0,
  mount:(el,upd)=>$$('.tile',el).forEach(b=>b.onclick=()=>{ const v=b.dataset.v; P.joints=P.joints.includes(v)?P.joints.filter(x=>x!==v):[...P.joints,v]; b.classList.toggle('sel'); SFX.pop(); upd(); })
});};
SCREENS.cuidado=(p,el)=>{ const P=st.profile, f=healthFlags(P); const pl=genPlan(P);
  qScreen(el,'cuidado',{
  say: f.care?'Vamos com calma, combinado? Ativei o Modo Cuidado pra você ❤️':'Vou deixar seus treinos com um pouco mais de atenção, tá? ⚠️',
  body:`<div class="card care-card"><span class="badge care">${f.care?'❤️ Modo Cuidado ativado':'⚠️ Atenção extra'}</span>
      <ul>${f.care?'<li><span>Caminhadas e exercícios leves, sem tiros de corrida nem saltos</span></li>':'<li><span>Intensidade moderada, sem exageros</span></li>'}
      <li><span>Frequência cardíaca até <b>${pl.zone[1]} bpm</b></span></li><li><span>Aquecimento caprichado e mais tempo de descanso</span></li>
      <li><span>Trote regenerativo bem leve no final de todo treino</span></li></ul></div>
    <div class="tipbox">🩺 <span>Recomendamos conversar com um médico antes de começar e mostrar este plano pra ele. Se sentir dor no peito, falta de ar forte ou tontura, pare na hora.</span></div>
    <button class="check ${P.careOk?'on':''}" data-ck><i></i>Entendi e vou buscar orientação médica se precisar</button>`,
  valid:()=>!f.care||P.careOk,
  mount:(el,upd)=>{ $('[data-ck]',el).onclick=e=>{ P.careOk=!P.careOk; e.currentTarget.classList.toggle('on',P.careOk); SFX.pop(); upd(); }; }
});};
const DN=['D','S','T','Q','Q','S','S'], DNL=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
SCREENS.dias=(p,el)=>{ const P=st.profile;
  const cnt=()=>`<b>${P.days.length}</b> treino${P.days.length===1?'':'s'} por semana`;
  qScreen(el,'dias',{
  say:'Em quais dias você quer treinar?',
  body:`<div class="card"><div class="days">${DN.map((d,i)=>`<button class="day ${P.days.includes(i)?'sel':''}" data-d="${i}" aria-label="${DNL[i]}">${d}</button>`).join('')}</div><div class="big-count" data-c>${cnt()}</div></div>
    <div class="tipbox">💤 <span>Deixe pelo menos <b>1 dia de descanso</b> — é nele que o músculo se reconstrói. Dias de descanso não quebram sua ofensiva!</span></div>`,
  valid:()=>P.days.length>=2&&P.days.length<=6,
  mount:(el,upd)=>$$('.day',el).forEach(b=>b.onclick=()=>{ const d=+b.dataset.d; if(P.days.includes(d)) P.days=P.days.filter(x=>x!==d); else if(P.days.length<6) P.days=[...P.days,d]; else { toast('Deixe pelo menos 1 dia pra recuperar 💤'); return; }
    b.classList.toggle('sel',P.days.includes(d)); $('[data-c]',el).innerHTML=cnt(); SFX.pop(); upd(); })
});};
SCREENS.tempo=(p,el)=>{ const P=st.profile; qScreen(el,'tempo',{
  say:'Quanto tempo você tem por treino?',
  body:optsHTML([[15,'Leve','⏱️'],[20,'Regular','⏰'],[30,'Puxado','💪'],[45,'Intenso','🔥']].map(([m,t,e])=>({v:m,e,t:`${m} min por dia`,tag:t})),P.minutes),
  valid:()=>!!P.minutes, mount:(el,upd)=>bindSingle(el,'.opt','v',v=>P.minutes=+v,upd)
});};
SCREENS.horario=(p,el)=>{ const P=st.profile; const opts=[['🌅','Manhã','07:00'],['☀️','Almoço','12:00'],['🌇','Fim de tarde','18:00'],['🌙','Noite','20:00']];
  qScreen(el,'horario',{
  say:'Que horas eu te chamo pra treinar?',
  body:optsHTML(opts.map(o=>({v:o[2],e:o[0],t:o[1],tag:o[2]})),P.reminder)+`<div class="card" style="margin-top:12px;display:flex;align-items:center;justify-content:space-between"><b style="font-weight:800">Outro horário</b><input type="time" class="field" style="width:130px;height:46px;font-size:17px" value="${P.reminder}"></div>
    <p class="note">Eu e a turma vamos te lembrar no horário escolhido. Você pode mudar depois no seu perfil.</p>`,
  mount:(el,upd)=>{ bindSingle(el,'.opt','v',v=>{ P.reminder=v; $('input[type=time]',el).value=v; },upd); $('input[type=time]',el).onchange=e=>{ P.reminder=e.target.value||'18:00'; $$('.opt',el).forEach(x=>x.classList.toggle('sel',x.dataset.v===P.reminder)); }; }
});};
SCREENS.parceiro=(p,el)=>{ const P=st.profile; let sel=P.partner;
  el.innerHTML=`<div class="ob-top"><button class="icon-btn" data-back>${IC.back}</button><div class="prog"><i></i></div></div>
    <div class="scroll"><div class="ob-body">
      <div class="bubble" style="text-align:center;margin:4px 0 0">Escolha seu <b style="color:var(--pink)">parceiro de treino</b>. Ele nunca foge de casa — e te ajuda a buscar a turma se ela sumir!</div>
      <div class="partner-stage" style="--pc:${CREW[sel].color}55"><div class="axo-slot" ${axo({id:sel,anim:'wave'},'full',{pad:0.08})}></div></div>
      <div class="ptabs">${CREW_IDS.map(id=>`<button class="ptab ${id===sel?'sel':''}" data-id="${id}" style="--pk:${CREW[id].dark};--pk-l:${CREW[id].color}44"><i style="background:${CREW[id].color}"></i>${CREW[id].name}</button>`).join('')}</div>
      <div class="pinfo"></div></div></div>
    <div class="foot"><button class="btn" data-next></button></div>`;
  animProg(el,obProg('parceiro'));
  const info=()=>{ const c=CREW[sel]; $('.pinfo',el).innerHTML=`<span class="role" style="--pk:${c.dark};--pk-l:${c.color}55">${c.role}</span><h3>${c.name}, ${c.title.toLowerCase()}</h3><p>${c.bio}</p>`; $('[data-next]',el).textContent=`Escolher ${c.name}`; $('.partner-stage',el).style.setProperty('--pc',c.color+'55'); };
  info();
  $$('.ptab',el).forEach(b=>b.onclick=()=>{ sel=b.dataset.id; $$('.ptab',el).forEach(x=>x.classList.toggle('sel',x===b)); info(); SFX.pop(); vib(10);
    const s=$('.partner-stage .axo-slot',el); setAxo(s,{id:sel,anim:'cheer',mood:'joy'},'full',{pad:0.08}); clearTimeout(el._t); el._t=setTimeout(()=>setAxo(s,{id:sel,anim:'wave'},'full',{pad:0.08}),1600); });
  $('[data-back]',el).onclick=()=>{ SFX.tap(); go(obPrev('parceiro'),{},'back'); };
  $('[data-next]',el).onclick=()=>{ P.partner=sel; save(); SFX.ok(); go('gerando'); };
};
SCREENS.gerando=(p,el)=>{ const P=st.profile;
  const items=['Analisando seu nível e objetivo','Ajustando os treinos à sua saúde','Calculando sua frequência cardíaca alvo','Planejando dias de recuperação 100%','Adicionando trote regenerativo anti-câimbra','Desenhando a sua trilha'];
  el.innerHTML=`<div class="gen"><div class="axo-slot" ${axo({id:P.partner,anim:'jack'},'tall')}></div><h2>Montando seu plano…</h2>
    <div class="checklist">${items.map(t=>`<div class="ck"><i></i>${t}</div>`).join('')}</div><div class="pct">0%</div></div>`;
  const cks=$$('.ck',el); let i=0; const pct=$('.pct',el);
  const step=()=>{ if(!el.isConnected) return; if(i>0){ cks[i-1].classList.remove('run'); cks[i-1].classList.add('ok'); SFX.pop(); }
    pct.textContent=Math.round(i/items.length*100)+'%';
    if(i<items.length){ cks[i].classList.add('run'); i++; el._t=setTimeout(step,620); }
    else { plan=genPlan(P); el._t=setTimeout(()=>go('plano',{},'fade'),550); } };
  el._t=setTimeout(step,400);
  return ()=>clearTimeout(el._t);
};
SCREENS.plano=(p,el)=>{ const P=st.profile; plan=genPlan(P); const pl=plan;
  const goal=GOALS[P.goal]; const load=[100,112,125,80];
  const mainCoach = P.goal==='5k'?'turbo':'lua';
  el.innerHTML=`<div class="scroll"><div class="plan-hero"><div style="font-size:40px">🎉</div><h1>Seu plano está pronto, ${esc(P.name.trim())}!</h1><p>Feito sob medida pra você, do jeitinho que respondeu.</p></div>
   <div class="pad stagger">
    <div class="kpis"><div class="kpi"><b>${pl.n}x</b><span>por semana</span></div><div class="kpi"><b>${P.minutes}</b><span>min/treino</span></div><div class="kpi"><b style="font-size:15px;line-height:27px">${pl.levelName}</b><span>nível</span></div></div>
    ${pl.care||pl.caution?`<div style="margin-bottom:12px"><span class="badge care">${pl.care?'❤️ Modo Cuidado':'⚠️ Atenção extra'}</span></div>`:''}
    <div class="card goal-card"><div class="gi">${goal.emoji}</div><div><small>Sua meta</small><b>${pl.projection}</b></div></div>
    <div class="card"><h4>Carga de treino nas 4 semanas</h4><div class="bars">${load.map((m,i)=>`<div><em>${m}%</em><i style="height:${m/125*100}%;animation-delay:${i*120}ms"></i><span>${i===3?'Sem. leve':'Sem. '+(i+1)}</span></div>`).join('')}</div>
      <p class="note">A 4ª semana é mais leve de propósito: é quando o corpo se adapta e você volta mais forte.</p></div>
    <div class="card"><h4>Frequência cardíaca alvo</h4><div style="display:flex;gap:14px;align-items:center"><div style="font-size:30px">❤️</div><div><b style="font-weight:900;font-size:22px">${pl.zone[0]}–${pl.zone[1]} bpm</b><p class="note" style="margin:0">no treino · trote regenerativo: ${pl.regen[0]}–${pl.regen[1]} bpm</p></div></div></div>
    <div class="card"><h4>Todo treino tem 4 partes</h4><div class="flow">
      ${[['sol','Aquecimento','Prepara articulações e coração.'],[mainCoach,'Treino principal','Força em casa ou corrida/caminhada guiada.'],['turbo','Trote regenerativo','Bem leve, pra limpar o ácido lático e evitar câimbras.'],['sol','Alongamento','Relaxa o músculo pra você recuperar 100% até o próximo treino.']]
        .map(([id,t,s])=>`<div class="flow-step"><div class="av" style="background:${CREW[id].color}55"><div class="axo-slot" ${axo({id,anim:'idle'},'head')}></div></div><div><b>${t}</b><span>${s}</span></div></div>`).join('')}
    </div></div>
    <p class="note" style="margin:12px 4px 20px">O AxoGo ajuda você a se mexer com segurança, mas não substitui avaliação médica ou de um profissional de educação física.</p>
   </div></div>
   <div class="foot line"><button class="btn" data-next>Continuar</button></div>`;
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('turma'); };
};
SCREENS.turma=(p,el)=>{ const P=st.profile;
  el.innerHTML=`<div class="scroll"><div class="pad" style="padding-top:calc(var(--top) + 18px)">
    <div class="bubble down" style="text-align:center"><span class="tw"></span></div>
    <div class="crew-stage"><div class="axo-slot" ${axo([{id:'turbo',anim:'cheer',mood:'joy',x:-2.6,z:-0.7,ry:0.3},{id:'sol',anim:'dance',x:-0.9,z:-0.1},{id:'rex',anim:'happy',x:0.9,z:0.2},{id:'lua',anim:'cheer',mood:'joy',x:2.6,z:-0.7,ry:-0.3}],'full',{pad:0.02})}></div></div>
    <div class="rules stagger"><div class="rule" style="--i:0"><div class="e">🔥</div><b>Treinou nos seus dias: turma feliz</b></div><div class="rule" style="--i:1"><div class="e">😢</div><b>Faltou 1 dia: turma tristinha</b></div><div class="rule" style="--i:2"><div class="e">🏃‍♂️💨</div><b>2+ dias: eles fogem de casa!</b></div></div>
    <p class="note" style="text-align:center;margin-top:14px">Cada treino depois de uma fuga traz um axolote de volta. ${cname(P.partner)} sempre fica com você.</p>
  </div></div><div class="foot"><button class="btn" data-next>Combinado!</button></div>`;
  typeText($('.tw',el),`A gente vai morar com você agora! Treinou, a turma fica feliz. Sumiu… a gente fica triste e foge de casa 😱`);
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('meta'); };
};
SCREENS.meta=(p,el)=>{ const P=st.profile; const G=[[7,35,'Bom começo'],[14,140,'Firme'],[30,210,'Dedicado'],[50,350,'Imparável']];
  el.innerHTML=`<div class="ob-top"><button class="icon-btn" data-back>${IC.back}</button><div class="prog"><i style="width:100%"></i></div></div>
   <div class="coach-row"><div class="axo-slot" ${axo({id:P.partner,anim:'talk'},'bust')}></div><div class="bubble left"><span class="tw"></span></div></div>
   <div class="scroll"><div class="ob-body"><div class="goal-list stagger">${G.map(([d,r,t],i)=>`<button class="goal-row ${P.streakGoal===d?'sel':''}" style="--i:${i}" data-v="${d}">${d} dias de ofensiva<span>${t} · +${r} 🫧</span></button>`).join('')}</div>
   <p class="note">Bata a meta pra ganhar pérolas. Quanto maior a meta, mais chance de criar o hábito!</p></div></div>
   <div class="foot"><button class="btn" data-next>Vou me dedicar!</button></div>`;
  typeText($('.tw',el),'Última coisa! Qual vai ser a sua meta de ofensiva? 🔥',()=>setAxo($('.coach-row .axo-slot',el),{id:P.partner,anim:'idle'},'bust'));
  $$('.goal-row',el).forEach(b=>b.onclick=()=>{ $$('.goal-row',el).forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); P.streakGoal=+b.dataset.v; SFX.pop(); });
  $('[data-back]',el).onclick=()=>{ SFX.tap(); go('turma',{},'back'); };
  $('[data-next]',el).onclick=()=>{ SFX.win(); finishOnboarding(); };
};
function finishOnboarding(){
  const first=!st.onboarded;
  st.onboarded=true; if(!st.startDate) st.startDate=todayK();
  plan=genPlan(st.profile); save();
  go('main',{tab:'home',welcome:first},'fade');
}
function enterApp(dir='fade'){
  const newly=syncDay();
  if(newly.length) go('fuga',{ids:newly},dir); else go('main',{tab:'home'},dir);
}

/* =====================================================================
   CASCA PRINCIPAL COM ABAS
   ===================================================================== */
let tab='home';
SCREENS.main=(p,el)=>{
  tab=p.tab||tab;
  el.innerHTML=`<div class="topbar"></div><div class="tabview"></div>
   <nav class="nav">${[['home',IC.navHome,'Trilha'],['run',IC.navRun,'Correr'],['crew',IC.navCrew,'Turma'],['quest',IC.navQuest,'Missões'],['me',IC.navMe,'Perfil']].map(([k,ic,l])=>`<button data-tab="${k}" aria-label="${l}" class="${k===tab?'on':''}">${ic}</button>`).join('')}</nav>`;
  $$('.nav button',el).forEach(b=>b.onclick=()=>{ if(b.dataset.tab===tab) return; SFX.tap(); tab=b.dataset.tab; $$('.nav button',el).forEach(x=>x.classList.toggle('on',x===b)); renderTab(el); });
  renderTopbar(el); renderTab(el,p);
};
function renderTopbar(el=cur?.el){
  const tb=el&&$('.topbar',el); if(!tb) return; const s=streak(), today=doneOn(todayK());
  tb.innerHTML=`<button class="crew-dots" data-crew aria-label="Turma">${CREW_IDS.map(id=>`<i class="${st.fled.includes(id)?'gone':''}" style="background:${CREW[id].color}"></i>`).join('')}</button>
    <button class="stat fire ${today?'':'off'}" data-fire>${IC.flame(today)}${s}</button>
    <button class="stat xp" data-xp>${IC.bolt}${st.xp}</button>
    <button class="stat pearl" data-pearl>${IC.pearl}${st.pearls}</button>`;
  $('[data-fire]',tb).onclick=()=>{ SFX.tap(); streakSheet(); };
  $('[data-crew]',tb).onclick=()=>{ SFX.tap(); $(`.nav [data-tab=crew]`,el).click(); };
  $('[data-xp]',tb).onclick=()=>toast(`⚡ ${st.xp} XP no total. Cada treino concluído rende XP!`);
  $('[data-pearl]',tb).onclick=()=>toast(`🫧 ${st.pearls} pérolas. Ganhe abrindo baús e completando missões.`);
}
function renderTab(el,p={}){
  const v=$('.tabview',el); if(el._tabCleanup){ el._tabCleanup(); el._tabCleanup=null; }
  const fn={home:tabHome,run:tabRun,crew:tabCrew,quest:tabQuest,me:tabMe}[tab];
  el._tabCleanup=fn(v,p,el)||null;
}

/* ---------- TRILHA (tela inicial) ---------- */
const OFF=[0,46,72,46,0,-46,-72,-46];
function casaHTML(){
  const mood=crewMood(), home=homeCrew(), P=st.profile;
  const xs={4:[-2.6,-0.87,0.87,2.6],3:[-1.75,0,1.75],2:[-0.95,0.95],1:[0]}[home.length]||[0];
  const order=[...home].sort((a,b)=>(a===P.partner)-(b===P.partner)); // parceiro no fim → posição central-direita
  const pos = home.length===4?[0,3,1,2]:home.length===3?[0,2,1]:[0,1];
  const animFor=(id,i)=>{ if(mood==='joy') return i%2?{anim:'dance',mood:'joy'}:{anim:'cheer',mood:'joy'};
    if(mood==='sad') return {anim:'sad',mood:i===0?'cry':'sad'};
    if(mood==='rest') return i%2?{anim:'sleep',mood:'sleep'}:{anim:'idle'};
    return id===P.partner?{anim:'wave'}:{anim:i%2?'idle':'happy'}; };
  const cast=order.map((id,i)=>({id,x:xs[pos[i]??i]??0,z:(Math.abs(xs[pos[i]??i]??0)>2?-0.5:0),ry:-(xs[pos[i]??i]??0)*0.08,...animFor(id,i)}));
  const m=missed(), fled=st.fled;
  let msg;
  if(mood==='joy') msg='Treino feito! A turma tá radiante 🎉 Agora é descansar e recuperar.';
  else if(mood==='rest') msg='Hoje é dia de descanso 💤 Recuperação também é treino!';
  else if(fled.length) msg=`${fled.map(cname).join(' e ')} ${fled.length>1?'fugiram':'fugiu'} de casa 😢 Treine hoje que eu te ajudo a trazer de volta!`;
  else if(m>=1) msg='Ei… você sumiu e a turma ficou tristinha. Bora treinar hoje?';
  else msg=`Bora treinar hoje, ${esc(P.name.trim())}? A turma tá te esperando!`;
  return `<div class="casa ${mood==='sad'?'sad':mood==='rest'?'rest':''}" data-casa>
    <div class="sky"><div class="sun"></div><div class="cloud" style="top:26px"></div><div class="cloud" style="top:58px;animation-delay:-9s;transform:scale(.7)"></div>${mood==='sad'?'<div class="rain"></div>':''}
      <button class="demo" data-demo>🧪 DEMO</button>
      <div class="axo-slot" ${axo(cast,'full',{pad:0.02,oy:0.12})}></div></div>
    <div class="msg"><p>${msg}</p><div class="hearts">${[0,1,2,3,4].map(i=>IC.heart.replace('<svg',`<svg class="${i<happiness()?'':'off'}"`)).join('')}</div></div>
    ${fled.length?`<div style="display:flex;gap:8px;padding:0 14px 12px;flex-wrap:wrap">${fled.map(id=>`<span class="pill f">🏃‍♂️💨 ${cname(id)} fugiu</span>`).join('')}</div>`:''}
  </div>`;
}
function nodeStatus(n,idx,ci){ if(st.done[n.id]) return 'done'; if(idx===ci) return 'cur'; return 'locked'; }
function tabHome(v,p,mainEl){
  const P=st.profile, ci=curIndex(), all=allNodes(); let gi=0;
  const curUnit = ci<all.length ? all[ci].unit : plan.units.length;
  v.innerHTML=`<div class="scroll" data-clip id="pathScroll">${casaHTML()}
    ${plan.units.map(u=>{
      const mir=u.idx%2?-1:1; const coach=coachFor(u.coach); const coachFled=st.fled.includes(u.coach);
      const locked=u.idx>curUnit;
      const nodes=u.nodes.map((n,j)=>{ const idx=gi++; const s=nodeStatus(n,idx,ci); const x=OFF[j%8]*mir;
        const icon = n.kind==='chest'?IC.chest : n.kind==='trophy'?IC.trophy : s==='done'?IC.check : NODE_IC[n.icon]||IC.star;
        const cls = n.kind==='workout'?'':n.kind;
        return `<div class="nwrap" style="--x:${x}px"><button class="node ${cls} ${s}" data-node="${n.id}" style="--c:${u.color};--d:${u.dark}" aria-label="${esc(n.title)}">${s==='cur'&&n.kind==='workout'?'<span class="ring"></span>':''}${icon}</button>${s==='cur'?`<div class="start-tip" style="--c:${u.color}">${n.kind==='chest'?'ABRIR':n.kind==='trophy'?'COMEMORAR':'COMEÇAR'}</div>`:''}</div>`; }).join('');
      const cAnim = locked?'idle':(u.idx===curUnit?(crewMood()==='sad'?'sad':'wave'):'happy');
      return `<section class="unit ${locked?'locked':''}" data-unit="${u.idx}" style="--c:${u.color};--d:${u.dark}">
        <div class="unit-head"><div><small>${u.label}</small><b>${u.title}</b></div><button class="guide" data-guide="${u.idx}" aria-label="Guia da unidade">${IC.guide}</button></div>
        <div class="nodes">${nodes}
          <div class="coach-spot" style="top:190px;${mir>0?'left:4px':'right:4px'}">${coachFled&&coach===P.partner&&u.coach!==P.partner?`<div class="fled-sign">🏃‍♂️💨<br>${cname(u.coach)} fugiu</div>`:''}<div class="axo-slot" ${axo({id:coach,anim:cAnim,mood:crewMood()==='sad'&&!locked?'sad':'happy',ry:mir*0.35},'full')}></div></div>
        </div></section>`;
    }).join('')}
    <div class="end-note">${ci>=all.length?'Você completou o plano inteiro! 🏆 Novas unidades chegam em breve.':'Mais unidades aparecem conforme você evolui ✨'}</div></div>`;
  const sc=$('#pathScroll',v);
  // recorte do 3D por baixo do cabeçalho grudado da unidade
  const onScroll=()=>{ let top=0; const r=sc.getBoundingClientRect();
    for(const h of $$('.unit-head',sc)){ const hr=h.getBoundingClientRect(), ur=h.parentElement.getBoundingClientRect(); if(hr.top<=r.top+12 && ur.bottom>r.top+hr.height+20){ top=hr.bottom-r.top+6; } }
    sc.dataset.clipTop=top; };
  sc.addEventListener('scroll',onScroll,{passive:true});
  $('[data-demo]',v).onclick=()=>{ SFX.tap(); demoSheet(); };
  $$('[data-guide]',v).forEach(b=>b.onclick=()=>{ SFX.tap(); guideSheet(plan.units[+b.dataset.guide]); });
  $$('.node',v).forEach(b=>b.onclick=e=>{ e.stopPropagation(); togglePop(v,b.dataset.node); });
  sc.addEventListener('click',e=>{ if(!e.target.closest('.pop')) closePop(v); });
  // rola até o nó atual
  requestAnimationFrame(()=>{ const c=$('.node.cur',v); if(c){ const r=c.getBoundingClientRect(), sr=sc.getBoundingClientRect(); const target=sc.scrollTop+r.top-sr.top-sr.height*0.55; if(target>0) sc.scrollTo({top:target,behavior:p.welcome?'auto':'smooth'}); }
    if(p.welcome && c) setTimeout(()=>{ togglePop(v,c.dataset.node); },700);
    if(p.justDone){ const d=$(`[data-node="${p.justDone}"]`,v); if(d){ d.animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:600,easing:'cubic-bezier(.2,1.6,.4,1)'}); } }
    onScroll(); });
}
function closePop(v){ const o=$('.pop',v); if(o){ o.remove(); $$('.coach-spot',v).forEach(c=>c.removeAttribute('data-axo-off')); } }
function togglePop(v,id){
  const was=$('.pop',v)?.dataset.for; closePop(v); if(was===id) return;
  const all=allNodes(), idx=all.findIndex(n=>n.id===id), n=all[idx], u=plan.units[n.unit], s=nodeStatus(n,idx,curIndex());
  const wrap=$(`[data-node="${id}"]`,v).parentElement; const x=parseFloat(getComputedStyle(wrap).getPropertyValue('--x'))||0;
  const pop=document.createElement('div'); pop.className='pop'+(s==='locked'?' locked':''); pop.dataset.for=id; pop.style.cssText=`--c:${u.color};--d:${u.dark};--x:${x}px`;
  SFX.pop();
  if(n.kind==='workout'){
    const meta=`<div class="meta"><span>⏱ ${n.minutes} min</span><span>🔥 ~${n.kcal} kcal</span><span>⚡ +${n.xp} XP</span>${n.hasRun?'<span>📍 GPS</span>':''}</div>`;
    if(s==='cur'&&pathToday()) pop.innerHTML=`<h3>${n.title}</h3><p>💤 Recuperação 100%: seu corpo se reconstrói no descanso. Esse treino libera amanhã!</p><button class="btn" disabled style="opacity:.75">Disponível amanhã</button><button class="btn link" data-det>Ver detalhes</button>`;
    else if(s==='cur') pop.innerHTML=`<h3>${n.title}</h3><p>${n.sub}</p>${meta}<button class="btn" data-start>Começar +${n.xp} XP</button><button class="btn link" data-det>Ver detalhes</button>`;
    else if(s==='done') pop.innerHTML=`<h3>${n.title} ✓</h3><p>Concluído! Mandou bem demais.</p><button class="btn" data-det>Ver detalhes</button>`;
    else pop.innerHTML=`<h3>${n.title}</h3><p>Complete os treinos anteriores pra desbloquear!</p><button class="btn" disabled>Bloqueado</button>`;
  } else if(n.kind==='chest'){
    pop.innerHTML = s==='cur'?`<h3>Baú surpresa!</h3><p>Um presentinho pela dedicação.</p><button class="btn" data-chest>Abrir</button>`:s==='done'?`<h3>Baú aberto ✓</h3><p>Você já pegou essas pérolas.</p>`:`<h3>Baú surpresa</h3><p>Complete o treino anterior pra abrir!</p><button class="btn" disabled>Bloqueado</button>`;
  } else {
    pop.innerHTML = s==='cur'?`<h3>${n.title}</h3><p>Você completou a unidade! Hora de comemorar com a turma.</p><button class="btn" data-trophy>Comemorar</button>`:s==='done'?`<h3>Unidade concluída ✓</h3><p>Troféu garantido!</p>`:`<h3>${n.title}</h3><p>Complete todos os treinos da unidade.</p><button class="btn" disabled>Bloqueado</button>`;
  }
  wrap.after(pop);
  $$('.coach-spot',v).forEach(c=>c.setAttribute('data-axo-off',''));
  const sc=$('#pathScroll',v); const pr=pop.getBoundingClientRect(), sr=sc.getBoundingClientRect(); if(pr.bottom>sr.bottom-10) sc.scrollBy({top:pr.bottom-sr.bottom+20,behavior:'smooth'});
  $('[data-start]',pop)&&($('[data-start]',pop).onclick=()=>{ SFX.ok(); go('treino',{nodeId:n.id},'up'); });
  $('[data-det]',pop)&&($('[data-det]',pop).onclick=()=>{ SFX.tap(); workoutSheet(n, s==='cur'&&!pathToday()); });
  $('[data-chest]',pop)&&($('[data-chest]',pop).onclick=()=>{ SFX.ok(); go('bau',{nodeId:n.id},'fade'); });
  $('[data-trophy]',pop)&&($('[data-trophy]',pop).onclick=()=>{ SFX.ok(); go('trofeu',{nodeId:n.id},'fade'); });
}
const BLOCK_COL={warm:['#ff9600','#fff1de'],main:['#ff6fa3','#fff1f6'],cool:['#1cb0f6','#ddf4ff'],stretch:['#58cc02','#e8ffd6']};
function stepLine(s){ return s.kind==='reps'?`${s.reps}x`:mmss(s.secs); }
function summarizeSteps(b){
  const seen=new Map(); b.steps.forEach(s=>{ if(s.kind==='rest') return; const k=s.name; if(!seen.has(k)) seen.set(k,{s,n:0}); seen.get(k).n++; });
  const rounds=b.steps.find(s=>s.rounds)?.rounds;
  return {rounds, items:[...seen.values()].map(({s,n})=>`<li><span>${s.name}${s.bonus?' ⭐':''}</span><span>${n>1&&!rounds?n+' × ':''}${stepLine(s)}</span></li>`).join('')};
}
function workoutSheet(n,canStart){
  const u=plan.units[n.unit];
  openSheet(`<div class="scroll" style="padding-top:6px"><div class="wk-head" style="--c:${u.color};--d:${u.dark}"><small>${u.label}</small><h2>${n.title}</h2>
     <div class="meta"><span>⏱ ${n.minutes} min</span><span>🔥 ~${n.kcal} kcal</span><span>⚡ +${n.xp} XP</span><span>❤️ ${plan.zone[0]}–${plan.zone[1]} bpm</span></div></div>
     ${n.blocks.map(b=>{ const c=coachFor(b.coach), sm=summarizeSteps(b), [bc,bl]=BLOCK_COL[b.key];
       return `<div class="block"><div class="av" style="--bg:${CREW[c].color}66"><div class="axo-slot" ${axo({id:c,anim:'idle'},'head')}></div></div><div style="flex:1;min-width:0"><small style="--bc:${bc}">${b.title}${sm.rounds?` · ${sm.rounds} RODADA${sm.rounds>1?'S':''}`:''}</small><b>com ${cname(c)}</b><ul>${sm.items}</ul></div></div>`; }).join('')}
     <div class="tipbox">💧 <span><b>Recuperação 100%:</b> beba água, durma bem e respeite o descanso. ${n.type==='descanso'?'Hoje o foco é soltar o corpo.':'O trote regenerativo no final acelera a limpeza do ácido lático e evita câimbras.'}</span></div>
     ${plan.care?'<div class="tipbox" style="background:#ffdfe0;color:#b0232b">❤️ <span>Modo Cuidado: pare se sentir dor no peito, falta de ar forte ou tontura.</span></div>':''}
   </div><div class="foot line">${canStart?`<button class="btn" data-go>Começar treino</button>`:''}<button class="btn ${canStart?'link':'outline'}" data-x>Fechar</button></div>`,
   {mount:L=>{ $('[data-x]',L).onclick=()=>closeSheet(); $('[data-go]',L)&&($('[data-go]',L).onclick=()=>{ SFX.ok(); go('treino',{nodeId:n.id},'up'); }); }});
}
function guideSheet(u){
  const tips=[
    ['🔥','Aqueça sempre','5 minutinhos de aquecimento deixam articulações lubrificadas e o coração preparado.'],
    ['🐢','Trote regenerativo','No fim do treino, um trote bem leve (dá pra conversar) ajuda a remover o lactato e reduz câimbras e dores.'],
    ['🧘','Alongue no final','Alongar com o músculo quente ajuda a relaxar e recuperar.'],
    ['💧','Hidrate-se','Beba água antes, durante e depois. Câimbra também é sinal de desidratação.'],
    ['😴','Durma bem','7 a 9 horas de sono: é quando o músculo se reconstrói de verdade.'],
    ['❤️','Escute seu corpo','Dor no peito, tontura ou falta de ar forte? Pare na hora e procure ajuda.'],
  ];
  openSheet(`<div class="scroll" style="padding-top:6px"><div class="wk-head" style="--c:${u.color};--d:${u.dark}"><small>${u.label} · GUIA</small><h2>${u.title}</h2><div class="meta"><span>${u.nodes.filter(x=>x.kind==='workout').length} treinos</span><span>com ${cname(coachFor(u.coach))}</span></div></div>
    <div class="how">${tips.map(([e,t,s])=>`<div class="card"><div class="e">${e}</div><div><b>${t}</b><span>${s}</span></div></div>`).join('')}</div></div>
    <div class="foot line"><button class="btn" data-x>Entendi</button></div>`,{mount:L=>$('[data-x]',L).onclick=()=>closeSheet()});
}
function streakSheet(){
  const s=streak(), d=nowD(), start=addD(d,-d.getDay());
  openSheet(`<div class="night" style="border-radius:26px 26px 0 0;margin-top:-19px;padding-top:19px"><div class="grab" style="background:#2c3d45"></div>
    <div style="text-align:center;padding:10px 20px 4px"><div style="width:90px;height:100px;margin:0 auto">${IC.flame(s>0).replace('<svg','<svg style="width:100%;height:100%"')}</div>
    <div class="streak-num" style="height:auto;line-height:1">${s}</div><div class="streak-lbl">dia${s===1?'':'s'} de ofensiva</div>
    ${weekHTML(start)}<div class="goalbar">Meta: ${st.profile.streakGoal} dias<div class="prog"><i style="width:${Math.min(100,s/st.profile.streakGoal*100)}%"></i></div></div>
    <p class="note" style="color:#9fb0b8;margin:16px 0 0">Treine nos dias do seu plano (${st.profile.days.map(x=>DNL[x]).join(', ')}). Dias de descanso não quebram a ofensiva!</p></div>
    <div class="foot"><button class="btn orange" data-x>Continuar</button></div></div>`,{mount:L=>$('[data-x]',L).onclick=()=>closeSheet()});
}
function weekHTML(start){
  const tk=todayK();
  return `<div class="week">${[0,1,2,3,4,5,6].map(i=>{ const d=addD(start,i), k=keyOf(d), on=doneOn(k), tr=isTrain(d);
    return `<div class="${k===tk?'today':''}">${DNL[i].slice(0,3)}<i class="${on?'on':tr?'':'rest'}"></i></div>`; }).join('')}</div>`;
}
function demoSheet(){
  openSheet(`<div class="sh-head"><h2>🧪 Modo demonstração</h2><p>Simule a passagem dos dias pra ver a turma reagir.</p></div>
   <div class="scroll"><div class="opts">
     <button class="opt" data-a="train"><span class="em">💪</span><span class="t">Concluir o treino de hoje<span class="sub">Pula o treino e vai direto pra comemoração</span></span></button>
     <button class="opt" data-a="day"><span class="em">⏭️</span><span class="t">Avançar 1 dia<span class="sub">Hoje é ${DNL[nowD().getDay()]} · ${isTrain(nowD())?'dia de treino':'dia de descanso'}</span></span></button>
     <button class="opt" data-a="skip2"><span class="em">😴</span><span class="t">Faltar 2 dias de treino<span class="sub">A turma fica triste e alguém foge</span></span></button>
     <button class="opt" data-a="reset"><span class="em">🔄</span><span class="t">Apagar tudo e recomeçar<span class="sub">Volta pro cadastro do zero</span></span></button>
   </div></div><div class="foot"><button class="btn outline" data-x>Fechar</button></div>`,
   {mount:L=>{ $('[data-x]',L).onclick=()=>closeSheet();
     $$('[data-a]',L).forEach(b=>b.onclick=()=>{ const a=b.dataset.a; SFX.ok();
       if(a==='train'){ const n=allNodes()[curIndex()]; if(!n||n.kind!=='workout'){ toast('Abra o baú/troféu da trilha primeiro 😉'); return; } if(pathToday()){ toast('Você já treinou hoje — avance 1 dia 💤'); return; }
         const stats={secs:n.minutes*60,kcal:n.kcal,km:n.hasRun?1.8:0,xp:n.xp}; const res=recordActivity(stats,{node:n}); go('fim',{stats,res,nodeId:n.id},'fade'); }
       if(a==='day'){ st.dayOffset++; save(); closeSheet(true); enterApp('fade'); }
       if(a==='skip2'){ let c=0; while(c<2){ st.dayOffset++; if(isTrain(nowD())) c++; } st.dayOffset++; save(); closeSheet(true); enterApp('fade'); }
       if(a==='reset'){ try{ localStorage.removeItem(KEY); }catch(e){} st=DEF(); plan=null; lastProg=0; go('welcome',{},'fade'); }
     }); }});
}

/* =====================================================================
   PLAYER DO TREINO (passo a passo guiado pelos axolotes)
   ===================================================================== */
const hav=(a,b)=>{ const R=6371e3,t=x=>x*Math.PI/180; const dl=t(b[0]-a[0]),dn=t(b[1]-a[1]); const h=Math.sin(dl/2)**2+Math.cos(t(a[0]))*Math.cos(t(b[0]))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const GPS={id:null,dist:0,last:null,lastT:0,status:'off',
  start(){ if(this.id!==null) return; if(!('geolocation' in navigator)){ this.status='nogps'; return; } this.status='wait';
    try{ this.id=navigator.geolocation.watchPosition(pos=>{ const {latitude:la,longitude:lo,accuracy:ac}=pos.coords; this.status='ok'; if(this.paused) return; if(ac>40) return;
        if(this.last){ const d=hav(this.last,[la,lo]), dt=Math.max(1,(pos.timestamp-this.lastT)/1000); if(d>=3&&d/dt<12){ this.dist+=d; this.last=[la,lo]; this.lastT=pos.timestamp; } }
        else { this.last=[la,lo]; this.lastT=pos.timestamp; } },
      err=>{ this.status=err.code===1?'denied':'nosignal'; },{enableHighAccuracy:true,maximumAge:1000,timeout:20000}); }catch(e){ this.status='nogps'; } },
  setPaused(p){ this.paused=p; if(p) this.last=null; },
  stop(){ if(this.id!==null){ try{ navigator.geolocation.clearWatch(this.id); }catch(e){} } this.id=null; },
  reset(){ this.stop(); this.dist=0; this.last=null; this.status='off'; this.paused=false; },
  label(){ return {off:'GPS desligado',wait:'Procurando sinal de GPS…',ok:'GPS ativo — medindo a distância',denied:'Localização bloqueada: contando só o tempo',nosignal:'Sem sinal de GPS: contando só o tempo',nogps:'GPS indisponível: contando só o tempo'}[this.status]; },
  cls(){ return this.status==='ok'?'ok':this.status==='wait'||this.status==='off'?'':'bad'; },
};
SCREENS.treino=({nodeId},el)=>{
  const n=allNodes().find(x=>x.id===nodeId); const P=st.profile;
  const steps=[]; n.blocks.forEach((b,bi)=>b.steps.forEach((s,si)=>steps.push({...s,bi,si,b})));
  let i=0, left=0, total=0, paused=true, elapsed=0, kcal=0, lastBeep=-1, lastT=performance.now(), started=false;
  GPS.reset();
  el.innerHTML=`<div class="pl-top"><button class="icon-btn" data-x>${IC.close}</button><div class="segs">${n.blocks.map((b,bi)=>`<div style="--w:${Math.max(1,b.steps.reduce((a,s)=>a+s.secs,0))};--sc:${BLOCK_COL[b.key][0]}"><i data-seg="${bi}" style="width:0"></i></div>`).join('')}</div></div>
    <div class="pl-main"><span class="pl-chip"></span><div class="pl-name"></div><div class="pl-round"></div>
      <div class="pl-coach"><div class="bubble down pl-tip"><span class="tw"></span></div><div class="axo-slot"></div></div>
      <div class="gps" hidden><div><b data-km>0,00</b><span>km</span></div><div><b data-pace>--:--</b><span>ritmo /km</span></div><div><b data-kc>0</b><span>kcal</span></div></div>
      <div class="gps-status" hidden><i></i><span></span></div>
      <div data-meter></div><div class="pl-next"></div></div>
    <div class="foot"><div class="pl-ctrl"><button class="btn outline sq" data-pause>${IC.pause}</button><button class="btn" data-next>Próximo</button></div></div>
    <div class="count-over"><span>3</span></div>`;
  const R=56, C=2*Math.PI*R;
  const show=()=>{ const s=steps[i], b=s.b, coach=coachFor(b.coach), [bc,bl]=BLOCK_COL[b.key]; const e=EX[s.ex]||{};
    const chip=$('.pl-chip',el); chip.textContent=b.title; chip.style.setProperty('--bc',bc); chip.style.setProperty('--bc-l',bl);
    $('.pl-name',el).textContent=s.name+(s.bonus?' ⭐':'');
    $('.pl-round',el).textContent=s.rounds?`Rodada ${s.round} de ${s.rounds}`:`Passo ${i+1} de ${steps.length}`;
    setAxo($('.pl-coach .axo-slot',el),{id:coach,anim:s.anim,mood:s.kind==='rest'?'happy':'happy',ry:e.ry??0.38},e.frame||'tall',{pad:0.02});
    let tip=s.tip; if(s.si===0&&coach!==b.coach) tip=`${cname(b.coach)} fugiu, então eu te guio nessa parte! `+tip;
    if(s.kind==='rest') tip='Descansa! Respira fundo e bebe um golinho de água 💧';
    typeText($('.tw',el),tip);
    left=s.kind==='reps'?0:s.secs; total=s.secs; lastBeep=-1;
    const isRun=s.kind==='run'; $('.gps',el).hidden=!isRun; $('.gps-status',el).hidden=!isRun; if(isRun) GPS.start(); GPS.setPaused(!isRun);
    $('[data-meter]',el).innerHTML = s.kind==='reps' ? `<div class="pl-reps">${s.reps}x</div>` :
      `<div class="pl-timer"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="${R}" fill="none" stroke="#eee" stroke-width="12"/><circle data-ring cx="66" cy="66" r="${R}" fill="none" stroke="${bc}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="num"><div><span data-t>${mmss(left)}</span><small>${s.kind==='rest'?'DESCANSO':isRun?'CORRENDO':'TEMPO'}</small></div></div></div>`;
    const nx=steps[i+1]; $('.pl-next',el).textContent=nx?`A seguir: ${nx.name}${nx.kind==='reps'?' · '+nx.reps+'x':' · '+mmss(nx.secs)}`:'Último passo! 💪';
    $('[data-next]',el).textContent = s.kind==='reps'?'Feito!':s.kind==='rest'?'Pular descanso':'Próximo';
    $('[data-next]',el).className = 'btn'+(s.kind==='reps'?' green':'');
    n.blocks.forEach((bb,bi)=>{ const before=steps.filter(x=>x.bi===bi).reduce((a,x)=>a+(steps.indexOf(x)<i?x.secs:0),0), tt=bb.steps.reduce((a,x)=>a+x.secs,0); $(`[data-seg="${bi}"]`,el).style.width=(before/tt*100)+'%'; });
  };
  const next=()=>{ const s=steps[i]; if(s.kind==='reps'){ kcal+=s.met*P.weight*s.secs/3600; elapsed+=0; }
    if(i>=steps.length-1){ finish(); return; } i++; SFX.go(); vib(30); show(); };
  const finish=()=>{ clearInterval(timer); GPS.stop(); paused=true;
    const stats={secs:Math.max(elapsed,60),kcal:Math.round(kcal),km:GPS.dist/1000,xp:n.xp};
    const res=recordActivity(stats,{node:n}); go('fim',{stats,res,nodeId:n.id},'fade'); };
  const timer=setInterval(()=>{ const now=performance.now(), dt=(now-lastT)/1000; lastT=now; if(paused||!started) return;
    const s=steps[i]; elapsed+=dt;
    if(s.kind!=='reps'){ left-=dt; kcal+=s.met*P.weight*dt/3600;
      const ring=$('[data-ring]',el); if(ring) ring.style.strokeDashoffset=C*(1-Math.max(0,left)/total);
      const tt=$('[data-t]',el); if(tt) tt.textContent=mmss(Math.ceil(left));
      const sec=Math.ceil(left); if(sec<=3&&sec>0&&sec!==lastBeep){ lastBeep=sec; SFX.beep(); }
      if(left<=0) next(); }
    else kcal+=0;
    if(n.hasRun){ $('[data-km]',el).textContent=fmtKm(GPS.dist); $('[data-kc]',el).textContent=Math.round(kcal);
      const runT=elapsed; $('[data-pace]',el).textContent=GPS.dist>50?mmss(runT/(GPS.dist/1000)):'--:--';
      const gs=$('.gps-status',el); gs.className='gps-status '+GPS.cls(); $('span',gs).textContent=GPS.label(); }
  },200);
  show();
  // contagem 3-2-1
  const co=$('.count-over',el); let c=3;
  const cd=setInterval(()=>{ c--; if(c>0){ co.innerHTML=`<span>${c}</span>`; SFX.beep(); } else if(c===0){ co.innerHTML=`<span style="font-size:72px">VAI!</span>`; SFX.go(); } else { clearInterval(cd); co.remove(); started=true; paused=false; lastT=performance.now(); } },800);
  SFX.beep();
  $('[data-next]',el).onclick=()=>{ if(!started) return; next(); };
  $('[data-pause]',el).onclick=e=>{ if(!started) return; paused=!paused; GPS.setPaused(paused||steps[i].kind!=='run'); e.currentTarget.innerHTML=paused?IC.play:IC.pause; SFX.tap(); toast(paused?'Treino pausado ⏸':'Bora continuar! ▶️'); };
  $('[data-x]',el).onclick=()=>{ const wasPaused=paused; paused=true; SFX.tap();
    openSheet(`<div class="sh-head" style="text-align:center"><div class="axo-slot" style="height:150px" ${axo({id:coachFor(steps[i].b.coach),anim:'sad',mood:'sad'},'full')}></div><h2>Vai parar agora?</h2><p>Se sair, o progresso deste treino não é salvo.</p></div>
      <div class="foot"><button class="btn" data-k>Continuar treinando</button><button class="btn link" style="color:var(--red)" data-q>Sair do treino</button></div>`,
      {mount:L=>{ $('[data-k]',L).onclick=()=>{ paused=wasPaused; closeSheet(); }; $('[data-q]',L).onclick=()=>{ clearInterval(timer); GPS.stop(); closeSheet(true); go('main',{tab:'home'},'back'); }; }}); };
  return ()=>{ clearInterval(timer); clearInterval(cd); GPS.stop(); };
};

/* =====================================================================
   COMEMORAÇÕES: fim de treino → acender ofensiva → turma volta
   ===================================================================== */
const CHEERS=['Você é imparável!','Mais um passo rumo à meta!','A turma tá orgulhosa de você!','Corpo agradece, mente também!','Isso é que é dedicação!'];
SCREENS.fim=(p,el)=>{ const {stats,res}=p; const P=st.profile;
  const cards=[['TOTAL DE XP','#ffc800',`${IC.bolt}${stats.xp}`],['TEMPO','#1cb0f6',mmss(stats.secs)],['KCAL','#ff9600',`${IC.flame(true)}${Math.round(stats.kcal)}`]];
  if(stats.km>0.01) cards.push(['DISTÂNCIA','#ff6fa3',`${fmtKm(stats.km*1000)} km`]);
  el.innerHTML=`<div class="celebrate"><div class="band"><div class="axo-slot" ${axo({id:P.partner,anim:'cheer',mood:'joy'},'tall')}></div></div>
    <div class="cel-title">${p.free?'Atividade concluída!':'Treino concluído!'}</div><div class="cel-sub">${CHEERS[Math.floor(Math.random()*CHEERS.length)]}</div>
    <div class="statcards">${cards.map(([t,k,v],i)=>`<div class="sc" style="--k:${k};--i:${i}"><small>${t}</small><b>${v}</b></div>`).join('')}</div></div>
    <div class="foot"><button class="btn" data-next>Receber XP</button></div>`;
  SFX.win(); vib([40,60,40]);
  setTimeout(()=>{ cards.forEach((_,i)=>setTimeout(()=>SFX.pop(),800+i*350)); },0);
  $('[data-next]',el).onclick=()=>{ SFX.ok(); afterFim(p,'fim'); };
};
function afterFim(p,from){
  const {res}=p;
  if(from==='fim' && res.first) return go('acender',p,'fade');
  if((from==='fim'||from==='ofensiva') && res.returned) return go('volta',p,'fade');
  go('main',{tab:p.free?'run':'home',justDone:p.nodeId},'fade');
}
SCREENS.acender=(p,el)=>{
  el.classList.add('night');
  el.innerHTML=`<div class="celebrate"><div class="fire-wrap off"><div class="burst"></div><div class="knob">${IC.flame(true)}</div></div>
    <div class="drag-arrow">⬆</div><div class="drag-hint">Arraste pra cima pra acender a sua ofensiva!</div></div><div class="foot" style="height:90px"></div>`;
  const fw=$('.fire-wrap',el), knob=$('.knob',el); let y0=null, dy=0, lit=false;
  const ignite=()=>{ if(lit) return; lit=true; fw.classList.remove('off'); knob.style.transition='transform .4s cubic-bezier(.2,1.6,.4,1)'; knob.style.transform='scale(1.15)'; SFX.fire(); vib([30,40,80]);
    const bs=$('.burst',fw); for(let k=0;k<18;k++){ const a=k/18*Math.PI*2, r=90+Math.random()*50; const d=document.createElement('i'); d.style.cssText=`--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px;background:${k%2?'#ffc800':'#ff9600'}`; bs.appendChild(d); }
    $('.drag-hint',el).textContent='Ofensiva acesa! 🔥'; $('.drag-arrow',el).style.visibility='hidden';
    setTimeout(()=>go('ofensiva',p,'fade'),1100); };
  fw.onpointerdown=e=>{ y0=e.clientY; fw.setPointerCapture(e.pointerId); knob.style.transition='none'; };
  fw.onpointermove=e=>{ if(y0===null||lit) return; dy=Math.min(0,e.clientY-y0); knob.style.transform=`translateY(${Math.max(-140,dy)}px)`; if(dy<-110) ignite(); };
  fw.onpointerup=()=>{ if(!lit){ knob.style.transition='transform .3s'; knob.style.transform=''; if(Math.abs(dy)<6) ignite(); } y0=null; dy=0; };
};
SCREENS.ofensiva=(p,el)=>{ const {res}=p, P=st.profile; const s=res.after, d=nowD(), start=addD(d,-d.getDay());
  el.classList.add('night');
  el.innerHTML=`<div class="celebrate"><div class="bubble down" style="max-width:300px;margin-bottom:6px"><span class="tw"></span></div>
    <div style="display:flex;align-items:flex-end;justify-content:center;height:170px"><div style="width:110px;height:130px">${IC.flame(true).replace('<svg','<svg style="width:100%;height:100%"')}</div><div class="axo-slot" style="width:150px;height:170px;margin-left:-30px" ${axo({id:P.partner,anim:'dance',mood:'joy'},'full')}></div></div>
    <div class="streak-num"><div>${res.before}</div><div>${s}</div></div><div class="streak-lbl">dia${s===1?'':'s'} de ofensiva</div>
    ${weekHTML(start)}<div class="goalbar">Meta: ${P.streakGoal} dias<div class="prog"><i style="width:${Math.min(100,res.before/P.streakGoal*100)}%"></i></div></div></div>
    <div class="foot"><button class="btn orange" data-next>Continuar</button></div>`;
  const num=$('.streak-num',el); setTimeout(()=>{ $$('div',num).forEach(x=>x.style.transform='translateY(-96px)'); $('.goalbar .prog i',el).style.width=Math.min(100,s/P.streakGoal*100)+'%'; SFX.ok(); },500);
  const msg = s===1?'Uma nova ofensiva! Treine nos seus dias pra ela crescer 🔥': s>=P.streakGoal?`META BATIDA! ${s} dias seguidos. Você é demais! 🏆`:`${s} dias seguidos! Faltam ${P.streakGoal-s} pra sua meta.`;
  if(s>=P.streakGoal && !st._goalPaid){ st.pearls+=35; st._goalPaid=true; save(); }
  setTimeout(()=>typeText($('.tw',el),msg),300);
  $('[data-next]',el).onclick=()=>{ SFX.ok(); afterFim(p,'ofensiva'); };
};
SCREENS.volta=(p,el)=>{ const id=p.res.returned, P=st.profile; const left=st.fled.length;
  el.style.background='linear-gradient(#fff1f6,#efe6fd)';
  el.innerHTML=`<div class="celebrate"><div class="axo-slot" style="width:100%;height:300px" ${axo([{id,anim:'cheer',mood:'joy',x:-0.9},{id:P.partner,anim:'dance',mood:'joy',x:0.9}],'tall')}></div>
    <div class="cel-title" style="color:var(--pink)">${cname(id)} voltou pra casa! 🎉</div>
    <div class="cel-sub">Seu treino convenceu ${PRO[id]} a voltar. ${left?`Faltam ${left} pra turma ficar completa!`:'A turma está completa de novo!'}</div></div>
    <div class="foot"><button class="btn" data-next>Que bom!</button></div>`;
  confetti($('.celebrate',el)); SFX.win();
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('main',{tab:'home',justDone:p.nodeId},'fade'); };
};
SCREENS.fuga=(p,el)=>{ const ids=p.ids, P=st.profile;
  el.style.background='linear-gradient(#93a6b5,#e3e9ee)';
  el.innerHTML=`<div class="celebrate"><div style="position:relative;width:100%;height:150px;overflow:hidden">${ids.map((id,i)=>`<div class="run-away" style="animation-delay:${i*0.5}s"><div class="axo-slot" style="width:150px;height:150px" ${axo({id,anim:'runaway',mood:'cry',ry:1.35},'full')}></div></div>`).join('')}</div>
    <div class="axo-slot" style="width:220px;height:230px" ${axo({id:P.partner,anim:'sad',mood:'sad'},'full')}></div>
    <div class="cel-title" style="color:#3c4b55">${ids.map(cname).join(' e ')} ${ids.length>1?'fugiram':'fugiu'} de casa! 😱</div>
    <div class="cel-sub" style="color:#56656e">Você faltou aos últimos treinos e a turma ficou triste. Treine hoje que eu te ajudo a trazer ${ids.length>1?'eles':PRO[ids[0]]} de volta!</div></div>
    <div class="foot"><button class="btn" data-next>Bora treinar!</button></div>`;
  SFX.sad();
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('main',{tab:'home'},'fade'); };
};
SCREENS.bau=(p,el)=>{ const n=allNodes().find(x=>x.id===p.nodeId); let taps=0; const prize=10+Math.floor(Math.random()*11);
  el.classList.add('chest-scene');
  el.innerHTML=`<div class="celebrate"><h2>BAÚ RARO</h2><div class="chest-box"><div class="rays"></div>${IC.chest}</div><div class="taps"><i></i><i></i><i></i></div><div class="drag-hint" data-h>Toque! Toque!</div></div><div class="foot"><button class="btn white" data-next hidden>Continuar</button></div>`;
  const box=$('.chest-box',el);
  box.onclick=()=>{ if(taps>=3) return; taps++; $$('.taps i',el)[taps-1].classList.add('on'); box.classList.remove('wob'); void box.offsetWidth; box.classList.add('wob'); SFX.pop(); vib(20);
    $('[data-h]',el).textContent=taps<2?'Toque! Toque!':taps<3?'Só mais uma!':'';
    if(taps===3){ setTimeout(()=>{ el.classList.add('epic'); box.classList.add('open'); SFX.win(); st.pearls+=prize; st.done[n.id]=todayK(); save();
      $('[data-h]',el).outerHTML=`<div class="reward">+${prize} pérolas 🫧</div>`; $('[data-next]',el).hidden=false; },350); } };
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('main',{tab:'home',justDone:n.id},'fade'); };
};
SCREENS.trofeu=(p,el)=>{ const n=allNodes().find(x=>x.id===p.nodeId); const u=plan.units[n.unit];
  st.done[n.id]=todayK(); st.pearls+=50; save();
  el.style.background=`linear-gradient(${u.color},${u.dark})`; el.style.color='#fff';
  el.innerHTML=`<div class="celebrate"><div class="chest-box open"><div class="rays"></div>${IC.trophy}</div>
    <div class="cel-title" style="color:#fff">Unidade ${u.idx+1} concluída!</div><div class="cel-sub" style="color:#fff;opacity:.9">"${u.title}" está no papo. +50 pérolas 🫧</div>
    <div class="axo-slot" style="width:100%;height:200px" ${axo(homeCrew().map((id,i,a)=>({id,anim:i%2?'dance':'cheer',mood:'joy',x:(i-(a.length-1)/2)*1.7})),'full')}></div></div>
    <div class="foot"><button class="btn white" data-next>Continuar</button></div>`;
  confetti($('.celebrate',el)); SFX.win();
  $('[data-next]',el).onclick=()=>{ SFX.ok(); go('main',{tab:'home',justDone:n.id},'fade'); };
};

/* =====================================================================
   ABA CORRER — corrida/caminhada livre com GPS e cronômetro
   ===================================================================== */
const RUN_MODES=[{id:'caminhada',e:'🚶',t:'Caminhada',s:'Ritmo confortável',anim:'march',met:3.8},{id:'trote',e:'🏃',t:'Trote leve',s:'Corridinha tranquila',anim:'run:0.7',met:7},{id:'corrida',e:'🔥',t:'Corrida',s:'Bora acelerar',anim:'run',met:9.8}];
function tabRun(v){
  const care=plan.care; let mode=care?'caminhada':'trote';
  v.innerHTML=`<div class="scroll"><div class="tab-title">Correr</div><div class="tab-sub">Caminhada ou corrida livre, cronometrada e medida pelo GPS do celular.</div>
    <div class="run-hero"><div class="axo-slot" ${axo({id:coachFor('turbo'),anim:'run:0.7',ry:0.9},'full',{oy:-0.1})}></div></div>
    <div class="pad" style="margin-top:14px">${optsHTML(RUN_MODES.map(m=>({v:m.id,e:m.e,t:m.t,s:care&&m.id!=='caminhada'?'Indisponível no Modo Cuidado':m.s})),mode)}
    <div class="tipbox">🐢 <span>Termine com 3–5 min de trote regenerativo bem leve. Ajuda a limpar o ácido lático e evita câimbras.</span></div><div style="height:20px"></div></div></div>
    <div class="foot line"><button class="btn blue" data-go>Iniciar</button></div>`;
  $$('.opt',v).forEach(b=>b.onclick=()=>{ if(care&&b.dataset.v!=='caminhada'){ toast('No Modo Cuidado, vamos de caminhada ❤️'); return; } mode=b.dataset.v; $$('.opt',v).forEach(x=>x.classList.toggle('sel',x===b)); const m=RUN_MODES.find(x=>x.id===mode); setAxo($('.run-hero .axo-slot',v),{id:coachFor('turbo'),anim:m.anim,ry:0.9},'full',{oy:-0.1}); SFX.pop(); });
  $('[data-go]',v).onclick=()=>{ SFX.ok(); go('livre',{mode},'up'); };
}
SCREENS.livre=({mode},el)=>{ const m=RUN_MODES.find(x=>x.id===mode), P=st.profile; let secs=0, paused=false, kcal=0, lastT=performance.now();
  GPS.reset(); GPS.start();
  el.innerHTML=`<div class="pl-top"><span style="font-weight:900;font-size:18px;white-space:nowrap">${m.e} ${m.t}</span><div class="gps-status" style="flex:1;justify-content:flex-end;text-align:right"><i></i><span></span></div></div>
    <div class="scroll"><div class="run-hero" style="margin-top:8px"><div class="axo-slot" ${axo({id:coachFor('turbo'),anim:m.anim,ry:0.9},'full',{oy:-0.1})}></div></div>
    <div class="run-big" data-t>0:00</div><small>TEMPO</small>
    <div class="pad"><div class="gps"><div><b data-km>0,00</b><span>km</span></div><div><b data-pace>--:--</b><span>ritmo /km</span></div><div><b data-kc>0</b><span>kcal</span></div></div>
    <p class="note" style="text-align:center">Mantenha o app aberto durante a atividade pra medir a distância.</p></div></div>
    <div class="foot"><div class="pl-ctrl"><button class="btn outline sq" data-pause>${IC.pause}</button><button class="btn red" data-end>Finalizar</button></div></div>`;
  const t=setInterval(()=>{ const now=performance.now(), dt=(now-lastT)/1000; lastT=now; const gs=$('.gps-status',el); gs.className='gps-status '+GPS.cls(); $('span',gs).textContent=GPS.label();
    if(paused) return; secs+=dt; kcal+=m.met*P.weight*dt/3600;
    $('[data-t]',el).textContent=mmss(secs); $('[data-km]',el).textContent=fmtKm(GPS.dist); $('[data-kc]',el).textContent=Math.round(kcal);
    $('[data-pace]',el).textContent=GPS.dist>50?mmss(secs/(GPS.dist/1000)):'--:--'; },250);
  $('[data-pause]',el).onclick=e=>{ paused=!paused; GPS.setPaused(paused); e.currentTarget.innerHTML=paused?IC.play:IC.pause; setAxo($('.axo-slot',el),{id:coachFor('turbo'),anim:paused?'idle':m.anim,ry:paused?0:0.9},'full',{oy:-0.1}); SFX.tap(); };
  $('[data-end]',el).onclick=()=>{ if(secs<10){ clearInterval(t); GPS.stop(); go('main',{tab:'run'},'back'); return; }
    clearInterval(t); GPS.stop(); const stats={secs,kcal,km:GPS.dist/1000,xp:Math.max(5,Math.round(secs/60)+5)}; const res=recordActivity(stats); go('fim',{stats,res,free:true},'fade'); };
  return ()=>{ clearInterval(t); GPS.stop(); };
};

/* =====================================================================
   ABA TURMA
   ===================================================================== */
function tabCrew(v){
  const mood=crewMood(), P=st.profile;
  v.innerHTML=`<div class="scroll" data-clip><div class="tab-title">Sua turma</div><div class="tab-sub">Felicidade da turma: ${'❤️'.repeat(happiness())}${'🤍'.repeat(5-happiness())}</div>
    <div class="crew-grid">${CREW_IDS.map(id=>{ const c=CREW[id], gone=st.fled.includes(id);
      const pill = id===P.partner?'<span class="pill p">Seu parceiro</span>':gone?'<span class="pill f">Fugiu de casa</span>':mood==='sad'?'<span class="pill s">Tristinho</span>':'<span class="pill h">Feliz em casa</span>';
      return `<button class="cc" data-id="${id}"><div class="pic" style="--cb:${c.color}44">${gone?'<div class="gone">🏃‍♂️💨</div>':`<div class="axo-slot" ${axo({id,anim:mood==='sad'?'sad':mood==='joy'?'happy':'idle',mood:mood==='sad'?'sad':mood==='joy'?'joy':'happy'},'full')}></div>`}</div>
        <div class="inf"><b>${c.name}</b><span>${c.role}</span>${pill}</div></button>`; }).join('')}</div></div>`;
  $$('.cc',v).forEach(b=>b.onclick=()=>{ SFX.tap(); crewSheet(b.dataset.id); });
}
function crewSheet(id){ const c=CREW[id], gone=st.fled.includes(id);
  const acts=[['wave','👋 Acenar'],['cheer','🎉 Comemorar'],['dance','💃 Dançar'],['squat','🏋️ Agachar'],['run','🏃 Correr'],['jack','⭐ Polichinelo'],['stretch','🧘 Alongar'],['pushup','💪 Flexão']];
  openSheet(`<div class="sh-head"><h2>${c.name}, ${c.title.toLowerCase()}</h2><p>${c.role}</p></div>
    <div class="scroll">${gone?`<div class="card" style="text-align:center"><div style="font-size:60px">🏃‍♂️💨</div><b style="font-weight:900;font-size:18px">${c.name} fugiu de casa</b><p class="note">Faça um treino pra ${PRO[id]} voltar!</p></div>`:
      `<div style="height:260px;border-radius:20px;background:${c.color}44;position:relative"><div class="axo-slot" style="position:absolute;inset:0" ${axo({id,anim:'wave'},'tall')}></div></div>
      <p style="font-weight:700;color:#666;margin:12px 2px">${c.bio}</p><div class="chips">${acts.map(([a,t])=>`<button class="chip" data-a="${a}">${t}</button>`).join('')}</div>`}<div style="height:12px"></div></div>
    <div class="foot line"><button class="btn outline" data-x>Fechar</button></div>`,
    {mount:L=>{ $('[data-x]',L).onclick=()=>closeSheet(); $$('[data-a]',L).forEach(b=>b.onclick=()=>{ const a=b.dataset.a; $$('[data-a]',L).forEach(x=>x.classList.toggle('sel',x===b)); SFX.pop(); const ex=a==='pushup'; setAxo($('.axo-slot',L),{id,anim:a,mood:a==='cheer'||a==='dance'?'joy':'happy',ry:ex?-1.2:0},ex?'low':'tall'); }); }});
}

/* =====================================================================
   ABA MISSÕES
   ===================================================================== */
function tabQuest(v){
  const h=hist(), k=todayK(), claimed=st.claimed[k]||[];
  const ms=[{id:'treino',t:'Complete 1 treino da trilha',target:1,val:h.path,r:10,ic:IC.dumbbell.replace(/#fff/g,'#ce82ff')},{id:'xp',t:'Ganhe 40 XP',target:40,val:h.xp,r:10,ic:IC.bolt},{id:'min',t:'Mexa-se por 20 minutos',target:20,val:h.mins,r:15,ic:IC.clock}];
  const wk=(()=>{ const d=nowD(), s=addD(d,-d.getDay()); let c=0; for(let i=0;i<7;i++) if(doneOn(keyOf(addD(s,i)))) c++; return c; })();
  v.innerHTML=`<div class="scroll" data-clip><div class="m-banner"><div><h3>Missões do dia</h3><p>Complete missões e ganhe pérolas pra turma!</p></div><div class="axo-slot" ${axo({id:st.profile.partner,anim:'happy'},'bust')}></div></div>
   <div class="sect"><div class="card">${ms.map(m=>{ const val=Math.min(m.target,m.val||0), full=val>=m.target, got=claimed.includes(m.id);
      return `<div class="mission"><div class="mi">${m.ic}</div><div style="flex:1;min-width:0"><b>${m.t}</b><div class="prog ${full?'full':''}"><i style="width:${Math.max(6,val/m.target*100)}%"></i></div><div class="cnt">${val} / ${m.target}</div></div>
        ${got?'<span class="pill h">✓ Pego</span>':full?`<button class="btn gold claim" data-claim="${m.id}" data-r="${m.r}">+${m.r} 🫧</button>`:`<span class="pill s">+${m.r} 🫧</span>`}</div>`; }).join('')}</div>
   <h3>Missão da semana</h3><div class="card"><div class="mission"><div class="mi">${IC.flame(true)}</div><div style="flex:1"><b>Treine ${st.profile.days.length} dias nesta semana</b><div class="prog ${wk>=st.profile.days.length?'full':''}"><i style="width:${Math.max(6,Math.min(1,wk/st.profile.days.length)*100)}%"></i></div><div class="cnt">${Math.min(wk,st.profile.days.length)} / ${st.profile.days.length}</div></div><span class="pill s">+40 🫧</span></div></div>
   <div style="height:24px"></div></div></div>`;
  $$('[data-claim]',v).forEach(b=>b.onclick=()=>{ (st.claimed[k]=st.claimed[k]||[]).push(b.dataset.claim); st.pearls+=+b.dataset.r; save(); SFX.win(); toast(`+${b.dataset.r} pérolas! 🫧`); renderTopbar(); tabQuest(v); });
}

/* =====================================================================
   ABA PERFIL
   ===================================================================== */
function tabMe(v){
  const P=st.profile, pl=plan; const tot=Object.values(st.history).reduce((a,h)=>({w:a.w+(h.workouts||0),km:a.km+(h.km||0),kcal:a.kcal+(h.kcal||0)}),{w:0,km:0,kcal:0});
  const since=st.startDate?parseK(st.startDate).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):'';
  v.innerHTML=`<div class="scroll" data-clip>
   <div class="prof-head"><div class="av" style="--pc:${CREW[P.partner].color}66"><div class="axo-slot" ${axo({id:P.partner,anim:'idle'},'head')}></div></div><div><h2>${esc(P.name)}</h2><p>No AxoGo desde ${since}</p><p>Parceiro: <b style="color:${CREW[P.partner].dark}">${cname(P.partner)}</b></p></div></div>
   <div class="sgrid"><div class="sbox">${IC.flame(true)}<div><b>${streak()}</b><span>Ofensiva</span></div></div><div class="sbox">${IC.bolt}<div><b>${st.xp}</b><span>Total de XP</span></div></div>
     <div class="sbox">${IC.dumbbell.replace(/#fff/g,'#ce82ff')}<div><b>${tot.w}</b><span>Treinos</span></div></div><div class="sbox">${IC.pin}<div><b>${tot.km.toFixed(1).replace('.',',')}</b><span>km</span></div></div></div>
   <div class="sect"><h3>Seu plano</h3><div class="card">
     <div class="rowi">Objetivo<span>${GOALS[P.goal]?.emoji} ${GOALS[P.goal]?.label}</span></div>
     <div class="rowi">Nível<span>${pl.levelName}</span></div>
     <div class="rowi">Dias de treino<span>${P.days.slice().sort().map(d=>DNL[d]).join(', ')}</span></div>
     <div class="rowi">Duração<span>${P.minutes} min</span></div>
     <div class="rowi">FC alvo<span>${pl.zone[0]}–${pl.zone[1]} bpm</span></div>
     <div class="rowi">Saúde<span>${pl.care?'<span class="badge care">❤️ Modo Cuidado</span>':pl.caution?'<span class="badge care">⚠️ Atenção extra</span>':'<span class="badge ok">✓ Liberado</span>'}</span></div>
     ${pl.joints.length?`<div class="rowi">Adaptado para<span>${pl.joints.map(j=>JOINTS.find(x=>x.id===j).label).join(', ')}</span></div>`:''}
     <button class="btn outline sm" style="margin-top:12px" data-redo>Refazer o questionário</button></div>
   <h3>Configurações</h3><div class="card">
     <div class="rowi">Lembrete diário<input type="time" class="field" style="width:120px;height:42px;font-size:16px" value="${P.reminder}" data-rem></div>
     <div class="rowi">Sons<button class="switch ${st.sound?'on':''}" data-snd aria-label="Sons"></button></div>
     <div class="rowi">Meta de ofensiva<span>${P.streakGoal} dias</span></div></div>
   <h3>Demonstração</h3><div class="card demo-box"><p style="font-weight:700;font-size:14px;color:#7a6500">Simule dias passando pra ver a turma ficar feliz, triste ou fugir de casa.</p><button class="btn gold sm" data-demo>🧪 Abrir modo demo</button></div>
   <div style="height:28px"></div></div></div>`;
  $('[data-redo]',v).onclick=()=>{ SFX.tap(); lastProg=0; go('objetivo',{},'fwd'); };
  $('[data-rem]',v).onchange=e=>{ P.reminder=e.target.value||P.reminder; save(); toast(`Lembrete às ${P.reminder} ⏰`); };
  $('[data-snd]',v).onclick=e=>{ st.sound=!st.sound; e.currentTarget.classList.toggle('on',st.sound); save(); SFX.tap(); };
  $('[data-demo]',v).onclick=()=>{ SFX.tap(); demoSheet(); };
}

/* =====================================================================
   INÍCIO
   ===================================================================== */
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&st.onboarded&&cur?.name==='main'){ const nw=syncDay(); if(nw.length) go('fuga',{ids:nw},'fade'); } });
go('splash',{},'none');
window.AxoGo={st,stage,go,plan:()=>plan};
