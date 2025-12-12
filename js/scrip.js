// ==================== DATOS GLOBALES ====================
// Check if 'mode' exists
if (!localStorage.getItem('mode')) {
    localStorage.setItem('mode', 'light');
}

console.log(localStorage.getItem('mode'));

// ==================== FUNCIONES PARA INDEX ====================

// Funcionalidad de scroll para los juegos (MANTENER pero sin llamar a generarJuegos)
function configurarScroll() {
    const container = document.getElementById('juegosContainer');
    const scrollLeft = document.getElementById('scrollLeft');
    const scrollRight = document.getElementById('scrollRight');
    
    if (!container || !scrollLeft || !scrollRight) return;
    
    scrollLeft.addEventListener('click', () => {
        container.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    });
    
    scrollRight.addEventListener('click', () => {
        container.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    });
}

// ==================== FUNCIONES GLOBALES ====================

// Toggle de modo oscuro
function configurarDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    const root = document.documentElement;
    const storedMode = localStorage.getItem('mode');

    // Estado inicial: si el checkbox está checked o el modo guardado es 'dark'
    if (toggle.checked || storedMode === 'dark') {
        root.setAttribute('data-theme', 'dark');
        toggle.checked = true;
        localStorage.setItem('mode', 'dark');
    } else {
        root.removeAttribute('data-theme');
        toggle.checked = false;
        localStorage.setItem('mode', 'light');
    }

    // Escuchar cambios del toggle
    toggle.addEventListener('change', function () {
        const activo = this.checked;

        if (activo) {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('mode', 'dark'); 
        } else {
            root.removeAttribute('data-theme');
            localStorage.setItem('mode', 'light')
        }
    });
}

// Llamar a la función al cargar la página
document.addEventListener('DOMContentLoaded', configurarDarkMode);

function aplicarModoOscuro(activo) {
    if (activo) {
        document.body.style.backgroundColor = '#1a202c';
        document.body.style.color = '#000000ff';
        
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.backgroundColor = '#2d3748';
            navbar.style.borderBottomColor = '#4a5568';
        }
        
        const links = document.querySelectorAll('.nav-links a:not(.active)');
        links.forEach(link => {
            link.style.color = '#e2e8f0';
        });
    } else {
        document.body.style.backgroundColor = '#f5f5f5';
        document.body.style.color = '#333';
        
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.backgroundColor = '#ffffff';
            navbar.style.borderBottomColor = '#e0e0e0';
        }
        
        const links = document.querySelectorAll('.nav-links a:not(.active)');
        links.forEach(link => {
            link.style.color = '#fffefeff';
        });
    }
}

// Animaciones al hacer scroll
function configurarAnimaciones() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    const elementos = document.querySelectorAll(
        '.juego-card, .tabla-top5 tbody tr, .tabla-completa tbody tr, .tabla-calendario tbody tr, .resultado-match .form-group input, .resultado-match .form-group button, .admin-pantalla ,.categoria-resultados-container, .pantalla-portal-container',
    );
    
    elementos.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s, transform 0.5s';
        observer.observe(el);
    });
}

// ==================== FUNCIONES PARA CLASIFICACIÓN ====================

// Hacer las filas de la tabla clickeables
function configurarFilasTabla() {
    const filas = document.querySelectorAll('.tabla-completa tbody tr, .tabla-top5 tbody tr');
    
    filas.forEach(fila => {
        fila.style.cursor = 'pointer';
        
        fila.addEventListener('click', function() {
            const equipo = this.querySelector('td:nth-child(2)').textContent;
            console.log(`Equipo seleccionado: ${equipo}`);
        });
        
        fila.addEventListener('mouseenter', function() {
            if (!this.closest('.tabla-top5')) {
                this.style.transform = 'translateY(-2px)';
            }
        });
        
        fila.addEventListener('mouseleave', function() {
            if (!this.closest('.tabla-top5')) {
                this.style.transform = 'translateY(0)';
            }
        });
    });
}

// ==================== FUNCIONES PARA CALENDARIO ====================


// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    // Funciones globales (se ejecutan en todas las páginas)
    configurarDarkMode();
    
    // Detectar página actual y ejecutar funciones específicas
    const body = document.body;
    const mainContent = document.querySelector('.main-content');
    
    if (mainContent) {
        // Página de Index
        if (document.getElementById('juegosContainer')) {
            // ELIMINADO: generarJuegos() - ahora se maneja en proximos-juegos.js
            configurarScroll(); // Mantener para las flechas de navegación
            configurarFilasTabla();
        }
        
        // Página de Clasificación
        if (mainContent.classList.contains('clasificacion-page')) {
            configurarSelectorLiga();
            configurarFilasTabla();
        }
        
        // Página de Calendario
        if (mainContent.classList.contains('calendario-page')) {
            configurarSelectorLiga();
        }
        
        // Página de Resultados
        if (mainContent.classList.contains('resultados-page')) {
    // Inicializar el módulo de resultados cuando se carga la página
    if (window.resultadosModule) {
        window.resultadosModule.inicializar();
    }
}
        
        // Animaciones (todas las páginas)
        setTimeout(configurarAnimaciones, 100);
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        if (href && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ==================== NAVEGACIÓN ENTRE PANTALLAS ====================

function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(sec => {
        if (sec.id === idPantalla) {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    });

    setTimeout(() => {
        if (typeof configurarAnimaciones === 'function') {
            configurarAnimaciones();
        }
    }, 100);
}

function navActive(navElement) {
    const links = document.querySelectorAll('.nav-links a');

    links.forEach(link => {
        if (link === navElement) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function configurarNavegacionIndex() {
    const linkHome = document.getElementById('link-home');
    const linkClasificacion = document.getElementById('link-clasificacion');
    const linkCalendario = document.getElementById('link-calendario');
    const linkResultados = document.getElementById('link-resultados');

    if (linkHome) {
        linkHome.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('home');
            navActive(linkHome);
            // ELIMINADO: generarJuegos() - se maneja automáticamente
            if (typeof configurarScroll === 'function') configurarScroll();
            if (typeof configurarFilasTabla === 'function') configurarFilasTabla();
            // Recargar próximos juegos si el módulo existe
            if (window.proximosJuegosModule) {
                window.proximosJuegosModule.recargar();
            }
        });
    }

    if (linkClasificacion) {
    linkClasificacion.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-clasificacion');
        navActive(linkClasificacion);
        
        // Recargar clasificación
        if (window.clasificacionModule) {
            window.clasificacionModule.recargar();
        }
    });
}

    if (linkCalendario) {
        linkCalendario.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-calendario');
            navActive(linkCalendario);
            if (typeof configurarSelectorLiga === 'function') configurarSelectorLiga();
        });
    }

    if (linkResultados) {
    linkResultados.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-resultados');
        navActive(linkResultados);
        
        // Inicializar/recargar el módulo de resultados
        if (window.resultadosModule) {
            // Si ya hay jornadas cargadas, solo recargar
            // Si no, inicializar por primera vez
            window.resultadosModule.recargar();
        }
        
        // Configurar animaciones
        if (typeof configurarAnimaciones === 'function') {
            setTimeout(configurarAnimaciones, 100);
        }
    });
}
}

// Inicializar navegación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    configurarNavegacionIndex();
    
    // Mostrar la pantalla Home por defecto
    mostrarPantalla('home');
    
    // Activar el link de Home
    const linkHome = document.getElementById('link-home');
    if (linkHome) {
        navActive(linkHome);
    }
});