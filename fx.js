/* Fondo interactivo de los encabezados: red de puntos que reacciona al mouse (o al dedo). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hosts = document.querySelectorAll('.h2-hero, .page-hero, .waia-hero');
  if (!hosts.length) return;

  hosts.forEach(function (host) {
    var cv = document.createElement('canvas');
    cv.className = 'fx-canvas';
    cv.setAttribute('aria-hidden', 'true');
    host.classList.add('fx-host');
    host.appendChild(cv);

    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, pts = [], raf = 0, visible = true;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };
    var LINK = 125, REACH = 190;

    function build() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(24, Math.min(w < 700 ? 38 : 80, Math.round(w * h / 15000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.2 + 0.7
        });
      }
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;

      if (mouse.on) {
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
        g.addColorStop(0, 'rgba(59,130,246,0.20)');
        g.addColorStop(1, 'rgba(59,130,246,0)');
        ctx.fillStyle = g;
        ctx.fillRect(mouse.x - 220, mouse.y - 220, 440, 440);
      }

      var i, j, p, q, dx, dy, d;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        if (!reduce) {
          if (mouse.on) {
            dx = p.x - mouse.x; dy = p.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
            if (d < 140 && d > 0.1) { var f = (140 - d) / 140 * 0.9; p.x += dx / d * f; p.y += dy / d * f; }
          }
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(160,196,255,0.55)';
        ctx.fill();
      }

      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < LINK * LINK) {
            ctx.strokeStyle = 'rgba(96,165,250,' + (0.22 * (1 - Math.sqrt(d) / LINK)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (mouse.on) {
          dx = p.x - mouse.x; dy = p.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH) {
            ctx.strokeStyle = 'rgba(245,184,0,' + (0.55 * (1 - d / REACH)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
    }

    function loop() {
      if (!visible) { raf = 0; return; }
      draw();
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!reduce && !raf && visible) raf = requestAnimationFrame(loop); }

    function setPos(cx, cy) {
      var r = host.getBoundingClientRect();
      mouse.tx = cx - r.left; mouse.ty = cy - r.top;
      if (!mouse.on) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      mouse.on = true;
    }
    host.addEventListener('mousemove', function (e) { setPos(e.clientX, e.clientY); });
    host.addEventListener('mouseleave', function () { mouse.on = false; });
    host.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) setPos(t.clientX, t.clientY); }, { passive: true });
    host.addEventListener('touchend', function () { mouse.on = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start();
      }, { threshold: 0 }).observe(host);
    }
    if ('ResizeObserver' in window) {
      var t;
      new ResizeObserver(function () { clearTimeout(t); t = setTimeout(build, 150); }).observe(host);
    } else {
      window.addEventListener('resize', build);
    }
    build();
    start();
  });
})();
