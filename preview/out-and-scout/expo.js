/* Exposure the Out & Scout way: tap to focus, then pull the sun beside the square
   up to brighten or down to darken, two stops each way. Long press locks it. No menus. */
(function () {
  var root = document.getElementById("expo"); if (!root) return;
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var vf = document.getElementById("ex-vf"), pic = document.getElementById("ex-pic"), fs = document.getElementById("ex-fs"),
      sun = document.getElementById("ex-sun"), lock = document.getElementById("ex-lock"), fin = document.getElementById("ex-fin"),
      cap = document.getElementById("ex-cap");
  var bias = 0, locked = false, T = [], auto = true, hideT = 0;
  function stop() { return parseFloat(getComputedStyle(fs).getPropertyValue("--stop")) || 24; }
  function setBias(b) {
    bias = Math.max(-2, Math.min(2, b));
    pic.style.filter = "brightness(" + Math.pow(2, bias * .55).toFixed(3) + ")";
    sun.style.transform = "translate(-50%, -50%) translateY(" + (-bias * stop()).toFixed(1) + "px)";
  }
  function place(x, y) { fs.style.left = x + "px"; fs.style.top = y + "px"; fs.classList.add("on"); fs.classList.remove("pop"); void fs.offsetWidth; fs.classList.add("pop"); }
  function setLock(on) { locked = on; lock.classList.toggle("on", on); }
  function finger(x, y, down) { fin.style.left = x + "px"; fin.style.top = y + "px"; fin.classList.add("on"); fin.classList.toggle("down", !!down); }
  function sunXY() { var r = sun.getBoundingClientRect(), b = vf.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; }
  function at(ms, f) { T.push(setTimeout(f, ms)); }
  function clear() { T.forEach(clearTimeout); T = []; }
  function reset() { clear(); setBias(0); setLock(false); fs.classList.remove("on"); fin.classList.remove("on", "down"); cap.textContent = "Tap to focus"; }
  // the demo: tap, pull the sun down, ease it back up, hold to lock
  function play() {
    reset(); if (!auto) return;
    var w = vf.clientWidth, h = vf.clientHeight, x = w * .42, y = h * .5;
    at(500, function () { finger(x, y); });
    at(1100, function () { finger(x, y, true); place(x, y); cap.textContent = "Tap to focus"; });
    at(1350, function () { finger(x, y); });
    at(2000, function () { var p = sunXY(); finger(p[0], p[1]); cap.textContent = "Pull the sun down to darken"; });
    at(2500, function () { fin.classList.add("down"); });
    var t0 = 2600, n = 24;
    for (var i = 1; i <= n; i++) (function (i) { at(t0 + i * 45, function () { setBias(-1.4 * i / n); var p = sunXY(); finger(p[0], p[1], true); }); })(i);
    at(4200, function () { cap.textContent = "Up to brighten"; });
    for (i = 1; i <= 12; i++) (function (i) { at(4300 + i * 45, function () { setBias(-1.4 + .7 * i / 12); var p = sunXY(); finger(p[0], p[1], true); }); })(i);
    at(5300, function () { fin.classList.remove("down"); });
    at(6000, function () { finger(x, y); cap.textContent = "Hold to lock"; });
    at(6400, function () { fin.classList.add("down", "hold"); });
    at(7200, function () { setLock(true); fin.classList.remove("down", "hold"); });
    at(7600, function () { fin.classList.remove("on"); cap.textContent = "Your turn: tap the picture, then drag the sun"; });
    at(11500, function () { if (auto) play(); });
  }
  // your turn
  function stopAuto() { if (!auto) return; auto = false; clear(); fin.classList.remove("on", "down", "hold"); }
  function local(e) { var b = vf.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
  var drag = null;
  sun.addEventListener("pointerdown", function (e) {
    stopAuto(); drag = { y: e.clientY, b: bias }; e.stopPropagation(); e.preventDefault();
    try { sun.setPointerCapture(e.pointerId); } catch (x) {}
    cap.textContent = "Down darker, up brighter";
  });
  sun.addEventListener("pointermove", function (e) { if (drag) setBias(drag.b - (e.clientY - drag.y) / stop()); });
  ["pointerup", "pointercancel"].forEach(function (t) { sun.addEventListener(t, function () { drag = null; }); });
  var pressT = 0, pressAt = null;
  vf.addEventListener("pointerdown", function (e) {
    if (e.target === sun) return; stopAuto(); pressAt = local(e);
    pressT = setTimeout(function () { place(pressAt[0], pressAt[1]); setLock(true); cap.textContent = "Locked"; pressAt = null; }, 600);
  });
  vf.addEventListener("pointermove", function (e) { if (pressAt) { var p = local(e); if (Math.abs(p[0] - pressAt[0]) + Math.abs(p[1] - pressAt[1]) > 10) { clearTimeout(pressT); pressAt = null; } } });
  vf.addEventListener("pointerup", function () {
    clearTimeout(pressT); if (!pressAt) return;
    place(pressAt[0], pressAt[1]); setLock(false); cap.textContent = "Now drag the sun"; pressAt = null;
  });
  vf.addEventListener("pointercancel", function () { clearTimeout(pressT); pressAt = null; });
  addEventListener("resize", function () { setBias(bias); });
  setBias(0);
  if (RM) { auto = false; place(vf.clientWidth * .42, vf.clientHeight * .5); setBias(-.8); cap.textContent = "Tap the picture, then drag the sun"; return; }
  var running = false;
  new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !running && auto) { running = true; play(); } if (!e.isIntersecting && auto) { running = false; reset(); } }); }, { threshold: .5 }).observe(vf);
})();
