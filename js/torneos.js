(function() {
    'use strict';

    // Variables globales del módulo
    let torneos = [];
    let torneoSeleccionado = null;

    // Referencias a elementos del DOM
    const elements = {
        filtroEstado: document.getElementById('filtro-estado'),
        btnNuevoTorneo: document.getElementById('btn-nuevo-torneo'),
        tableContainer: document.getElementById('torneos-table-container'),
        loadingState: document.getElementById('loading-state'),
        alertContainer: document.getElementById('alert-container'),
        
        // Modal cambiar estado
        modalEstado: document.getElementById('modal-cambiar-estado'),
        closeEstadoModal: document.getElementById('close-estado-modal'),
        torneoNombreDisplay: document.getElementById('torneo-nombre-display'),
        nuevoEstadoSelect: document.getElementById('nuevo-estado'),
        cancelEstadoBtn: document.getElementById('cancel-estado-btn'),
        confirmEstadoBtn: document.getElementById('confirm-estado-btn'),
        
        // Modal nuevo torneo
        modalNuevo: document.getElementById('modal-nuevo-torneo'),
        closeNuevoModal: document.getElementById('close-nuevo-modal'),
        formNuevoTorneo: document.getElementById('form-nuevo-torneo'),
        nombreTorneo: document.getElementById('nombre-torneo'),
        temporadaTorneo: document.getElementById('temporada-torneo'),
        tipoFutbol: document.getElementById('tipo-futbol'),
        cancelNuevoBtn: document.getElementById('cancel-nuevo-btn'),
        confirmNuevoBtn: document.getElementById('confirm-nuevo-btn')
    };

    // Inicialización
    function init() {
        console.log('[TORNEOS MODULE] Inicializando módulo de torneos');
        setupEventListeners();
        cargarTorneos();
    }

    // Configurar event listeners
    function setupEventListeners() {
        console.log('[TORNEOS MODULE] Configurando event listeners');
        
        // Filtro por estado
        if (elements.filtroEstado) {
            elements.filtroEstado.addEventListener('change', filtrarTorneos);
        }
        
        // Botón nuevo torneo
        if (elements.btnNuevoTorneo) {
            elements.btnNuevoTorneo.addEventListener('click', abrirModalNuevo);
        }
        
        // Modal cambiar estado
        if (elements.closeEstadoModal) {
            elements.closeEstadoModal.addEventListener('click', cerrarModalEstado);
        }
        if (elements.cancelEstadoBtn) {
            elements.cancelEstadoBtn.addEventListener('click', cerrarModalEstado);
        }
        if (elements.confirmEstadoBtn) {
            elements.confirmEstadoBtn.addEventListener('click', confirmarCambioEstado);
        }
        
        // Modal nuevo torneo
        if (elements.closeNuevoModal) {
            elements.closeNuevoModal.addEventListener('click', cerrarModalNuevo);
        }
        if (elements.cancelNuevoBtn) {
            elements.cancelNuevoBtn.addEventListener('click', cerrarModalNuevo);
        }
        if (elements.confirmNuevoBtn) {
            elements.confirmNuevoBtn.addEventListener('click', crearNuevoTorneo);
        }
        if (elements.formNuevoTorneo) {
            elements.formNuevoTorneo.addEventListener('submit', (e) => {
                e.preventDefault();
                crearNuevoTorneo();
            });
        }
        
        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target === elements.modalEstado) {
                cerrarModalEstado();
            }
            if (e.target === elements.modalNuevo) {
                cerrarModalNuevo();
            }
        });
    }

    // Cargar torneos desde el servidor
    async function cargarTorneos() {
        console.log('[TORNEOS MODULE] Cargando torneos desde el servidor');
        
        try {
            showLoading(true);
            
            const response = await fetch('../pages/torneos.php?action=listar');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[TORNEOS MODULE] Respuesta del servidor:', data);
            
            if (data.success) {
                torneos = data.data || [];
                console.log(`[TORNEOS MODULE] ${torneos.length} torneos cargados`);
                renderizarTorneos(torneos);
            } else {
                showAlert('Error al cargar torneos: ' + (data.message || 'Error desconocido'), 'danger');
            }
        } catch (error) {
            console.error('[TORNEOS MODULE] Error al cargar torneos:', error);
            showAlert('Error de conexión al cargar torneos', 'danger');
        } finally {
            showLoading(false);
        }
    }

    // Filtrar torneos por estado
    function filtrarTorneos() {
        const estadoFiltro = elements.filtroEstado.value;
        console.log('[TORNEOS MODULE] Filtrando por estado:', estadoFiltro);
        
        if (estadoFiltro === '') {
            renderizarTorneos(torneos);
        } else {
            const torneosFiltrados = torneos.filter(t => t.estado === estadoFiltro);
            console.log(`[TORNEOS MODULE] ${torneosFiltrados.length} torneos encontrados`);
            renderizarTorneos(torneosFiltrados);
        }
    }

    // Renderizar tabla de torneos
    function renderizarTorneos(listaTorneos) {
        console.log('[TORNEOS MODULE] Renderizando', listaTorneos.length, 'torneos');
        
        if (listaTorneos.length === 0) {
            elements.tableContainer.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-title">No hay torneos</h3>
                    <p class="empty-text">No se encontraron torneos con los filtros seleccionados</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Torneo</th>
                        <th>Estado</th>
                        <th>Temporada</th>
                        <th>Tipo</th>
                        <th>Equipos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${listaTorneos.map(torneo => `
                        <tr>
                            <td><strong>${escapeHtml(torneo.nombre)}</strong></td>
                            <td>${getEstadoBadge(torneo.estado)}</td>
                            <td>${escapeHtml(torneo.temporada)}</td>
                            <td>${torneo.tipo_futbol === 'futbol11' ? 'Fútbol 11' : 'Fútbol 7'}</td>
                            <td><strong>${torneo.num_equipos || 0}</strong></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-small btn-primary" 
                                            onclick="window.torneoModule.abrirModalEstado(${torneo.id}, '${escapeHtml(torneo.nombre)}', '${torneo.estado}')">
                                        Cambiar Estado
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        elements.tableContainer.innerHTML = tableHTML;
    }

    // Obtener badge de estado
    function getEstadoBadge(estado) {
        const estadosConfig = {
            'inactivo': { label: 'Inactivo', class: 'status-inactivo' },
            'inscripcion': { label: 'Inscripción', class: 'status-inscripcion' },
            'en_curso': { label: 'En Curso', class: 'status-en_curso' },
            'finalizado': { label: 'Finalizado', class: 'status-finalizado' },
            'archivado': { label: 'Archivado', class: 'status-archivado' }
        };

        const config = estadosConfig[estado] || { label: estado, class: 'status-inactivo' };
        return `<span class="status-badge ${config.class}">${config.label}</span>`;
    }

    // Abrir modal cambiar estado
    function abrirModalEstado(id, nombre, estadoActual) {
        console.log('[TORNEOS MODULE] Abriendo modal para cambiar estado del torneo:', id);
        
        torneoSeleccionado = id;
        elements.torneoNombreDisplay.value = nombre;
        elements.nuevoEstadoSelect.value = estadoActual;
        elements.modalEstado.style.display = 'block';
    }

    // Cerrar modal cambiar estado
    function cerrarModalEstado() {
        console.log('[TORNEOS MODULE] Cerrando modal de cambio de estado');
        
        elements.modalEstado.style.display = 'none';
        torneoSeleccionado = null;
    }

    // Confirmar cambio de estado
    async function confirmarCambioEstado() {
        if (!torneoSeleccionado) {
            console.error('[TORNEOS MODULE] No hay torneo seleccionado');
            return;
        }

        const nuevoEstado = elements.nuevoEstadoSelect.value;
        console.log('[TORNEOS MODULE] Cambiando estado del torneo', torneoSeleccionado, 'a', nuevoEstado);
        
        try {
            elements.confirmEstadoBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('action', 'cambiar_estado');
            formData.append('id', torneoSeleccionado);
            formData.append('estado', nuevoEstado);

            const response = await fetch('../pages/torneos.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('[TORNEOS MODULE] Respuesta del servidor:', data);

            if (data.success) {
                showAlert('Estado del torneo actualizado correctamente', 'success');
                cerrarModalEstado();
                await cargarTorneos();
            } else {
                showAlert('Error: ' + (data.message || 'Error desconocido'), 'danger');
            }
        } catch (error) {
            console.error('[TORNEOS MODULE] Error al cambiar estado:', error);
            showAlert('Error al cambiar el estado', 'danger');
        } finally {
            elements.confirmEstadoBtn.disabled = false;
        }
    }

    // Abrir modal nuevo torneo
    function abrirModalNuevo() {
        console.log('[TORNEOS MODULE] Abriendo modal para crear nuevo torneo');
        
        elements.formNuevoTorneo.reset();
        elements.modalNuevo.style.display = 'block';
    }

    // Cerrar modal nuevo torneo
    function cerrarModalNuevo() {
        console.log('[TORNEOS MODULE] Cerrando modal de nuevo torneo');
        
        elements.modalNuevo.style.display = 'none';
        elements.formNuevoTorneo.reset();
    }

    // Crear nuevo torneo
    async function crearNuevoTorneo() {
        console.log('[TORNEOS MODULE] Creando nuevo torneo');
        
        // Validar formulario
        if (!elements.formNuevoTorneo.checkValidity()) {
            elements.formNuevoTorneo.reportValidity();
            return;
        }

        const nombre = elements.nombreTorneo.value.trim();
        const temporada = elements.temporadaTorneo.value.trim();
        const tipoFutbol = elements.tipoFutbol.value;

        console.log('[TORNEOS MODULE] Datos del nuevo torneo:', { nombre, temporada, tipoFutbol });

        try {
            elements.confirmNuevoBtn.disabled = true;

            const formData = new FormData();
            formData.append('action', 'crear');
            formData.append('nombre', nombre);
            formData.append('temporada', temporada);
            formData.append('tipo_futbol', tipoFutbol);

            const response = await fetch('../pages/torneos.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('[TORNEOS MODULE] Respuesta del servidor:', data);

            if (data.success) {
                showAlert('Torneo creado exitosamente', 'success');
                cerrarModalNuevo();
                await cargarTorneos();
            } else {
                showAlert('Error: ' + (data.message || 'Error desconocido'), 'danger');
            }
        } catch (error) {
            console.error('[TORNEOS MODULE] Error al crear torneo:', error);
            showAlert('Error al crear el torneo', 'danger');
        } finally {
            elements.confirmNuevoBtn.disabled = false;
        }
    }

    // Mostrar/ocultar loading
    function showLoading(show) {
        if (elements.loadingState) {
            elements.loadingState.style.display = show ? 'block' : 'none';
        }
    }

    // Mostrar alertas
    function showAlert(message, type = 'success') {
        console.log(`[TORNEOS MODULE] Mostrando alerta [${type}]:`, message);
        
        const alertHTML = `
            <div class="alert alert-${type}">
                ${escapeHtml(message)}
            </div>
        `;
        
        elements.alertContainer.innerHTML = alertHTML;
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            elements.alertContainer.innerHTML = '';
        }, 5000);

        // Scroll al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Función para escapar HTML y prevenir XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Exponer funciones públicas
    window.torneoModule = {
        abrirModalEstado: abrirModalEstado
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[TORNEOS MODULE] Módulo de torneos cargado correctamente');
})();