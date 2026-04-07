// Plastiservi — JS

document.addEventListener('DOMContentLoaded', () => {

    const isSPA = !!document.querySelector('.page');

    // ============================
    // SPA MODE (index.html)
    // ============================
    if (isSPA) {

        function showPage(name) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById('page-' + name);
            if (target) {
                target.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Trigger reveals for newly visible page
                setTimeout(() => revealInPage(target), 80);
            }
            document.querySelectorAll('[data-page]').forEach(el => {
                el.classList.toggle('active', el.dataset.page === name);
            });
            mobileNav?.classList.remove('open');
            history.pushState(null, '', '#' + name);
        }

        window.showPage = showPage;

        document.querySelectorAll('[data-page]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showPage(el.dataset.page);
            });
        });

        const hash = window.location.hash.replace('#', '');
        showPage(hash || 'inicio');

        function revealInPage(pageEl) {
            pageEl.querySelectorAll('.reveal').forEach(el => el.classList.remove('visible'));
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.05 });
            pageEl.querySelectorAll('.reveal').forEach(el => obs.observe(el));
        }

    // ============================
    // STANDALONE PAGE MODE
    // ============================
    } else {

        // Show all reveals immediately (with small delay for CSS transition)
        setTimeout(() => {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }, 60);

        // Also observe for elements below the fold
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }

    // ============================
    // MOBILE MENU
    // ============================
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileClose = document.querySelector('.mobile-nav-close');

    hamburger?.addEventListener('click', () => mobileNav?.classList.add('open'));
    mobileClose?.addEventListener('click', () => mobileNav?.classList.remove('open'));

    // ============================
    // STATS COUNTER
    // ============================
    const statsObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                if (el.dataset.counted) return;
                el.dataset.counted = true;
                const target = parseInt(el.getAttribute('data-count'));
                const suffix = el.getAttribute('data-suffix') || '';
                const increment = target / (1800 / 16);
                let current = 0;
                const tick = () => {
                    current += increment;
                    if (current < target) {
                        el.textContent = Math.ceil(current) + suffix;
                        requestAnimationFrame(tick);
                    } else {
                        el.textContent = target + suffix;
                    }
                };
                tick();
                statsObs.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => statsObs.observe(el));

    // ============================
    // CONTACT FORMS
    // ============================
    document.querySelectorAll('.contact-form-el').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('[type="submit"]');
            const original = btn.textContent;
            btn.textContent = 'Enviando...';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = '¡Enviado! Te contactaremos pronto.';
                btn.style.background = '#16a34a';
                form.reset();
                setTimeout(() => {
                    btn.textContent = original;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 4000);
            }, 1400);
        });
    });

});
