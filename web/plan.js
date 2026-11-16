// =====================================================================
// AxoGo — gerador de plano de treino (regras simples e seguras)
// =====================================================================
export const LEVELS = ['Começando do zero','Iniciante','Intermediário','Avançado'];
export const GOALS = {
  peso:{label:'Emagrecer com saúde', emoji:'🔥'},
  '5k':{label:'Correr meus primeiros 5 km', emoji:'🏃'},
  forca:{label:'Ficar mais forte', emoji:'💪'},
  condicionamento:{label:'Ter mais fôlego', emoji:'❤️'},
  estresse:{label:'Diminuir o estresse', emoji:'😌'},
  habito:{label:'Criar o hábito de me mexer', emoji:'🌱'},
};
export const PARQ = [
  {id:'q1', text:'Algum médico já disse que você tem problema no coração ou pressão alta?', care:true},
  {id:'q2', text:'Você sente dor no peito em repouso, no dia a dia ou quando se exercita?', care:true},
  {id:'q3', text:'Você perdeu o equilíbrio por tontura ou desmaiou nos últimos 12 meses?', care:true},
  {id:'q4', text:'Você tem outra doença crônica diagnosticada (diabetes, asma, problema nos rins…)?', caution:true},
  {id:'q5', text:'Você toma remédio de uso contínuo para alguma condição crônica?', caution:true},
  {id:'q6', text:'Você tem problema em ossos, articulações ou músculos que pode piorar com exercício?', joints:true},
  {id:'q7', text:'Algum médico já disse que você só deve se exercitar com supervisão?', care:true},
  {id:'q8', text:'Você está grávida ou teve bebê há menos de 6 meses?', care:true, onlyIf:p=>p.sex!=='m'},
];
export const JOINTS = [
  {id:'joelho',label:'Joelhos',emoji:'🦵'},{id:'costas',label:'Costas / lombar',emoji:'🔙'},
  {id:'ombro',label:'Ombros',emoji:'💪'},{id:'tornozelo',label:'Tornozelos / pés',emoji:'🦶'},
  {id:'quadril',label:'Quadril',emoji:'🍑'},{id:'punho',label:'Punhos',emoji:'✋'},
];

// ---------- biblioteca de exercícios (quem ensina, animação, dica) ----------
export const EX = {
  mobilidade:{name:'Mobilidade articular', anim:'stretch', met:2.5, tip:'Gire pescoço, ombros, quadril e tornozelos devagar. Acorda as articulações!'},
  marcha:{name:'Marcha estacionária', anim:'march', met:3.8, tip:'Suba os joelhos e balance os braços no ritmo. Vai esquentando!'},
  bracos:{name:'Abrir e fechar os braços', anim:'breathe', met:2.5, tip:'Braços pra cima inspirando, pra baixo soltando o ar.'},
  agach_leve:{name:'Agachamento leve', anim:'squat', met:4, tip:'Só metade da descida, pra preparar as pernas.'},
  calcanhar:{name:'Elevação de calcanhar', anim:'tiptoe', met:3, tip:'Suba na ponta dos pés e desça devagar. Ótimo pra panturrilha e tornozelo.'},
  polichinelo:{name:'Polichinelo', anim:'jack', met:8, tip:'Abra pernas e braços juntos. Aterrisse macio, na ponta dos pés.'},
  marcha_alta:{name:'Marcha alta', anim:'march', met:5, tip:'Joelhos na altura do quadril, sem impacto. Puxa o fôlego sem pular!'},
  agachamento:{name:'Agachamento', anim:'squat', met:5, tip:'Pés na largura do quadril, peito aberto e joelhos na direção dos pés.'},
  agach_parcial:{name:'Agachamento parcial', anim:'squat', met:4.5, tip:'Desça só até onde for confortável pro joelho. Sem dor!'},
  flexao_parede:{name:'Flexão na parede', anim:'pushup', met:3.8, tip:'Mãos na parede na altura do peito. Corpo reto como uma tábua.', ry:-1.2, frame:'low'},
  flexao_joelho:{name:'Flexão com joelhos', anim:'pushup', met:4.5, tip:'Joelhos no chão, quadril alinhado. Desça o peito devagar.', ry:-1.2, frame:'low'},
  flexao:{name:'Flexão', anim:'pushup', met:6, tip:'Mãos abaixo dos ombros e abdômen firme. Desça controlando!', ry:-1.2, frame:'low'},
  abd_pe:{name:'Abdominal em pé', anim:'kneeup', met:4.5, tip:'Leve o joelho até o cotovelo contraindo a barriga. Protege a lombar.'},
  abdominal:{name:'Abdominal remador', anim:'kneeup', met:5, tip:'Contraia o abdômen e solte o ar ao subir. Sem puxar o pescoço.'},
  prancha:{name:'Prancha', anim:'plank', met:4, tip:'Cotovelos abaixo dos ombros, quadril alinhado. Respire!', ry:-1.2, frame:'low'},
  afundo:{name:'Afundo alternado', anim:'lunge', met:5, tip:'Passo largo, desça até os dois joelhos ficarem em 90°.'},
  agach_iso:{name:'Agachamento isométrico', anim:'wallsit', met:4, tip:'Fique paradinho na posição de cadeira. Costas retas!'},
  caminhada:{name:'Caminhada', anim:'march', met:3.5, tip:'Passos firmes e postura alta. Respire pelo nariz.', run:true},
  caminhada_rapida:{name:'Caminhada rápida', anim:'march', met:4.3, tip:'Acelere o passo como se estivesse atrasado pro ônibus!', run:true},
  caminhada_leve:{name:'Caminhada leve', anim:'march', met:3, tip:'Ritmo tranquilo: você deve conseguir conversar e até cantar.', run:true},
  trote:{name:'Trote leve', anim:'run:0.7', met:7, tip:'Corridinha bem leve, passos curtos. Se cansar, caminhe — tudo bem!', run:true},
  corrida_leve:{name:'Corrida leve', anim:'run:0.85', met:8, tip:'Ritmo confortável: fôlego pra falar frases curtas.', run:true},
  corrida:{name:'Corrida', anim:'run', met:9.8, tip:'Braços soltos, passadas leves e olhar pra frente.', run:true},
  tiro:{name:'Tiro', anim:'run:1.3', met:11, tip:'Acelera forte por poucos segundos! Depois, recupera.', run:true},
  trote_regen:{name:'Trote regenerativo', anim:'run:0.55', met:6, run:true,
    tip:'Bem levinho, dá pra conversar. Isso acelera a remoção do ácido lático e diminui câimbras e dor amanhã.'},
  caminhada_regen:{name:'Caminhada regenerativa', anim:'march', met:3, run:true,
    tip:'Bem devagar, soltando o corpo. Ajuda a limpar o ácido lático e evita câimbras.'},
  along_pant:{name:'Alongar panturrilha', anim:'calf', met:2.3, tip:'Perna de trás esticada, calcanhar no chão. Segure sem balançar.'},
  along_post:{name:'Alongar posterior da coxa', anim:'fold', met:2.3, tip:'Incline o tronco com as costas retas até sentir a parte de trás da coxa.'},
  along_quad:{name:'Alongar quadríceps', anim:'quad', met:2.3, tip:'Segure o pé atrás, joelhos juntinhos. Apoie numa parede se precisar.'},
  along_omb:{name:'Alongar ombros e peito', anim:'shoulder', met:2.3, tip:'Cruze o braço na frente do peito e puxe de leve.'},
  along_lat:{name:'Alongamento lateral', anim:'stretch', met:2.3, tip:'Braços pra cima e incline pra cada lado, respirando fundo.'},
  respiracao:{name:'Respiração profunda', anim:'breathe', met:1.5, tip:'Inspire em 4 tempos, solte em 6. Seu coração agradece.'},
  descanso:{name:'Descanso', anim:'breathe', met:1.5, tip:'Respira! Beba um golinho de água se precisar.'},
};

// ---------- utilidades ----------
export const bmiOf = p => p.weight / ((p.height/100)**2);
export function bmiInfo(b){
  if (b<18.5) return {label:'abaixo do ideal', color:'#1cb0f6', pos:Math.max(0,(b-14)/22)};
  if (b<25) return {label:'faixa saudável', color:'#58cc02', pos:(b-14)/22};
  if (b<30) return {label:'um pouco acima', color:'#ffc800', pos:(b-14)/22};
  return {label:'acima — priorizaremos baixo impacto', color:'#ff9600', pos:Math.min(1,(b-14)/22)};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r15 = s => Math.max(15, Math.round(s/15)*15);

export function healthFlags(p){
  const q=p.parq||{}; const list=PARQ.filter(x=>!x.onlyIf||x.onlyIf(p));
  const care=list.some(x=>x.care&&q[x.id]); const caution=list.some(x=>x.caution&&q[x.id]);
  return {care, caution, joints:q.q6?(p.joints||[]):[]};
}

export function genPlan(p){
  const {care,caution,joints}=healthFlags(p);
  const bmi=bmiOf(p), age=p.age;
  const knee=joints.includes('joelho'), back=joints.includes('costas'), shoulder=joints.includes('ombro')||joints.includes('punho');
  const lowImpact = care || bmi>=30 || age>=65 || knee || joints.includes('tornozelo') || joints.includes('quadril');
  let L = p.level; if (care) L=Math.min(L,1); if (age>=65) L=Math.min(L,2);
  let R = care ? 0 : p.run;
  const hrMax = Math.round(208-0.7*age);
  const pct = care?[50,60]:caution?[55,65]:[[60,70],[60,75],[65,80],[70,85]][L];
  const zone = pct.map(x=>Math.round(hrMax*x/100)), regen=[50,60].map(x=>Math.round(hrMax*x/100));
  const scale = (care?0.65:caution?0.8:1)*(age>=60?0.85:1);
  const days=[...p.days].sort(), n=days.length, total=p.minutes;
  const pattern = {
    '5k':['corrida','forca','corrida','corrida','forca','corrida'],
    forca:['forca','corrida','forca','forca','corrida','forca'],
    peso:['corrida','forca','corrida','forca','corrida','forca'],
  }[p.goal] || ['forca','corrida','forca','corrida','forca','corrida'];
  const ctx={p,L,R,care,caution,knee,back,shoulder,lowImpact,scale,total,joints};

  const UNIT=[
    {title:'Despertar do corpo', color:'#ff6fa3', dark:'#e0508a', coach:'rex'},
    {title:'Ganhando ritmo', color:'#1cb0f6', dark:'#1899d6', coach:'turbo'},
    {title:'Mais forte a cada dia', color:'#ce82ff', dark:'#a568cc', coach:'lua'},
    {title:'Semana leve: recuperar e evoluir', color:'#58cc02', dark:'#58a700', coach:'sol'},
  ];
  const units = UNIT.map((u,w)=>{
    const nodes=[]; let k=0;
    for (let i=0;i<n;i++){
      let type=pattern[i%pattern.length]; if (care && type==='corrida') type='caminhada';
      const last = i===n-1 && w<3;
      nodes.push(session(type,w,i,ctx,{challenge:last}));
      if (i===1) nodes.push({id:`u${w}c`, kind:'chest', title:'Baú surpresa', sub:'Abra pra ganhar pérolas'});
      if (i===Math.floor((n-1)/2) && n>=3) nodes.push(session('descanso',w,99,ctx,{}));
    }
    nodes.push({id:`u${w}t`, kind:'trophy', title:`Fim da unidade ${w+1}`, sub:'Comemore com a turma!'});
    nodes.forEach((nd,j)=>{ nd.unit=w; if(!nd.id) nd.id=`u${w}n${j}`; });
    return {...u, idx:w, nodes, label:`SEÇÃO 1, UNIDADE ${w+1}`};
  });
  // números do resumo
  const sess = units[0].nodes.filter(x=>x.kind==='workout');
  const weekKcal = Math.round(sess.reduce((a,s)=>a+s.kcal,0));
  const weekMin = [0,1,2,3].map(w=>units[w].nodes.filter(x=>x.kind==='workout').reduce((a,s)=>a+s.minutes,0));
  let projection;
  if (p.goal==='5k') projection = R>=3 ? 'Baixar seu tempo nos 5 km' : `Correr 5 km sem parar em ~${[10,8,6,4][R]} semanas`;
  else if (p.goal==='peso') projection = `Gastar ~${weekKcal} kcal por semana só nos treinos`;
  else if (p.goal==='forca') projection = 'Fazer +30% de repetições em 4 semanas';
  else if (p.goal==='condicionamento') projection = 'Subir escadas sem perder o fôlego em ~4 semanas';
  else if (p.goal==='estresse') projection = `${n} pausas ativas por semana pra desacelerar a mente`;
  else projection = `Treinar ${n}x por semana sem falhar`;
  return {care,caution,joints,lowImpact,L,R,levelName:LEVELS[L],hrMax,zone,regen,pct,bmi,units,weekMin,weekKcal,projection,days,n,total};
}

function stepOf(key,secs,ctx,extra={}){ const e=EX[key]; return {ex:key,name:e.name,anim:e.anim,tip:e.tip,met:e.met,kind:e.run?'run':'time',secs:r15(secs),...extra}; }
function repsOf(key,reps,ctx){ const e=EX[key]; return {ex:key,name:e.name,anim:e.anim,tip:e.tip,met:e.met,kind:'reps',reps,secs:reps*3}; }

function session(type,w,i,ctx,{challenge}){
  const {p,L,R,care,caution,knee,back,shoulder,lowImpact,scale,total}=ctx;
  const wk=[1,1.12,1.25,0.8][w];
  const num = i+1+w*10;
  if (type==='descanso'){
    const m=Math.min(total,15);
    const blocks=[
      {key:'main', title:'CAMINHADA LEVE', coach:'sol', steps:[stepOf('caminhada_leve',(m-5)*60,ctx)]},
      {key:'stretch', title:'MOBILIDADE E ALONGAMENTO', coach:'sol', steps:[stepOf('mobilidade',90,ctx),stepOf('along_post',45,ctx),stepOf('along_lat',45,ctx),stepOf('respiracao',120,ctx)]},
    ];
    return finish({id:`u${w}r`, kind:'workout', type, title:'Descanso ativo', sub:'Caminhada leve + mobilidade', icon:'leaf', blocks, xpBonus:-10},ctx);
  }
  const warm=clamp(Math.round(total*0.18),3,7), cool=clamp(Math.round(total*0.15),3,6), str=clamp(Math.round(total*0.15),3,6);
  const main=Math.max(5,total-warm-cool-str)*60;
  // aquecimento
  const ws=warm*60;
  const warmSteps=[stepOf('mobilidade',ws*0.25,ctx),
    ...(lowImpact||L===0 ? [stepOf('marcha',ws*0.4,ctx)] : [stepOf('marcha',ws*0.25,ctx),stepOf('polichinelo',ws*0.15,ctx)]),
    stepOf('bracos',ws*0.2,ctx), knee?stepOf('calcanhar',ws*0.15,ctx):stepOf('agach_leve',ws*0.15,ctx)];
  let mainSteps=[], mainTitle, mainCoach, sub, icon, title;
  if (type==='forca'){
    mainCoach='lua'; icon='dumbbell'; mainTitle='TREINO DE FORÇA';
    const reps=Math.round([8,10,12,15][L]*wk*scale);
    const plank=r15([15,20,30,40][L]*wk*scale);
    const pick=[
      knee?'agach_parcial':'agachamento',
      shoulder||L===0?'flexao_parede':L===1?'flexao_joelho':'flexao',
      back||L<2?'abd_pe':'abdominal',
      knee?'calcanhar':(L===0?'agach_iso':'afundo'),
      shoulder?'agach_iso':'prancha',
      lowImpact?'marcha_alta':'polichinelo',
    ];
    const nEx = main<=360?4:main<=720?5:6;
    const circuit=pick.slice(0,nEx).map(k=>{
      const e=EX[k];
      if (k==='prancha'||k==='agach_iso') return stepOf(k,plank,ctx);
      if (k==='polichinelo'||k==='marcha_alta') return stepOf(k,[30,30,40,45][L],ctx);
      return repsOf(k,(k==='afundo'?Math.round(reps*0.8):reps),ctx);
    });
    const restS=[45,40,30,30][L]+(care?15:0);
    const roundT=circuit.reduce((a,s)=>a+s.secs+5,0);
    let rounds=clamp(Math.floor(main/(roundT+restS)),1,5); if(challenge) rounds=Math.min(rounds+1,5);
    for (let r=0;r<rounds;r++){ circuit.forEach(s=>mainSteps.push({...s,round:r+1,rounds})); if(r<rounds-1) mainSteps.push({...stepOf('descanso',restS,ctx),kind:'rest',round:r+1,rounds}); }
    title=`Força ${Math.ceil((i+1)/2)}`; sub=pick.slice(0,3).map(k=>EX[k].name.split(' ')[0]).join(', ').replace(/, ([^,]*)$/,' e $1');
  } else {
    mainCoach='turbo'; mainTitle = type==='caminhada'?'CAMINHADA':'CORRIDA';
    icon = (type==='caminhada'||R===0)?'walk':'shoe';
    if (type==='caminhada'){
      const blocks=Math.max(1,Math.floor(main/300));
      for(let b=0;b<blocks;b++){ mainSteps.push(stepOf('caminhada',180,ctx)); mainSteps.push(stepOf(care?'caminhada_leve':'caminhada_rapida',120,ctx)); }
      title='Caminhada'; sub = care?'Ritmo leve e seguro':'Caminhada com variação de ritmo';
    } else if (R===0){
      const jog=r15((30+w*15)*scale), pair=jog+90, nn=Math.max(2,Math.floor(main/pair));
      for(let b=0;b<nn;b++){ mainSteps.push(stepOf('caminhada_rapida',90,ctx)); mainSteps.push(stepOf('trote',jog,ctx)); }
      title='Caminhada + trote'; sub=`${nn}× trote de ${jog}s`;
    } else if (R===1){
      const run=r15(60*wk), pair=run+90, nn=Math.max(2,Math.floor(main/pair));
      for(let b=0;b<nn;b++){ mainSteps.push(stepOf('corrida_leve',run,ctx)); mainSteps.push(stepOf('caminhada',90,ctx)); }
      title='Corrida intervalada'; sub=`${nn}× ${run>=60?Math.round(run/60)+' min':run+'s'} correndo`;
    } else if (R===2){
      const run=r15(180*wk), pair=run+60, nn=Math.max(1,Math.floor(main/pair));
      for(let b=0;b<nn;b++){ mainSteps.push(stepOf('corrida',run,ctx)); mainSteps.push(stepOf('caminhada',60,ctx)); }
      title='Corrida em blocos'; sub=`${nn}× ${Math.round(run/60)} min correndo`;
    } else {
      const strides = caution?0:4, cont=main-strides*60;
      mainSteps.push(stepOf('corrida',cont,ctx));
      for(let b=0;b<strides;b++){ mainSteps.push(stepOf('tiro',20,ctx)); mainSteps.push(stepOf('caminhada',40,ctx)); }
      title='Corrida contínua'; sub=`${Math.round(cont/60)} min + ${strides} tiros`;
    }
    if (challenge) mainSteps.push(stepOf(type==='caminhada'||R===0?'caminhada_rapida':'corrida',120,ctx,{bonus:true}));
  }
  if (challenge){ title='Desafio da semana'; icon='star'; }
  const coolKey = (R===0||care) ? 'caminhada_regen':'trote_regen';
  const ss=str*60;
  const blocks=[
    {key:'warm', title:'AQUECIMENTO', coach:'sol', steps:warmSteps},
    {key:'main', title:mainTitle, coach:mainCoach, steps:mainSteps},
    {key:'cool', title: coolKey==='trote_regen'?'TROTE REGENERATIVO':'CAMINHADA REGENERATIVA', coach:'turbo', steps:[stepOf(coolKey,cool*60,ctx)]},
    {key:'stretch', title:'ALONGAMENTO', coach:'sol', steps:[
      stepOf('along_pant',ss*0.2,ctx), stepOf('along_post',ss*0.22,ctx), stepOf('along_quad',ss*0.2,ctx),
      stepOf('along_omb',ss*0.18,ctx), stepOf('respiracao',ss*0.2,ctx)]},
  ];
  return finish({id:`u${w}s${i}`, kind:'workout', type, title, sub, icon, blocks, challenge, xpBonus:challenge?10:0},ctx);
}
function finish(s,ctx){
  const secs=s.blocks.reduce((a,b)=>a+b.steps.reduce((x,st)=>x+st.secs,0),0);
  s.minutes=Math.max(5,Math.round(secs/60));
  s.kcal=Math.round(s.blocks.reduce((a,b)=>a+b.steps.reduce((x,st)=>x+st.met*ctx.p.weight*st.secs/3600,0),0));
  s.xp=10+s.minutes+(s.xpBonus||0);
  s.hasRun=s.blocks.some(b=>b.steps.some(st=>st.kind==='run'));
  return s;
}
