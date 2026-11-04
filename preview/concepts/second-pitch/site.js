(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, F = window.FLAV || {};
  // entrances
  var els=[].slice.call(document.querySelectorAll('.rise'));
  if(!('IntersectionObserver' in window)||reduce){els.forEach(function(e){e.classList.add('in')})}
  else{var io=new IntersectionObserver(function(en){var i=0;en.forEach(function(x){if(x.isIntersecting){var el=x.target;setTimeout(function(){el.classList.add('in')},(i++)*80);io.unobserve(el)}})},{rootMargin:'0px 0px -8% 0px'});els.forEach(function(e){io.observe(e)})}
  // route line draws as you climb the page
  var line=document.getElementById('routeLine'), bl=document.querySelector('.bandline');
  function onScroll(){var h=document.documentElement.scrollHeight-innerHeight, p=h>0?Math.min(1,scrollY/h):1;
    if(line){line.style.strokeDasharray='1';line.style.strokeDashoffset=String(1-Math.max(.04,p))}
    if(bl){var r=bl.ownerSVGElement.getBoundingClientRect(),q=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight+r.height)*1.6));bl.style.strokeDasharray='1';bl.style.strokeDashoffset=String(1-q)}}
  if(!reduce){addEventListener('scroll',function(){requestAnimationFrame(onScroll)},{passive:true});onScroll()}
  // pack drawing
  function setPack(svg,k){if(!svg||!F[k])return;var f=F[k],p=f.pts,m=p[Math.floor(p.length/2)];
    svg.style.setProperty('--pack',f.col);svg.querySelector('.line').setAttribute('d',f.d);
    [[p[0],'.r1'],[m,'.r2'],[p[p.length-1],'.r3']].forEach(function(a){var c=svg.querySelector(a[1]);c.setAttribute('cx',a[0][0]);c.setAttribute('cy',a[0][1])});
    svg.querySelector('.fname').textContent=f.name;svg.querySelector('.fmeta').textContent=f.grade+' · 55g · Made in Sheffield';
    svg.setAttribute('aria-label','Pack front: '+f.name+', grade '+f.grade)}
  var live=document.getElementById('livePack');
  // home: pick a route
  var names=document.getElementById('names');
  if(names){names.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var k=b.dataset.k;
    [].forEach.call(names.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b)});
    document.querySelector('.show').style.setProperty('--pack',F[k].col);
    live.classList.add('swap');setTimeout(function(){setPack(live,k);live.classList.remove('swap')},180);
    document.getElementById('factG').textContent=F[k].grade+'  ·  '+F[k].price;document.getElementById('factT').textContent=F[k].fact;
    var a=document.getElementById('factLink');a.href=k==='pk'?'drop.html':'bar.html#'+k;a.textContent=k==='pk'?'See the drop':'See this bar'})}
  // product page
  var prod=document.getElementById('prod');
  if(prod){var ING={pd:'Rolled oats (40%), dates (24%), roasted peanuts (18%), golden syrup, sunflower oil, sea salt.',go:'Rolled oats (46%), golden syrup, butter (milk), stem ginger (9%), brown sugar, ground ginger, sea salt.',cr:'Rye flakes (22%), rolled oats (20%), dates, dark chocolate (12%) (cocoa mass, sugar, cocoa butter), cocoa powder (4%), sunflower oil, sea salt.'};
    function pick(k){if(!F[k]||k==='pk')return;[].forEach.call(document.querySelectorAll('.flav button'),function(x){x.setAttribute('aria-pressed',x.dataset.k===k)});
      prod.style.setProperty('--pack',F[k].col);setPack(live,k);document.getElementById('pName').textContent=F[k].name;document.getElementById('pGrade').textContent=F[k].grade;document.getElementById('pFact').textContent=F[k].fact;document.getElementById('ing').textContent=ING[k]}
    document.querySelector('.flav').addEventListener('click',function(e){var b=e.target.closest('button');if(b)pick(b.dataset.k)});
    pick((location.hash||'#pd').slice(1));
    prod.addEventListener('change',function(e){if(e.target.name==='size'){var v=+e.target.value;document.getElementById('price').textContent='£'+(v%1?v.toFixed(2):v)}});
    document.getElementById('add').addEventListener('click',function(){document.getElementById('note').textContent='This is a concept shop by Eltio Studio, so nothing was added. On a real build this opens the bag.'})}
  // countdowns
  function tick(){var c=document.getElementById('clock');if(!c)return;var t=new Date(c.dataset.to)-new Date();if(t<0)t=0;
    document.getElementById('cdD').textContent=Math.floor(t/864e5);document.getElementById('cdH').textContent=String(Math.floor(t/36e5)%24).padStart(2,'0');document.getElementById('cdM').textContent=String(Math.floor(t/6e4)%60).padStart(2,'0')}
  tick();setInterval(tick,30000);
  var cd=document.getElementById('cd');if(cd){var d=Math.ceil((new Date(cd.dataset.to)-new Date())/864e5);if(d>0)cd.firstChild.textContent='Sat 21 Nov, 9am · '+d+' days'}
  // calendar file for the drop
  var ics=document.getElementById('ics');if(ics){var s=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Second Pitch concept//EN','BEGIN:VEVENT','UID:parkin-2026@second-pitch.concept','DTSTAMP:20261104T090000Z','DTSTART:20261121T090000Z','DTEND:20261121T093000Z','SUMMARY:Parkin drop (Second Pitch concept)','DESCRIPTION:800 numbered tins. A concept by Eltio Studio.','END:VEVENT','END:VCALENDAR'].join('\r\n');ics.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(s)}
  // home tabs
  var tl=document.querySelector('[role=tablist]');
  if(tl){var tabs=[].slice.call(tl.querySelectorAll('[role=tab]'));function sel(t){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=!on})}
    tl.addEventListener('click',function(e){var t=e.target.closest('[role=tab]');if(t)sel(t)});
    tl.addEventListener('keydown',function(e){var i=tabs.indexOf(document.activeElement);if(i<0)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){var n=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];n.focus();sel(n)}})}
})();
