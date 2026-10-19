/* Out & Scout: the dawn, the head torch, the route behind the page, the places strip, and sending the PDF. */
(function(){
"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches,FINE=matchMedia("(pointer: fine)").matches;
var NS="http://www.w3.org/2000/svg";
function $(s){return document.querySelector(s)}
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function clamp(v,a,b){return v<a?a:v>b?b:v}

/* ---------- dawn: the page comes up from blue hour, once a visit ---------- */
var dawn=$("#dawn"),seen=false;
try{seen=sessionStorage.getItem("os-dawn")==="1";sessionStorage.setItem("os-dawn","1")}catch(e){}
if(dawn){if(RM||seen)dawn.remove();else{dawn.classList.add("go");dawn.addEventListener("animationend",function(e){if(e.target===dawn)dawn.remove()});setTimeout(function(){if(dawn.parentNode)dawn.remove()},3200)}}

/* ---------- the cursor is a head torch ---------- */
var torch=$("#torch");
if(torch&&FINE&&!RM){
  var tx=innerWidth/2,ty=innerHeight/2,cx=tx,cy=ty,on=false,running=false;
  function f(){cx+=(tx-cx)*.16;cy+=(ty-cy)*.16;torch.style.transform="translate3d("+(cx-320)+"px,"+(cy-320)+"px,0)";if(Math.abs(tx-cx)+Math.abs(ty-cy)>.5)requestAnimationFrame(f);else running=false}
  function run(){if(running)return;running=true;requestAnimationFrame(f)}
  addEventListener("pointermove",function(e){tx=e.clientX;ty=e.clientY;if(!on){on=true;cx=tx;cy=ty;torch.classList.add("on")}run()},{passive:true});
  document.addEventListener("pointerleave",function(){torch.classList.remove("on")});
  document.addEventListener("pointerenter",function(){torch.classList.add("on")});
}else if(torch)torch.remove();

/* ---------- the route behind the page: contours, a path that draws as you walk down, a marker per shot ---------- */
var bg=$("#bgtrail"),route=null,marks=[],docH=0;
function buildTrail(){
  if(!bg)return;bg.innerHTML="";marks=[];
  var W=document.documentElement.clientWidth;docH=document.documentElement.scrollHeight;bg.style.height=docH+"px";
  var svg=el("svg",{width:W,height:docH,viewBox:"0 0 "+W+" "+docH},bg);
  /* contour lines: long slow waves, faint */
  var cg=el("g",{"class":"tr-contour"},svg);
  for(var y=260;y<docH;y+=170){var d="M-20 "+y,amp=28+((y/170)%4)*9;for(var x=0;x<=W+40;x+=40)d+=" L"+x+" "+(y+Math.sin(x/230+y/400)*amp+Math.sin(x/95+y/150)*8).toFixed(1);el("path",{d:d},cg)}
  /* an OS style grid, crosses only */
  var gd="";for(var gy=120;gy<docH;gy+=240)for(var gx=60;gx<W;gx+=240)gd+="M"+(gx-4)+" "+gy+"h8M"+gx+" "+(gy-4)+"v8";el("path",{"class":"tr-cross",d:gd},svg);
  /* the route: weaves between the sections, one marker where each feature sits */
  var sy=scrollY,secs=document.querySelectorAll(".feat, .does, .join"),marg=Math.max(40,(W-1240)/2),wide=W>1100;
  var xs=[wide?marg*.45:22,wide?W-marg*.45:W-22],cx=xs[0],cy=140,p="M"+cx+" "+cy,n=0;
  Array.prototype.forEach.call(secs,function(s,i){
    var r=s.getBoundingClientRect(),gy=r.top+sy-44,nx=xs[(i+1)%2],dd=nx>cx?1:-1;
    /* down the margin with a little wander, then across the gap above the section */
    var steps=Math.max(2,Math.round((gy-cy)/260));
    for(var k=1;k<=steps;k++){var yy=cy+(gy-40-cy)*k/steps,wx=cx+dd*Math.sin(k*1.7+i)*14;p+=" S"+(wx+dd*10)+" "+(yy-60)+" "+wx+" "+yy}
    p+=" S"+(cx+dd*40)+" "+(gy+8)+" "+(cx+dd*120)+" "+gy+" S"+((cx+nx)/2)+" "+(gy-10)+" "+(nx-dd*120)+" "+gy+" S"+(nx-dd*30)+" "+(gy+2)+" "+nx+" "+(gy+30);
    var isShot=s.classList.contains("feat")&&!s.classList.contains("big")||s.id==="app"||s.id==="list";
    n++;marks.push({x:nx,y:gy+30,n:n,label:(s.querySelector(".mono")||{}).textContent||"",dir:nx<W/2?1:-1,shot:isShot&&wide});
    cx=nx;cy=gy+30;
  });
  p+=" L"+cx+" "+(docH-60);
  route=el("path",{d:p,"class":"tr-route",pathLength:1000},svg);
  /* north arrow, top right */
  var na=el("g",{"class":"tr-north",transform:"translate("+(W-36)+",150)"},svg);el("path",{d:"M0 -16 L6 8 L0 4 L-6 8 Z"},na);var nt=el("text",{y:24,"text-anchor":"middle"},na);nt.textContent="N";
  marks.forEach(function(m){
    var g=el("g",{"class":"tr-mark"},svg);m.g=g;
    el("circle",{cx:m.x,cy:m.y,r:4},g);
    if(m.shot){/* the camera's field of view, a wedge off the marker */
      var dd=m.dir,L=wide?Math.min(marg*.8,170):90;
      el("path",{"class":"tr-fov",d:"M"+m.x+" "+m.y+"L"+(m.x+dd*L)+" "+(m.y-L*.36)+"M"+m.x+" "+m.y+"L"+(m.x+dd*L)+" "+(m.y+L*.36)},g);
      el("path",{"class":"tr-arc",d:"M"+(m.x+dd*L*.55)+" "+(m.y-L*.2)+"A"+(L*.6)+" "+(L*.6)+" 0 0 "+(dd>0?1:0)+" "+(m.x+dd*L*.55)+" "+(m.y+L*.2)},g);
    }
    var t=el("text",{x:m.x+(m.dir>0?12:-12),y:m.y+3,"text-anchor":m.dir>0?"start":"end"},g);t.textContent=("0"+m.n).slice(-2)+(wide&&m.label?" · "+m.label.trim():"");
    m.at=nearest(m.y);
  });
  tick();
}
function nearest(y){var L=route.getTotalLength(),lo=0,hi=L;for(var i=0;i<24;i++){var mid=(lo+hi)/2;if(route.getPointAtLength(mid).y<y)lo=mid;else hi=mid}return lo/L}
var raf=0;
function tick(){raf=0;if(!route)return;var p=RM?1:clamp((scrollY+innerHeight*.8)/docH,0,1);route.style.strokeDashoffset=String(1000*(1-p));marks.forEach(function(m){m.g.classList.toggle("on",p>=m.at)})}
if(bg){
  addEventListener("scroll",function(){if(!raf)raf=requestAnimationFrame(tick)},{passive:true});
  var rt=0;addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(buildTrail,200)});
  if(document.readyState==="complete")buildTrail();else addEventListener("load",buildTrail);
  if(window.ResizeObserver){var lastH=0;new ResizeObserver(function(){var h=document.documentElement.scrollHeight;if(Math.abs(h-lastH)>40){lastH=h;clearTimeout(rt);rt=setTimeout(buildTrail,200)}}).observe(document.body)}
}

/* ---------- places strip: today's sun at real places, live ---------- */
var strip=$("#places");
if(strip){
  var rad=Math.PI/180;
  function sunPos(t,lat,lon){var d=t/864e5-.5+2440588-2451545,M=rad*(357.5291+.98560028*d);var L=M+rad*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M))+rad*102.9372+Math.PI,e=rad*23.4397;var dec=Math.asin(Math.sin(e)*Math.sin(L)),ra=Math.atan2(Math.sin(L)*Math.cos(e),Math.cos(L));var H=rad*(280.16+360.9856235*d)+rad*lon-ra,phi=rad*lat;return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H))/rad}
  var LF=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  function parts(d){var o={};LF.formatToParts(d).forEach(function(p){o[p.type]=p.value});return o}
  var P=parts(new Date()),G=Date.UTC(+P.year,+P.month-1,+P.day),GP=parts(new Date(G)),MID=G-((+GP.hour)*60+(+GP.minute))*6e4;
  function hm(m){m=Math.round(m);return ("0"+Math.floor(m/60)).slice(-2)+":"+("0"+m%60).slice(-2)}
  var PL=[["Knole Park",51.269,.205],["Seven Sisters",50.75,.15],["Dungeness",50.914,.969],["Dartmoor",50.57,-3.92],["Brecon Beacons",51.884,-3.436],["Snowdon",53.068,-4.076],["Peak District",53.35,-1.8],["Lake District",54.46,-3.09],["Glencoe",56.68,-5.1],["Isle of Skye",57.27,-6.2]];
  var now=(+P.hour)*60+(+P.minute);
  var html=PL.map(function(pl){
    var rise=null,set=null,gs=null,ge=null,prev=sunPos(MID,pl[1],pl[2]);
    for(var m=2;m<=1440;m+=2){var e=sunPos(MID+m*6e4,pl[1],pl[2]);if(prev<-.833&&e>=-.833&&rise===null)rise=m;if(prev>=-.833&&e<-.833)set=m;if(m>=720&&e<6&&prev>=6&&gs===null)gs=m;if(m>=720&&e<-4&&prev>=-4&&ge===null)ge=m;prev=e}
    var up=sunPos(MID+now*6e4,pl[1],pl[2])>-.833;
    return '<span><i'+(up?' class="lit"':'')+'></i><b>'+pl[0]+'</b> ↑ '+(rise?hm(rise):"–")+' · golden '+(gs?hm(gs):"–")+'–'+(ge?hm(ge):"–")+' · ↓ '+(set?hm(set):"–")+'</span>'
  }).join("");
  strip.querySelector(".pl-track").innerHTML=html+html;
}

/* ---------- send the PDF: the pages stack, fly off, and a receipt comes back ---------- */
var film=$("#film"),sendBtn=$("#fsend"),toast=$("#ftoast");
if(film&&sendBtn){
  sendBtn.addEventListener("click",function(){
    if(film.classList.contains("sent"))return;
    var n=film.querySelectorAll(".pp").length,name=($("#fpage").textContent.split("·")[0]||"shot-list.pdf").trim();
    film.classList.add("sent");sendBtn.disabled=true;
    setTimeout(function(){
      toast.innerHTML='<i></i>'+name+' · '+n+' page'+(n===1?"":"s")+' · sent to the director and the 1st AD';toast.classList.add("show");
      film.classList.remove("sent");sendBtn.disabled=false;
      if(window.OS_FILM)window.OS_FILM.restart();
      setTimeout(function(){toast.classList.remove("show")},3600);
    },RM?0:800);
  });
}
})();
