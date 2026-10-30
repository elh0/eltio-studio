/* Helix extras (30 Oct, Elliot: "wow factor but simple").
   1. Sound on: a quiet loop (a placeholder, made in the browser, until Leo sends a piece of his
      own music) and a ripple that runs through the cards on every beat.
   2. Fan: the faster you scroll or drag, the further the cards fan open; they settle when still. */
var FX = (function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fan = 0, last = null, waves = [], level = 0;
  var ctx = null, out = null, an = null, buf = null, on = false, timer = 0, next = 0, step = 0;
  var BPM = 92, S16 = 60 / BPM / 4;
  var chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66], [52, 55, 59, 62]];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function tick(off) {
    if (last !== null && !reduce) {
      var v = Math.abs(off - last), want = Math.min(16, v * 80);
      fan += (want - fan) * (want > fan ? .25 : .06);
    }
    last = off;
    var now = performance.now();
    waves = waves.filter(function (w) { return now - w.t < 1800; });
    if (an) { an.getByteTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i += 4) { var x = (buf[i] - 128) / 128; s += x * x; } level += (Math.sqrt(s / (buf.length / 4)) - level) * .2; }
    else level *= .9;
  }
  /* how far a card at path position u is pushed out right now */
  function bump(u) {
    if (reduce) return 0;
    var b = 0, now = performance.now();
    for (var k = 0; k < waves.length; k++) {
      var t = (now - waves[k].t) / 1000, front = -N / 2 + t * N / 1.5, d = (u - front) / (G.per * .12);
      b += waves[k].a * Math.exp(-d * d) * Math.max(0, 1 - t / 1.8);
    }
    return b + level * 60;
  }

  /* the placeholder loop: soft kick, brushed hat, a slow pad */
  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .22);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .5);
    var ms = (t - ctx.currentTime) * 1000;
    setTimeout(function () { if (on) waves.push({ t: performance.now(), a: G.cw * .55 }); }, Math.max(0, ms));
  }
  function hat(t, v) {
    var n = ctx.createBufferSource(), len = ctx.sampleRate * .05, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b; var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    var g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    n.connect(f); f.connect(g); g.connect(out); n.start(t);
  }
  function pad(t, notes, dur) {
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1400, t + dur / 2); f.frequency.linearRampToValueAtTime(500, t + dur);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + .8); g.gain.setValueAtTime(.05, t + dur - .6); g.gain.linearRampToValueAtTime(.0001, t + dur + .4);
    f.connect(g); g.connect(out);
    notes.forEach(function (m) { [-6, 6].forEach(function (det) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m - 12); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + .5); }); });
  }
  function schedule() {
    while (next < ctx.currentTime + .15) {
      var s = step % 64;
      if (s % 4 === 0) kick(next);
      if (s % 4 === 2) hat(next, .05); else if (s % 2 === 1) hat(next, .015);
      if (s % 16 === 0) pad(next, chords[(s / 16) % 4], S16 * 16);
      next += S16; step++;
    }
  }
  /* iPhones mute web audio when the side switch is on silent; asking for media playback (and a
     silent looping track, for older iOS) makes the loop play like a video does */
  var keep = null;
  function wake() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!keep) {
      keep = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==');
      keep.loop = true; keep.setAttribute('playsinline', '');
    }
    keep.play().catch(function () {});
  }
  function start() {
    wake();
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      out = ctx.createGain(); out.gain.value = 0;
      an = ctx.createAnalyser(); an.fftSize = 512; buf = new Uint8Array(an.fftSize);
      out.connect(an); an.connect(ctx.destination);
    }
    ctx.resume(); on = true; next = ctx.currentTime + .08; step = 0;
    out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(.8, ctx.currentTime, .25);
    clearInterval(timer); timer = setInterval(schedule, 25); schedule();
  }
  function stop() {
    on = false; clearInterval(timer);
    if (ctx) { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, .15); }
  }

  /* 30 Oct, Elliot: no sound switch on the home page; the loop code stays for when Leo's own
     music comes in, but nothing starts it for now */

  return { tick: tick, bump: bump, get fan() { return fan; } };
})();
