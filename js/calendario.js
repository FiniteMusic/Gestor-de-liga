/**
 * calendario.js - Gestión dinámica del calendario de partidos
 * Carga y muestra los partidos de la semana actual desde la base de datos
 */

// Estado global del calendario
const calendarioState = {
    partidosCargados: [],
    filtroActual: 'todos',
    ultimaActualizacion: null
};

/**
 * Inicializa el módulo de calendario
 */
function inicializarCalendario() {
    configurarFiltroTipoFutbol();
    cargarCalendarioSemana();
    
    // Verificar actualización cada hora
    setInterval(verificarActualizacionDomingo, 3600000); // 1 hora
}

/**
 * Configura el event listener del filtro de tipo de fútbol
 */
function configurarFiltroTipoFutbol() {
    const filtroSelect = document.getElementById('filtro-tipo-futbol');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            calendarioState.filtroActual = e.target.value;
            renderizarCalendario();
        });
    }
}

/**
 * Verifica si es domingo y necesita actualizar
 */
function verificarActualizacionDomingo() {
    const ahora = new Date();
    const esDomingo = ahora.getDay() === 0;
    const horaActual = ahora.getHours();
    
    // Si es domingo entre las 0 y 1 AM, recargar
    if (esDomingo && horaActual === 0) {
        const ultimaActualizacion = calendarioState.ultimaActualizacion;
        
        // Evitar recargas múltiples en la misma hora
        if (!ultimaActualizacion || 
            ahora - ultimaActualizacion > 3600000) {
            cargarCalendarioSemana();
        }
    }
}

/**
 * Carga los partidos de la semana desde el servidor
 */
async function cargarCalendarioSemana() {
    mostrarEstadoCarga('loading');
    
    try {
        const response = await fetch('pages/calendario.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            calendarioState.partidosCargados = data.partidos || [];
            calendarioState.ultimaActualizacion = new Date();
            renderizarCalendario();
        } else {
            throw new Error(data.message || 'Error al cargar los partidos');
        }
        
    } catch (error) {
        console.error('Error al cargar calendario:', error);
        mostrarEstadoCarga('error');
    }
}

/**
 * Renderiza el calendario con los partidos cargados
 */
function renderizarCalendario() {
    const tbody = document.getElementById('calendario-tbody');
    
    if (!tbody) {
        console.error('No se encontró el tbody del calendario');
        return;
    }
    
    // Filtrar partidos según el filtro actual
    const partidosFiltrados = filtrarPartidos(calendarioState.partidosCargados);
    
    if (partidosFiltrados.length === 0) {
        mostrarEstadoCarga('vacio');
        return;
    }
    
    mostrarEstadoCarga('success');
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // Agrupar partidos por fecha
    const partidosAgrupados = agruparPorFecha(partidosFiltrados);
    
    // Renderizar cada grupo
    partidosAgrupados.forEach(grupo => {
        grupo.partidos.forEach((partido, index) => {
            const row = crearFilaPartido(partido, index === 0 ? grupo.fecha : null);
            tbody.appendChild(row);
        });
    });
}

/**
 * Filtra los partidos según el tipo de fútbol seleccionado
 */
function filtrarPartidos(partidos) {
    if (calendarioState.filtroActual === 'todos') {
        return partidos;
    }
    
    return partidos.filter(p => p.tipo_futbol === calendarioState.filtroActual);
}

/**
 * Agrupa los partidos por fecha para mejor visualización
 */
function agruparPorFecha(partidos) {
    const grupos = {};
    
    partidos.forEach(partido => {
        const fecha = partido.fecha_formateada;
        if (!grupos[fecha]) {
            grupos[fecha] = {
                fecha: fecha,
                partidos: []
            };
        }
        grupos[fecha].partidos.push(partido);
    });
    
    // Convertir a array y ordenar por fecha
    return Object.values(grupos).sort((a, b) => {
        return new Date(a.partidos[0].fecha_partido) - new Date(b.partidos[0].fecha_partido);
    });
}

/**
 * Crea una fila de la tabla para un partido
 */
function crearFilaPartido(partido, mostrarFecha) {
    const row = document.createElement('tr');
    
    // Aplicar clase especial si el partido es hoy
    if (esHoy(partido.fecha_partido)) {
        row.classList.add('partido-hoy');
    }
    
    // Aplicar clase según estado del partido
    row.classList.add(`estado-${partido.estado}`);
    
    row.innerHTML = `
        <td class="fecha-cell">${mostrarFecha || ''}</td>
        <td class="hora-cell">${partido.hora_formateada}</td>
        <td class="equipo-cell equipo-local">
            <span class="equipo-nombre">${partido.equipo_local}</span>
            ${partido.tipo_futbol === 'futbol7' ? '<span class="badge-futbol7">F7</span>' : ''}
        </td>
        <td class="equipo-cell equipo-visitante">
            <span class="equipo-nombre">${partido.equipo_visitante}</span>
            ${partido.tipo_futbol === 'futbol7' ? '<span class="badge-futbol7">F7</span>' : ''}
        </td>
        <td class="lugar-cell">${partido.lugar || 'Cancha ESCOM'}</td>
    `;
    
    return row;
}

/**
 * Verifica si una fecha es hoy
 */
function esHoy(fechaStr) {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
}

/**
 * Muestra el estado de carga correspondiente
 */
function mostrarEstadoCarga(estado) {
    const loading = document.getElementById('calendario-loading');
    const error = document.getElementById('calendario-error');
    const vacio = document.getElementById('calendario-vacio');
    const container = document.getElementById('calendario-container');
    
    // Ocultar todos
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (vacio) vacio.style.display = 'none';
    if (container) container.style.display = 'none';
    
    // Mostrar el correspondiente
    switch(estado) {
        case 'loading':
            if (loading) loading.style.display = 'block';
            break;
        case 'error':
            if (error) error.style.display = 'block';
            break;
        case 'vacio':
            if (vacio) vacio.style.display = 'block';
            break;
        case 'success':
            if (container) container.style.display = 'block';
            break;
    }
}

/**
 * Fuerza la recarga del calendario
 */
function recargarCalendario() {
    cargarCalendarioSemana();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCalendario);
} else {
    inicializarCalendario();
}

// Exportar funciones para uso externo
window.calendarioModule = {
    recargar: recargarCalendario,
    getPartidos: () => calendarioState.partidosCargados
};