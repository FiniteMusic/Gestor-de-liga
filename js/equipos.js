/**
 * Módulo de Gestión de Equipos
 * Controla la visualización y administración de equipos
 */

// Variables globales
let equiposData = [];
let torneosData = [];
let accionPendiente = null;

// Inicialización cuando el DOM está listo
(function() {
    // Esperar a que el contenido esté cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();

/**
 * Función de inicialización principal
 */
function inicializar() {
    console.log('[EQUIPOS] Inicializando módulo...');
    
    // Verificar que los elementos existen
    if (!verificarElementos()) {
        console.error('[EQUIPOS] Elementos del DOM no encontrados');
        return;
    }
    
    // Cargar datos iniciales
    cargarTorneos();
    cargarEquipos();
    
    // Configurar event listeners
    configurarEventListeners();
    
    console.log('[EQUIPOS] Módulo inicializado correctamente');
}

/**
 * Verificar que los elementos del DOM existen
 */
function verificarElementos() {
    const elementos = [
        'filtro-tipo',
        'filtro-estado',
        'filtro-torneo',
        'equipos-tbody',
        'loading-state',
        'table-content',
        'empty-state'
    ];
    
    for (const id of elementos) {
        if (!document.getElementById(id)) {
            console.error(`[EQUIPOS] Elemento no encontrado: ${id}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Configurar todos los event listeners
 */
function configurarEventListeners() {
    // Filtros
    const filtroTipo = document.getElementById('filtro-tipo');
    const filtroEstado = document.getElementById('filtro-estado');
    const filtroTorneo = document.getElementById('filtro-torneo');
    
    if (filtroTipo) filtroTipo.addEventListener('change', filtrarEquipos);
    if (filtroEstado) filtroEstado.addEventListener('change', filtrarEquipos);
    if (filtroTorneo) filtroTorneo.addEventListener('change', filtrarEquipos);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.querySelector('#confirmModal .modal');
        if (modal && event.target === modal) {
            cerrarModal();
        }
    });
    
    console.log('[EQUIPOS] Event listeners configurados');
}

/**
 * Cargar lista de torneos para el filtro
 */
async function cargarTorneos() {
    console.log('[EQUIPOS] Cargando torneos...');
    
    try {
        const response = await fetch('../pages/api-equipos.php?action=getTorneos');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            torneosData = data.torneos;
            const select = document.getElementById('filtro-torneo');
            
            if (select) {
                // Limpiar opciones existentes (excepto "Todos")
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Agregar torneos
                data.torneos.forEach(torneo => {
                    const option = document.createElement('option');
                    option.value = torneo.id;
                    option.textContent = `${torneo.nombre} - ${torneo.temporada}`;
                    select.appendChild(option);
                });
                
                console.log(`[EQUIPOS] ${data.torneos.length} torneos cargados`);
            }
        } else {
            console.error('[EQUIPOS] Error en respuesta:', data.message);
        }
    } catch (error) {
        console.error('[EQUIPOS] Error al cargar torneos:', error);
        mostrarAlerta('warning', 'No se pudieron cargar los torneos para el filtro');
    }
}

/**
 * Cargar equipos desde el servidor
 */
async function cargarEquipos() {
    console.log('[EQUIPOS] Cargando equipos...');
    mostrarCargando(true);
    
    try {
        const response = await fetch('../pages/api-equipos.php?action=getEquipos');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            equiposData = data.equipos || [];
            console.log(`[EQUIPOS] ${equiposData.length} equipos cargados`);
            
            actualizarEstadisticas(equiposData);
            mostrarEquipos(equiposData);
        } else {
            console.error('[EQUIPOS] Error en respuesta:', data.message);
            mostrarAlerta('danger', data.message || 'Error al cargar equipos');
            mostrarEquipos([]);
        }
    } catch (error) {
        console.error('[EQUIPOS] Error al cargar equipos:', error);
        mostrarAlerta('danger', 'Error de conexión al cargar equipos');
        mostrarEquipos([]);
    } finally {
        mostrarCargando(false);
    }
}

/**
 * Mostrar/ocultar indicador de carga
 */
function mostrarCargando(mostrar) {
    const loadingState = document.getElementById('loading-state');
    const tableContent = document.getElementById('table-content');
    const emptyState = document.getElementById('empty-state');
    
    if (loadingState) loadingState.style.display = mostrar ? 'block' : 'none';
    if (tableContent) tableContent.style.display = mostrar ? 'none' : 'block';
    if (emptyState) emptyState.style.display = 'none';
}

/**
 * Actualizar estadísticas en el header
 */
function actualizarEstadisticas(equipos) {
    if (!Array.isArray(equipos)) {
        console.error('[EQUIPOS] Datos de equipos inválidos');
        return;
    }
    
    const stats = {
        total: equipos.length,
        confirmados: equipos.filter(e => e.estado === 'confirmado').length,
        preinscritos: equipos.filter(e => e.estado === 'preinscrito').length,
        descalificados: equipos.filter(e => e.estado === 'descalificado').length
    };
    
    const elementos = {
        'stat-total': stats.total,
        'stat-confirmados': stats.confirmados,
        'stat-preinscritos': stats.preinscritos,
        'stat-descalificados': stats.descalificados
    };
    
    for (const [id, valor] of Object.entries(elementos)) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }
    
    console.log('[EQUIPOS] Estadísticas actualizadas:', stats);
}

/**
 * Mostrar equipos en la tabla
 */
function mostrarEquipos(equipos) {
    if (!Array.isArray(equipos)) {
        console.error('[EQUIPOS] Datos de equipos inválidos');
        return;
    }
    
    const tbody = document.getElementById('equipos-tbody');
    const emptyState = document.getElementById('empty-state');
    const tableContent = document.getElementById('table-content');
    
    if (!tbody || !emptyState || !tableContent) {
        console.error('[EQUIPOS] Elementos de tabla no encontrados');
        return;
    }
    
    if (equipos.length === 0) {
        tableContent.style.display = 'none';
        emptyState.style.display = 'block';
        tbody.innerHTML = '';
        console.log('[EQUIPOS] No hay equipos para mostrar');
        return;
    }
    
    tableContent.style.display = 'block';
    emptyState.style.display = 'none';
    
    tbody.innerHTML = equipos.map(equipo => crearFilaEquipo(equipo)).join('');
    
    console.log(`[EQUIPOS] ${equipos.length} equipos mostrados en tabla`);
}

/**
 * Crear HTML para una fila de equipo
 */
function crearFilaEquipo(equipo) {
    return `
        <tr>
            <td>
                <div class="team-name">${escapeHtml(equipo.nombre)}</div>
            </td>
            <td>${escapeHtml(equipo.torneo_nombre)}</td>
            <td>
                <span class="status-badge status-${equipo.estado}">
                    <span class="status-dot"></span>
                    ${formatearEstado(equipo.estado)}
                </span>
            </td>
            <td>${escapeHtml(equipo.capitan_nombre)}</td>
            <td>${escapeHtml(equipo.capitan_email)}</td>
            <td>${escapeHtml(equipo.capitan_telefono || 'N/A')}</td>
            <td>${formatearFecha(equipo.fecha_inscripcion)}</td>
            <td>
                <div class="action-buttons">
                    ${generarBotonesAccion(equipo)}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Generar botones de acción según el estado del equipo
 */
function generarBotonesAccion(equipo) {
    const nombreEscapado = escapeHtml(equipo.nombre).replace(/'/g, "\\'");
    
    const botones = {
        preinscrito: `
            <button class="btn btn-success btn-small" onclick="cambiarEstado(${equipo.id}, 'confirmado', '${nombreEscapado}')">
                Confirmar
            </button>
            <button class="btn btn-warning btn-small" onclick="cambiarEstado(${equipo.id}, 'descalificado', '${nombreEscapado}')">
                Descalificar
            </button>
            <button class="btn btn-danger btn-small" onclick="cambiarEstado(${equipo.id}, 'eliminado', '${nombreEscapado}')">
                Eliminar
            </button>
        `,
        confirmado: `
            <button class="btn btn-warning btn-small" onclick="cambiarEstado(${equipo.id}, 'descalificado', '${nombreEscapado}')">
                Descalificar
            </button>
            <button class="btn btn-danger btn-small" onclick="cambiarEstado(${equipo.id}, 'eliminado', '${nombreEscapado}')">
                Eliminar
            </button>
        `,
        descalificado: `
            <button class="btn btn-success btn-small" onclick="cambiarEstado(${equipo.id}, 'confirmado', '${nombreEscapado}')">
                Reactivar
            </button>
            <button class="btn btn-danger btn-small" onclick="cambiarEstado(${equipo.id}, 'eliminado', '${nombreEscapado}')">
                Eliminar
            </button>
        `,
        eliminado: `
            <button class="btn btn-secondary btn-small" disabled>
                Eliminado
            </button>
        `
    };
    
    return botones[equipo.estado] || '';
}

/**
 * Cambiar estado de un equipo (muestra modal de confirmación)
 */
function cambiarEstado(idEquipo, nuevoEstado, nombreEquipo) {
    console.log(`[EQUIPOS] Solicitud cambio estado: ${idEquipo} -> ${nuevoEstado}`);
    
    accionPendiente = {
        idEquipo: idEquipo,
        nuevoEstado: nuevoEstado,
        nombreEquipo: nombreEquipo
    };
    
    const modal = document.querySelector('#confirmModal .modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const notasContainer = document.getElementById('notas-container');
    const confirmBtn = document.getElementById('confirm-btn');
    
    if (!modal || !modalTitle || !modalMessage || !notasContainer || !confirmBtn) {
        console.error('[EQUIPOS] Elementos del modal no encontrados');
        return;
    }
    
    // Configurar modal según la acción
    const configuraciones = {
        confirmado: {
            titulo: 'Confirmar Equipo',
            mensaje: `¿Confirmar el equipo "${nombreEquipo}"? Este equipo podrá participar en el torneo.`,
            mostrarNotas: false,
            colorBoton: 'btn-success'
        },
        descalificado: {
            titulo: 'Descalificar Equipo',
            mensaje: `¿Descalificar el equipo "${nombreEquipo}"? El equipo será removido de la competencia.`,
            mostrarNotas: true,
            colorBoton: 'btn-warning'
        },
        eliminado: {
            titulo: 'Eliminar Equipo',
            mensaje: `¿Eliminar permanentemente el equipo "${nombreEquipo}"? Esta acción no se puede deshacer.`,
            mostrarNotas: true,
            colorBoton: 'btn-danger'
        }
    };
    
    const config = configuraciones[nuevoEstado];
    
    if (!config) {
        console.error('[EQUIPOS] Estado no válido:', nuevoEstado);
        return;
    }
    
    modalTitle.textContent = config.titulo;
    modalMessage.textContent = config.mensaje;
    notasContainer.style.display = config.mostrarNotas ? 'block' : 'none';
    confirmBtn.className = `btn ${config.colorBoton}`;
    
    // Limpiar notas
    const notasInput = document.getElementById('modal-notas');
    if (notasInput) notasInput.value = '';
    
    // Mostrar modal
    modal.style.display = 'block';
}

/**
 * Confirmar acción del modal
 */
async function confirmarAccion() {
    if (!accionPendiente) {
        console.error('[EQUIPOS] No hay acción pendiente');
        return;
    }
    
    console.log('[EQUIPOS] Confirmando acción:', accionPendiente);
    
    const notasInput = document.getElementById('modal-notas');
    const notas = notasInput ? notasInput.value : '';
    const confirmBtn = document.getElementById('confirm-btn');
    
    if (!confirmBtn) {
        console.error('[EQUIPOS] Botón de confirmación no encontrado');
        return;
    }
    
    // Deshabilitar botón mientras se procesa
    confirmBtn.disabled = true;
    const textoOriginal = confirmBtn.textContent;
    confirmBtn.textContent = 'Procesando...';
    
    try {
        const formData = new FormData();
        formData.append('action', 'cambiarEstado');
        formData.append('id_equipo', accionPendiente.idEquipo);
        formData.append('nuevo_estado', accionPendiente.nuevoEstado);
        formData.append('notas', notas);
        
        const response = await fetch('../pages/api-equipos.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('[EQUIPOS] Estado cambiado exitosamente');
            mostrarAlerta('success', data.message);
            cerrarModal();
            await cargarEquipos(); // Recargar lista
        } else {
            console.error('[EQUIPOS] Error al cambiar estado:', data.message);
            mostrarAlerta('danger', data.message);
        }
    } catch (error) {
        console.error('[EQUIPOS] Error al cambiar estado:', error);
        mostrarAlerta('danger', 'Error de conexión al cambiar estado');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = textoOriginal;
    }
}

/**
 * Cerrar modal
 */
function cerrarModal() {
    const modal = document.querySelector('#confirmModal .modal');
    if (modal) {
        modal.style.display = 'none';
    }
    accionPendiente = null;
    console.log('[EQUIPOS] Modal cerrado');
}

/**
 * Filtrar equipos según criterios seleccionados
 */
function filtrarEquipos() {
    const tipoFutbol = document.getElementById('filtro-tipo')?.value || '';
    const estado = document.getElementById('filtro-estado')?.value || '';
    const torneo = document.getElementById('filtro-torneo')?.value || '';
    
    console.log('[EQUIPOS] Aplicando filtros:', { tipoFutbol, estado, torneo });
    
    let equiposFiltrados = [...equiposData];
    
    if (tipoFutbol) {
        equiposFiltrados = equiposFiltrados.filter(e => e.tipo_futbol === tipoFutbol);
    }
    
    if (estado) {
        equiposFiltrados = equiposFiltrados.filter(e => e.estado === estado);
    }
    
    if (torneo) {
        equiposFiltrados = equiposFiltrados.filter(e => e.id_torneo == torneo);
    }
    
    console.log(`[EQUIPOS] ${equiposFiltrados.length} equipos después de filtrar`);
    
    actualizarEstadisticas(equiposFiltrados);
    mostrarEquipos(equiposFiltrados);
}

/**
 * Mostrar alerta temporal
 */
function mostrarAlerta(tipo, mensaje) {
    const container = document.getElementById('alert-container');
    if (!container) {
        console.error('[EQUIPOS] Contenedor de alertas no encontrado');
        return;
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'calendario-page';
    alertDiv.innerHTML = `
        <div class="alert alert-${tipo}">
            ${escapeHtml(mensaje)}
        </div>
    `;
    
    container.appendChild(alertDiv);
    
    console.log(`[EQUIPOS] Alerta mostrada: ${tipo} - ${mensaje}`);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Formatear estado para mostrar
 */
function formatearEstado(estado) {
    const estados = {
        'preinscrito': 'Preinscrito',
        'confirmado': 'Confirmado',
        'descalificado': 'Descalificado',
        'eliminado': 'Eliminado'
    };
    return estados[estado] || estado;
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    try {
        const date = new Date(fecha);
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('[EQUIPOS] Error al formatear fecha:', error);
        return 'N/A';
    }
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Exponer funciones globales necesarias
window.cambiarEstado = cambiarEstado;
window.confirmarAccion = confirmarAccion;
window.cerrarModal = cerrarModal;

console.log('[EQUIPOS] Script cargado completamente');