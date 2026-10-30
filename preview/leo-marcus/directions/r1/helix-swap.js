/* Switching films inside the player (30 Oct, Elliot: "the next project slides in first, then the
   text, like a VR headset UI"). The old film recedes into the distance, the next one glides in
   from the side in depth, then the title and credits settle in one after another. */
function spatialSwap(o) {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !o.film.animate) { o.fill(); return; }
  var dir = o.dir || 1, f = o.film, r = f.getBoundingClientRect();
  var ease = 'cubic-bezier(.16, 1, .3, 1)';
  /* the old film: a copy left where it was, which drifts back and away */
  var ghost = f.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.style.cssText = 'position:fixed;margin:0;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;z-index:80;pointer-events:none;transform-origin:50% 50%';
  document.body.appendChild(ghost);
  o.fill();
  ghost.animate([
    { transform: 'perspective(1400px) translate3d(0,0,0) rotateY(0)', opacity: 1, filter: 'blur(0)' },
    { transform: 'perspective(1400px) translate3d(' + (-dir * 38) + '%,0,-520px) rotateY(' + (dir * 22) + 'deg)', opacity: 0, filter: 'blur(6px)' }
  ], { duration: 760, easing: ease, fill: 'forwards' }).onfinish = function () { ghost.remove(); };
  /* the new film: in from the far side, turning to face you */
  f.animate([
    { transform: 'perspective(1400px) translate3d(' + (dir * 46) + '%,0,-620px) rotateY(' + (-dir * 26) + 'deg)', opacity: 0, filter: 'blur(8px)' },
    { transform: 'perspective(1400px) translate3d(0,0,0) rotateY(0)', opacity: 1, filter: 'blur(0)' }
  ], { duration: 1050, delay: 90, easing: ease, fill: 'backwards' });
  /* then the words, one line at a time */
  (o.text || []).forEach(function (el, k) {
    if (!el) return;
    el.animate([
      { transform: 'translate3d(' + (dir * 24) + 'px,10px,0)', opacity: 0, filter: 'blur(6px)' },
      { transform: 'none', opacity: 1, filter: 'blur(0)' }
    ], { duration: 700, delay: 480 + k * 80, easing: ease, fill: 'backwards' });
  });
}
