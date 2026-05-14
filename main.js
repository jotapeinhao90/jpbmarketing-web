/* JPB Marketing — main.js */

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
  const notifContainer = document.getElementById('dashNotifs');
  if (notifContainer) {
    const msgs = [
      { icon: '📨', title: 'Nueva respuesta',      msg: '"Me interesa agendar una llamada..."',    time: 'ahora' },
      { icon: '📅', title: 'Reunión confirmada',   msg: '"¿Martes a las 10am te acomoda?"',        time: '1m' },
      { icon: '💼', title: 'Lead calificado',      msg: '"Somos 45 personas, necesitamos..."',     time: '2m' },
      { icon: '✉️', title: 'Follow-up enviado',    msg: '"Hola Juan, como te comenté antes..."',   time: '3m' },
      { icon: '🤝', title: 'Propuesta solicitada', msg: '"¿Puedes enviarme una propuesta?"',        time: '4m' },
    ];
    let idx = 0;
    const dashCount = document.getElementById('dashCount');
    const respCount = document.getElementById('respCount');
    let emails = 1247, resps = 23;

    setInterval(() => {
      idx = (idx + 1) % msgs.length;
      const m = msgs[idx];
      const el = document.createElement('div');
      el.className = 'dash-notif';
      el.innerHTML = `<div class="dash-notif-icon">${m.icon}</div><div class="dash-notif-body"><div class="dash-notif-title">${m.title}</div><div class="dash-notif-msg">${m.msg}</div></div><span class="dash-notif-time">${m.time}</span>`;
      notifContainer.insertBefore(el, notifContainer.firstChild);
      while (notifContainer.children.length > 2) notifContainer.removeChild(notifContainer.lastChild);
      emails += Math.floor(Math.random() * 8) + 2;
      resps++;
      if (dashCount) dashCount.textContent = emails.toLocaleString('en-US');
      if (respCount) respCount.textContent = resps;
    }, 3800);
  }

});
