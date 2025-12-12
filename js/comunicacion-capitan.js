(function() {
    'use strict';

    let todosLosEquipos = [];
    let todosLosTorneos = [];

    // Inicializar cuando el DOM esté listo
    function init() {
        cargarTorneos();
        cargarEquipos();
        setupEventListeners();
    }

    function setupEventListeners() {
        const filtroCategoria = document.getElementById('filtroCategoria');
        const filtroEstado = document.getElementById('filtroEstado');
        const filtroTorneo = document.getElementById('filtroTorneo');

        if (filtroCategoria) {
            filtroCategoria.addEventListener('change', aplicarFiltros);
        }
        if (filtroEstado) {
            filtroEstado.addEventListener('change', aplicarFiltros);
        }
        if (filtroTorneo) {
            filtroTorneo.addEventListener('change', aplicarFiltros);
        }
    }

    async function cargarTorneos() {
        try {
            const response = await fetch('../pages/comunicacion-capitan.php?action=getTorneos');
            const data = await response.json();

            if (data.success) {
                todosLosTorneos = data.data.torneos;
                actualizarSelectTorneos(data.data.torneos);
            }
        } catch (error) {
            console.error('Error al cargar torneos:', error);
        }
    }

    function actualizarSelectTorneos(torneos) {
        const selectTorneo = document.getElementById('filtroTorneo');
        if (!selectTorneo) return;

        // Limpiar opciones excepto la primera
        selectTorneo.innerHTML = '<option value="">Todos los torneos</option>';

        torneos.forEach(torneo => {
            const option = document.createElement('option');
            option.value = torneo.id;
            option.textContent = `${torneo.nombre} - ${torneo.temporada}`;
            selectTorneo.appendChild(option);
        });
    }

    async function cargarEquipos() {
        try {
            const response = await fetch('../pages/comunicacion-capitan.php?action=getEquipos');
            const data = await response.json();

            if (data.success) {
                todosLosEquipos = data.data.equipos;
                actualizarEstadisticas(data.data.equipos);
                aplicarFiltros();
            } else {
                mostrarError(data.message || 'Error al cargar los equipos');
            }
        } catch (error) {
            console.error('Error al cargar equipos:', error);
            mostrarError('Error de conexión al cargar los equipos');
        }
    }

    function aplicarFiltros() {
        const filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
        const filtroEstado = document.getElementById('filtroEstado')?.value || '';
        const filtroTorneo = document.getElementById('filtroTorneo')?.value || '';

        let equiposFiltrados = todosLosEquipos.filter(equipo => {
            const matchCategoria = !filtroCategoria || equipo.tipo_futbol === filtroCategoria;
            const matchEstado = !filtroEstado || equipo.estado === filtroEstado;
            const matchTorneo = !filtroTorneo || equipo.id_torneo == filtroTorneo;

            return matchCategoria && matchEstado && matchTorneo;
        });

        mostrarEquipos(equiposFiltrados);
        actualizarEstadisticas(equiposFiltrados);
    }

    function actualizarEstadisticas(equipos) {
        const statTotal = document.getElementById('statTotal');
        const statConfirmados = document.getElementById('statConfirmados');
        const statPreinscritos = document.getElementById('statPreinscritos');
        const statEliminados = document.getElementById('statEliminados');

        if (statTotal) statTotal.textContent = equipos.length;

        if (statConfirmados) {
            statConfirmados.textContent = equipos.filter(e => e.estado === 'confirmado').length;
        }

        if (statPreinscritos) {
            statPreinscritos.textContent = equipos.filter(e => e.estado === 'preinscrito').length;
        }

        if (statEliminados) {
            const eliminados = equipos.filter(e => e.estado === 'eliminado' || e.estado === 'descalificado').length;
            statEliminados.textContent = eliminados;
        }
    }

    function mostrarEquipos(equipos) {
        const container = document.getElementById('equiposTableContainer');
        if (!container) return;

        if (equipos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3 class="empty-title">No se encontraron equipos</h3>
                    <p class="empty-text">No hay equipos que coincidan con los filtros seleccionados</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-container">
                <table class="equipos-table">
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Estado</th>
                            <th>Torneo</th>
                            <th>Categoría</th>
                            <th>Capitán</th>
                            <th>Correo</th>
                            <th>Número</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipos.map(equipo => crearFilaEquipo(equipo)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    function crearFilaEquipo(equipo) {
        const estadoBadgeClass = `badge-${equipo.estado}`;
        const categoriaBadgeClass = `badge-${equipo.tipo_futbol}`;
        const categoriaTexto = equipo.tipo_futbol === 'futbol11' ? 'Fútbol 11' : 'Fútbol 7';
        
        // Formatear el estado para mostrar
        const estadoTexto = equipo.estado.charAt(0).toUpperCase() + equipo.estado.slice(1);

        // Formatear el mensaje de WhatsApp
        const mensaje = encodeURIComponent(`Hola ${equipo.capitan_nombre}, te contacto por este medio para darte noticias`);
        const numeroLimpio = (equipo.telefono || '').replace(/\D/g, '');
        const whatsappURL = `https://wa.me/52${numeroLimpio}?text=${mensaje}`;

        return `
            <tr>
                <td><strong>${equipo.nombre}</strong></td>
                <td><span class="badge ${estadoBadgeClass}">${estadoTexto}</span></td>
                <td>${equipo.torneo_nombre}</td>
                <td><span class="badge ${categoriaBadgeClass}">${categoriaTexto}</span></td>
                <td>${equipo.capitan_nombre}</td>
                <td>${equipo.email}</td>
                <td>
                    ${equipo.telefono ? `
                        <a href="${whatsappURL}" target="_blank" class="whatsapp-btn" title="Contactar por WhatsApp">
                            <svg class="whatsapp-icon" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            ${equipo.telefono}
                        </a>
                    ` : '<span style="color: var(--text-muted);">Sin teléfono</span>'}
                </td>
            </tr>
        `;
    }

    function mostrarError(mensaje) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        alertContainer.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${mensaje}
            </div>
        `;

        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    // Inicializar cuando se cargue el script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();