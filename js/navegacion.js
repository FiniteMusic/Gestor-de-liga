/**
 * navigation.js - Sistema de navegación para ESCOM League
 * Controla la visualización de pantallas y la navegación entre secciones
 */

// ==================================================================
// ESTADO GLOBAL DE NAVEGACIÓN
// ==================================================================
const navigationState = {
    pantallaActual: 'home',
    historial: []
};

// ==================================================================
// FUNCIONES DE CONTROL DE PANTALLAS
// ==================================================================

/**
 * Muestra una pantalla específica y oculta las demás
 * @param {string} idPantalla - ID de la pantalla a mostrar
 */
function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    let pantallaEncontrada = false;

    pantallas.forEach(pantalla => {
        if (pantalla.id === idPantalla) {
            pantalla.classList.remove('hidden');
            pantalla.classList.add('activa');
            pantallaEncontrada = true;
        } else {
            pantalla.classList.add('hidden');
            pantalla.classList.remove('activa');
        }
    });

    if (pantallaEncontrada) {
        // Actualizar estado
        navigationState.historial.push(navigationState.pantallaActual);
        navigationState.pantallaActual = idPantalla;

        // Ejecutar callbacks específicos de cada pantalla
        ejecutarCallbacksPantalla(idPantalla);
    } else {
        console.warn(`Pantalla no encontrada: ${idPantalla}`);
    }

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Ejecuta funciones específicas cuando se activa una pantalla
 * @param {string} idPantalla - ID de la pantalla activada
 */
function ejecutarCallbacksPantalla(idPantalla) {
    switch(idPantalla) {
        case 'home':
            // Generar juegos próximos
            if (typeof generarJuegos === 'function') generarJuegos();
            if (typeof configurarScroll === 'function') configurarScroll();
            break;

        case 'pantalla-clasificacion':
            // Cargar tabla de clasificación
            if (typeof configurarFilasTabla === 'function') configurarFilasTabla();
            break;

        case 'pantalla-calendario':
            // Recargar calendario
            if (typeof recargarCalendario === 'function') {
                recargarCalendario();
            } else if (window.calendarioModule && typeof window.calendarioModule.recargar === 'function') {
                window.calendarioModule.recargar();
            }
            break;

        case 'pantalla-resultados':
            // Inicializar resultados
            if (typeof iniciarFechas === 'function') iniciarFechas();
            if (typeof generarJuegos === 'function') generarJuegos();
            break;
    }

    // Callback general para animaciones
    if (typeof configurarAnimaciones === 'function') {
        configurarAnimaciones();
    }
}

// ==================================================================
// CONTROL DE NAVEGACIÓN ACTIVA
// ==================================================================

/**
 * Marca el enlace de navegación como activo
 * @param {HTMLElement} navElement - Elemento del enlace a activar
 */
function activarNavLink(navElement) {
    const links = document.querySelectorAll('.nav-links a');

    links.forEach(link => {
        if (link === navElement) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Encuentra y activa el link correspondiente a una pantalla
 * @param {string} idPantalla - ID de la pantalla
 */
function activarNavPorPantalla(idPantalla) {
    const mapaPantallas = {
        'home': 'link-home',
        'pantalla-clasificacion': 'link-clasificacion',
        'pantalla-calendario': 'link-calendario',
        'pantalla-resultados': 'link-resultados'
    };

    const linkId = mapaPantallas[idPantalla];
    if (linkId) {
        const link = document.getElementById(linkId);
        if (link) {
            activarNavLink(link);
        }
    }
}

// ==================================================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ==================================================================

/**
 * Configura todos los event listeners de navegación
 */
function configurarNavegacion() {
    // Obtener todos los enlaces
    const linkHome = document.getElementById('link-home');
    const linkClasificacion = document.getElementById('link-clasificacion');
    const linkCalendario = document.getElementById('link-calendario');
    const linkResultados = document.getElementById('link-resultados');

    // Configurar Link Home
    if (linkHome) {
        linkHome.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarPantalla('home', linkHome);
        });
    }

    // Configurar Link Clasificación
    if (linkClasificacion) {
        linkClasificacion.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarPantalla('pantalla-clasificacion', linkClasificacion);
        });
    }

    // Configurar Link Calendario
    if (linkCalendario) {
        linkCalendario.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarPantalla('pantalla-calendario', linkCalendario);
        });
    }

    // Configurar Link Resultados
    if (linkResultados) {
        linkResultados.addEventListener('click', (e) => {
            e.preventDefault();
            cambiarPantalla('pantalla-resultados', linkResultados);
        });
    }

    // Configurar navegación por URL hash (opcional)
    configurarNavegacionHash();
}

/**
 * Función unificada para cambiar de pantalla
 * @param {string} idPantalla - ID de la pantalla
 * @param {HTMLElement} linkElement - Elemento del enlace
 */
function cambiarPantalla(idPantalla, linkElement) {
    mostrarPantalla(idPantalla);
    if (linkElement) {
        activarNavLink(linkElement);
    }
    // Actualizar URL sin recargar
    actualizarURL(idPantalla);
}

// ==================================================================
// NAVEGACIÓN POR URL HASH (OPCIONAL)
// ==================================================================

/**
 * Configura la navegación mediante hash en la URL
 */
function configurarNavegacionHash() {
    // Mapa de hashes a pantallas
    const hashToPantalla = {
        '#home': 'home',
        '#clasificacion': 'pantalla-clasificacion',
        '#calendario': 'pantalla-calendario',
        '#resultados': 'pantalla-resultados',
        '': 'home' // Default
    };

    // Escuchar cambios en el hash
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        const idPantalla = hashToPantalla[hash] || 'home';
        mostrarPantalla(idPantalla);
        activarNavPorPantalla(idPantalla);
    });

    // Procesar hash inicial si existe
    const hashInicial = window.location.hash;
    if (hashInicial && hashToPantalla[hashInicial]) {
        const idPantalla = hashToPantalla[hashInicial];
        mostrarPantalla(idPantalla);
        activarNavPorPantalla(idPantalla);
    }
}

/**
 * Actualiza la URL sin recargar la página
 * @param {string} idPantalla - ID de la pantalla
 */
function actualizarURL(idPantalla) {
    const pantallaToHash = {
        'home': '#home',
        'pantalla-clasificacion': '#clasificacion',
        'pantalla-calendario': '#calendario',
        'pantalla-resultados': '#resultados'
    };

    const nuevoHash = pantallaToHash[idPantalla] || '#home';
    if (window.location.hash !== nuevoHash) {
        history.pushState(null, '', nuevoHash);
    }
}

// ==================================================================
// FUNCIONES AUXILIARES
// ==================================================================

/**
 * Regresa a la pantalla anterior
 */
function volverAtras() {
    if (navigationState.historial.length > 0) {
        const pantallaAnterior = navigationState.historial.pop();
        mostrarPantalla(pantallaAnterior);
        activarNavPorPantalla(pantallaAnterior);
    }
}

/**
 * Obtiene la pantalla actual
 * @returns {string} ID de la pantalla actual
 */
function getPantallaActual() {
    return navigationState.pantallaActual;
}

/**
 * Verifica si una pantalla está activa
 * @param {string} idPantalla - ID de la pantalla
 * @returns {boolean}
 */
function esPantallaActiva(idPantalla) {
    return navigationState.pantallaActual === idPantalla;
}

// ==================================================================
// INICIALIZACIÓN
// ==================================================================

/**
 * Inicializa el sistema de navegación
 */
function inicializarNavegacion() {
    // Configurar event listeners
    configurarNavegacion();

    // Verificar si hay hash en la URL
    const hashInicial = window.location.hash;
    
    if (hashInicial) {
        // Si hay hash, intentar navegar a esa pantalla
        const mapHash = {
            '#home': 'home',
            '#clasificacion': 'pantalla-clasificacion',
            '#calendario': 'pantalla-calendario',
            '#resultados': 'pantalla-resultados'
        };
        const pantallaInicial = mapHash[hashInicial] || 'home';
        mostrarPantalla(pantallaInicial);
        activarNavPorPantalla(pantallaInicial);
    } else {
        // Mostrar pantalla home por defecto
        mostrarPantalla('home');
        const linkHome = document.getElementById('link-home');
        if (linkHome) {
            activarNavLink(linkHome);
        }
    }

    console.log('✅ Sistema de navegación inicializado');
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarNavegacion);
} else {
    inicializarNavegacion();
}

// ==================================================================
// EXPORTAR API PÚBLICA
// ==================================================================

window.navigationController = {
    mostrarPantalla,
    cambiarPantalla,
    volverAtras,
    getPantallaActual,
    esPantallaActiva,
    activarNavLink
};