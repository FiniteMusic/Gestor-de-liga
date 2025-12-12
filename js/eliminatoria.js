/**
 * ⚽ MÓDULO DE GESTIÓN DE FASE ELIMINATORIA ⚽
 * Gestiona la visualización del top 8 y generación de eliminatorias
 */

(function() {
    'use strict';

    // Variables globales del módulo
    let currentTorneoId = null;
    let currentCategoria = '';

    /**
     * Inicialización del módulo
     */
    function init() {
        console.log('[ELIMINATORIA] Módulo inicializado');
        
        // Cargar torneos disponibles
        loadTorneos();
        
        // Event listeners
        setupEventListeners();
    }

    /**
     * Configura los event listeners
     */
    function setupEventListeners() {
        const filterTorneo = document.getElementById('filter-torneo');
        const filterCategoria = document.getElementById('filter-categoria');
        const btnGenerar = document.getElementById('btn-generar-eliminatoria');

        if (filterTorneo) {
            filterTorneo.addEventListener('change', handleFilterChange);
        }

        if (filterCategoria) {
            filterCategoria.addEventListener('change', handleFilterChange);
        }

        if (btnGenerar) {
            btnGenerar.addEventListener('click', handleGenerarEliminatoria);
        }
    }

    /**
     * Carga los torneos disponibles
     */
    async function loadTorneos() {
        const selectTorneo = document.getElementById('filter-torneo');
        
        try {
            const response = await fetch('../pages/eliminatoria.php?action=get_torneos');
            const data = await response.json();

            if (data.success) {
                selectTorneo.innerHTML = '<option value="">Selecciona un torneo</option>';
                
                data.torneos.forEach(torneo => {
                    const option = document.createElement('option');
                    option.value = torneo.id;
                    option.textContent = `${torneo.nombre} - ${torneo.temporada}`;
                    option.dataset.categoria = torneo.tipo_futbol;
                    selectTorneo.appendChild(option);
                });

                // Si solo hay un torneo, seleccionarlo automáticamente
                if (data.torneos.length === 1) {
                    selectTorneo.value = data.torneos[0].id;
                    handleFilterChange();
                }
            } else {
                showAlert('Error al cargar torneos: ' + data.message, 'danger');
            }
        } catch (error) {
            console.error('[ERROR] Cargando torneos:', error);
            showAlert('Error de conexión al cargar torneos', 'danger');
        }
    }

    /**
     * Maneja el cambio de filtros
     */
    async function handleFilterChange() {
        const selectTorneo = document.getElementById('filter-torneo');
        const selectCategoria = document.getElementById('filter-categoria');
        
        currentTorneoId = selectTorneo.value;
        currentCategoria = selectCategoria.value;

        if (!currentTorneoId) {
            showEmptyState('Selecciona un torneo para ver los equipos clasificados');
            hideStatusBanner();
            disableGenerateButton();
            return;
        }

        // Cargar equipos y verificar estado
        await loadEquiposTop8();
        await checkTorneoStatus();
    }

    /**
     * Carga los equipos del top 8
     */
    async function loadEquiposTop8() {
        const tableContent = document.getElementById('table-content');
        
        // Mostrar loading
        tableContent.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Cargando equipos clasificados...</p>
            </div>
        `;

        try {
            const url = `../pages/eliminatoria.php?action=get_top8&torneo_id=${currentTorneoId}${currentCategoria ? '&categoria=' + currentCategoria : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                if (data.equipos && data.equipos.length > 0) {
                    renderEquiposTable(data.equipos);
                } else {
                    showEmptyState('No hay equipos clasificados para este torneo');
                }
            } else {
                showAlert('Error: ' + data.message, 'danger');
                showEmptyState(data.message || 'No se pudieron cargar los equipos');
            }
        } catch (error) {
            console.error('[ERROR] Cargando equipos:', error);
            showAlert('Error de conexión al cargar equipos', 'danger');
            showEmptyState('Error al cargar los datos');
        }
    }

    /**
     * Verifica el estado del torneo para habilitar/deshabilitar botón
     */
    async function checkTorneoStatus() {
        if (!currentTorneoId) return;

        try {
            const response = await fetch(`../pages/eliminatoria.php?action=check_status&torneo_id=${currentTorneoId}`);
            const data = await response.json();

            const btnGenerar = document.getElementById('btn-generar-eliminatoria');

            if (data.success) {
                if (data.puede_generar) {
                    btnGenerar.disabled = false;
                    showStatusBanner(
                        'success',
                        'Torneo listo para eliminatoria',
                        'Todos los partidos de la fase regular han finalizado. Puedes generar la fase eliminatoria.'
                    );
                } else {
                    btnGenerar.disabled = true;
                    showStatusBanner(
                        'warning',
                        'Torneo en fase regular',
                        data.mensaje || 'Aún hay partidos pendientes de finalizar en la última jornada.'
                    );
                }
            } else {
                btnGenerar.disabled = true;
                showStatusBanner('warning', 'Estado desconocido', data.message);
            }
        } catch (error) {
            console.error('[ERROR] Verificando estado:', error);
            disableGenerateButton();
        }
    }

    /**
     * Renderiza la tabla de equipos
     */
    function renderEquiposTable(equipos) {
        const tableContent = document.getElementById('table-content');
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Equipo</th>
                        <th>Estado</th>
                        <th>Capitán</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipos.forEach((equipo, index) => {
            const estadoClass = equipo.estado === 'confirmado' ? 'status-confirmado' : 'status-preinscrito';
            const estadoText = equipo.estado === 'confirmado' ? 'Confirmado' : 'Pre-inscrito';
            
            html += `
                <tr>
                    <td>
                        <span class="position-badge">${index + 1}</span>
                    </td>
                    <td><strong>${escapeHtml(equipo.nombre_equipo)}</strong></td>
                    <td>
                        <span class="status-badge ${estadoClass}">
                            ${estadoText}
                        </span>
                    </td>
                    <td>${escapeHtml(equipo.nombre_capitan)}</td>
                    <td>${escapeHtml(equipo.email)}</td>
                    <td>${equipo.telefono ? escapeHtml(equipo.telefono) : 'N/A'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        tableContent.innerHTML = html;
    }

    /**
     * Muestra el banner de estado
     */
    function showStatusBanner(type, title, message) {
        const banner = document.getElementById('status-banner');
        const statusTitle = document.getElementById('status-title');
        const statusMessage = document.getElementById('status-message');

        banner.style.display = 'block';
        banner.className = 'status-banner ' + type;
        statusTitle.textContent = title;
        statusMessage.textContent = message;
    }

    /**
     * Oculta el banner de estado
     */
    function hideStatusBanner() {
        const banner = document.getElementById('status-banner');
        banner.style.display = 'none';
    }

    /**
     * Muestra estado vacío
     */
    function showEmptyState(message) {
        const tableContent = document.getElementById('table-content');
        tableContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-title">🏆</div>
                <p class="empty-text">${message}</p>
            </div>
        `;
    }

    /**
     * Deshabilita el botón de generar
     */
    function disableGenerateButton() {
        const btnGenerar = document.getElementById('btn-generar-eliminatoria');
        if (btnGenerar) {
            btnGenerar.disabled = true;
        }
    }

    /**
     * Maneja la generación de la fase eliminatoria
     */
    async function handleGenerarEliminatoria() {
        if (!currentTorneoId) {
            showAlert('Debes seleccionar un torneo', 'warning');
            return;
        }

        // Confirmación
        if (!confirm('¿Estás seguro de generar la fase eliminatoria? Esta acción no se puede deshacer.')) {
            return;
        }

        const btnGenerar = document.getElementById('btn-generar-eliminatoria');
        const originalText = btnGenerar.innerHTML;
        
        // Deshabilitar botón y mostrar loading
        btnGenerar.disabled = true;
        btnGenerar.innerHTML = '<span>⏳</span> Generando...';

        try {
            const response = await fetch('../pages/eliminatoria.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=generar_eliminatoria&torneo_id=${currentTorneoId}`
            });

            const data = await response.json();

            if (data.success) {
                showAlert(data.message || 'Fase eliminatoria generada exitosamente', 'success');
                
                // Recargar datos
                setTimeout(() => {
                    handleFilterChange();
                }, 1500);
            } else {
                showAlert('Error: ' + data.message, 'danger');
                btnGenerar.disabled = false;
                btnGenerar.innerHTML = originalText;
            }
        } catch (error) {
            console.error('[ERROR] Generando eliminatoria:', error);
            showAlert('Error de conexión al generar eliminatoria', 'danger');
            btnGenerar.disabled = false;
            btnGenerar.innerHTML = originalText;
        }
    }

    /**
     * Muestra una alerta
     */
    function showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alert-container');
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${type === 'success' ? '✓' : '⚠'}</span>
            <span>${message}</span>
        `;

        alertContainer.appendChild(alert);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();