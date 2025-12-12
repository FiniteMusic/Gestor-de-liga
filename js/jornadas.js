/** 
 * jornadas.js - Gestión de visualización y edición de partidos por jornada
 */

let partidoSeleccionado = null;

// Inicialización cuando el DOM está listo
(function() {
    // Verificar si ya estamos en el contexto correcto
    if (document.getElementById('filtro-torneo')) {
        inicializar();
    } else {
        // Si no, esperar al DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializar);
        } else {
            inicializar();
        }
    }
})();

/**
 * Función de inicialización principal
 */
function inicializar() {
    cargarTorneos();
    configurarEventos();
}

/**
 * Configurar event listeners
 */
function configurarEventos() {
    const btnFiltrar = document.getElementById('btn-filtrar');
    const filtroTorneo = document.getElementById('filtro-torneo');
    const btnGuardar = document.getElementById('btn-guardar-cambios');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', buscarPartidos);
    }

    if (filtroTorneo) {
        filtroTorneo.addEventListener('change', cargarJornadas);
    }

    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambiosPartido);
    }

    // Cerrar modal al hacer clic fuera
    const modal = document.querySelector('#modal-editar-partido .modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }
}

/**
 * Cargar lista de torneos activos
 */
async function cargarTorneos() {
    try {
        const response = await fetch('../pages/jornadas.php?action=obtener_torneos');
        const data = await response.json();

        const select = document.getElementById('filtro-torneo');
        
        if (data.success && data.torneos.length > 0) {
            select.innerHTML = '<option value="">Selecciona un tipo de fútbol</option>';
            data.torneos.forEach(function(torneo) {
                const option = document.createElement('option');
                option.value = torneo.id;
                const tipoFutbol = torneo.tipo_futbol === 'futbol11' ? 'Fútbol 11' : 'Fútbol 7';
                option.textContent = torneo.nombre + ' - ' + tipoFutbol;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No hay torneos activos</option>';
            mostrarAlerta('No se encontraron torneos activos', 'warning');
        }
    } catch (error) {
        console.error('Error al cargar torneos:', error);
        mostrarAlerta('Error al cargar los torneos', 'danger');
    }
}

/**
 * Cargar jornadas según el torneo seleccionado
 */
async function cargarJornadas() {
    const torneoId = document.getElementById('filtro-torneo').value;
    const selectJornada = document.getElementById('filtro-jornada');

    if (!torneoId) {
        selectJornada.innerHTML = '<option value="">Selecciona un torneo primero</option>';
        return;
    }

    try {
        const response = await fetch('../pages/jornadas.php?action=obtener_jornadas&id_torneo=' + torneoId);
        const data = await response.json();

        if (data.success && data.jornadas.length > 0) {
            selectJornada.innerHTML = '<option value="">Selecciona una jornada</option>';
            data.jornadas.forEach(function(jornada) {
                const option = document.createElement('option');
                option.value = jornada.id;
                option.textContent = jornada.nombre + ' (' + jornada.fecha_inicio + ' - ' + jornada.fecha_fin + ')';
                selectJornada.appendChild(option);
            });
        } else {
            selectJornada.innerHTML = '<option value="">No hay jornadas disponibles</option>';
            mostrarAlerta('No se encontraron jornadas para este torneo', 'info');
        }
    } catch (error) {
        console.error('Error al cargar jornadas:', error);
        mostrarAlerta('Error al cargar las jornadas', 'danger');
    }
}

/**
 * Buscar y mostrar partidos
 */
async function buscarPartidos() {
    const torneoId = document.getElementById('filtro-torneo').value;
    const jornadaId = document.getElementById('filtro-jornada').value;
    const container = document.getElementById('partidos-container');

    if (!torneoId || !jornadaId) {
        mostrarAlerta('Selecciona un torneo y una jornada', 'warning');
        return;
    }

    // Mostrar loading
    container.innerHTML = '<div class="loading-container"><div class="spinner"></div><p class="loading-text">Cargando partidos...</p></div>';

    try {
        const response = await fetch('../pages/jornadas.php?action=obtener_partidos&id_jornada=' + jornadaId);
        const data = await response.json();

        if (data.success && data.partidos.length > 0) {
            mostrarPartidos(data.partidos);
        } else {
            container.innerHTML = '<div class="empty-state"><svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><h3 class="empty-title">No hay partidos programados</h3><p class="empty-text">Esta jornada aún no tiene partidos asignados</p></div>';
        }
    } catch (error) {
        console.error('Error al cargar partidos:', error);
        mostrarAlerta('Error al cargar los partidos', 'danger');
        container.innerHTML = '<div class="empty-state"><h3 class="empty-title">Error al cargar</h3><p class="empty-text">Ocurrió un error al cargar los partidos</p></div>';
    }
}

/**
 * Mostrar partidos en tabla
 */
function mostrarPartidos(partidos) {
    const container = document.getElementById('partidos-container');
    
    let filasHtml = '';
    partidos.forEach(function(partido) {
        filasHtml += generarFilaPartido(partido);
    });

    const html = '<div class="table-wrapper"><div class="table-header"><h2 class="table-title">Partidos de la Jornada</h2></div><div class="table-container"><table><thead><tr><th>Equipo Local</th><th>Equipo Visitante</th><th>Fecha y Hora</th><th>Lugar</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + filasHtml + '</tbody></table></div></div>';

    container.innerHTML = html;
}

/**
 * Generar fila de partido
 */
function generarFilaPartido(partido) {
    const fecha = new Date(partido.fecha_partido);
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const fechaFormateada = fecha.toLocaleDateString('es-MX', opciones);
    const horaFormateada = fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const estadoClasses = {
        'programado': 'status-preinscrito',
        'en_curso': 'status-confirmado',
        'finalizado': 'status-confirmado',
        'suspendido': 'status-eliminado',
        'forfeit': 'status-descalificado',
        'cancelado': 'status-descalificado'
    };

    const estadoTextos = {
        'programado': 'Programado',
        'en_curso': 'En Curso',
        'finalizado': 'Finalizado',
        'suspendido': 'Suspendido',
        'forfeit': 'Forfeit',
        'cancelado': 'Cancelado'
    };

    const puedeEditar = partido.estado === 'programado';
    const estadoClass = estadoClasses[partido.estado] || 'status-preinscrito';
    const estadoTexto = estadoTextos[partido.estado] || partido.estado;
    const lugar = partido.lugar || 'Cancha ESCOM';

    let accionesHtml = '';
    if (puedeEditar) {
        accionesHtml = '<button class="btn btn-small btn-warning" onclick="abrirModalEditar(' + 
            partido.id + ', \'' + 
            escaparComillas(partido.equipo_local) + '\', \'' + 
            escaparComillas(partido.equipo_visitante) + '\', \'' + 
            partido.fecha_partido + '\', \'' + 
            escaparComillas(lugar) + '\')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>Editar</button>';
    } else {
        accionesHtml = '<span style="color: var(--text-muted); font-size: 0.85rem;">No editable</span>';
    }

    return '<tr><td><strong>' + partido.equipo_local + '</strong></td><td><strong>' + 
        partido.equipo_visitante + '</strong></td><td><div style="font-weight: 600;">' + 
        fechaFormateada + '</div><div style="color: var(--text-muted); font-size: 0.9rem;">' + 
        horaFormateada + '</div></td><td>' + lugar + '</td><td><span class="status-badge ' + 
        estadoClass + '">' + estadoTexto + '</span></td><td><div class="action-buttons">' + 
        accionesHtml + '</div></td></tr>';
}

/**
 * Escapar comillas para HTML
 */
function escaparComillas(texto) {
    return texto.replace(/'/g, '\\\'').replace(/"/g, '&quot;');
}

/**
 * Abrir modal para editar partido
 */
function abrirModalEditar(id, local, visitante, fechaHora, lugar) {
    partidoSeleccionado = id;
    
    const fecha = new Date(fechaHora);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaInput = anio + '-' + mes + '-' + dia;
    
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const horaInput = horas + ':' + minutos;

    document.getElementById('modal-partido-info').textContent = local + ' vs ' + visitante;
    document.getElementById('modal-fecha').value = fechaInput;
    document.getElementById('modal-hora').value = horaInput;
    document.getElementById('modal-lugar').value = lugar;

    const modal = document.querySelector('#modal-editar-partido .modal');
    modal.style.display = 'block';
}

/**
 * Cerrar modal
 */
function cerrarModal() {
    const modal = document.querySelector('#modal-editar-partido .modal');
    modal.style.display = 'none';
    partidoSeleccionado = null;
}

/**
 * Guardar cambios del partido
 */
async function guardarCambiosPartido() {
    const fecha = document.getElementById('modal-fecha').value;
    const hora = document.getElementById('modal-hora').value;
    const lugar = document.getElementById('modal-lugar').value;

    if (!fecha || !hora || !lugar) {
        mostrarAlerta('Completa todos los campos', 'warning');
        return;
    }

    const fechaHora = fecha + ' ' + hora + ':00';

    const btnGuardar = document.getElementById('btn-guardar-cambios');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const formData = new FormData();
        formData.append('action', 'actualizar_partido');
        formData.append('id_partido', partidoSeleccionado);
        formData.append('fecha_partido', fechaHora);
        formData.append('lugar', lugar);

        const response = await fetch('../pages/jornadas.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            mostrarAlerta('Partido actualizado correctamente', 'success');
            cerrarModal();
            buscarPartidos();
        } else {
            mostrarAlerta(data.message || 'Error al actualizar el partido', 'danger');
        }
    } catch (error) {
        console.error('Error al guardar cambios:', error);
        mostrarAlerta('Error al guardar los cambios', 'danger');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
}

/**
 * Mostrar alerta
 */
function mostrarAlerta(mensaje, tipo) {
    tipo = tipo || 'info';
    const container = document.getElementById('alert-container');
    
    const tiposIconos = {
        'info': 'ℹ️',
        'success': '✓',
        'warning': '⚠',
        'danger': '✕'
    };

    const alerta = document.createElement('div');
    alerta.className = 'alert alert-' + tipo;
    alerta.style.animation = 'slideIn 0.3s ease-out';
    alerta.innerHTML = '<span style="font-size: 1.2rem;">' + tiposIconos[tipo] + '</span><span>' + mensaje + '</span>';

    container.appendChild(alerta);

    setTimeout(function() {
        alerta.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() {
            alerta.remove();
        }, 300);
    }, 4000);
}