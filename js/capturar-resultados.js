// Main state management
const ResultadosState = {
    torneos: [],
    jornadas: [],
    partidos: [],
    selectedTorneo: null,
    selectedJornada: null
};

// DOM Elements
const elements = {
    filtroTorneo: null,
    filtroJornada: null,
    partidosContainer: null,
    alertContainer: null
};

// Initialize when DOM is ready
function initResultados() {
    // Get DOM elements
    elements.filtroTorneo = document.getElementById('filtroTorneo');
    elements.filtroJornada = document.getElementById('filtroJornada');
    elements.partidosContainer = document.getElementById('partidosContainer');
    elements.alertContainer = document.getElementById('alertContainer');

    // Setup event listeners
    if (elements.filtroTorneo) {
        elements.filtroTorneo.addEventListener('change', handleTorneoChange);
    }
    
    if (elements.filtroJornada) {
        elements.filtroJornada.addEventListener('change', handleJornadaChange);
    }

    // Load initial data
    loadTorneos();
}

// Alert functions
function showAlert(message, type = 'info') {
    if (!elements.alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
    `;
    
    elements.alertContainer.innerHTML = '';
    elements.alertContainer.appendChild(alertDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Load torneos
async function loadTorneos() {
    try {
        const response = await fetch('../pages/capturar-resultados.php?action=getTorneos');
        const data = await response.json();

        if (data.success) {
            ResultadosState.torneos = data.data;
            renderTorneosSelect();
        } else {
            showAlert(data.message || 'Error al cargar torneos', 'danger');
        }
    } catch (error) {
        console.error('Error loading torneos:', error);
        showAlert('Error al cargar torneos', 'danger');
    }
}

// Render torneos in select
function renderTorneosSelect() {
    if (!elements.filtroTorneo) return;

    elements.filtroTorneo.innerHTML = '<option value="">Selecciona un torneo</option>';
    
    ResultadosState.torneos.forEach(torneo => {
        const option = document.createElement('option');
        option.value = torneo.id;
        option.textContent = `${torneo.nombre} - ${torneo.temporada}`;
        elements.filtroTorneo.appendChild(option);
    });
}

// Handle torneo change
async function handleTorneoChange(e) {
    const torneoId = e.target.value;
    ResultadosState.selectedTorneo = torneoId;
    ResultadosState.selectedJornada = null;

    if (!torneoId) {
        elements.filtroJornada.innerHTML = '<option value="">Selecciona un torneo primero</option>';
        showEmptyState('Selecciona un torneo para ver los partidos');
        return;
    }

    await loadJornadas(torneoId);
}

// Load jornadas
async function loadJornadas(torneoId) {
    try {
        const response = await fetch(`../pages/capturar-resultados.php?action=getJornadas&torneo_id=${torneoId}`);
        const data = await response.json();

        if (data.success) {
            ResultadosState.jornadas = data.data;
            renderJornadasSelect();
            
            if (ResultadosState.jornadas.length === 0) {
                showAlert('No hay jornadas disponibles para este torneo', 'info');
            }
        } else {
            showAlert(data.message || 'Error al cargar jornadas', 'danger');
        }
    } catch (error) {
        console.error('Error loading jornadas:', error);
        showAlert('Error al cargar jornadas', 'danger');
    }
}

// Render jornadas in select
function renderJornadasSelect() {
    if (!elements.filtroJornada) return;

    elements.filtroJornada.innerHTML = '<option value="">Selecciona una jornada</option>';
    
    ResultadosState.jornadas.forEach(jornada => {
        const option = document.createElement('option');
        option.value = jornada.id;
        option.textContent = `${jornada.nombre} (${jornada.numero_jornada})`;
        elements.filtroJornada.appendChild(option);
    });
}

// Handle jornada change
async function handleJornadaChange(e) {
    const jornadaId = e.target.value;
    ResultadosState.selectedJornada = jornadaId;

    if (!jornadaId) {
        showEmptyState('Selecciona una jornada para ver los partidos');
        return;
    }

    await loadPartidos(jornadaId);
}

// Load partidos
async function loadPartidos(jornadaId) {
    showLoading();

    try {
        const response = await fetch(`../pages/capturar-resultados.php?action=getPartidos&jornada_id=${jornadaId}`);
        const data = await response.json();

        if (data.success) {
            ResultadosState.partidos = data.data;
            
            if (ResultadosState.partidos.length === 0) {
                showEmptyState('No hay partidos programados para esta jornada');
            } else {
                renderPartidos();
            }
        } else {
            showAlert(data.message || 'Error al cargar partidos', 'danger');
            showEmptyState('Error al cargar partidos');
        }
    } catch (error) {
        console.error('Error loading partidos:', error);
        showAlert('Error al cargar partidos', 'danger');
        showEmptyState('Error al cargar partidos');
    }
}

// Show loading state
function showLoading() {
    if (!elements.partidosContainer) return;

    elements.partidosContainer.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p class="loading-text">Cargando partidos...</p>
        </div>
    `;
}

// Show empty state
function showEmptyState(message) {
    if (!elements.partidosContainer) return;

    elements.partidosContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚽</div>
            <h3 class="empty-title">Sin Partidos</h3>
            <p class="empty-text">${message}</p>
        </div>
    `;
}

// Render partidos
function renderPartidos() {
    if (!elements.partidosContainer) return;

    const partidosHtml = ResultadosState.partidos.map(partido => {
        const isFinalized = partido.estado === 'finalizado';
        const fechaFormateada = formatDate(partido.fecha_partido);
        
        return `
            <div class="partido-card">
                <div class="partido-header">
                    <div class="partido-info">
                        <span class="partido-numero">Partido #${partido.id}</span>
                        <span class="partido-fecha">📅 ${fechaFormateada}</span>
                    </div>
                    <span class="partido-lugar">📍 ${partido.lugar || 'Sin definir'}</span>
                </div>
                
                <div class="partido-body">
                    <div class="equipo-section">
                        <div class="equipo-nombre">${partido.equipo_local}</div>
                        <input 
                            type="number" 
                            class="marcador-input" 
                            id="marcador-local-${partido.id}"
                            value="${partido.marcador_local !== null ? partido.marcador_local : ''}"
                            min="0"
                            placeholder="0"
                            ${isFinalized ? 'disabled' : ''}
                        >
                    </div>
                    
                    <div class="vs-divider">VS</div>
                    
                    <div class="equipo-section">
                        <div class="equipo-nombre">${partido.equipo_visitante}</div>
                        <input 
                            type="number" 
                            class="marcador-input" 
                            id="marcador-visitante-${partido.id}"
                            value="${partido.marcador_visitante !== null ? partido.marcador_visitante : ''}"
                            min="0"
                            placeholder="0"
                            ${isFinalized ? 'disabled' : ''}
                        >
                    </div>
                </div>
                
                <div class="partido-footer">
                    <span class="status-badge status-${partido.estado}">
                        ${partido.estado === 'finalizado' ? '✓' : '⏱️'} 
                        ${partido.estado === 'finalizado' ? 'Finalizado' : 'Programado'}
                    </span>
                    <button 
                        class="btn btn-primary" 
                        onclick="guardarResultado(${partido.id})"
                        ${isFinalized ? 'disabled' : ''}
                    >
                        ${isFinalized ? '✓ Guardado' : '💾 Guardar Resultado'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    elements.partidosContainer.innerHTML = `
        <div class="partidos-grid">
            ${partidosHtml}
        </div>
    `;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Sin fecha';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('es-MX', options);
}

// Save resultado
async function guardarResultado(partidoId) {
    const inputLocal = document.getElementById(`marcador-local-${partidoId}`);
    const inputVisitante = document.getElementById(`marcador-visitante-${partidoId}`);
    
    if (!inputLocal || !inputVisitante) {
        showAlert('Error al obtener los marcadores', 'danger');
        return;
    }
    
    const marcadorLocal = inputLocal.value;
    const marcadorVisitante = inputVisitante.value;

    // Validation
    if (marcadorLocal === '' || marcadorVisitante === '') {
        showAlert('Por favor ingresa ambos marcadores', 'danger');
        return;
    }

    if (marcadorLocal < 0 || marcadorVisitante < 0) {
        showAlert('Los marcadores no pueden ser negativos', 'danger');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'guardarResultado');
        formData.append('partido_id', partidoId);
        formData.append('marcador_local', marcadorLocal);
        formData.append('marcador_visitante', marcadorVisitante);

        const response = await fetch('../pages/capturar-resultados.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✓ Resultado guardado exitosamente', 'success');
            
            // Reload partidos to reflect changes
            await loadPartidos(ResultadosState.selectedJornada);
        } else {
            showAlert(data.message || 'Error al guardar resultado', 'danger');
        }
    } catch (error) {
        console.error('Error saving resultado:', error);
        showAlert('Error al guardar resultado', 'danger');
    }
}

// Make guardarResultado globally accessible
window.guardarResultado = guardarResultado;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResultados);
} else {
    initResultados();
}