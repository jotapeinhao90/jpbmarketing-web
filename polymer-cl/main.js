// Polimer - Main Logic

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Loading Screen ---
    const loader = document.getElementById('loader');
    const progress = document.getElementById('loaderProgress');
    
    let width = 0;
    const interval = setInterval(() => {
        width += Math.random() * 30;
        if(width > 100) width = 100;
        progress.style.width = width + '%';
        
        if (width === 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add('hidden');
                // Trigger initials reveals manually for items above fold if needed
                reveal();
            }, 600);
        }
    }, 200);

    // --- 2. Custom Cursor ---
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');
    
    // Only applied on desktop (handled by CSS hiding on mobile, but JS should still be careful)
    if(window.innerWidth > 768) {
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });

        // Smooth follow for the ring
        const render = () => {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            
            cursorRing.style.transform = `translate(calc(${ringX}px - 50%), calc(${ringY}px - 50%))`;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);

        // Hover effects on clickables
        const clickables = document.querySelectorAll('a, button, input, textarea, select');
        clickables.forEach(el => {
            el.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
            el.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
        });
    }

    // --- 3. Sticky Navbar ---
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- 4. Mobile Menu Toggle ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // --- 5. Scroll Reveal Animations ---
    const reveals = document.querySelectorAll('.reveal');
    
    function reveal() {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;

        reveals.forEach((element) => {
            const elementTop = element.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', reveal);
    
    // --- 6. Stats Counter Animation ---
    const stats = document.querySelectorAll('.stat-number');
    let hasAnimated = false;
    
    function animateStats() {
        if(hasAnimated) return;
        
        // Find if stats are in view
        const firstStat = stats[0];
        if(!firstStat) return;
        
        const top = firstStat.getBoundingClientRect().top;
        if(top < window.innerHeight - 50) {
            hasAnimated = true;
            stats.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                const suffix = stat.getAttribute('data-suffix') || '';
                const duration = 2000;
                const increment = target / (duration / 16); // 60fps
                
                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if(current < target) {
                        stat.innerText = Math.ceil(current) + suffix;
                        requestAnimationFrame(updateCounter);
                    } else {
                        stat.innerText = target + suffix;
                    }
                };
                updateCounter();
            });
        }
    }
    
    window.addEventListener('scroll', animateStats);

    // --- 7. Tilt Effect on Cards ---
    const tiltCards = document.querySelectorAll('.tilt');
    
    if(window.innerWidth > 768) {
        tiltCards.forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const tiltX = (y - centerY) / 10;
                const tiltY = (centerX - x) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            });
        });
    }

    // --- 8. Contact Form Handling ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = 'Enviando...';
            btn.style.opacity = '0.7';
            
            // Validate and simulate sending
            setTimeout(() => {
                btn.innerText = '¡Enviado con éxito!';
                btn.style.background = 'var(--secondary-color)';
                btn.style.opacity = '1';
                contactForm.reset();
                
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = '';
                }, 3000);
            }, 1500);
        });
    }

    // --- 9. Product Modals Setup ---
    const productsData = {
        hielo: {
            title: "Bolsas para Hielo",
            icon: "🧊",
            desc: "Resistentes a bajas temperaturas y roturas.",
            details: "Nuestras bolsas para hielo están fabricadas con resinas de polietileno de baja densidad (PEBD) formuladas específicamente para soportar temperaturas de congelación sin perder flexibilidad ni resistencia al impacto. Disponibles en distintas capacidades y pueden ser impresas con el diseño de su marca a full color."
        },
        pallet: {
            title: "Fundas Cubre Pallet",
            icon: "📦",
            desc: "Protección y estabilidad máxima.",
            details: "Diseñadas para la protección de pallets completos contra polvo, humedad y daños superficiales durante el almacenamiento o transporte. Fabricadas en polietileno termocontraíble o normal. Se adaptan perfectamente a las dimensiones de su carga, mejorando la presentación y seguridad."
        },
        basura: {
            title: "Bolsas de Basura",
            icon: "♻️",
            desc: "Alta resistencia para uso industrial y comercial.",
            details: "Para uso domiciliario, comercial e industrial. Manejamos bolsas de aseo de alta resistencia y calibre para desechos pesados, as\u00ed como opciones est\u00e1ndar. Ofrecemos diferentes capacidades (desde 50 hasta 240 litros) y distintos colores para facilitar el manejo integral de residuos."
        },
        wicketer: {
            title: "Bolsas Wicketer",
            icon: "🗞️",
            desc: "Para procesos automáticos de envasado.",
            details: "Bolsas apiladas y sujetas por un gancho (wicket) diseñadas especialmente para optimizar las líneas de envasado automático o semi-automático. Son muy utilizadas en la industria alimentaria (panaderías, avícolas) y artículos de higiene general."
        },
        films: {
            title: "Films Especiales",
            icon: "🛡️",
            desc: "Laminados, barrera y stretch.",
            details: "Proveemos films laminados y coextruidos de alta barrera para proteger todo tipo de productos contra humedad y ox\u00edgeno. Adem\u00e1s, fabricamos Film Stretch de alto rendimiento y elongaci\u00f3n para asegurar apropiadamente sus cargas paletizadas, minimizando da\u00f1os por ca\u00eddas de mercader\u00eda."
        },
        formatos: {
            title: "Formatos Especiales",
            icon: "🛍️",
            desc: "Pouche Doypack y envases al vacío.",
            details: "Ofrecemos formatos tipo Pouche / Doypack (bolsas que se mantienen de pie) con o sin cierre tipo zipper, ideales para alimentos s\u00f3lidos, polvos o l\u00edquidos. Tambi\u00e9n elaboramos bolsas para vac\u00edo que asisten en prolongar la vida \u00fatil de los productos perecederos. Todos estos envases pueden personalizarse a la medida exacta de tus requerimientos."
        }
    };

    const modal = document.getElementById('productModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalDetails = document.getElementById('modalDetails');
    const modalWaBtn = document.getElementById('modalWaBtn');

    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach((card, index) => {
        // Assign keys to cards in DOM order matches our data
        const keys = Object.keys(productsData);
        const key = keys[index];
        if(!key) return; // fail-safe if there are more cards than data
        card.setAttribute('data-product', key);
        
        // Add visual queue to card
        card.insertAdjacentHTML('beforeend', '<div style="margin-top: 1.5rem; color: var(--primary-color); font-weight: 500; font-size: 0.95rem;">Ver todos los detalles &rarr;</div>');

        card.addEventListener('click', () => {
            const data = productsData[key];
            
            modalIcon.innerText = data.icon;
            modalTitle.innerText = data.title;
            modalDesc.innerText = data.desc;
            modalDetails.innerText = data.details;
            
            const waMsg = encodeURIComponent(`Hola, me gustar\u00eda cotizar "${data.title}" y conocer m\u00e1s detalles.`);
            modalWaBtn.href = `https://wa.me/56944843503?text=${waMsg}`;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Stop background from scrolling
        });
    });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    if(modalClose && modalOverlay) {
        modalClose.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', closeModal);
    }
});
