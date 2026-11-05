// reveal on scroll, staggered inside each block; autoplay videos only while seen
(function(){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){var el=e.target;el.classList.add('in');
      el.querySelectorAll('.track .pt').forEach(function(p,i){p.style.transitionDelay=(0.25+i*0.12)+'s';});
      io.unobserve(el);}
  });},{rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.rv').forEach(function(el,i){el.style.transitionDelay=((i%3)*0.07)+'s';io.observe(el);});
  var vo=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;
    if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){});}else v.pause();});},{threshold:.25});
  document.querySelectorAll('video').forEach(function(v){vo.observe(v);});
})();
