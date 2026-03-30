/* ============================================
   JPB Marketing - Interactive Landing Page
   ============================================ */

// ---- Loading Screen ----
class Loader {
  constructor() {
    this.loader = document.getElementById('loader');
    this.progress = document.getElementById('loaderProgress');
    this.percent = document.getElementById('loaderPercent');
    this.start();
  }

  start() {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p > 100) p = 100;
      this.progress.style.width = p + '%';
      this.percent.textContent = Math.floor(p) + '%';
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.loader.classList.add('loaded');
          document.body.classList.add('loaded');
          setTimeout(() => this.loader.remove(), 600);
        }, 300);
      }
    }, 120);
  }
}

// ---- Custom Cursor ----
class CustomCursor {
  constructor() {
    this.dot = document.getElementById('cursorDot');
    this.ring = document.getElementById('cursorRing');
    if (!this.dot || !this.ring) return;

    this.pos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.isHovering = false;
    this.isClicking = false;

    // Only init on non-touch devices
    if (window.matchMedia('(pointer: fine)').matches) {
      this.init();
    } else {
      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
    }
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    document.addEventListener('mousedown', () => {
      this.ring.classList.add('clicking');
    });

    document.addEventListener('mouseup', () => {
      this.ring.classList.remove('clicking');
    });

    // Hover detection for interactive elements
    const hoverTargets = 'a, button, input, textarea, select, .service-card, .metric-card, .testimonial-card, .btn-cta';
    document.querySelectorAll(hoverTargets).forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.ring.classList.add('hovering');
        this.dot.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        this.ring.classList.remove('hovering');
        this.dot.classList.remove('hovering');
      });
    });

    this.animate();
  }

  animate() {
    // Dot follows instantly
    this.dot.style.transform = `translate(${this.mouse.x}px, ${this.mouse.y}px)`;

    // Ring follows with lerp
    this.pos.x += (this.mouse.x - this.pos.x) * 0.15;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.15;
    this.ring.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`;

    requestAnimationFrame(() => this.animate());
  }
}

// ---- Particle Background ----
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 150 };
    this.resize();
    this.init();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    const count = Math.min(100, Math.floor((this.canvas.width * this.canvas.height) / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.15,
        color: Math.random() > 0.5 ? '0, 212, 255' : '168, 85, 247',
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => { this.resize(); this.init(); });
    window.addEventListener('mousemove', (e) => { this.mouse.x = e.x; this.mouse.y = e.y; });
    window.addEventListener('mouseout', () => { this.mouse.x = null; this.mouse.y = null; });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const time = performance.now() * 0.001;

    this.particles.forEach((p, i) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += 0.02;

      if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.speedY *= -1;

      // Mouse interaction with attraction/repulsion
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x -= dx * force * 0.03;
          p.y -= dy * force * 0.03;
        }
      }

      // Pulsing size
      const pulseSize = p.size + Math.sin(p.pulse) * 0.5;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, Math.max(0.5, pulseSize), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
      this.ctx.fill();

      // Connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - dist / 160)})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ---- Typewriter Effect ----
class Typewriter {
  constructor(element, words) {
    this.el = element;
    this.words = words;
    this.wordIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.typeSpeed = 80;
    this.deleteSpeed = 40;
    this.pauseTime = 2500;
    this.type();
  }

  type() {
    const currentWord = this.words[this.wordIndex];

    if (this.isDeleting) {
      this.el.textContent = currentWord.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      this.el.textContent = currentWord.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    let delay = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

    if (!this.isDeleting && this.charIndex === currentWord.length) {
      delay = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.wordIndex = (this.wordIndex + 1) % this.words.length;
      delay = 400;
    }

    setTimeout(() => this.type(), delay);
  }
}

// ---- Magnetic Elements ----
class MagneticElements {
  constructor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.magnetic').forEach(el => {
      const strength = parseInt(el.dataset.strength) || 20;

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x / strength * 2}px, ${y / strength * 2}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
        el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => el.style.transition = '', 400);
      });
    });
  }
}

// ---- Button Ripple Effect ----
class RippleEffect {
  constructor() {
    document.querySelectorAll('.btn-ripple').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }
}

// ---- Card Glow Follow ----
class CardGlow {
  constructor() {
    document.querySelectorAll('.tilt-card').forEach(card => {
      const glow = card.querySelector('.card-glow');

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Tilt
        const rotateX = (y - centerY) / 15;
        const rotateY = (centerX - x) / 15;
        card.style.transform = `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;

        // Glow follow
        if (glow) {
          glow.style.opacity = '1';
          glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0, 212, 255, 0.15), transparent 60%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        if (glow) {
          glow.style.opacity = '0';
        }
        setTimeout(() => card.style.transition = '', 500);
      });
    });
  }
}

// ---- Parallax Effect ----
class Parallax {
  constructor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.elements = document.querySelectorAll('[data-parallax]');
    if (this.elements.length) {
      window.addEventListener('scroll', () => this.update(), { passive: true });
    }
  }

  update() {
    const scrollY = window.scrollY;
    this.elements.forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.2;
      const rect = el.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (visible) {
        el.style.transform = `translateY(${scrollY * speed}px)`;
      }
    });
  }
}

// ---- Scroll Progress Bar ----
class ScrollProgress {
  constructor() {
    this.bar = document.getElementById('scrollProgress');
    if (!this.bar) return;
    window.addEventListener('scroll', () => this.update(), { passive: true });
  }

  update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.scrollY / scrollable) * 100;
    this.bar.style.width = progress + '%';
  }
}

// ---- Text Scramble Effect ----
class TextScramble {
  constructor() {
    this.chars = '!<>-_\\/[]{}—=+*^?#_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.scramble(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.text-scramble').forEach(el => this.observer.observe(el));
  }

  scramble(el) {
    const text = el.dataset.text || el.textContent;
    const length = text.length;
    let iteration = 0;

    const interval = setInterval(() => {
      el.textContent = text.split('').map((char, i) => {
        if (i < iteration) return text[i];
        return this.chars[Math.floor(Math.random() * this.chars.length)];
      }).join('');

      iteration += 1 / 2;
      if (iteration >= length) {
        el.textContent = text;
        clearInterval(interval);
      }
    }, 30);
  }
}

// ---- Testimonials Carousel ----
class TestimonialsCarousel {
  constructor() {
    this.track = document.getElementById('testimonialsTrack');
    this.dotsContainer = document.getElementById('carouselDots');
    this.prevBtn = document.getElementById('carouselPrev');
    this.nextBtn = document.getElementById('carouselNext');
    if (!this.track) return;

    this.cards = this.track.querySelectorAll('.testimonial-card');
    this.current = 0;
    this.total = this.cards.length;
    this.autoPlayTimer = null;
    this.isDragging = false;
    this.startX = 0;
    this.currentTranslate = 0;

    this.createDots();
    this.bindEvents();
    this.update();
    this.autoPlay();
  }

  createDots() {
    for (let i = 0; i < this.total; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
    }
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => { this.prev(); this.resetAutoPlay(); });
    this.nextBtn.addEventListener('click', () => { this.next(); this.resetAutoPlay(); });

    // Touch/drag
    this.track.addEventListener('touchstart', (e) => this.dragStart(e.touches[0].clientX), { passive: true });
    this.track.addEventListener('touchmove', (e) => this.dragMove(e.touches[0].clientX), { passive: true });
    this.track.addEventListener('touchend', () => this.dragEnd());

    this.track.addEventListener('mousedown', (e) => { e.preventDefault(); this.dragStart(e.clientX); });
    this.track.addEventListener('mousemove', (e) => this.dragMove(e.clientX));
    this.track.addEventListener('mouseup', () => this.dragEnd());
    this.track.addEventListener('mouseleave', () => { if (this.isDragging) this.dragEnd(); });
  }

  dragStart(x) { this.isDragging = true; this.startX = x; }

  dragMove(x) {
    if (!this.isDragging) return;
    this.currentTranslate = x - this.startX;
  }

  dragEnd() {
    this.isDragging = false;
    if (Math.abs(this.currentTranslate) > 80) {
      if (this.currentTranslate < 0) this.next();
      else this.prev();
    }
    this.currentTranslate = 0;
    this.resetAutoPlay();
  }

  prev() { this.goTo(this.current === 0 ? this.total - 1 : this.current - 1); }
  next() { this.goTo(this.current >= this.total - 1 ? 0 : this.current + 1); }

  goTo(index) {
    this.current = index;
    this.update();
  }

  update() {
    this.cards.forEach((card, i) => {
      card.classList.remove('active', 'prev', 'next');
      if (i === this.current) card.classList.add('active');
      else if (i < this.current) card.classList.add('prev');
      else card.classList.add('next');
    });

    // Update dots
    this.dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this.current);
    });
  }

  autoPlay() {
    this.autoPlayTimer = setInterval(() => this.next(), 5000);
  }

  resetAutoPlay() {
    clearInterval(this.autoPlayTimer);
    this.autoPlay();
  }
}

// ---- Back to Top ----
class BackToTop {
  constructor() {
    this.btn = document.getElementById('backToTop');
    if (!this.btn) return;
    this.circle = this.btn.querySelector('circle');
    this.circumference = 2 * Math.PI * 20;
    this.circle.style.strokeDasharray = this.circumference;

    window.addEventListener('scroll', () => this.update(), { passive: true });
    this.btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = window.scrollY / scrollable;
    const offset = this.circumference - (progress * this.circumference);
    this.circle.style.strokeDashoffset = offset;

    if (window.scrollY > 400) {
      this.btn.classList.add('visible');
    } else {
      this.btn.classList.remove('visible');
    }
  }
}

// ---- Navbar ----
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ---- Mobile Menu ----
function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ---- Smooth Scroll ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ---- Scroll Reveal ----
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Staggered animation
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, i * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ---- Counter Animation ----
function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target);
          const suffix = el.dataset.suffix || '';
          const duration = 2200;
          const start = performance.now();

          function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
            const current = Math.floor(eased * target);
            el.textContent = current + suffix;

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              el.textContent = target + suffix;
            }
          }

          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(counter => observer.observe(counter));
}

// ---- Form Handling ----
function initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Floating label effect
  form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
    input.addEventListener('blur', () => {
      if (!input.value) input.parentElement.classList.remove('focused');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spinner">
        <circle cx="12" cy="12" r="10" stroke-dasharray="30" stroke-dashoffset="10"/>
      </svg>
      Enviando...
    `;
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        ¡Mensaje enviado!
      `;
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

      // Success confetti
      createConfetti();

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.disabled = false;
        form.reset();
        form.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('focused'));
      }, 3000);
    }, 1500);
  });
}

// ---- Confetti Effect ----
function createConfetti() {
  const colors = ['#00d4ff', '#a855f7', '#e040fb', '#3b82f6', '#10b981', '#fbbf24'];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
    confetti.style.animationDelay = (Math.random() * 0.5) + 's';
    confetti.style.width = (Math.random() * 8 + 4) + 'px';
    confetti.style.height = (Math.random() * 8 + 4) + 'px';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
}

// ---- Initialize Everything ----
document.addEventListener('DOMContentLoaded', () => {
  // Loading screen
  new Loader();

  // Particles
  const canvas = document.getElementById('particles-canvas');
  if (canvas) new ParticleSystem(canvas);

  // Custom cursor
  new CustomCursor();

  // Typewriter
  const tw = document.getElementById('heroTypewriter');
  if (tw) new Typewriter(tw, [
    'socio estratégico B2B',
    'vendedor externo',
    'sistema de prospección',
    'motor de crecimiento'
  ]);

  // Interactive features
  new MagneticElements();
  new RippleEffect();
  new CardGlow();
  new Parallax();
  new ScrollProgress();
  new TextScramble();
  new TestimonialsCarousel();
  new BackToTop();

  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initScrollReveal();
  initCounters();
  initForm();
});
