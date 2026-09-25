/* ============================================================
   showcase.js — the front page's two "what R can do" figures, moved here
   from Daniel's "Starch curves in R" (B1.1 practical companion, Aug 2026):
   the 3D cloud you can drag, and a copy button on every code block.
   ============================================================ */
(function () {
  'use strict';
  /* on a phone the map-and-charts figure keeps a readable size and scrolls sideways */
  document.querySelectorAll('.showcase .taste.fig > svg').forEach(function (svg) {
    var wrap = document.createElement('div'); wrap.className = 'figscroll';
    svg.parentNode.insertBefore(wrap, svg); wrap.appendChild(svg);
    var hint = document.createElement('p'); hint.className = 'figswipe'; hint.setAttribute('aria-hidden', 'true');
    hint.textContent = '↔ Swipe the figure to see all of it';
    wrap.parentNode.insertBefore(hint, wrap.nextSibling);
  });
  /* a labelled bar with a copy button on every code block */
  document.querySelectorAll('.code').forEach(function (box) {
    var bar = document.createElement('div'); bar.className = 'bar';
    var tag = document.createElement('span'); tag.className = 'tag'; tag.innerHTML = box.getAttribute('data-lang') || 'R';
    var btn = document.createElement('button'); btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var text = box.querySelector('pre').innerText;
      var done = function () { btn.textContent = 'Copied'; btn.classList.add('done'); setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
      else fallback(text, done);
    });
    function fallback(text, done) {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Select and copy'; }
      document.body.removeChild(ta);
    }
    bar.appendChild(tag); bar.appendChild(btn); box.insertBefore(bar, box.firstChild);
  });
})();
/* ---- interactive 3D PCA cloud: hand-written, no external library ---- */
(function () {
  var cv = document.getElementById('pca3d');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');

  var seed = 20260828;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function gauss() { return (rnd()+rnd()+rnd()+rnd()+rnd()+rnd()-3) / 1.15; }

  /* Groups 2 and 3 are placed along this camera's view axis, so from the
     starting angle they land on top of each other and read as one cluster.
     Any rotation pulls them apart. */
  var YAW0 = -0.62, PITCH0 = 0.30;
  var yaw = YAW0, pitch = PITCH0;
  var RX = 2.6, RY = 1.5, RZ = 1.6, D = 14;
  var SEP = [0.892, 0.475, 1.250], MID = [1.10, 0.28, 0.00];
  var GROUPS = [
    { c: [-1.62, 0.10, 0.00], s: 0.40, n: 48 },
    { c: [MID[0]-SEP[0]/2, MID[1]-SEP[1]/2, MID[2]-SEP[2]/2], s: 0.36, n: 44 },
    { c: [MID[0]+SEP[0]/2, MID[1]+SEP[1]/2, MID[2]+SEP[2]/2], s: 0.36, n: 42 }
  ];
  var pts = [];
  GROUPS.forEach(function (g, gi) {
    for (var i = 0; i < g.n; i++) {
      pts.push({ x: g.c[0]+gauss()*g.s, y: g.c[1]+gauss()*g.s, z: g.c[2]+gauss()*g.s, g: gi });
    }
  });

  var CUBE = [[-RX,-RY,-RZ],[RX,-RY,-RZ],[RX,RY,-RZ],[-RX,RY,-RZ],
              [-RX,-RY,RZ],[RX,-RY,RZ],[RX,RY,RZ],[-RX,RY,RZ]];
  var EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  var AXES = [{ b:[RX,-RY,-RZ], t:'PC1' }, { b:[-RX,RY,-RZ], t:'PC2' }, { b:[-RX,-RY,RZ], t:'PC3' }];
  var O = [-RX,-RY,-RZ];

  var W = 0, H = 0, dpr = 1, scale = 1;
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
  }
  function proj(x, y, z) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x1 = x*cy + z*sy, z1 = -x*sy + z*cy;
    var y1 = y*cp - z1*sp, z2 = y*sp + z1*cp;
    var k = D / (D + z2);
    return { x: W/2 + x1*k*scale, y: H/2 - y1*k*scale, z: z2, k: k };
  }
  function draw() {
    if (!W || !H) return;
    var cols = [css('--indigo'), css('--amber'), css('--teal')];
    var rule = css('--rule'), ink3 = css('--ink3');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var pc = CUBE.map(function (v) { return proj(v[0], v[1], v[2]); });
    ctx.strokeStyle = rule; ctx.lineWidth = 1; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    EDGES.forEach(function (e) { ctx.moveTo(pc[e[0]].x, pc[e[0]].y); ctx.lineTo(pc[e[1]].x, pc[e[1]].y); });
    ctx.stroke();

    var o = proj(O[0], O[1], O[2]);
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    AXES.forEach(function (ax) {
      var b = proj(ax.b[0], ax.b[1], ax.b[2]);
      ctx.strokeStyle = ink3; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = ink3;
      ctx.fillText(ax.t, o.x + (b.x-o.x)*1.11, o.y + (b.y-o.y)*1.11);
    });

    pts.map(function (p) { var q = proj(p.x, p.y, p.z); q.g = p.g; return q; })
       .sort(function (a, b) { return b.z - a.z; })
       .forEach(function (q) {
         var t = (q.k - 0.80) / 0.42; t = t < 0 ? 0 : (t > 1 ? 1 : t);
         ctx.globalAlpha = 0.5 + 0.45*t;
         ctx.fillStyle = cols[q.g];
         ctx.beginPath(); ctx.arc(q.x, q.y, 2.7 + 2.2*t, 0, 6.2832); ctx.fill();
       });
    ctx.globalAlpha = 1;
  }
  function size() {
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    scale = Math.min(H * 0.145, W * 0.085);
    draw();
  }

  if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv);
  window.addEventListener('resize', size);

  var drag = null;
  cv.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY };
    cv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    yaw += (e.clientX - drag.x) * 0.0085;
    pitch = Math.max(-1.25, Math.min(1.25, pitch + (e.clientY - drag.y) * 0.0065));
    drag = { x: e.clientX, y: e.clientY }; draw();
  });
  ['pointerup','pointercancel'].forEach(function (t) {
    cv.addEventListener(t, function () { drag = null; });
  });
  cv.addEventListener('keydown', function (e) {
    var k = { ArrowLeft:[-0.11,0], ArrowRight:[0.11,0], ArrowUp:[0,-0.09], ArrowDown:[0,0.09] }[e.key];
    if (!k) return;
    yaw += k[0]; pitch = Math.max(-1.25, Math.min(1.25, pitch + k[1]));
    draw(); e.preventDefault();
  });
  var rst = document.getElementById('pca3d-reset');
  if (rst) rst.addEventListener('click', function () { yaw = YAW0; pitch = PITCH0; draw(); });

  size();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', draw); else if (mq.addListener) mq.addListener(draw);
  }
})();
