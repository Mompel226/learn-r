/* ============================================================
   story.js — a statistics idea told click by click, the way Daniel's
   C4.1 chi-squared slides tell it: one picture that builds, one short
   step of words beside it, an amber analogy where it helps, and every
   step waits for "Next step" (never a timer: animations wait for the
   reader).

   { type:'story', id, title, gate?, w, h,
     scene: function (S) { return svg-inner-markup },   // parts carry data-el="…"
     steps: [ { title, md, show:['el', …], focus:['el', …], analogy:'…',
                run: function (svg) { … } } ] }

   · show   parts that appear at this step (and stay)
   · hide   parts that leave at this step (a picture can move on: the tally
            makes way for the dots, the dots for the bars)
   · focus  parts lit at this step; everything else shown is dimmed
   · run    optional: animate something at this step (counts, growing bars)
   · pan    optional: the part a phone scrolls to (else the last part shown)
   Going Back rebuilds the picture up to that step, so it is always right.

   LR.S — tiny SVG helpers for scenes: scale, axes, bars, normal curve, text.
   ============================================================ */
(function (LR) {
  'use strict';
  var h = LR.h, md = LR.md, esc = LR.esc;

  /* ---------- SVG helpers ---------- */
  var S = LR.S = {};
  S.scale = function (d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; };
  S.g = function (el, inner, cls) { return '<g data-el="' + el + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</g>'; };
  S.text = function (x, y, t, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') + '" class="' + (o.cls || 'st-t') + '"' + (o.size ? ' font-size="' + o.size + '"' : '') + (o.weight ? ' font-weight="' + o.weight + '"' : '') + (o.fill ? ' fill="' + o.fill + '"' : '') + '>' + esc(t) + '</text>';
  };
  S.line = function (x1, y1, x2, y2, cls) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'st-ln') + '"/>'; };
  S.rect = function (x, y, w, hh, cls, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + (rx || 0) + '" class="' + (cls || 'st-bar') + '"/>'; };
  /* axes: o = { x0, x1, y0, y1 (pixels), xs, ys (scales), xTicks:[], yTicks:[], xLabel, yLabel } */
  S.axes = function (o) {
    var s = S.line(o.x0, o.y0, o.x1, o.y0, 'st-ax') + S.line(o.x0, o.y0, o.x0, o.y1, 'st-ax');
    (o.xTicks || []).forEach(function (t) { var x = o.xs(t.v != null ? t.v : t); s += S.line(x, o.y0, x, o.y0 + 5, 'st-ax') + S.text(x, o.y0 + 20, t.t != null ? t.t : t, { cls: 'st-tick' }); });
    (o.yTicks || []).forEach(function (t) { var y = o.ys(t.v != null ? t.v : t); s += S.line(o.x0 - 5, y, o.x0, y, 'st-ax') + S.text(o.x0 - 9, y + 4, t.t != null ? t.t : t, { cls: 'st-tick', anchor: 'end' }); });
    if (o.xLabel) s += S.text((o.x0 + o.x1) / 2, o.y0 + 42, o.xLabel, { cls: 'st-lab' });
    if (o.yLabel) s += '<text transform="translate(' + (o.x0 - 46) + ' ' + ((o.y0 + o.y1) / 2) + ') rotate(-90)" text-anchor="middle" class="st-lab">' + esc(o.yLabel) + '</text>';
    return s;
  };
  /* the normal curve as a path, scaled so its peak sits at yPeak (pixels) */
  S.normal = function (mean, sd, xs, yBase, yPeak, from, to, cls) {
    var n = 90, d = '', pk = 1 / (sd * Math.sqrt(2 * Math.PI));
    from = from != null ? from : mean - 4 * sd; to = to != null ? to : mean + 4 * sd;
    for (var i = 0; i <= n; i++) {
      var v = from + (to - from) * i / n, f = Math.exp(-0.5 * Math.pow((v - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
      d += (i ? ' L' : 'M') + xs(v).toFixed(1) + ' ' + (yBase - (yBase - yPeak) * f / pk).toFixed(1);
    }
    return '<path d="' + d + '" class="' + (cls || 'st-curve') + '" pathLength="1"/>';
  };
  /* the area under a normal curve between a and b, closed to the baseline */
  S.normalArea = function (mean, sd, xs, yBase, yPeak, a, b, cls) {
    var n = 60, d = 'M' + xs(a).toFixed(1) + ' ' + yBase, pk = 1 / (sd * Math.sqrt(2 * Math.PI));
    for (var i = 0; i <= n; i++) {
      var v = a + (b - a) * i / n, f = Math.exp(-0.5 * Math.pow((v - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
      d += ' L' + xs(v).toFixed(1) + ' ' + (yBase - (yBase - yPeak) * f / pk).toFixed(1);
    }
    return '<path d="' + d + ' L' + xs(b).toFixed(1) + ' ' + yBase + ' Z" class="' + (cls || 'st-area') + '"/>';
  };

  /* ---------- the block ---------- */
  LR.blocks.story = function (s, ctx) {
    var el = h('section', { class: 'blk blk--story' + (s.gate ? ' is-gate' : ''), 'aria-roledescription': 'step-by-step story' });
    el.appendChild(h('div', { class: 'blk__k', text: 'Step by step' + (s.title ? ' · ' + s.title : '') }));
    var W = s.w || 640, H = s.h || 360;
    var fig = h('div', { class: 'story__fig' });
    fig.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(s.alt || s.title || 'Diagram') + '">' + s.scene(S) + '</svg>';
    var svg = fig.firstChild;
    var words = h('div', { class: 'story__words', 'aria-live': 'polite' });
    var back = h('button', { type: 'button', class: 'btn btn--ghost', text: '← Back' });
    var next = h('button', { type: 'button', class: 'btn btn--run story__next', text: 'Next step →' });
    var dots = h('div', { class: 'story__dots', 'aria-hidden': 'true' });
    var count = h('span', { class: 'story__count' });
    s.steps.forEach(function () { dots.appendChild(h('i')); });
    var swipe = h('p', { class: 'story__swipe', 'aria-hidden': 'true', text: '↔ Swipe the picture to see all of it' });
    el.appendChild(h('div', { class: 'story__body' }, [fig, swipe, words]));
    el.appendChild(h('div', { class: 'story__bar' }, [back, dots, count, next]));

    var parts = [].slice.call(svg.querySelectorAll('[data-el]'));
    var i = -1;
    /* phones: the picture is wider than the screen; bring this step's part into view */
    function pan(k) {
      if (fig.scrollWidth <= fig.clientWidth + 2) return;
      var st = s.steps[k], ids = st.pan ? [st.pan] : (st.show && st.show.length ? st.show : st.focus || []);
      var tgt = ids.length ? svg.querySelector('[data-el="' + ids[ids.length - 1] + '"]') : null;
      if (!tgt || !tgt.getBBox) return;
      var bb = tgt.getBBox(), vb = svg.viewBox.baseVal, sc = svg.getBoundingClientRect().width / vb.width;
      var cx = (bb.x + bb.width / 2 - vb.x) * sc;
      var left = Math.max(0, Math.min(cx - fig.clientWidth / 2, fig.scrollWidth - fig.clientWidth));
      try { fig.scrollTo({ left: left, behavior: LR.reduced() ? 'auto' : 'smooth' }); } catch (e) { fig.scrollLeft = left; }
    }
    function go(k, animate) {
      k = Math.max(0, Math.min(k, s.steps.length - 1));
      var shown = {};
      for (var j = 0; j <= k; j++) {
        (s.steps[j].show || []).forEach(function (e) { shown[e] = true; });
        (s.steps[j].hide || []).forEach(function (e) { delete shown[e]; });
      }
      var focus = s.steps[k].focus || [];
      parts.forEach(function (p) {
        var id = p.getAttribute('data-el');
        var on = !!shown[id], newly = on && (s.steps[k].show || []).indexOf(id) >= 0 && animate;
        p.classList.toggle('is-on', on);
        p.classList.toggle('is-new', !!newly);
        p.classList.toggle('is-dim', on && focus.length > 0 && focus.indexOf(id) < 0);
        p.classList.toggle('is-focus', focus.indexOf(id) >= 0);
      });
      var st = s.steps[k];
      words.innerHTML = '';
      words.appendChild(h('p', { class: 'story__step', text: 'Step ' + (k + 1) + ' of ' + s.steps.length }));
      if (st.title) words.appendChild(h('h3', { class: 'story__h', text: st.title }));
      words.appendChild(h('div', { class: 'prose', html: md(st.md) }));
      if (st.analogy) words.appendChild(h('div', { class: 'story__an' }, [h('b', { text: 'Analogy' }), h('div', { class: 'prose', html: md(st.analogy) })]));
      [].forEach.call(dots.children, function (d, j) { d.className = j < k ? 'is-past' : j === k ? 'is-cur' : ''; });
      count.textContent = (k + 1) + ' / ' + s.steps.length;
      back.disabled = k === 0;
      var last = k === s.steps.length - 1;
      next.textContent = last ? '↺ Watch again' : 'Next step →';
      if (st.run && animate) st.run(svg);
      pan(k);
      if (last && s.gate) ctx.pass(s.id);
      i = k;
    }
    /* after a click, keep the picture, the words and the buttons on screen together */
    function inView() {
      var r = el.getBoundingClientRect(), vh = window.innerHeight || 0;
      if (r.height <= vh && (r.top < 0 || r.bottom > vh)) {
        try { el.scrollIntoView({ block: 'nearest', behavior: LR.reduced() ? 'auto' : 'smooth' }); } catch (e) { el.scrollIntoView(false); }
      }
    }
    next.addEventListener('click', function () { if (i === s.steps.length - 1) go(0, true); else go(i + 1, true); inView(); });
    back.addEventListener('click', function () { go(i - 1, false); inView(); });
    el.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft' && !back.disabled) { e.preventDefault(); back.click(); }
    });
    el.tabIndex = -1;
    go(0, true);
    /* the first step's pan needs the block on the page, which happens after this returns */
    setTimeout(function () { if (i === 0) pan(0); }, 60);
    return el;
  };
})(window.LR);
