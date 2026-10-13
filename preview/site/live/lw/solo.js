// Shows one panel of a Grip page on its own, filling the frame: #q=<selector>&i=<index>&click=<selector>
(function () {
  var q = {}; location.hash.slice(1).split('&').forEach(function (kv) { var j = kv.indexOf('='); if (j > 0) q[kv.slice(0, j)] = decodeURIComponent(kv.slice(j + 1)); });
  if (!q.q) return;
  function run() {
    if (q.click) { var c = document.querySelector(q.click); if (c) c.click(); }
    var el = document.querySelectorAll(q.q)[+q.i || 0]; if (!el) return;
    var st = document.createElement('style');
    st.textContent = 'html,body{overflow:hidden!important;background:' + (q.bg || '#000') + '!important;margin:0}body *{visibility:hidden}' +
      '.solo-on,.solo-on *{visibility:visible}.solo-on{position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;margin:0!important;z-index:2147483647;box-sizing:border-box;max-width:none!important;border-radius:0!important}';
    document.head.appendChild(st); el.classList.add('solo-on');
    dispatchEvent(new Event('resize'));
  }
  if (document.readyState === 'complete') setTimeout(run, 50); else addEventListener('load', function () { setTimeout(run, 50); });
})();
