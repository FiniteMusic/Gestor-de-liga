function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(sec => {
        if (sec.id === idPantalla) {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    });

    // aplicar animaciones a la nueva pantalla activa
    if (typeof configurarAnimaciones === 'function') {
        configurarAnimaciones();
    }
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

function configurarNavegacion() {
    const linkAdmin = document.getElementById('link-admin');
    const linkClasificacion = document.getElementById('link-clasificacion');
    const linkResultados = document.getElementById('link-resultados');
    const logout = document.getElementById('link-logout');

    if (linkAdmin) {
        linkAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-admin');
            navActive(linkAdmin);
            if (typeof generarJuegos === 'function') generarJuegos();
            if (typeof configurarScroll === 'function') configurarScroll();
            if (typeof configurarFilasTabla === 'function') configurarFilasTabla();
        });
    }

    if (linkClasificacion) {
        linkClasificacion.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-clasificacion');
            navActive(linkClasificacion);
            if (typeof generarJuegos === 'function') generarJuegos();
            if (typeof configurarScroll === 'function') configurarScroll();
            if (typeof configurarFilasTabla === 'function') configurarFilasTabla();
        });
    }

    if (linkResultados) {
        linkResultados.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-resultados');
            navActive(linkResultados);
            if (typeof generarJuegos === 'function') generarJuegos();
            if (typeof configurarScroll === 'function') configurarScroll();
            if (typeof configurarFilasTabla === 'function') configurarFilasTabla();
            if (typeof iniciarFechas === 'function') iniciarFechas();
        });
    }

    if (logout) {
        logout.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../index.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    configurarNavegacion();
    // Mostrar la pantalla de administración por defecto
    mostrarPantalla('pantalla-admin');
    // Activar el link correspondiente
    const linkAdmin = document.getElementById('link-admin');
    if (linkAdmin) {
        navActive(linkAdmin);
    }
});