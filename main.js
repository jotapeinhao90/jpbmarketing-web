/* JPB Marketing — main.js */

// ── Preloader ──────────────────────────────────────────────
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  setTimeout(() => preloader.classList.add('hidden'), 1500);
});

document.addEventListener('DOMContentLoaded', () => {

  // ── Navbar scroll shadow ───────────────────────────────
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 20);
    updateBackTop();
  }, { passive: true });

  // ── Active nav link (by filename) ─────────────────────
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // ── Mobile hamburger ───────────────────────────────────
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.nav-mobile');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav?.classList.toggle('open');
  });
  mobileNav?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  // ── Scroll reveal ──────────────────────────────────────
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // ── Animated counters ──────────────────────────────────
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.floor(target * eased);
      el.textContent = val.toLocaleString('en-US') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // ── Back to top ────────────────────────────────────────
  const backTop = document.querySelector('.back-top');
  function updateBackTop() {
    backTop?.classList.toggle('visible', window.scrollY > 400);
  }
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ── Smooth scroll anchors ──────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = navbar?.offsetHeight || 72;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });

  // ── Dashboard live animation (hero card) ───────────────
  const dashBody = document.getElementById('dashBody');
  if (dashBody) {
    const campaigns = [
      {
        name: '🔩 Metales y Aceros — Región Metro.',
        emails: 1247, barPct: '78%', respuestas: 23, openRate: '4.2%', reuniones: 8,
        notifs: [
          { icon: '📨', title: 'Nueva respuesta',    msg: '"Me interesa agendar una llamada..."', time: 'ahora' },
          { icon: '📅', title: 'Reunión confirmada', msg: '"¿Martes a las 10am te acomoda?"',    time: '3m' },
        ],
        tickMsgs: [
          { icon: '📨', title: 'Nueva respuesta',    msg: '"¿Cuánto cuesta el servicio?"',        time: 'ahora' },
          { icon: '💼', title: 'Lead calificado',    msg: '"Somos 80 personas, necesitamos..."',  time: 'ahora' },
          { icon: '🤝', title: 'Propuesta solicitada', msg: '"¿Puedes enviar una propuesta?"',   time: 'ahora' },
        ],
      },
      {
        name: '🛍️ Bolsas Plásticas — Valparaíso',
        emails: 892, barPct: '61%', respuestas: 18, openRate: '3.8%', reuniones: 5,
        notifs: [
          { icon: '💼', title: 'Lead calificado',    msg: '"Necesitamos 50.000 unidades/mes"',   time: 'ahora' },
          { icon: '✉️', title: 'Propuesta solicitada', msg: '"¿Puedes enviarme una cotización?"', time: '2m' },
        ],
        tickMsgs: [
          { icon: '📨', title: 'Nueva respuesta',    msg: '"Nos interesa conocer precios..."',    time: 'ahora' },
          { icon: '📅', title: 'Reunión agendada',   msg: '"Jueves 11am nos acomoda bien"',       time: 'ahora' },
          { icon: '🤝', title: 'Pedido inicial',     msg: '"Queremos hacer una prueba de 5k..."', time: 'ahora' },
        ],
      },
      {
        name: '🍎 Alimentos y Bebidas — Biobío',
        emails: 1543, barPct: '88%', respuestas: 31, openRate: '5.1%', reuniones: 11,
        notifs: [
          { icon: '🤝', title: 'Reunión agendada',   msg: '"Hablamos el miércoles a las 3pm"',   time: 'ahora' },
          { icon: '📨', title: 'Nueva respuesta',    msg: '"Tenemos interés en sus servicios"',   time: '4m' },
        ],
        tickMsgs: [
          { icon: '📨', title: 'Nueva respuesta',    msg: '"Muy interesante, coordinemos..."',    time: 'ahora' },
          { icon: '💼', title: 'Oportunidad grande', msg: '"Somos distribuidores en 3 regiones"', time: 'ahora' },
          { icon: '📅', title: 'Llamada agendada',   msg: '"Lunes 9am, ¿te acomoda?"',            time: 'ahora' },
        ],
      },
    ];

    let campIdx = 0;
    let tickIdx = 0;
    let liveEmails = campaigns[0].emails;
    let liveResps  = campaigns[0].respuestas;

    const elCampName  = document.getElementById('dashCampName');
    const elEmails    = document.getElementById('dashEmailCount');
    const elBar       = document.getElementById('dashBarFill');
    const elResps     = document.getElementById('dashRespNum');
    const elOpen      = document.getElementById('dashOpenRate');
    const elMeetings  = document.getElementById('dashMeetings');
    const elNotifs    = document.getElementById('dashNotifs');

    function makeNotif(n) {
      const d = document.createElement('div');
      d.className = 'dash-notif';
      d.innerHTML = `<div class="dash-notif-icon">${n.icon}</div><div class="dash-notif-body"><div class="dash-notif-title">${n.title}</div><div class="dash-notif-msg">${n.msg}</div></div><span class="dash-notif-time">${n.time}</span>`;
      return d;
    }

    // Tick: add notification + increment counters every ~3.5s
    setInterval(() => {
      const c = campaigns[campIdx];
      liveEmails += Math.floor(Math.random() * 7) + 2;
      liveResps++;
      if (elEmails) elEmails.textContent = liveEmails.toLocaleString('en-US');
      if (elResps)  elResps.textContent  = liveResps;

      const msgs = c.tickMsgs;
      tickIdx = (tickIdx + 1) % msgs.length;
      if (elNotifs) {
        elNotifs.insertBefore(makeNotif(msgs[tickIdx]), elNotifs.firstChild);
        while (elNotifs.children.length > 2) elNotifs.removeChild(elNotifs.lastChild);
      }
    }, 3500);

    // Campaign switch every 5s
    setInterval(() => {
      dashBody.classList.add('dash-fade');

      setTimeout(() => {
        campIdx = (campIdx + 1) % campaigns.length;
        const c = campaigns[campIdx];
        liveEmails = c.emails;
        liveResps  = c.respuestas;
        tickIdx    = 0;

        if (elCampName) elCampName.textContent       = c.name;
        if (elEmails)   elEmails.textContent         = c.emails.toLocaleString('en-US');
        if (elBar)      elBar.style.width            = c.barPct;
        if (elResps)    elResps.textContent          = c.respuestas;
        if (elOpen)     elOpen.textContent           = c.openRate;
        if (elMeetings) elMeetings.textContent       = c.reuniones;
        if (elNotifs)   elNotifs.innerHTML           = c.notifs.map(n => makeNotif(n).outerHTML).join('');

        dashBody.classList.remove('dash-fade');
      }, 350);
    }, 5000);
  }

});
