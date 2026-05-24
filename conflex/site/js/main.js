/* =====================
   Nav scroll shadow
   ===================== */
const nav = document.getElementById('nav');
const tick = () => nav.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', tick, { passive: true });
tick();

/* =====================
   Nav search
   ===================== */
function handleSearch(e) {
  e.preventDefault();
  window.location.href = 'productos.html';
}

/* =====================
   Mobile burger
   ===================== */
document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('drawer').classList.toggle('open');
});
document.getElementById('drawer').querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('drawer').classList.remove('open'));
});

/* =====================
   Smooth scroll (offset nav)
   ===================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    }
  });
});

/* =====================
   Intersection reveal
   ===================== */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up, .fade-left, .fade-right, .fade-3d').forEach(el => io.observe(el));

/* =====================
   Counter animation
   ===================== */
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const end = +el.dataset.to;
    const dur = 1200;
    const step = end / (dur / 16);
    let cur = 0;
    const run = () => { cur = Math.min(cur + step, end); el.textContent = Math.floor(cur); if (cur < end) requestAnimationFrame(run); };
    requestAnimationFrame(run);
    cio.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.count').forEach(c => cio.observe(c));

/* =====================
   3D tilt on cards
   ===================== */
document.querySelectorAll('.prod, .ind, .nos-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-5px) perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* =====================
   YouTube lazy player
   ===================== */
function loadVideo() {
  const thumb  = document.getElementById('vp-thumb');
  const iframe = document.getElementById('vp-iframe');
  const yt     = document.getElementById('yt-iframe');
  yt.src = 'https://www.youtube-nocookie.com/embed/3n8QQg7Dyl0?autoplay=1&rel=0&modestbranding=1';
  thumb.style.display  = 'none';
  iframe.style.display = 'block';
}

/* =====================
   Contact form
   ===================== */
function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Enviando…';
  btn.disabled = true;
  setTimeout(() => {
    document.getElementById('cform').style.display = 'none';
    document.getElementById('form-ok').style.display = 'block';
  }, 1100);
}
