/* Out & Scout: the phone at the end, lit by the real sun through the day. */
(function(){
"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
function $(s){return document.querySelector(s)}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function ease(t){return 1-Math.pow(1-t,3)}
var SUN=window.OS_SUN;
var stage=$("#end-stage");
if(!stage||!SUN)return;
var slider=$("#end-time"),play=$("#end-play"),log=$("#end-log"),readout=$("#end-read");
var heading=300; /* the camera faces WNW, across the park */
var tm=clamp(SUN.nowMin(),SUN.RISE-70,SUN.SET+70);
slider.min=Math.floor(SUN.RISE-90);slider.max=Math.ceil(SUN.SET+90);slider.value=tm;
var playing=false,hooks=[];
function sun(){return SUN.sunAt(tm)}
function light(){var s=sun();if(s.el<=-1)return {k:-1,word:s.el<-6?"After dark":s.el<-4?"Blue hour":"Sun on the horizon"};var r=SUN.rel(s.az,heading),k=SUN.cls(r);return {k:k,r:r,word:SUN.KT[k]+(Math.abs(r)<=8||Math.abs(r)>=172?"":", sun "+(r>0?"right":"left"))}}
function phaseWord(){var s=sun(),p=SUN.phase(s.el,tm);return p==="golden hour"?"Golden hour":p==="blue hour"?"Blue hour":s.el<-6?"After dark":Math.round(s.el)+"° up"}
function setLog(){var g=SUN.golden();var Lw=light();readout.textContent=SUN.hm(tm)+" · "+phaseWord()+(Lw.k>=0?" · "+Lw.word:sun().el<-4?"":" · "+Lw.word);log.textContent="Knole Park · sunrise "+SUN.hm(SUN.RISE)+(g?" · golden "+SUN.hm(g[0])+"–"+SUN.hm(g[1]):"")+" · sunset "+SUN.hm(SUN.SET)}
function setTime(v){tm=clamp(+v,+slider.min,+slider.max);slider.value=tm;setLog();hooks.forEach(function(f){f()})}
slider.addEventListener("input",function(){playing=false;play.textContent="Play the day";setTime(slider.value)});
play.addEventListener("click",function(){playing=!playing;play.textContent=playing?"Pause":"Play the day";if(playing&&tm>=+slider.max-2)setTime(slider.min)});
setLog();

var started=false;
function start(){if(started)return;started=true;var s=document.createElement("script");s.src="three.min.js";s.onload=function(){try{build()}catch(e){fail()}};s.onerror=fail;document.head.appendChild(s)}
function fail(){stage.classList.add("no3d")}
if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start()}},{rootMargin:"600px"});io.observe(stage)}else start();

/* the viewfinder on the screen: a ridge, frame lines, the sun's path, the HUD */
var ridge=[];(function(){var y=.62;for(var i=0;i<=40;i++){y+=(Math.sin(i*.9)*.03+Math.sin(i*.31+1)*.05)*(i<20?1:.7);ridge.push(clamp(y,.35,.8))}})();
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function drawScreen(c){
  var x=c.getContext("2d"),W=c.width,H=c.height,s=W/844;
  x.setTransform(1,0,0,1,0,0);x.scale(s,s);var w=844,h=390;
  var st=sun(),el=st.el,L=light();
  /* sky: night, blue hour, gold, day */
  var top,bot;
  if(el<-6){top="#06070C";bot="#0B0D14"}else if(el<-4){top="#0D1526";bot="#2A3550"}else if(el<6){top="#2B2F4A";bot="#B26A3A"}else if(el<15){top="#4C6C9E";bot="#C9B79A"}else{top="#5E86C2";bot="#C9D3DD"}
  var g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,w,h);
  /* the sun in the picture: azimuth across the frame, elevation up it (35 mm, 55° wide) */
  var r=SUN.rel(st.az,heading),sx=w/2+r/27.5*w,sy=h*.62-el/16*h*.62;
  if(el>-6&&Math.abs(r)<40){var gl=x.createRadialGradient(sx,sy,0,sx,sy,120);gl.addColorStop(0,"rgba(255,230,200,.55)");gl.addColorStop(1,"rgba(255,200,150,0)");x.fillStyle=gl;x.fillRect(0,0,w,h);x.fillStyle="#FF5A1F";x.beginPath();x.arc(sx,sy,el<6?9:7,0,7);x.fill()}
  /* the ridge, lit from the sun's side */
  x.beginPath();x.moveTo(0,h);ridge.forEach(function(v,i){x.lineTo(i/40*w,v*h)});x.lineTo(w,h);x.closePath();
  var dark=el<-4?"#07080A":el<6?"#17130F":"#2A2A24";x.fillStyle=dark;x.fill();
  x.strokeStyle="rgba(236,235,230,.7)";x.lineWidth=1.2;x.beginPath();ridge.forEach(function(v,i){i?x.lineTo(i/40*w,v*h):x.moveTo(0,v*h)});x.stroke();
  /* the sun's path over the picture, hours ticked, golden in orange */
  x.strokeStyle="rgba(236,235,230,.35)";x.lineWidth=1;x.setLineDash([3,4]);x.beginPath();var first=true;
  for(var m=SUN.RISE;m<=SUN.SET;m+=6){var p=SUN.sunAt(m),pr=SUN.rel(p.az,heading);if(Math.abs(pr)>40){first=true;continue}var px=w/2+pr/27.5*w,py=h*.62-p.el/16*h*.62;if(first){x.moveTo(px,py);first=false}else x.lineTo(px,py)}
  x.stroke();x.setLineDash([]);
  var gd=SUN.golden();if(gd){x.strokeStyle="#FF5A1F";x.lineWidth=2.5;x.beginPath();first=true;for(var m2=gd[0];m2<=gd[1];m2+=3){var q=SUN.sunAt(m2),qr=SUN.rel(q.az,heading);if(Math.abs(qr)>40){first=true;continue}var qx=w/2+qr/27.5*w,qy=h*.62-q.el/16*h*.62;if(first){x.moveTo(qx,qy);first=false}else x.lineTo(qx,qy)}x.stroke()}
  /* frame lines 2.39 */
  var fh=w/2.39,fy=(h-fh)/2;x.fillStyle="rgba(0,0,0,.45)";x.fillRect(0,0,w,fy);x.fillRect(0,fy+fh,w,h-fy-fh);
  x.strokeStyle="rgba(236,235,230,.55)";x.lineWidth=1;x.strokeRect(70.5,fy+.5,w-141,fh-1);
  /* HUD */
  x.fillStyle="#ECEBE6";x.font="500 11px 'Geist Mono',ui-monospace,monospace";x.textBaseline="top";
  x.fillText("KNOLE PARK · "+SUN.hm(tm).toUpperCase(),84,fy+10);
  x.textAlign="right";x.fillText("2.39 · 35 MM",w-84,fy+10);x.textAlign="left";
  x.fillStyle="rgba(236,235,230,.75)";x.fillText(L.word.toUpperCase(),84,fy+fh-24);
  x.textAlign="right";x.fillStyle="#FF5A1F";x.fillText(phaseWord().toUpperCase(),w-84,fy+fh-24);x.textAlign="left";
  /* rails: the lens chip and the shutter */
  x.fillStyle="#ECEBE6";x.font="400 26px 'Geist',system-ui,sans-serif";x.fillText("35",w-54,h/2-40);x.font="400 9px 'Geist Mono',ui-monospace,monospace";x.fillText("MM",w-50,h/2-10);
  x.strokeStyle="#ECEBE6";x.lineWidth=2;x.beginPath();x.arc(w-40,h/2+40,18,0,7);x.stroke();x.fillStyle="#C9C8C3";x.beginPath();x.arc(w-40,h/2+40,14,0,7);x.fill();
  x.fillStyle="rgba(236,235,230,.6)";x.font="400 9px 'Geist Mono',ui-monospace,monospace";x.fillText("6A",26,h/2-6);x.strokeStyle="rgba(236,235,230,.4)";x.lineWidth=1;x.strokeRect(18.5,h/2-30.5,28,20);
}
function rshape(T,w,h,r){var s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
function planeUV(geo,w,h){var p=geo.attributes.position,uv=geo.attributes.uv;for(var i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);uv.needsUpdate=true}

function build(){
  var T=window.THREE,cv=$("#end-cv");
  var renderer=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:"high-performance"});
  if(!renderer.getContext())throw 0;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  var scene=new T.Scene(),cam=new T.PerspectiveCamera(30,1,8,400);cam.position.set(0,0,40);

  /* the phone, landscape: 147 x 71.5 x 8.3 mm, a unit is 5 mm */
  var Wd=29.4,Hd=14.3,R=2.2,D=1.2,bev=.24;
  var phone=new T.Group(),inner=new T.Group();phone.add(inner);scene.add(phone);
  var frameMat=new T.MeshPhysicalMaterial({color:0x8a8984,metalness:1,roughness:.26,clearcoat:.3});
  var body=new T.Mesh(new T.ExtrudeGeometry(rshape(T,Wd-bev*2,Hd-bev*2,R-bev),{depth:D,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:6,curveSegments:24}),frameMat);body.position.z=-D/2;inner.add(body);
  var glass=new T.MeshPhysicalMaterial({color:0x020202,metalness:0,roughness:.05,clearcoat:1,clearcoatRoughness:.02});
  var front=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),glass);front.position.z=D/2+bev+.03;inner.add(front);
  var sc=document.createElement("canvas");sc.width=1688;sc.height=780;
  var tex=new T.CanvasTexture(sc);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  var sw=Wd-1.1,sh=Hd-1.1,sg=new T.ShapeGeometry(rshape(T,sw,sh,R-.5),24);planeUV(sg,sw,sh);
  var screen=new T.Mesh(sg,new T.MeshBasicMaterial({map:tex,toneMapped:false}));screen.position.z=D/2+bev+.08;screen.renderOrder=1;inner.add(screen);
  var shine=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),new T.MeshPhysicalMaterial({color:0x000000,transparent:true,opacity:.16,roughness:.04,metalness:0,clearcoat:1,depthWrite:false}));shine.position.z=D/2+bev+.14;shine.renderOrder=2;inner.add(shine);
  var bk=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),new T.MeshPhysicalMaterial({color:0x1d1d1b,metalness:.2,roughness:.55,clearcoat:.4,clearcoatRoughness:.4}));bk.position.z=-D/2-bev-.03;bk.rotation.y=Math.PI;inner.add(bk);
  /* island, camera block top-left when held landscape */
  var isl=new T.Mesh(new T.ShapeGeometry(rshape(T,.7,2.5,.35),16),new T.MeshBasicMaterial({color:0x000000}));isl.position.set(-Wd/2+1.9,0,D/2+bev+.1);isl.renderOrder=3;inner.add(isl);
  var plat=new T.Mesh(new T.ExtrudeGeometry(rshape(T,6.4,6.4,1.5),{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:3,curveSegments:16}),new T.MeshPhysicalMaterial({color:0x2b2a27,metalness:.3,roughness:.25,clearcoat:.8}));
  plat.rotation.y=Math.PI;plat.position.set(-Wd/2+4.0,Hd/2-4.0,-D/2-bev);inner.add(plat);
  var ringM=new T.MeshPhysicalMaterial({color:0x4a4945,metalness:1,roughness:.25}),lensM=new T.MeshPhysicalMaterial({color:0x050608,metalness:.2,roughness:.02,clearcoat:1});
  [[-1.45,1.45],[-1.45,-1.45],[1.5,0]].forEach(function(o){var ring=new T.Mesh(new T.CylinderGeometry(1.25,1.25,.5,40),ringM);ring.rotation.x=Math.PI/2;ring.position.set(plat.position.x+o[0],plat.position.y+o[1],-D/2-bev-.38);inner.add(ring);var gl=new T.Mesh(new T.CircleGeometry(.95,40),lensM);gl.rotation.y=Math.PI;gl.position.set(ring.position.x,ring.position.y,-D/2-bev-.64);inner.add(gl)});
  [[1,7.4,2.2],[1,4.6,2.2],[1,9.6,.9],[-1,6,3.6]].forEach(function(b){var m=new T.Mesh(new T.BoxGeometry(b[2],.3,.7),frameMat);m.position.set(b[1]-Wd/2+4,b[0]*(Hd/2+.08),0);inner.add(m)});

  /* the sun: one light that goes round, and a sky that goes with it */
  var sunLight=new T.DirectionalLight(0xffffff,3);scene.add(sunLight);scene.add(sunLight.target);
  var sky=new T.HemisphereLight(0x8fb4ff,0x1a140c,.6);scene.add(sky);
  var amb=new T.AmbientLight(0xffffff,.05);scene.add(amb);
  var sunBall=new T.Mesh(new T.SphereGeometry(.9,32,32),new T.MeshBasicMaterial({color:0xFF5A1F,toneMapped:false}));scene.add(sunBall);
  var halo=new T.Sprite(new T.SpriteMaterial({map:(function(){var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d"),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,"rgba(255,140,60,.9)");g.addColorStop(.3,"rgba(255,120,40,.35)");g.addColorStop(1,"rgba(255,90,31,0)");x.fillStyle=g;x.fillRect(0,0,128,128);var t=new T.CanvasTexture(c);return t})(),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(9,9,1);scene.add(halo);
  /* the sun's arc, drawn in the air */
  var arcPts=[];for(var m=SUN.RISE;m<=SUN.SET;m+=10)arcPts.push(sunVec(m));
  var arc=new T.Line(new T.BufferGeometry().setFromPoints(arcPts),new T.LineDashedMaterial({color:0xECEBE6,transparent:true,opacity:.3,dashSize:.5,gapSize:.5}));arc.computeLineDistances();scene.add(arc);
  var gd=SUN.golden();if(gd){var gp=[];for(var m2=gd[0];m2<=gd[1];m2+=5)gp.push(sunVec(m2));scene.add(new T.Line(new T.BufferGeometry().setFromPoints(gp),new T.LineBasicMaterial({color:0xFF5A1F,transparent:true,opacity:.9})))}
  function sunVec(m){var s=SUN.sunAt(m),az=(s.az-heading)*Math.PI/180,el=Math.max(s.el,-8)*Math.PI/180,Rr=26;return new T.Vector3(Math.sin(az)*Math.cos(el)*Rr,Math.sin(el)*Rr+2,Math.cos(az)*Math.cos(el)*Rr*.55+6)}
  /* a floor: a faint grid the phone sits over */
  var grid=new T.GridHelper(80,32,0x3a3833,0x26241f);grid.position.y=-9.5;grid.material.transparent=true;grid.material.opacity=.45;scene.add(grid);

  /* environment for reflections, rebuilt as the sun moves */
  var pm=new T.PMREMGenerator(renderer),envRT=null,lastEnvKey="";
  function makeEnv(){
    var s=sun(),key=Math.round(s.el/3)+"|"+Math.round(s.az/15);if(key===lastEnvKey)return;lastEnvKey=key;
    var es=new T.Scene(),col=skyCol(s.el);es.background=new T.Color(col.top);
    var ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshBasicMaterial({color:new T.Color(col.ground),side:T.DoubleSide}));ground.rotation.x=-Math.PI/2;ground.position.y=-5;es.add(ground);
    if(s.el>-6){var v=sunVec(tm),b=new T.Mesh(new T.PlaneGeometry(8,8),new T.MeshBasicMaterial({color:new T.Color(col.sun).multiplyScalar(s.el<6?4:7),side:T.DoubleSide}));b.position.copy(v).multiplyScalar(.6);b.lookAt(0,0,0);es.add(b)}
    if(envRT)envRT.dispose();envRT=pm.fromScene(es,.02);scene.environment=envRT.texture;
  }
  function skyCol(el){if(el<-6)return {top:0x05060a,ground:0x08090c,sun:0x224466,light:0x3a5a8a,int:.15};if(el<-4)return {top:0x0e1a33,ground:0x141a2a,sun:0x4f6fb0,light:0x7fa0ff,int:.6};if(el<6)return {top:0x3a3450,ground:0x3a2a1e,sun:0xff8c3a,light:0xffa050,int:2.8};if(el<15)return {top:0x5f7fb5,ground:0x6a5f4e,sun:0xffd9a8,light:0xffe4c0,int:3.4};return {top:0x7f9fd0,ground:0x8a8070,sun:0xffffff,light:0xffffff,int:3.8}}
  function applySun(){
    var s=sun(),c=skyCol(s.el),v=sunVec(tm);
    sunLight.position.copy(v);sunLight.color.set(c.light);sunLight.intensity=c.int;
    sky.color.set(c.top).multiplyScalar(2);sky.intensity=s.el<-6?.25:s.el<6?.7:1;
    sunBall.position.copy(v);halo.position.copy(v);var vis=s.el>-8;sunBall.visible=vis;halo.visible=vis;halo.material.opacity=s.el<6?.9:.5;
    makeEnv();
  }
  hooks.push(applySun);applySun();

  /* pop-out cards */
  function cardTex(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return {c:c,t:t}}
  function lbl(x,a,b,sunDot){var W=x.canvas.width,H=x.canvas.height;x.clearRect(0,0,W,H);x.fillStyle="rgba(18,18,17,.94)";rr(x,2,2,W-4,H-4,24);x.fill();x.strokeStyle="rgba(236,235,230,.3)";x.lineWidth=2;x.stroke();
    if(sunDot){x.fillStyle="#FF5A1F";x.beginPath();x.arc(44,H/2,10,0,7);x.fill()}
    x.fillStyle="rgba(236,235,230,.55)";x.font="400 24px 'Geist Mono',ui-monospace,monospace";x.textBaseline="alphabetic";x.fillText(a,sunDot?72:40,H*.42);
    x.fillStyle="#ECEBE6";x.font="400 44px 'Geist',system-ui,sans-serif";x.fillText(b,sunDot?72:40,H*.42+54)}
  var cards=[
    {x:-13.5,y:7.6,z:3.5,w:10,h:3.4,draw:function(x){lbl(x,"LIGHT READ",light().word,false)}},
    {x:13.5,y:6.8,z:4.5,w:9.6,h:3.4,draw:function(x){var g=SUN.golden();lbl(x,"GOLDEN HOUR",g?SUN.hm(g[0])+" – "+SUN.hm(g[1]):"–",true)}},
    {x:-13,y:-7.6,z:2.8,w:8.6,h:3.4,draw:function(x){lbl(x,"LENS · FRAME","35 mm · 2.39",false)}},
    {x:13,y:-7,z:3.2,w:9,h:3.4,draw:function(x){var s=sun();lbl(x,"SUN · "+SUN.hm(tm),s.el<=-1?"Below the horizon":Math.round(s.el)+"° up · "+Math.round(s.az)+"°",true)}}
  ];
  cards.forEach(function(c){var ct=cardTex(Math.round(c.w*60),Math.round(c.h*60));c.cv=ct.c;c.tex=ct.t;
    c.mesh=new T.Mesh(new T.PlaneGeometry(c.w,c.h),new T.MeshBasicMaterial({map:ct.t,transparent:true,toneMapped:false,depthWrite:false,opacity:0}));c.mesh.position.set(c.x*.3,c.y*.3,D/2);inner.add(c.mesh);
    var lg=new T.BufferGeometry().setFromPoints([new T.Vector3(c.x*.45,c.y*.45,D/2+bev+.02),new T.Vector3(c.x,c.y,c.z)]);c.line=new T.Line(lg,new T.LineBasicMaterial({color:0xECEBE6,transparent:true,opacity:0}));inner.add(c.line)});
  function redrawCards(){cards.forEach(function(c){c.draw(c.cv.getContext("2d"));c.tex.needsUpdate=true})}
  redrawCards();hooks.push(redrawCards);

  function size(){var r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;
    var tn=Math.tan(cam.fov*Math.PI/360),zw=(Wd*1.3)/(2*tn*cam.aspect),zh=(Hd*1.9)/(2*tn);cam.position.z=Math.max(zw,zh);cam.updateProjectionMatrix()}
  size();addEventListener("resize",size);

  var yaw=-.3,pitch=0,vy=0,drag=null;
  cv.addEventListener("pointerdown",function(e){drag={x:e.clientX,y:e.clientY,yaw:yaw,pitch:pitch};cv.setPointerCapture(e.pointerId);stage.classList.add("held")});
  cv.addEventListener("pointermove",function(e){if(!drag)return;var nx=drag.yaw+(e.clientX-drag.x)*.012;vy=(nx-yaw)*.6;yaw=nx;pitch=clamp(drag.pitch+(e.clientY-drag.y)*.006,-.5,.5)});
  function up(){drag=null;stage.classList.remove("held")}
  cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  cv.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){vy-=.08;e.preventDefault()}if(e.key==="ArrowRight"){vy+=.08;e.preventDefault()}});

  var visible=true;if("IntersectionObserver" in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)loop()},{rootMargin:"100px"}).observe(stage);
  var t0=performance.now(),looping=false,frame=0,lastT=0;stage.classList.add("ready");
  function progress(){var r=stage.getBoundingClientRect();return RM?1:clamp((innerHeight-r.top)/(innerHeight*.85),0,1)}
  function loop(){if(looping)return;looping=true;requestAnimationFrame(step)}
  function step(now){
    if(!visible){looping=false;return}
    var t=(now-t0)/1000,dt=Math.min(.05,t-lastT);lastT=t;var p=ease(progress()),land=1-p;
    if(playing){var nt=tm+dt*42;if(nt>=+slider.max){nt=+slider.max;playing=false;play.textContent="Play the day"}setTime(nt)}
    if(!drag){yaw+=vy;vy*=.94;if(Math.abs(vy)<.0005)yaw+=((-.3+Math.sin(t*.3)*.18)-yaw)*.012}
    phone.position.set(0,-28*land*land+Math.sin(t*.9)*.2*p,0);
    phone.rotation.set(.5*land+pitch+.12*p,yaw-2.6*land,-.3*land+Math.sin(t*.6)*.015);
    phone.scale.setScalar(.7+.3*p);
    var lift=clamp((p-.82)/.18,0,1);
    cards.forEach(function(c,i){var k=ease(clamp(lift*1.4-i*.12,0,1));c.mesh.position.set(c.x*(.3+.7*k),c.y*(.3+.7*k)+Math.sin(t*1.1+i)*.12*k,D/2+.1+(c.z-.1)*k);c.mesh.material.opacity=k;c.line.material.opacity=.35*k});
    if(frame++%3===0){drawScreen(sc);tex.needsUpdate=true}
    renderer.render(scene,cam);requestAnimationFrame(step);
  }
  drawScreen(sc);tex.needsUpdate=true;
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){drawScreen(sc);tex.needsUpdate=true;redrawCards()});
  loop();
}
})();
