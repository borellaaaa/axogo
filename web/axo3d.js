import * as THREE from './vendor/three.module.min.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';
/* =========================================================
   ESTILO: toon (2 tons) + contorno grosso (inverted hull)
   ========================================================= */
const INK = '#2b201b';
const OUTLINE_W = 0.028;

const gradTex = (() => {
  const d = new Uint8Array([100,100,100,255, 200,200,200,255, 255,255,255,255, 255,255,255,255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();

const matCache = new Map();
function toonMat(c){ const k='t'+c; if(!matCache.has(k)) matCache.set(k,new THREE.MeshToonMaterial({color:c,gradientMap:gradTex})); return matCache.get(k); }
function flatMat(c){ const k='f'+c; if(!matCache.has(k)) matCache.set(k,new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide})); return matCache.get(k); }
function outlineMat(w=OUTLINE_W){
  const k='o'+w; if(matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshBasicMaterial({color:INK, side:THREE.BackSide});
  m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${w.toFixed(4)};`); };
  m.customProgramCacheKey = () => 'outline'+w;
  matCache.set(k,m); return m;
}
// normais suavizadas só para o contorno (evita rachaduras em quinas)
function smoothForOutline(geo){
  let g = geo.clone();
  for (const a of Object.keys(g.attributes)) if (a !== 'position') g.deleteAttribute(a);
  g = mergeVertices(g, 1e-4); g.computeVertexNormals(); return g;
}
// peça = malha + contorno, dentro de um Group (o Group é o que se anima)
function part(geo, color, {outline=true, flat=false, w}={}){
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, flat ? flatMat(color) : toonMat(color)));
  if (outline) g.add(new THREE.Mesh(smoothForOutline(geo), outlineMat(w)));
  return g;
}
const ell  = (rx,ry,rz,ws=40,hs=28) => new THREE.SphereGeometry(1,ws,hs).scale(rx,ry,rz);
const caps = (r,len) => new THREE.CapsuleGeometry(r,len,8,20);
const cyl  = (r,h) => new THREE.CylinderGeometry(r,r,h,32);

/* =========================================================
   PROPORÇÕES BASE (iguais para os 4)
   ========================================================= */
const A=0.8, B=0.62, C=0.62;            // raios da cabeça (x, y, z)
const torsoCurve = new THREE.SplineCurve(
  [[0,0.30],[0.2,0.32],[0.33,0.39],[0.41,0.51],[0.43,0.66],[0.40,0.82],[0.34,0.97],[0.27,1.09],[0.17,1.19],[0,1.24]]
  .map(([r,y]) => new THREE.Vector2(r,y)));
const torsoPts = torsoCurve.getPoints(60);
const TZ = 0.86; // achatamento frente/trás do corpo
function rT(y){
  for (let i=0;i<torsoPts.length-1;i++){ const a=torsoPts[i], b=torsoPts[i+1];
    if (y>=a.y && y<=b.y){ const t=(y-a.y)/((b.y-a.y)||1); return a.x+(b.x-a.x)*t; } }
  return 0;
}
// casca de roupa que acompanha o corpo (jaqueta, regata, shorts…)
function shell(y0,y1,off,th,color,{closeBottom=false}={}){
  const pts=[];
  pts.push(closeBottom ? new THREE.Vector2(0.001,y0-off) : new THREE.Vector2(Math.max(rT(y0)+off-th,0.001),y0));
  const n=28; for(let i=0;i<=n;i++){ const y=y0+(y1-y0)*i/n; pts.push(new THREE.Vector2(rT(y)+off,y)); }
  pts.push(new THREE.Vector2(Math.max(rT(y1)+off-th,0.001),y1));
  return part(new THREE.LatheGeometry(pts,56,Math.PI,Math.PI*2).scale(1,1,TZ), color);
}
// casca ABERTA na frente (jaqueta): sólido com borda, abertura varia com a altura
function openShell(y0,y1,off,color,gapFn){
  const ny=30, na=64, depth=0.08, P=[], I=[];
  const pt=(y,th,o)=>{ const r=Math.max(rT(y)+o,0.01); return [Math.sin(th)*r, y, Math.cos(th)*r*TZ]; };
  const id=(i,j)=>i*(na+1)+j;
  for(let i=0;i<=ny;i++){ const y=y0+(y1-y0)*i/ny, g=gapFn(y);
    for(let j=0;j<=na;j++){ const th=g+(Math.PI*2-2*g)*j/na; P.push(...pt(y,th,off)); } }
  for(let i=0;i<ny;i++) for(let j=0;j<na;j++){ const a=id(i,j),b=id(i,j+1),c=id(i+1,j),d=id(i+1,j+1); I.push(a,b,c, b,d,c); }
  // bordas: duplica vértices p/ manter a quina marcada
  const edge=(list)=>{ for(let k=0;k<list.length-1;k++){ const [pi,pj]=list[k],[qi,qj]=list[k+1];
      const yp=y0+(y1-y0)*pi/ny, yq=y0+(y1-y0)*qi/ny, gp=gapFn(yp), gq=gapFn(yq);
      const tp=gp+(Math.PI*2-2*gp)*pj/na, tq=gq+(Math.PI*2-2*gq)*qj/na, n=P.length/3;
      P.push(...pt(yp,tp,off),...pt(yq,tq,off),...pt(yp,tp,off-depth),...pt(yq,tq,off-depth));
      I.push(n,n+1,n+2, n+2,n+1,n+3); } };
  const rng=(n)=>[...Array(n+1).keys()];
  edge(rng(na).map(j=>[0,j])); edge(rng(ny).map(i=>[i,na]));
  edge(rng(na).reverse().map(j=>[ny,j])); edge(rng(ny).reverse().map(i=>[i,0]));
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setIndex(I); g.computeVertexNormals();
  return part(g,color);
}
// posiciona e orienta algo sobre a superfície do corpo (th = ângulo a partir da frente)
function onTorso(obj,th,y,off=0){
  const r=rT(y)+off, dr=(rT(y+0.01)-rT(y-0.01))/0.02;
  const tx=new THREE.Vector3(Math.cos(th),0,-Math.sin(th)*TZ).normalize();
  let ty=new THREE.Vector3(Math.sin(th)*dr,1,Math.cos(th)*dr*TZ).normalize();
  const n=new THREE.Vector3().crossVectors(tx,ty).normalize(); ty=new THREE.Vector3().crossVectors(n,tx);
  obj.position.set(Math.sin(th)*r,y,Math.cos(th)*r*TZ);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tx,ty,n));
  return obj;
}
// posiciona e orienta algo sobre a superfície da cabeça (coord. locais da cabeça)
function onHead(obj,x,y,lift=0){
  const z = C*Math.sqrt(Math.max(0,1-(x/A)**2-(y/B)**2));
  const n = new THREE.Vector3(x/(A*A), y/(B*B), z/(C*C)).normalize();
  obj.position.set(x,y,z).addScaledVector(n,lift);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), n);
  return obj;
}
function frontZ(y,off=0,x=0){ const r=rT(y)+off; return r*TZ*Math.sqrt(Math.max(0,1-(x/r)**2)); }

/* =========================================================
   PARTES DO AXOLOTE
   ========================================================= */
function gill(L,W,dir,v){
  const g = new THREE.Group();
  const add=(geo,x,y,z,col=v.gill,opt)=>{ const p=part(geo,col,opt); p.position.set(x*dir,y,z); g.add(p); return p; };
  add(ell(L*0.5,W*0.36,0.055), L*0.5, W*0.1, 0);
  [0.42,0.66,0.88].forEach(t => add(ell(W*0.3,W*0.27,0.05), L*t, -W*0.17, 0));
  const s = part(ell(L*0.3,W*0.11,0.012), v.stripe, {outline:false});
  s.position.set(L*0.56*dir, W*0.04, 0.05); s.rotation.z = -0.06*dir; g.add(s);
  return g;
}

function eyesCute(face,{size=1,sparkle=false}={}){
  return [-1,1].map(side=>{
    const g=new THREE.Group(); onHead(g,0.3*side,0.03);
    g.add(part(ell(0.068*size,0.088*size,0.03),INK,{outline:false,flat:true}));
    const h=part(ell(0.025*size,0.025*size,0.01),'#ffffff',{outline:false,flat:true}); h.position.set(0.02*size,0.03*size,0.026); g.add(h);
    if (sparkle){ const h2=part(ell(0.012*size,0.012*size,0.01),'#ffffff',{outline:false,flat:true}); h2.position.set(-0.022*size,-0.03*size,0.026); g.add(h2); }
    face.add(g); return g;
  });
}
function eyesHappy(face){
  return [-1,1].map(side=>{
    const g=new THREE.Group(); onHead(g,0.3*side,0.0,0.005);
    g.add(part(new THREE.TorusGeometry(0.06,0.018,10,24,Math.PI),INK,{outline:false,flat:true}));
    [-1,1].forEach(s=>{ const c=part(ell(0.018,0.018,0.018),INK,{outline:false,flat:true}); c.position.x=0.06*s; g.add(c); });
    face.add(g); return g;
  });
}
function smile(face,{y=-0.17,r=0.075}={}){
  const g=new THREE.Group(); onHead(g,0,y,0.004);
  g.add(part(new THREE.TorusGeometry(r,0.017,10,28,Math.PI).rotateZ(Math.PI),INK,{outline:false,flat:true}));
  [-1,1].forEach(s=>{ const c=part(ell(0.017,0.017,0.017),INK,{outline:false,flat:true}); c.position.x=r*s; g.add(c); });
  face.add(g); return g;
}
function mouthOpen(face,{y=-0.15,tongue='#ff7b8a'}={}){
  const g=new THREE.Group(); onHead(g,0,y,0.006);
  g.add(part(new THREE.CircleGeometry(0.085,28,Math.PI,Math.PI),'#4a2323',{outline:false,flat:true}));
  const ring=part(new THREE.TorusGeometry(0.085,0.014,8,28,Math.PI).rotateZ(Math.PI),INK,{outline:false,flat:true}); g.add(ring);
  const top=part(new THREE.CylinderGeometry(0.014,0.014,0.17,8).rotateZ(Math.PI/2),INK,{outline:false,flat:true}); g.add(top);
  const t=part(ell(0.045,0.026,0.004),tongue,{outline:false,flat:true}); t.position.set(0,-0.058,0.003); g.add(t);
  face.add(g); return g;
}
function blush(face,color){
  return [-1,1].map(side=>{ const g=new THREE.Group(); onHead(g,0.47*side,-0.1,0.002);
    g.add(part(ell(0.075,0.04,0.008),color,{outline:false,flat:true})); face.add(g); return g; });
}
function brows(face,{tilt=0.18}={}){
  return [-1,1].map(side=>{ const g=new THREE.Group(); onHead(g,0.3*side,0.17,0.006);
    const b=part(caps(0.014,0.07).rotateZ(Math.PI/2),INK,{outline:false,flat:true}); b.rotation.z=-tilt*side; g.add(b); face.add(g); return g; });
}
function sneaker(leg,{shoe='#ffffff',band,sole=INK}){
  const s=new THREE.Group(); s.position.set(0,-0.33,0.05); leg.add(s);
  s.add(part(ell(0.18,0.11,0.24),shoe));
  const b=part(ell(0.185,0.035,0.245),band,{outline:false}); b.position.y=0.02; s.add(b);
  const so=part(ell(0.19,0.04,0.25),sole); so.position.y=-0.075; s.add(so);
  const sock=part(cyl(0.15,0.08),'#ffffff'); sock.position.set(0,0.11,-0.05); s.add(sock);
  return s;
}

/* =========================================================
   MONTAGEM — retorna o "rig" (pivôs nomeados p/ animação)
   ========================================================= */
function buildAxolotl(v){
  const rig = { variant:v.id };
  const root = new THREE.Group(); rig.root = root;           // giro / posição no mundo
  const body = new THREE.Group(); root.add(body); rig.body = body; // squash & stretch (pivô no chão)
  const torso = new THREE.Group(); body.add(torso); rig.torso = torso;
  torso.add(part(new THREE.LatheGeometry(torsoPts,56,Math.PI,Math.PI*2).scale(1,1,TZ), v.body));

  // cabeça
  const neck = new THREE.Group(); neck.position.set(0,1.18,0); torso.add(neck); rig.neck = neck;
  const head = new THREE.Group(); head.position.set(0,0.6,0); neck.add(head); rig.head = head;
  head.add(part(ell(A,B,C,56,40), v.body));
  const face = new THREE.Group(); head.add(face); rig.face = face;

  // brânquias (3 de cada lado)
  rig.gills = {L:[],R:[]};
  const G=[{x:0.56,y:0.34,a:0.62,L:0.56,W:0.24},{x:0.7,y:0.1,a:-0.04,L:0.6,W:0.25},{x:0.66,y:-0.16,a:-0.58,L:0.46,W:0.22}];
  for (const dir of [-1,1]) for (const d of G){
    const g=gill(d.L,d.W,dir,v); g.position.set(d.x*dir,d.y,-0.12); g.rotation.set(0,0.3*dir,d.a*dir);
    head.add(g); rig.gills[dir<0?'L':'R'].push(g);
  }

  // braços
  rig.arms = {};
  for (const side of [-1,1]){
    // ombro -> cotovelo -> mão (3 pivôs)
    const sh=new THREE.Group(); sh.position.set(0.37*side,1.02,0.03); sh.rotation.set(-0.12,0,0.7*side); torso.add(sh);
    sh.add(part(caps(0.085,0.17).translate(0,-0.085,0), v.body));
    const el=new THREE.Group(); el.position.y=-0.17; el.rotation.z=-0.25*side; sh.add(el);
    el.add(part(caps(0.085,0.15).translate(0,-0.075,0), v.body));
    const hand=part(ell(0.108,0.105,0.1), v.body); hand.position.y=-0.22; el.add(hand);
    rig.arms[side<0?'L':'R'] = {shoulder:sh, elbow:el, hand};
  }
  // pernas
  rig.legs = {};
  for (const side of [-1,1]){
    const hip=new THREE.Group(); hip.position.set(0.19*side,0.42,0); torso.add(hip);
    hip.add(part(caps(0.14,0.16).translate(0,-0.2,0), v.body));
    let foot;
    if (v.shoes) foot = sneaker(hip, v.shoes);
    else { foot=part(ell(0.16,0.09,0.19), v.body); foot.position.set(0,-0.34,0.05); hip.add(foot); }
    rig.legs[side<0?'L':'R'] = {hip, foot};
  }
  // rabo: corrente de juntas (pivôs p/ animar) + uma malha lisa única, recalculada a cada pose
  const tailBase=new THREE.Group(); tailBase.position.set(0.2,0.4,-0.18); tailBase.rotation.y=0.45; torso.add(tailBase);
  const radii=[0.16,0.15,0.138,0.125,0.11,0.095,0.08,0.066,0.052];
  const curl =[-0.12,0.08,0.22,0.36,0.46,0.52,0.56,0.56,0.5];
  rig.tail=[]; let parent=tailBase;
  radii.forEach((r,i)=>{ const seg=new THREE.Group(); if(i) seg.position.x=0.11; seg.rotation.z=curl[i]; parent.add(seg); rig.tail.push(seg); parent=seg; });
  makeTail(rig,tailBase,radii,v);

  // sombra no chão
  root.add(shadowMesh());

  v.outfit(rig, v);
  // extras de expressão (usados pelo sistema de humor)
  const by = v.id==='rex' ? 0.29 : 0.2;
  rig.sadBrows = [-1,1].map(side=>{ const g=new THREE.Group(); onHead(g,0.3*side,by,0.008);
    const b=part(caps(0.017,0.08).rotateZ(Math.PI/2),INK,{outline:false,flat:true}); b.rotation.z=-0.4*side; g.add(b); g.visible=false; rig.face.add(g); return g; });
  rig.tears = [-1,1].map(side=>{ const g=new THREE.Group(); onHead(g,0.36*side,-0.06,0.02);
    const d=part(ell(0.032,0.045,0.02),'#8fd8ff',{outline:true,w:0.012}); g.add(d); g.visible=false; rig.face.add(g); return g; });
  rig.frown=(()=>{ const g=new THREE.Group(); onHead(g,0,-0.2,0.006);
    g.add(part(new THREE.TorusGeometry(0.06,0.017,10,24,Math.PI),INK,{outline:false,flat:true}));
    [-1,1].forEach(sd=>{ const c=part(ell(0.017,0.017,0.017),INK,{outline:false,flat:true}); c.position.x=0.06*sd; g.add(c); });
    g.visible=false; rig.face.add(g); return g; })();
  rig.root.traverse(o=>{ o.userData.rest=[o.position.clone(),o.rotation.clone(),o.scale.clone(),o.visible]; });
  rig.all=[]; rig.root.traverse(o=>rig.all.push(o));
  return rig;
}

function makeTail(rig,base,radii,v){
  const M=22, rr=[...radii, radii[radii.length-1]*0.66, 0.014], N=rr.length, SEG=0.11;
  const pos=new Float32Array((N*M+1)*3), col=new Float32Array((N*M+1)*3), idx=[];
  const cb=new THREE.Color(v.body), cg=new THREE.Color(v.gill);
  for(let i=0;i<N;i++) for(let k=0;k<M;k++){
    const c=(Math.cos(k/M*Math.PI*2)>0.86 && i>0)?cg:cb; col.set([c.r,c.g,c.b],(i*M+k)*3);
    if(i<N-1){ const a=i*M+k, b=i*M+(k+1)%M, c2=(i+1)*M+k, d=(i+1)*M+(k+1)%M; idx.push(a,b,c2, b,d,c2); }
  }
  const tip=N*M; col.set([cb.r,cb.g,cb.b],tip*3);
  for(let k=0;k<M;k++) idx.push((N-1)*M+k,(N-1)*M+(k+1)%M,tip);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3)); geo.setIndex(idx);
  const mesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:gradTex}));
  const hull=new THREE.Mesh(geo,outlineMat());
  mesh.frustumCulled=hull.frustumCulled=false; base.add(mesh,hull);
  const acc=new THREE.Matrix4(), P=[], Q=[], rq=new THREE.Quaternion(), ax=new THREE.Vector3(), up=new THREE.Vector3(), sd=new THREE.Vector3();
  for(let i=0;i<N;i++){ P.push(new THREE.Vector3()); Q.push(new THREE.Quaternion()); }
  rig.updateTail=()=>{
    acc.identity(); const n=rig.tail.length;
    for(let i=0;i<n;i++){ const seg=rig.tail[i]; seg.updateMatrix(); acc.multiply(seg.matrix); P[i].setFromMatrixPosition(acc); Q[i].setFromRotationMatrix(acc); }
    ax.set(1,0,0).applyQuaternion(Q[n-1]);
    for(let i=n;i<N;i++){ P[i].copy(P[i-1]).addScaledVector(ax,i===n?SEG:SEG*0.75); Q[i].copy(Q[n-1]); }
    for(let i=0;i<N;i++){
      if(i>0&&i<n) rq.copy(Q[i-1]).slerp(Q[i],0.5); else rq.copy(Q[i]);
      up.set(0,1,0).applyQuaternion(rq); sd.set(0,0,1).applyQuaternion(rq);
      for(let k=0;k<M;k++){ const a=k/M*Math.PI*2, cu=Math.cos(a)*rr[i], cs=Math.sin(a)*rr[i]*0.72, o=(i*M+k)*3;
        pos[o]=P[i].x+up.x*cu+sd.x*cs; pos[o+1]=P[i].y+up.y*cu+sd.y*cs; pos[o+2]=P[i].z+up.z*cu+sd.z*cs; }
    }
    pos[tip*3]=P[N-1].x+ax.x*0.03; pos[tip*3+1]=P[N-1].y+ax.y*0.03; pos[tip*3+2]=P[N-1].z+ax.z*0.03;
    geo.attributes.position.needsUpdate=true; geo.computeVertexNormals();
  };
  rig.updateTail();
}
let _shadowTex;
function shadowMesh(){
  if(!_shadowTex){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
    const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(43,32,27,.28)'); g.addColorStop(.6,'rgba(43,32,27,.12)'); g.addColorStop(1,'rgba(43,32,27,0)');
    x.fillStyle=g; x.fillRect(0,0,128,128); _shadowTex=new THREE.CanvasTexture(c); }
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.1), new THREE.MeshBasicMaterial({map:_shadowTex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(0.15,0.002,0); return m;
}
function sleeve(rig,color,{r=0.108,cuff}={}){
  for (const k of ['L','R']){ const a=rig.arms[k];
    a.shoulder.add(part(caps(r,0.17).translate(0,-0.085,0),color));
    a.elbow.add(part(caps(r,0.07).translate(0,-0.035,0),color));
    if (cuff){ const c=part(cyl(r+0.008,0.05),cuff); c.position.y=-0.135; a.elbow.add(c); }
  }
}

/* =========================================================
   OS 4 PERSONAGENS
   ========================================================= */
const VARIANTS = [
{ id:'rex', name:'Rex', tag:'Jaqueta de couro + óculos escuros', bg:'#fde9e3',
  body:'#f6b3a6', gill:'#ee8888', stripe:'#cf6470', blush:'#f1928f',
  outfit(r,v){
    const J='#34302d', J2='#4b4542';
    const gapF=y=>0.2+0.26*(1.16-y)/0.7;
    r.torso.add(openShell(0.46,1.16,0.035,J,gapF));
    for (const sd of [-1,1]){
      const sh=new THREE.Shape(); [[0,-0.2],[0.105,0.02],[0.07,0.05],[0.125,0.14],[0,0.17]].forEach(([x,y],i)=> i? sh.lineTo(x*sd,y) : sh.moveTo(x*sd,y));
      const lap=new THREE.Group(); onTorso(lap,sd*(gapF(0.96)-0.01),0.96,0.03); r.torso.add(lap);
      lap.add(part(new THREE.ExtrudeGeometry(sh,{depth:0.025,bevelEnabled:false}),J2,{w:0.018}));
    }
    const pin=new THREE.Group(); onTorso(pin,0.85,0.74,0.04); pin.add(part(ell(0.03,0.03,0.015),'#b9b4b0',{w:0.014})); r.torso.add(pin);
    const pk=new THREE.Group(); onTorso(pk,-0.85,0.64,0.042); const pl=part(caps(0.011,0.1).rotateZ(Math.PI/2),INK,{outline:false,flat:true}); pl.rotation.z=0.25; pk.add(pl); r.torso.add(pk);
    sleeve(r,J,{cuff:J2});
    // óculos
    const glasses=new THREE.Group(); r.face.add(glasses); r.glasses=glasses;
    const s=new THREE.Shape(), w=0.5,h=0.27,rt=0.04,rb=0.12, x0=-w/2,x1=w/2,y0=-h/2,y1=h/2;
    s.moveTo(x0+rt,y1); s.lineTo(x1-rt,y1); s.quadraticCurveTo(x1,y1,x1,y1-rt); s.lineTo(x1,y0+rb); s.quadraticCurveTo(x1,y0,x1-rb,y0);
    s.lineTo(x0+rb,y0); s.quadraticCurveTo(x0,y0,x0,y0+rb); s.lineTo(x0,y1-rt); s.quadraticCurveTo(x0,y1,x0+rt,y1);
    const lg=new THREE.ExtrudeGeometry(s,{depth:0.03,bevelEnabled:true,bevelThickness:0.015,bevelSize:0.015,bevelSegments:3,curveSegments:10}).translate(0,0,-0.015);
    for (const side of [-1,1]){
      const lens=new THREE.Group(); onHead(lens,0.29*side,0.06,0.06); glasses.add(lens);
      lens.add(part(lg,'#231d1a',{w:0.02}));
      for (const gx of [-0.06,0.05]){ const gl=part(new THREE.BoxGeometry(0.034,0.2,0.004),'#6e605a',{outline:false,flat:true}); gl.position.set(gx,0.0,0.034); gl.rotation.z=-0.65; lens.add(gl); }
    }
    const bridge=new THREE.Group(); onHead(bridge,0,0.12,0.07); glasses.add(bridge);
    bridge.add(part(new THREE.BoxGeometry(0.16,0.045,0.035),'#231d1a',{w:0.016}));
    const kk=Math.sqrt(1-(0.12/B)**2)*1.035;
    for (const side of [-1,1]){ const tp=[]; for(let t=0.86;t>=0.1;t-=0.08) tp.push(new THREE.Vector3(A*kk*Math.cos(t)*side,0.12,C*kk*Math.sin(t)));
      glasses.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp),20,0.02,8),'#231d1a',{outline:false,flat:true})); }
    r.mouth=smile(r.face);
  }},
{ id:'turbo', name:'Turbo', tag:'Regata, número de prova e faixa', bg:'#e3f1fc',
  body:'#a3d4f5', gill:'#5ea9e6', stripe:'#3d83c6', blush:'#f59fb0',
  shoes:{shoe:'#ffffff',band:'#ff8a3c',sole:'#26324d'},
  outfit(r,v){
    const T='#ff8a3c', N='#26324d';
    r.torso.add(shell(0.52,1.14,0.025,0.045,T));
    r.torso.add(shell(0.3,0.56,0.035,0.05,N,{closeBottom:true}));
    for (const k of ['L','R']){ const c=part(cyl(0.165,0.12),N); c.position.y=-0.09; r.legs[k].hip.add(c); }
    // número de peito
    const cv=document.createElement('canvas'); cv.width=256; cv.height=192; const x=cv.getContext('2d');
    const draw=()=>{ x.clearRect(0,0,256,192);
      x.fillStyle='#fff'; x.strokeStyle=INK; x.lineWidth=12; x.beginPath(); x.roundRect(8,8,240,176,26); x.fill(); x.stroke();
      x.fillStyle=INK; x.font='800 30px "Baloo 2",system-ui'; x.textAlign='center'; x.fillText('AXOGO',128,52);
      x.fillStyle='#2f7fd0'; x.font='800 110px "Baloo 2",system-ui'; x.fillText('07',128,160);
      [[30,30],[226,30]].forEach(([a,b])=>{x.fillStyle='#c9c9c9';x.beginPath();x.arc(a,b,7,0,7);x.fill();}); };
    draw();
    const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; r._bibTex=tex; r._bibDraw=draw;
    const bib=new THREE.Mesh(new THREE.PlaneGeometry(0.29,0.22), new THREE.MeshBasicMaterial({map:tex,transparent:true}));
    bib.position.set(0,0.78,frontZ(0.78,0.025)+0.012); bib.rotation.x=-0.08; r.torso.add(bib);
    // faixa na cabeça
    const hb=new THREE.Group(); hb.position.y=0.4; hb.rotation.x=0.06; r.head.add(hb); r.headband=hb;
    const k=Math.sqrt(1-(0.4/B)**2);
    hb.add(part(new THREE.TorusGeometry(1,0.085,14,80).scale(A*k+0.02,C*k+0.02,1).rotateX(-Math.PI/2),'#ffffff'));
    hb.add(part(new THREE.TorusGeometry(1,0.03,10,80).scale(A*k+0.058,C*k+0.058,1).rotateX(-Math.PI/2),T,{outline:false}));
    // munhequeiras
    for (const k2 of ['L','R']){ const w=part(cyl(0.096,0.07),T); w.position.y=-0.09; r.arms[k2].elbow.add(w); }
    r.eyes=eyesCute(r.face); r.brows=brows(r.face,{tilt:0.22}); r.mouth=mouthOpen(r.face); r.cheeks=blush(r.face,v.blush);
  }},
{ id:'sol', name:'Sol', tag:'Moletom com capuz + fone de ouvido', bg:'#fff3d6',
  body:'#ffd57a', gill:'#ffaa45', stripe:'#e6852a', blush:'#ff9e86',
  shoes:{shoe:'#ffffff',band:'#2bb3a3',sole:'#2f4a48'},
  outfit(r,v){
    const H='#2bb3a3', H2='#22958a';
    r.torso.add(shell(0.4,1.16,0.035,0.055,H));
    const hem=part(new THREE.TorusGeometry(1,0.03,10,64).scale(rT(0.42)+0.04,(rT(0.42)+0.04)*TZ,1).rotateX(-Math.PI/2),H2); hem.position.y=0.42; r.torso.add(hem);
    const pocket=part(ell(0.18,0.085,0.03),'#5cc9bc'); pocket.position.set(0,0.6,frontZ(0.6,0.035)-0.005); pocket.rotation.x=-0.05; r.torso.add(pocket);
    const hood=part(ell(0.36,0.17,0.17),H2); hood.position.set(0,1.12,-0.2); hood.rotation.x=-0.35; r.torso.add(hood);
    for (const s of [-1,1]){
      const st=part(caps(0.013,0.14),'#ffffff',{w:0.014}); st.position.set(0.07*s,0.92,frontZ(0.92,0.035,0.07)+0.015); r.torso.add(st);
      const tip=part(ell(0.022,0.022,0.022),'#ffffff',{w:0.014}); tip.position.set(0.07*s,0.82,frontZ(0.82,0.035,0.07)+0.02); r.torso.add(tip);
    }
    sleeve(r,H,{r:0.11,cuff:H2});
    // fone no pescoço
    // fone de ouvido na cabeça
    const ph=new THREE.Group(); r.head.add(ph); r.headphones=ph;
    ph.add(part(new THREE.TorusGeometry(1,0.04,10,48,Math.PI).scale(A+0.05,B+0.06,1),'#3b3d4a',{w:0.02}));
    const pad=part(new THREE.TorusGeometry(1,0.05,10,24,0.7).rotateZ(Math.PI/2-0.35).scale(A+0.03,B+0.04,1.6),'#565968',{outline:false}); ph.add(pad);
    for (const sd of [-1,1]){
      const cup=new THREE.Group(); cup.position.set((A+0.03)*sd,-0.02,0); cup.rotation.y=Math.PI/2*sd; ph.add(cup);
      cup.add(part(ell(0.17,0.2,0.08),'#3b3d4a'));
      const ac=part(ell(0.1,0.125,0.03),'#ff6b6b',{outline:false}); ac.position.z=0.062; cup.add(ac);
    }
    r.eyes=eyesHappy(r.face); r.mouth=smile(r.face,{y:-0.16,r:0.07}); r.cheeks=blush(r.face,v.blush);
  }},
{ id:'lua', name:'Lua', tag:'Agasalho esportivo + boné pra trás', bg:'#efe6fd',
  body:'#d4bff5', gill:'#a98ae6', stripe:'#8865cf', blush:'#f3a0c4',
  shoes:{shoe:'#ffffff',band:'#4fcfae',sole:'#3c2f5c'},
  outfit(r,v){
    const M='#4fcfae', M2='#3db394';
    r.torso.add(shell(0.48,1.16,0.03,0.05,M));
    // zíper
    const zp=[]; for(let y=0.49;y<=1.1;y+=0.03) zp.push(new THREE.Vector3(0,y,frontZ(y,0.03)+0.004));
    r.torso.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zp),40,0.011,8),INK,{outline:false,flat:true}));
    const pull=part(new THREE.BoxGeometry(0.04,0.07,0.015),'#d9d9d9',{w:0.012}); pull.position.set(0,0.95,frontZ(0.95,0.03)+0.02); r.torso.add(pull);
    const collar=part(new THREE.TorusGeometry(1,0.045,10,56).scale(rT(1.1)+0.04,(rT(1.1)+0.04)*TZ,1).rotateX(-Math.PI/2),M2); collar.position.y=1.1; r.torso.add(collar);
    sleeve(r,M,{cuff:M2});
    for (const k of ['L','R']) for (const y of [-0.07,-0.125]){
      const st=part(new THREE.TorusGeometry(0.11,0.013,8,32).rotateX(Math.PI/2),'#ffffff',{outline:false}); st.position.y=y; r.arms[k].shoulder.add(st);
    }
    // boné pra trás
    const cap=new THREE.Group(); cap.rotation.x=-0.12; r.head.add(cap); r.cap=cap;
    cap.add(part(new THREE.SphereGeometry(1,56,24,0,Math.PI*2,0,Math.PI*0.31).scale(A+0.03,B+0.03,C+0.03),'#ffffff'));
    const brim=part(ell(0.3,0.028,0.24),M); brim.position.set(0,0.36,-0.72); brim.rotation.x=-0.25; cap.add(brim);
    const btn=part(ell(0.045,0.03,0.045),M,{w:0.016}); btn.position.y=B+0.04; cap.add(btn);
    const rimK=Math.sin(Math.PI*0.31);
    const rim=part(new THREE.TorusGeometry(1,0.032,10,72).scale((A+0.03)*rimK,(C+0.03)*rimK,1).rotateX(-Math.PI/2),'#ffffff'); rim.position.y=(B+0.03)*Math.cos(Math.PI*0.31); cap.add(rim);
    r.eyes=eyesCute(r.face,{size:1.12,sparkle:true}); r.mouth=smile(r.face); r.cheeks=blush(r.face,v.blush);
  }},
];


/* =========================================================
   METADADOS DA TURMA
   ========================================================= */
export const CREW = {
  rex:   { id:'rex',   name:'Rex',   color:'#f6b3a6', dark:'#e0508a', role:'Motivação e ofensiva', title:'O líder descolado',
           bio:'Nunca perde a pose. Cuida da sua ofensiva e te lembra de treinar todo dia.' },
  turbo: { id:'turbo', name:'Turbo', color:'#a3d4f5', dark:'#1899d6', role:'Corridas e trotes', title:'O velocista',
           bio:'Vive de tênis no pé. Te guia nas caminhadas, corridas e no trote regenerativo.' },
  sol:   { id:'sol',   name:'Sol',   color:'#ffd57a', dark:'#e5a400', role:'Aquecimento e recuperação', title:'A calmaria',
           bio:'Mestre do alongamento. Garante que você aqueça bem e recupere 100%.' },
  lua:   { id:'lua',   name:'Lua',   color:'#d4bff5', dark:'#a568cc', role:'Força em casa', title:'A forte',
           bio:'Ensina agachamento, flexão, abdominal e prancha com a técnica certinha.' },
};
export const CREW_IDS = ['rex','turbo','sol','lua'];

/* =========================================================
   ANIMAÇÕES — tudo procedural (seno, molas, easing)
   Cada animação soma deslocamentos sobre a pose de repouso,
   com peso w (permite misturar duas animações na transição).
   ========================================================= */
const TAU = Math.PI*2;
const S = (t,f=1,ph=0)=>Math.sin(t*f+ph);
const cyc = (t,period)=> (1-Math.cos(t*TAU/period))/2;      // 0→1→0 suave
function mk(w){
  return {
    w,
    r(o,x=0,y=0,z=0){ if(!o) return; o.rotation.x+=x*this.w; o.rotation.y+=y*this.w; o.rotation.z+=z*this.w; },
    p(o,x=0,y=0,z=0){ if(!o) return; o.position.x+=x*this.w; o.position.y+=y*this.w; o.position.z+=z*this.w; },
    s(o,x=1,y=1,z=1){ if(!o) return; o.scale.x*=1+(x-1)*this.w; o.scale.y*=1+(y-1)*this.w; o.scale.z*=1+(z-1)*this.w; },
  };
}
const SIDES = [['L',-1],['R',1]];

// braço em pose ABSOLUTA. z: abertura lateral (0 = colado no corpo, 1.57 = horizontal, 2.3 = em "V" pra cima —
// mais que isso a mão entra na cabeça). x: pra frente (−) / pra trás (+). e: cotovelo abrindo. ex: cotovelo dobrando pra frente (−).
const ARM0={x:-0.12,z:0.7,e:-0.25};
function arm(P,r,k,z,x=ARM0.x,e=ARM0.e,ex=0){
  const sd=k==='L'?-1:1, a=r.arms[k];
  P.r(a.shoulder,x-ARM0.x,0,sd*(z-ARM0.z)); P.r(a.elbow,ex,0,sd*(e-ARM0.e));
}
function breathe(P,r,t,a=1){
  P.s(r.body, 1-0.012*a*S(t,2.2), 1+0.02*a*S(t,2.2), 1-0.012*a*S(t,2.2));
  r.gills.L.forEach((g,i)=>P.r(g,0,0,-0.09*a*S(t,2.4,i*0.8)));
  r.gills.R.forEach((g,i)=>P.r(g,0,0, 0.09*a*S(t,2.4,i*0.8)));
  r.tail.forEach((s,i)=>P.r(s,0,0.1*a*S(t,1.7,-i*0.45),0.03*a*S(t,1.7,-i*0.45)));
}
function flapGills(P,r,t,amp,f=9){
  r.gills.L.forEach((g,i)=>P.r(g,0,0,-amp*S(t,f,i*0.9)));
  r.gills.R.forEach((g,i)=>P.r(g,0,0, amp*S(t,f,i*0.9)));
}
function wagTail(P,r,t,amp,f){ r.tail.forEach((sg,i)=>P.r(sg,0,amp*S(t,f,-i*0.5),0)); }
// agachamento: quadril desce, pés ficam no chão, joelhos pra frente
function squatPose(P,r,d,{lean=0.2,arms=true}={}){
  const drop=0.2*d, a=Math.acos(Math.min(1,(0.42-drop)/0.42));
  P.p(r.torso,0,-drop,-0.06*d);
  P.r(r.torso,lean*d,0,0);
  for (const [k,sd] of SIDES){ P.r(r.legs[k].hip,-a-lean*d,0,sd*0.12*d); P.r(r.legs[k].foot,a,0,0); }
  if (arms) for (const [k] of SIDES) arm(P,r,k,0.7-0.45*d,ARM0.x-1.3*d);
  P.r(r.neck,-lean*d*0.9,0,0);
}

export const ANIMS = {
  idle(P,r,t){ breathe(P,r,t); P.r(r.neck,0.03*S(t,1.3),0.05*S(t,0.7),0.04*S(t,0.9)); for (const [k] of SIDES) arm(P,r,k,0.7+0.04*S(t,2.2)); },
  happy(P,r,t){
    breathe(P,r,t,1.2);
    const u=t%2.6, hop = u<1.2 ? Math.abs(Math.sin(u/1.2*Math.PI*2)) : 0;
    P.p(r.body,0,0.12*hop,0); P.s(r.body,1+0.03*(1-hop)*(u<1.2?1:0),1-0.02*(1-hop)*(u<1.2?1:0),1);
    P.r(r.neck,0.04*S(t,2.6),0.08*S(t,1.3),0.08*S(t,2.6));
    for (const [k] of SIDES) arm(P,r,k,0.95+0.3*hop);
  },
  talk(P,r,t){
    breathe(P,r,t);
    P.r(r.neck,0.05*S(t,6),0.06*S(t,1.6),0.05*S(t,2.1));
    P.s(r.mouth,1,1+0.55*Math.abs(S(t,11)),1);
    arm(P,r,'R',0.95+0.12*S(t,3),-0.75-0.2*S(t,3),ARM0.e,-0.9); arm(P,r,'L',0.7);
  },
  wave(P,r,t){
    breathe(P,r,t);
    arm(P,r,'R',1.95+0.22*S(t,8),0.35,0.55+0.4*S(t,8)); arm(P,r,'L',0.75);
    P.r(r.neck,0,0.08,-0.1+0.03*S(t,4)); flapGills(P,r,t,0.06,6);
  },
  cheer(P,r,t){
    const s = Math.abs(S(t,4.6));
    P.p(r.body,0,0.3*s,0); P.s(r.body,1.05-0.07*s,0.92+0.12*s,1.05-0.07*s);
    for (const [k,sd] of SIDES) arm(P,r,k,2.2+0.12*S(t,9.2,sd),0.3,0.1);
    flapGills(P,r,t,0.22,10); P.r(r.neck,-0.12,0,0.06*S(t,4.6)); wagTail(P,r,t,0.25,9);
    for (const [k,sd] of SIDES) P.r(r.legs[k].hip,0,0,sd*0.14*s);
  },
  dance(P,r,t){
    breathe(P,r,t);
    const k=S(t,6);
    P.r(r.body,0,0.15*S(t,3),0.09*k); P.p(r.body,0,0.06*Math.abs(k),0);
    arm(P,r,'L',1.35+0.9*Math.max(0,k),0.25,0.1); arm(P,r,'R',1.35+0.9*Math.max(0,-k),0.25,0.1);
    P.r(r.neck,0.06*k,0,-0.1*k); flapGills(P,r,t,0.15,6); wagTail(P,r,t,0.2,6);
    P.r(r.legs.L.hip,-0.3*Math.max(0,-k),0,0); P.r(r.legs.R.hip,-0.3*Math.max(0,k),0,0);
  },
  sad(P,r,t){
    breathe(P,r,t,0.6);
    P.r(r.neck,0.3,0,0.06*S(t,0.6)); P.s(r.body,1.02,0.96,1.02);
    for (const [k] of SIDES) arm(P,r,k,0.4,0.05);
    r.gills.L.forEach((g,i)=>P.r(g,0,0, 0.45+0.03*S(t,1.2,i)));
    r.gills.R.forEach((g,i)=>P.r(g,0,0,-0.45-0.03*S(t,1.2,i)));
    r.tail.forEach(s=>P.r(s,0,0,-0.07));
  },
  sleep(P,r,t){
    breathe(P,r,t,1.4); P.r(r.neck,0.22,0,0.18); P.s(r.body,1.02,0.97,1.02);
    for (const [k] of SIDES) arm(P,r,k,0.45);
    r.gills.L.forEach(g=>P.r(g,0,0,0.25)); r.gills.R.forEach(g=>P.r(g,0,0,-0.25));
  },
  run(P,r,t,sp=1){
    const f = 8.5*sp, k = S(t,f), amp=Math.min(1.15,sp);
    P.r(r.body,0.12*amp,0,0); P.p(r.body,0,0.07*amp*Math.abs(S(t,f,Math.PI/2)),0);
    P.r(r.legs.L.hip,-0.8*k*amp,0,0); P.r(r.legs.R.hip,0.8*k*amp,0,0);
    P.r(r.legs.L.foot,0.35*Math.max(0,-k),0,0); P.r(r.legs.R.foot,0.35*Math.max(0,k),0,0);
    arm(P,r,'L',0.4,ARM0.x+0.85*k*amp,ARM0.e,-1.25); arm(P,r,'R',0.4,ARM0.x-0.85*k*amp,ARM0.e,-1.25);
    P.r(r.neck,-0.08+0.03*S(t,f*2),0,0); flapGills(P,r,t,0.12*amp,f); wagTail(P,r,t,0.18,f);
  },
  march(P,r,t){
    const f=5.2, k=S(t,f), l=Math.max(0,k), rr=Math.max(0,-k);
    P.r(r.legs.L.hip,-1.1*l,0,0); P.r(r.legs.R.hip,-1.1*rr,0,0);
    P.r(r.legs.L.foot,0.7*l,0,0); P.r(r.legs.R.foot,0.7*rr,0,0);
    P.p(r.body,0,0.04*Math.abs(k),0);
    arm(P,r,'L',0.45,ARM0.x+0.8*k,ARM0.e,-1.0); arm(P,r,'R',0.45,ARM0.x-0.8*k,ARM0.e,-1.0);
    breathe(P,r,t,0.5); flapGills(P,r,t,0.08,f);
  },
  squat(P,r,t){ squatPose(P,r,cyc(t,2.3)); breathe(P,r,t,0.5); },
  wallsit(P,r,t){ squatPose(P,r,0.9,{lean:0.05}); breathe(P,r,t,0.8); P.p(r.body,0.004*S(t,40),0,0); },
  jack(P,r,t){
    const per=0.85, s=cyc(t,per);
    for (const [k,sd] of SIDES){ arm(P,r,k,0.75+1.5*s,0.1+0.15*s,-0.25+0.35*s); P.r(r.legs[k].hip,0,0,sd*0.32*s); P.r(r.legs[k].foot,0,0,-sd*0.32*s); }
    P.p(r.body,0,0.11*Math.sin(Math.min(1,(t%per)/per)*Math.PI),0); flapGills(P,r,t,0.18,TAU/per);
  },
  kneeup(P,r,t){
    const k=S(t,TAU/1.7), l=Math.max(0,k), rr=Math.max(0,-k);
    P.r(r.legs.L.hip,-1.3*l,0,0); P.r(r.legs.R.hip,-1.3*rr,0,0);
    P.r(r.legs.L.foot,0.9*l,0,0); P.r(r.legs.R.foot,0.9*rr,0,0);
    for (const [kk] of SIDES) arm(P,r,kk,1.0,-0.9,ARM0.e,-1.5);
    P.r(r.torso,0.22*Math.abs(k),0.2*k,0); P.r(r.neck,-0.1*Math.abs(k),0,0);
  },
  pushup(P,r,t,sp=1,hold=false){
    const d = hold ? 0.12 : cyc(t,2.0);
    const th = 1.1 + 0.13*d;
    P.p(r.body,0,0,-0.95); P.r(r.body,th,0,0);
    for (const [k] of SIDES) arm(P,r,k,0.5+0.35*d,-th-0.05,ARM0.e-0.5*d,0.45*d);
    P.r(r.neck,-0.75+0.1*d,0,0); flapGills(P,r,t,0.06,4);
    for (const [k] of SIDES) P.r(r.legs[k].foot,-0.5,0,0);
    if (hold) P.p(r.body,0,0.004*S(t,35),0);
  },
  plank(P,r,t){ ANIMS.pushup(P,r,t,1,true); },
  lunge(P,r,t,sp=1,hold=false){
    const d = hold ? 0.8 : cyc(t,2.4);
    P.r(r.legs.R.hip,-1.0*d,0,0); P.r(r.legs.R.foot,0.75*d,0,0);
    P.r(r.legs.L.hip, 0.6*d,0,0); P.r(r.legs.L.foot,-0.2*d,0,0);
    P.p(r.torso,0,-0.13*d,0);
    if (!hold) for (const [k] of SIDES) arm(P,r,k,0.95,0.1,-1.15);
    breathe(P,r,t,0.5);
  },
  calf(P,r,t){ ANIMS.lunge(P,r,t,1,true); P.r(r.body,0.1,0,0); for (const [k] of SIDES) arm(P,r,k,0.45,-1.35+0.03*S(t,2)); },
  stretch(P,r,t){
    const s = S(t,TAU/4.2);
    for (const [k] of SIDES) arm(P,r,k,2.25,0.25,0.15);
    P.r(r.torso,0,0,0.2*s); P.r(r.neck,0,0,0.08*s); breathe(P,r,t,0.6);
  },
  fold(P,r,t){
    const d = 0.75+0.25*S(t,TAU/4);
    P.r(r.torso,0.5*d,0,0); P.p(r.torso,0,0,-0.1*d);
    for (const [k] of SIDES){ P.r(r.legs[k].hip,-0.5*d,0,0); arm(P,r,k,0.35,-0.75*d); }
    P.r(r.neck,0.15*d,0,0); breathe(P,r,t,0.5);
  },
  quad(P,r,t){
    P.r(r.legs.L.hip,0.85,0,0); P.r(r.legs.L.foot,-0.6,0,0);
    arm(P,r,'L',0.55,0.75); arm(P,r,'R',1.7+0.06*S(t,3),0.1,0.1);
    P.p(r.body,0.004*S(t,23),0,0); breathe(P,r,t,0.6);
  },
  shoulder(P,r,t){
    const s=cyc(t,5);
    arm(P,r,'R',-0.55-0.12*s,-1.25,0); arm(P,r,'L',0.75,-0.95,ARM0.e,-1.5);
    P.r(r.neck,0,-0.15,0); breathe(P,r,t,0.6);
  },
  breathe(P,r,t){
    const s=cyc(t,5.2);
    for (const [k] of SIDES) arm(P,r,k,0.7+1.5*s,0.2*s,-0.25+0.4*s);
    P.s(r.body,1+0.03*s,1+0.035*s,1+0.03*s); P.r(r.neck,-0.12*s,0,0);
    r.gills.L.forEach(g=>P.r(g,0,0,-0.12*s)); r.gills.R.forEach(g=>P.r(g,0,0,0.12*s));
  },
  tiptoe(P,r,t){ const d=cyc(t,1.6); P.p(r.body,0,0.08*d,0); for (const [k] of SIDES){ P.r(r.legs[k].foot,0.4*d,0,0); arm(P,r,k,0.95,0.1,-1.15); } breathe(P,r,t,0.5); },
  runaway(P,r,t){ ANIMS.run(P,r,t,1.3); },
};
// rosto por humor: 'happy' | 'joy' | 'sad' | 'cry' | 'sleep'
function applyFace(r,mood,t,phase){
  const eyes = r.eyes||[];
  const blink = ((t+phase)%3.9) < 0.13;
  const sad = mood==='sad'||mood==='cry';
  let ey = blink ? 0.12 : 1;
  if (mood==='joy') ey = Math.min(ey,0.45);
  if (mood==='sleep') ey = 0.08;
  if (sad && !blink) ey = 0.85;
  if (r.variant!=='sol') eyes.forEach(e=>e.scale.y*=ey);
  else if (mood==='sleep'||sad) eyes.forEach(e=>{ e.scale.y*=-0.7; });
  r.mouth.visible = !sad; r.frown.visible = sad;
  if (mood==='sleep'){ r.mouth.scale.x*=0.55; r.mouth.scale.y*=0.55; }
  r.sadBrows.forEach(b=>b.visible=sad);
  if (r.brows) r.brows.forEach(b=>b.visible=!sad);
  if (r.cheeks) r.cheeks.forEach(c=>c.visible=!sad||mood==='cry');
  r.tears.forEach((tr,i)=>{ tr.visible = mood==='cry'; if(mood==='cry'){ const u=((t*0.7)+i*0.5)%1; tr.position.y-=0.22*u; tr.scale.setScalar(1-0.6*u); } });
}

/* =========================================================
   UM RENDERIZADOR 3D PARA VÁRIOS "SLOTS" NA PÁGINA
   Qualquer elemento com class="axo-slot" e data-axo='{...}' ganha um
   <canvas> próprio. A cena é desenhada num WebGL fora da tela e copiada
   pra dentro de cada slot — assim o axolote rola, some, aparece e fica
   por baixo/por cima dos outros elementos igual a qualquer imagem.
   ========================================================= */
export class AxoStage {
  constructor(root){
    this.root=root;
    this.gl=document.createElement('canvas');
    this.renderer=new THREE.WebGLRenderer({canvas:this.gl,antialias:true,alpha:true});
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.renderer.setPixelRatio(1); this.renderer.autoClear=false; this.renderer.setClearColor(0,0);
    this.gw=0; this.gh=0; this.ensure(256,256);
    this.scene=new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xffffff,1.65));
    const d=new THREE.DirectionalLight(0xffffff,1.55); d.position.set(-2,4,5); this.scene.add(d);
    this.rigs={};
    for (const v of VARIANTS){ const rig=buildAxolotl(v); rig.root.visible=false; this.scene.add(rig.root); this.rigs[v.id]=rig; }
    this.cam=new THREE.PerspectiveCamera(24,1,0.1,60);
    this.cache=new WeakMap(); this.t0=performance.now(); this.frame=0; this.cost=0; this.half=false;
    document.fonts?.ready.then(()=>{ const r=this.rigs.turbo; if(r&&r._bibDraw){ r._bibDraw(); r._bibTex.needsUpdate=true; } });
    const loop=()=>{ requestAnimationFrame(loop); try{ this.render(); }catch(e){ if(!this._err){ this._err=true; console.error(e); } } };
    requestAnimationFrame(loop);
  }
  ensure(w,h){ if(w>this.gw||h>this.gh){ this.gw=Math.max(this.gw,w); this.gh=Math.max(this.gh,h); this.renderer.setSize(this.gw,this.gh,false); } }
  setLayer(){ /* compatibilidade: não é mais necessário */ }
  spec(el,now){
    const raw=el.dataset.axo||'{}'; let c=this.cache.get(el);
    if(!c||c.raw!==raw){
      let sp; try{ sp=JSON.parse(raw); }catch(e){ sp={cast:[]}; }
      const prev=c?c.states:[];
      const states=(sp.cast||[]).map((m,i)=>{ const p=prev[i]; const a=m.anim||'idle';
        if(p && p.id===m.id){ if(p.cur!==a) return {id:m.id,cur:a,prev:p.cur,tc:now}; return p; }
        return {id:m.id,cur:a,prev:null,tc:now}; });
      c={raw,sp,states}; this.cache.set(el,c);
    }
    return c;
  }
  pose(rig,anim,t,w){
    const [name,spd]=String(anim).split(':'); const fn=ANIMS[name]||ANIMS.idle; const sp=spd?parseFloat(spd):1;
    fn(mk(w),rig,t,sp);
  }
  render(){
    const R=this.renderer, now=performance.now(), T=this.fixedT ?? (now-this.t0)/1000, dpr=this.dpr;
    const rootR=this.root.getBoundingClientRect();
    const slots=this.root.querySelectorAll('.axo-slot');
    this.frame++; let n=0;
    for (const el of slots){
      const cw=el.clientWidth, ch=el.clientHeight; if(cw<4||ch<4) continue;
      const r=el.getBoundingClientRect();
      if (r.bottom<rootR.top-10||r.top>rootR.bottom+10||r.right<rootR.left-10||r.left>rootR.right+10) continue;
      if (el.closest('[data-axo-off]')) continue;
      n++;
      let cv=el._axoCv;
      if(!cv||cv.parentNode!==el){ cv=document.createElement('canvas'); cv.className='axo-c'; el.appendChild(cv); el._axoCv=cv; el._axoCtx=cv.getContext('2d'); el._axoNew=true; }
      // com muitos slots num aparelho lento, alterna os quadros (30 fps) em vez de travar tudo
      if (this.half && !el._axoNew && ((n+this.frame)&1)) continue;
      el._axoNew=false;
      const w=Math.max(2,Math.round(cw*dpr)), h=Math.max(2,Math.round(ch*dpr));
      if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; }
      this.ensure(w,h);
      const c=this.spec(el,now), sp=c.sp, cast=sp.cast||[]; if(!cast.length){ el._axoCtx.clearRect(0,0,w,h); continue; }
      // enquadramento
      const fr=sp.frame||'full';
      let y0=-0.05,y1=2.6; if(fr==='tall'){y1=3.05;} if(fr==='bust'){y0=0.95;y1=2.5;} if(fr==='head'){y0=1.12;y1=2.48;} if(fr==='low'){y0=-0.05;y1=1.9;}
      const xs=cast.map(m=>m.x||0); const xa=Math.min(...xs)-1.42, xb=Math.max(...xs)+1.42;
      const bw=(xb-xa), bh=(y1-y0), cxm=(xa+xb)/2+(sp.ox||0), cym=(y0+y1)/2+(sp.oy||0);
      const aspect=w/h, f=Math.tan(this.cam.fov*Math.PI/360), pad=1+(sp.pad??0.04);
      const dist=Math.max(bh/2/f, bw/2/(f*aspect))*pad/(sp.zoom||1);
      this.cam.aspect=aspect; this.cam.position.set(cxm,cym+dist*0.07,dist); this.cam.lookAt(cxm,cym,0); this.cam.updateProjectionMatrix();
      for (const id in this.rigs) this.rigs[id].root.visible=false;
      cast.forEach((m,i)=>{
        const rig=this.rigs[m.id]; if(!rig) return;
        for (const o of rig.all){ const [p,ro,s,v]=o.userData.rest; o.position.copy(p); o.rotation.copy(ro); o.scale.copy(s); o.visible=v; }
        const st=c.states[i], ph=(m.ph??(i*1.37+m.id.length*0.61));
        const t=T+ph, k=Math.min(1,(now-st.tc)/300), e=k*k*(3-2*k);
        if (st.prev && k<1){ this.pose(rig,st.prev,t,1-e); this.pose(rig,st.cur,t,e); } else this.pose(rig,st.cur,t,1);
        applyFace(rig,m.mood||'happy',t,ph);
        rig.updateTail();
        rig.root.position.set(m.x||0,0,m.z||0); rig.root.rotation.set(0,m.ry||0,0); rig.root.scale.setScalar(m.s||1);
        rig.root.visible=true;
      });
      R.setViewport(0,0,w,h); R.setScissor(0,0,w,h); R.setScissorTest(true); R.clear(); R.render(this.scene,this.cam);
      const ctx=el._axoCtx; ctx.clearRect(0,0,w,h); ctx.drawImage(this.gl,0,this.gh-h,w,h,0,0,w,h);
    }
    const dt=performance.now()-now; this.cost=this.cost*0.9+dt*0.1;
    if(!this.half && this.cost>20) this.half=true; else if(this.half && this.cost<7) this.half=false;
  }
}

export { buildAxolotl, VARIANTS };
