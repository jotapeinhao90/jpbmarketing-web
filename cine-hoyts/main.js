/* ============================================================
   CINEMAX — JavaScript principal
   ============================================================ */

// ---- DATA ----

const movies = [
    {
        id: 'thunderbolts',
        title: 'Thunderbolts*',
        genre: 'Acción · Aventura · Marvel',
        duration: '2h 7min',
        rating: '+14',
        score: '8.2',
        badge: 'ESTRENO',
        formats: ['IMAX', '3D', '2D'],
        poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        synopsis: 'Un grupo de antihéroes y villanos reformados son reclutados por una agencia de seguridad para una misión suicida. Entre ellos se encuentran Yelena Belova, US Agent, Taskmaster y Ghost. Juntos deben descubrir su propia identidad y trabajar como equipo antes de que sea demasiado tarde.',
        cast: 'Florence Pugh, Sebastian Stan, Wyatt Russell, Hannah John-Kamen, David Harbour',
        director: 'Jake Schreier',
        showtimes: {
            'IMAX': ['12:00', '15:30', '19:00', '22:00'],
            '3D': ['13:45', '17:15', '20:30'],
            '2D Doblada': ['11:00', '14:00', '16:45', '21:15'],
        },
        price: { normal: 6500, premium: 9500, imax: 12000 }
    },
    {
        id: 'mision',
        title: 'Misión Imposible: Sentencia Final',
        genre: 'Acción · Espionaje · Thriller',
        duration: '2h 43min',
        rating: '+14',
        score: '9.0',
        badge: 'HOT',
        formats: ['2D', 'Sub'],
        poster: 'https://image.tmdb.org/t/p/w500/xg27NrXi7VXCGUr7MG75UqLl6Vg.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/xg27NrXi7VXCGUr7MG75UqLl6Vg.jpg',
        synopsis: 'Ethan Hunt y su equipo se enfrentan a la amenaza más grande de su vida: una IA letal llamada "La Entidad" que puede infiltrarse en cualquier sistema del mundo. Para derrotarla, deben rastrear dos mitades de una llave que controla el destino de la humanidad.',
        cast: 'Tom Cruise, Hayley Atwell, Ving Rhames, Simon Pegg, Rebecca Ferguson',
        director: 'Christopher McQuarrie',
        showtimes: {
            '2D Subtitulada': ['11:30', '15:00', '18:30', '22:00'],
            '2D Doblada': ['13:00', '16:30', '20:00'],
        },
        price: { normal: 6500, premium: 9500, imax: 12000 }
    },
    {
        id: 'avatar3',
        title: 'Avatar: El Portador de la Semilla',
        genre: 'Ciencia Ficción · Aventura',
        duration: '3h 5min',
        rating: '+12',
        score: '8.5',
        badge: '3D',
        formats: ['IMAX 3D', '3D', '2D'],
        poster: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        synopsis: 'Jake Sully y Neytiri continúan su lucha por proteger Pandora. Cuando el hijo de Quaritch regresa con una nueva misión de venganza, la familia Sully debe explorar regiones desconocidas del planeta y forjar nuevas alianzas para sobrevivir.',
        cast: 'Sam Worthington, Zoe Saldaña, Sigourney Weaver, Kate Winslet',
        director: 'James Cameron',
        showtimes: {
            'IMAX 3D': ['11:00', '15:30', '20:00'],
            '3D Subtitulada': ['12:30', '17:00', '21:30'],
            '2D Doblada': ['13:00', '18:00'],
        },
        price: { normal: 7000, premium: 10000, imax: 13500 }
    },
    {
        id: 'sinners',
        title: 'Sinners',
        genre: 'Terror · Drama · Período',
        duration: '2h 17min',
        rating: '+18',
        score: '8.7',
        badge: 'CRÍTICA',
        formats: ['2D', 'Sub'],
        poster: 'https://image.tmdb.org/t/p/w500/wEyBQmVKseMGp5WU1ePzfr8JYiP.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/wEyBQmVKseMGp5WU1ePzfr8JYiP.jpg',
        synopsis: 'Mississippi, 1932. Dos hermanos gemelos regresan al Sur americano con ambiciones de empezar una nueva vida, pero cuando abren un club nocturno con el dinero ganado ilícitamente, atraen a una amenaza sobrenatural que cambia su destino para siempre.',
        cast: 'Michael B. Jordan, Hailee Steinfeld, Miles Caton, Jack O\'Connell',
        director: 'Ryan Coogler',
        showtimes: {
            '2D Subtitulada': ['13:30', '16:45', '20:15'],
            '2D Doblada': ['15:00', '18:30', '22:00'],
        },
        price: { normal: 6500, premium: 9500, imax: 12000 }
    },
    {
        id: 'minecraft',
        title: 'Un Mundo Minecraft',
        genre: 'Animación · Aventura · Familiar',
        duration: '1h 41min',
        rating: '+7',
        score: '6.5',
        badge: 'FAMILIAR',
        formats: ['2D', '3D'],
        poster: 'https://image.tmdb.org/t/p/w500/yFiXMhvRPSqkBKOFV3VFpMp7KcQ.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/yFiXMhvRPSqkBKOFV3VFpMp7KcQ.jpg',
        synopsis: 'Cuatro personas y sus guía mestizo son transportados al Overworld, un mundo cúbico mágico donde la creatividad es la clave para sobrevivir. Para regresar al mundo real, deberán dominar los poderes de este universo y enfrentarse a terribles criaturas.',
        cast: 'Jack Black, Jason Momoa, Emma Myers, Danielle Brooks',
        director: 'Jared Hess',
        showtimes: {
            '3D Doblada': ['11:30', '14:00', '16:30', '19:00'],
            '2D Doblada': ['12:00', '15:00', '17:30', '20:30'],
        },
        price: { normal: 6000, premium: 8500, imax: 11000 }
    },
    {
        id: 'novocaine',
        title: 'Novocaine',
        genre: 'Acción · Thriller',
        duration: '1h 50min',
        rating: '+16',
        score: '7.1',
        badge: null,
        formats: ['2D', 'Sub'],
        poster: 'https://image.tmdb.org/t/p/w500/5qDg9pBMrUI1LkMKwrGx6SbFaqq.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/5qDg9pBMrUI1LkMKwrGx6SbFaqq.jpg',
        synopsis: 'Nathan sufre de una rara condición que le impide sentir dolor. Cuando su novia es secuestrada por una banda de criminales, descubre que esta "superpotencia" puede convertirse en su mayor ventaja para rescatarla y enfrentarse a quienes le quitaron lo que más ama.',
        cast: 'Jack Quaid, Amber Midthunder, Ray Nicholson',
        director: 'Dan Berk, Robert Olsen',
        showtimes: {
            '2D Subtitulada': ['14:30', '17:00', '19:30', '22:00'],
            '2D Doblada': ['13:00', '16:00', '20:30'],
        },
        price: { normal: 6500, premium: 9500, imax: 12000 }
    },
    {
        id: 'flow',
        title: 'Flow',
        genre: 'Animación · Aventura',
        duration: '1h 24min',
        rating: +7,
        score: '8.9',
        badge: 'OSCAR',
        formats: ['2D'],
        poster: 'https://image.tmdb.org/t/p/w500/imKSymKBK7o73sajciEmndJoVkR.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/imKSymKBK7o73sajciEmndJoVkR.jpg',
        synopsis: 'Un gato solitario se ve obligado a compartir un bote con un grupo de animales de diferentes especies mientras el mundo se inunda. Esta hermosa película letona, sin diálogos, ganó el Oscar a mejor película animada.',
        cast: 'Sin diálogos',
        director: 'Gints Zilbalodis',
        showtimes: {
            '2D': ['11:00', '13:00', '15:00', '17:00', '19:00'],
        },
        price: { normal: 5500, premium: 8000, imax: 10000 }
    },
    {
        id: 'elio',
        title: 'Elio',
        genre: 'Animación · Ciencia Ficción · Familiar',
        duration: '1h 38min',
        rating: '+7',
        score: '7.8',
        badge: 'PIXAR',
        formats: ['2D', '3D'],
        poster: 'https://image.tmdb.org/t/p/w500/hhvKmNGpEjcEKBmVfkSDt2VGeTR.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/hhvKmNGpEjcEKBmVfkSDt2VGeTR.jpg',
        synopsis: 'Elio, un niño soñador obsesionado con el espacio, es teletransportado accidentalmente a la Comunidad de Razas Unidas de la Galaxia. Tomado por el representante de la Tierra, debe aprender a vivir entre alienígenas mientras busca la manera de volver a casa.',
        cast: 'Yonas Kibreab, Zoe Saldaña, Brad Garrett',
        director: 'Madeline Sharafian',
        showtimes: {
            '3D Doblada': ['11:00', '13:30', '16:00', '18:30'],
            '2D Doblada': ['12:15', '15:00', '17:30', '20:00'],
        },
        price: { normal: 6000, premium: 8500, imax: 11000 }
    }
];

const upcomingMovies = [
    {
        title: 'Superman (2025)',
        genre: 'Acción · DC · Superhéroes',
        releaseDate: '10 Jul 2025',
        daysLeft: 91,
        poster: 'https://image.tmdb.org/t/p/w200/9OPsEiMiPiuFzpjgD1RZEGmh8Q.jpg'
    },
    {
        title: 'Jurassic World: El Reinado',
        genre: 'Aventura · Ciencia Ficción',
        releaseDate: '2 Jul 2025',
        daysLeft: 83,
        poster: 'https://image.tmdb.org/t/p/w200/vCZ9ZcUKmHt7o5VKnT6cP9p7LMT.jpg'
    },
    {
        title: 'Los 4 Fantásticos: Primeros Pasos',
        genre: 'Acción · Marvel',
        releaseDate: '25 Jul 2025',
        daysLeft: 106,
        poster: 'https://image.tmdb.org/t/p/w200/xKmBtHMkZLmwlIUJIBL5iMNEH9.jpg'
    },
    {
        title: 'Karate Kid: Leyendas',
        genre: 'Acción · Drama Deportivo',
        releaseDate: '30 May 2025',
        daysLeft: 50,
        poster: 'https://image.tmdb.org/t/p/w200/gnwKw7ZBcmjHiOt12ydFNJBYvRh.jpg'
    },
    {
        title: 'How to Train Your Dragon',
        genre: 'Animación · Aventura',
        releaseDate: '13 Jun 2025',
        daysLeft: 64,
        poster: 'https://image.tmdb.org/t/p/w200/kRJijIVkrwSdDMBKPkMJ2VbcaJx.jpg'
    },
    {
        title: 'The Running Man',
        genre: 'Acción · Ciencia Ficción',
        releaseDate: '17 Oct 2025',
        daysLeft: 190,
        poster: 'https://image.tmdb.org/t/p/w200/9rkpHmPgkAX1VSHC2z95X9JVYoJ.jpg'
    }
];

const combos = [
    { emoji: '🍿', name: 'Combo Simple', desc: 'Popcorn mediano + Bebida 350ml', price: 4990 },
    { emoji: '🍿🥤', name: 'Combo Doble', desc: '2 Popcorn medianos + 2 Bebidas 350ml', price: 8990 },
    { emoji: '🍿🥤🍫', name: 'Combo Familiar', desc: 'Popcorn grande + 2 Bebidas + Chocolate', price: 11990 },
    { emoji: '🌮🍿🥤', name: 'Combo Nachos', desc: 'Nachos con salsa + Popcorn small + Bebida', price: 7490 },
];

// ---- STATE ----
let currentSlide = 0;
let slideTimer;
let selectedMovie = null;
let selectedShowtime = null;
let selectedSeats = [];
let selectedCombo = null;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    renderMovies();
    renderUpcoming();
    startSlideshow();
    setupNavScroll();
    setupDateTabs();
    setupFormatFilters();
});

// ---- NAVBAR SCROLL ----
function setupNavScroll() {
    const nav = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 80);
    });
}

// ---- HERO SLIDESHOW ----
function startSlideshow() {
    slideTimer = setInterval(() => nextSlide(), 5000);
}

function goSlide(index) {
    clearInterval(slideTimer);
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
    startSlideshow();
}

function nextSlide() {
    const slides = document.querySelectorAll('.hero-slide');
    goSlide((currentSlide + 1) % slides.length);
}

function prevSlide() {
    const slides = document.querySelectorAll('.hero-slide');
    goSlide((currentSlide - 1 + slides.length) % slides.length);
}

// ---- DATE TABS ----
function setupDateTabs() {
    document.querySelectorAll('.date-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            showToast('Mostrando funciones para ' + this.textContent.replace(/\n/g, ' ').trim());
        });
    });
}

// ---- FORMAT FILTERS ----
function setupFormatFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            showToast('Filtrando por: ' + this.textContent);
        });
    });
}

// ---- RENDER MOVIES ----
function renderMovies() {
    const grid = document.getElementById('moviesGrid');
    grid.innerHTML = movies.map(m => `
        <div class="movie-card" onclick="openMovie('${m.id}')">
            <div class="movie-poster">
                <img src="${m.poster}" alt="${m.title}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/666?text=${encodeURIComponent(m.title)}'">
                <div class="movie-poster-overlay">
                    <button class="poster-buy-btn">Comprar entradas</button>
                </div>
                ${m.badge ? `<span class="movie-badge">${m.badge}</span>` : ''}
                <span class="rating-badge">★ ${m.score}</span>
            </div>
            <div class="movie-info">
                <div class="movie-title">${m.title}</div>
                <div class="movie-genre">${m.genre.split(' · ')[0]} · ${m.duration} · ${m.rating}</div>
                <div class="movie-formats">
                    ${m.formats.map(f => `<span class="format-tag">${f}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// ---- RENDER UPCOMING ----
function renderUpcoming() {
    const grid = document.getElementById('upcomingGrid');
    grid.innerHTML = upcomingMovies.map(m => `
        <div class="upcoming-card">
            <div class="upcoming-poster">
                <img src="${m.poster}" alt="${m.title}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/70x100/1a1a2e/666?text=?'">
            </div>
            <div class="upcoming-info">
                <h4>${m.title}</h4>
                <div class="genre">${m.genre}</div>
                <div class="countdown">En ${m.daysLeft} días · ${m.releaseDate}</div>
                <button class="remind-btn" onclick="event.stopPropagation(); showToast('¡Te avisaremos cuando se abra la venta! 🔔')">
                    🔔 Recordarme
                </button>
            </div>
        </div>
    `).join('');
}

// ---- MOVIE MODAL ----
function openMovie(movieId) {
    selectedMovie = movies.find(m => m.id === movieId);
    if (!selectedMovie) return;

    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <div class="modal-movie-hero">
            <div class="modal-movie-poster">
                <img src="${selectedMovie.poster}" alt="${selectedMovie.title}"
                     onerror="this.src='https://via.placeholder.com/260x390/1a1a2e/666?text=${encodeURIComponent(selectedMovie.title)}'"
                     style="width:100%;height:100%;object-fit:cover;min-height:400px;">
            </div>
            <div class="modal-movie-details">
                <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
                    <span class="badge badge-rating">${selectedMovie.rating}</span>
                    ${selectedMovie.formats.map(f => `<span class="badge badge-format">${f}</span>`).join('')}
                </div>
                <h2>${selectedMovie.title}</h2>
                <div class="modal-meta">
                    <span>${selectedMovie.genre}</span>
                    <span class="dot">·</span>
                    <span>${selectedMovie.duration}</span>
                    <span class="dot">·</span>
                    <span class="modal-rating">★ ${selectedMovie.score}/10</span>
                </div>
                <p class="modal-synopsis">${selectedMovie.synopsis}</p>
                <div class="modal-cast">
                    <strong>Reparto:</strong> ${selectedMovie.cast}<br>
                    <strong>Director:</strong> ${selectedMovie.director}
                </div>
                <div class="showtimes-section">
                    <h3>Selecciona función — Hoy, Jueves 10 de Abril</h3>
                    ${renderShowtimes(selectedMovie)}
                </div>
            </div>
        </div>
    `;

    document.getElementById('movieModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderShowtimes(movie) {
    const sold = ['22:00', '11:00'];
    return Object.entries(movie.showtimes).map(([format, times]) => `
        <div class="showtime-group">
            <h4>
                <span class="showtime-format-tag">${format}</span>
                <span style="font-size:0.8rem;color:var(--text-dim);">Sala ${Math.floor(Math.random()*8)+1}</span>
            </h4>
            <div class="showtime-slots">
                ${times.map(t => `
                    <button class="showtime-slot ${sold.includes(t) && format.includes('IMAX') ? 'sold-out' : ''}"
                        onclick="${sold.includes(t) && format.includes('IMAX') ? '' : `selectShowtime('${t}', '${format}')`}">
                        ${t}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function selectShowtime(time, format) {
    selectedShowtime = { time, format };
    closeMovieModal();
    openSeatsModal();
}

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('active');
    document.body.style.overflow = '';
}

function closeModal(event) {
    if (event.target === document.getElementById('movieModal')) closeMovieModal();
}

// ---- SEATS MODAL ----
function openSeatsModal() {
    selectedSeats = [];
    const body = document.getElementById('seatsBody');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const cols = 12;

    // Randomly occupy some seats
    const occupied = new Set();
    for (let i = 0; i < 25; i++) {
        const r = rows[Math.floor(Math.random() * rows.length)];
        const c = Math.floor(Math.random() * cols) + 1;
        occupied.add(`${r}${c}`);
    }

    // Premium rows (A, B = front)
    const premiumRows = ['A', 'B'];

    body.innerHTML = `
        <div class="seats-header">
            <h2>${selectedMovie?.title || 'Selección de asientos'}</h2>
            <p>${selectedShowtime?.format || ''} · ${selectedShowtime?.time || ''} · Jue 10 Abr · Sala 3</p>
        </div>
        <div class="seats-area">
            <div class="screen-indicator">
                <div class="screen-line"></div>
                <div class="screen-label">Pantalla</div>
            </div>
            <div class="seats-grid">
                ${rows.map(row => `
                    <div class="seats-row">
                        <span class="row-label">${row}</span>
                        ${Array.from({length: Math.floor(cols/2)}, (_, i) => i + 1).map(col => {
                            const id = `${row}${col}`;
                            const isOcc = occupied.has(id);
                            const isPrem = premiumRows.includes(row);
                            return `<div class="seat ${isOcc ? 'occupied' : ''} ${isPrem ? 'premium-seat' : ''}"
                                        id="seat-${id}"
                                        title="${isPrem ? 'Premium ' : ''}Fila ${row} · Asiento ${col}"
                                        onclick="${isOcc ? '' : `toggleSeat('${id}', ${isPrem})`}">
                                    </div>`;
                        }).join('')}
                        <div class="seat-aisle"></div>
                        ${Array.from({length: Math.floor(cols/2)}, (_, i) => Math.floor(cols/2) + i + 1).map(col => {
                            const id = `${row}${col}`;
                            const isOcc = occupied.has(id);
                            const isPrem = premiumRows.includes(row);
                            return `<div class="seat ${isOcc ? 'occupied' : ''} ${isPrem ? 'premium-seat' : ''}"
                                        id="seat-${id}"
                                        title="${isPrem ? 'Premium ' : ''}Fila ${row} · Asiento ${col}"
                                        onclick="${isOcc ? '' : `toggleSeat('${id}', ${isPrem})`}">
                                    </div>`;
                        }).join('')}
                        <span class="row-label">${row}</span>
                    </div>
                `).join('')}
            </div>
            <div class="seats-legend">
                <div class="legend-item"><div class="legend-seat avail"></div> Disponible</div>
                <div class="legend-item"><div class="legend-seat sel"></div> Seleccionado</div>
                <div class="legend-item"><div class="legend-seat occ"></div> Ocupado</div>
                <div class="legend-item"><div class="legend-seat prem"></div> Premium</div>
            </div>
        </div>
        <div class="seats-footer">
            <div class="seats-summary">
                <div id="seatsCount">Selecciona tus asientos</div>
                <div id="seatsPrice" style="margin-top:0.25rem;"></div>
            </div>
            <button class="btn-primary" id="continueBtn" onclick="continueToSnacks()" disabled style="opacity:0.4">
                Continuar →
            </button>
        </div>
    `;

    document.getElementById('seatsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function toggleSeat(seatId, isPremium) {
    const el = document.getElementById('seat-' + seatId);
    const idx = selectedSeats.findIndex(s => s.id === seatId);

    if (idx >= 0) {
        selectedSeats.splice(idx, 1);
        el.classList.remove('selected');
    } else {
        if (selectedSeats.length >= 8) {
            showToast('Máximo 8 asientos por compra');
            return;
        }
        selectedSeats.push({ id: seatId, premium: isPremium });
        el.classList.add('selected');
    }

    updateSeatsSummary();
}

function updateSeatsSummary() {
    const countEl = document.getElementById('seatsCount');
    const priceEl = document.getElementById('seatsPrice');
    const btn = document.getElementById('continueBtn');
    const prices = selectedMovie?.price || { normal: 6500, premium: 9500 };

    if (selectedSeats.length === 0) {
        countEl.textContent = 'Selecciona tus asientos';
        priceEl.textContent = '';
        btn.disabled = true;
        btn.style.opacity = '0.4';
        return;
    }

    const total = selectedSeats.reduce((sum, s) => sum + (s.premium ? prices.premium : prices.normal), 0);
    const names = selectedSeats.map(s => s.id).join(', ');
    countEl.innerHTML = `<strong>${selectedSeats.length}</strong> asiento${selectedSeats.length > 1 ? 's' : ''} — Fila ${names}`;
    priceEl.innerHTML = `Total: <span class="price">$${total.toLocaleString('es-CL')}</span>`;
    btn.disabled = false;
    btn.style.opacity = '1';
}

function continueToSnacks() {
    closeSeatsModal();
    openSnacks();
}

function closeSeatsModal() {
    document.getElementById('seatsModal').classList.remove('active');
    document.body.style.overflow = '';
}

function closeSeatsEvent(event) {
    if (event.target === document.getElementById('seatsModal')) closeSeatsModal();
}

// ---- SNACKS MODAL ----
function openSnacks() {
    selectedCombo = null;
    const body = document.getElementById('snacksBody');
    body.innerHTML = `
        <div class="snacks-modal-header">
            <h2>🍿 Snacks y Combos</h2>
            <p>Agrega un combo a tu pedido y recógelo en sala sin esperar en fila.</p>
        </div>
        <div class="combos-grid">
            ${combos.map((c, i) => `
                <div class="combo-card" id="combo-${i}" onclick="selectCombo(${i})">
                    <div class="combo-emoji">${c.emoji}</div>
                    <div class="combo-name">${c.name}</div>
                    <div class="combo-desc">${c.desc}</div>
                    <div class="combo-price">$${c.price.toLocaleString('es-CL')}</div>
                </div>
            `).join('')}
        </div>
        <div class="snacks-footer">
            <button class="btn-secondary" onclick="skipSnacks()">Continuar sin snacks</button>
            <button class="btn-primary" onclick="confirmPurchase()">
                Confirmar compra →
            </button>
        </div>
    `;
    document.getElementById('snacksModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function selectCombo(index) {
    document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('combo-' + index).classList.add('selected');
    selectedCombo = combos[index];
    showToast(`✓ ${combos[index].name} agregado`);
}

function skipSnacks() {
    selectedCombo = null;
    confirmPurchase();
}

function closeSnacksModal() {
    document.getElementById('snacksModal').classList.remove('active');
    document.body.style.overflow = '';
}

function closeSnacksEvent(event) {
    if (event.target === document.getElementById('snacksModal')) closeSnacksModal();
}

// ---- CONFIRM PURCHASE ----
function confirmPurchase() {
    closeSnacksModal();

    const prices = selectedMovie?.price || { normal: 6500, premium: 9500 };
    const seatTotal = selectedSeats.reduce((sum, s) => sum + (s.premium ? prices.premium : prices.normal), 0);
    const comboTotal = selectedCombo ? selectedCombo.price : 0;
    const total = seatTotal + comboTotal;

    const seats = selectedSeats.map(s => s.id).join(', ');
    const confirmText = document.getElementById('confirmText');
    confirmText.innerHTML = `
        <strong>${selectedMovie?.title || 'Película'}</strong><br>
        ${selectedShowtime?.format || ''} · ${selectedShowtime?.time || ''} · Jue 10 Abr<br>
        Asientos: <strong>${seats}</strong><br>
        ${selectedCombo ? `Combo: ${selectedCombo.name}<br>` : ''}
        Total pagado: <strong>$${total.toLocaleString('es-CL')}</strong>
    `;

    document.getElementById('confirmModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
    document.body.style.overflow = '';
    selectedMovie = null;
    selectedShowtime = null;
    selectedSeats = [];
    selectedCombo = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- TRAILER ----
function openTrailer(movieId) {
    showToast('▶ Cargando tráiler...');
}

// ---- TOAST ----
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---- KEYBOARD ----
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeMovieModal();
        closeSeatsModal();
        closeSnacksModal();
    }
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
});
