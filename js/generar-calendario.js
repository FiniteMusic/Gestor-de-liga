// generar-calendario.js
// Script para el módulo de generación de calendario
// Se carga dinámicamente por admin.js

(function() {
    'use strict';

    // Estado local del módulo
    const state = {
        torneoSeleccionado: null,
        listaEquipos: []
    };

    // Inicializar el módulo
    function init() {
        console.log('[Calendario] Módulo inicializado');
        cargarTorneos();
        configurarEventos();
    }

    // Configurar event listeners
    function configurarEventos() {
        const selectTorneo = document.getElementById('torneoSelect');
        const btnGenerar = document.getElementById('btnGenerar');
        const btnEliminar = document.getElementById('btnEliminar');

        if (selectTorneo) {
            selectTorneo.addEventListener('change', function(e) {
                state.torneoSeleccionado = e.target.value;
                if (state.torneoSeleccionado) {
                    cargarEquiposInscritos(state.torneoSeleccionado);
                }
            });
        }

        if (btnGenerar) {
            btnGenerar.addEventListener('click', generarCalendario);
        }

        if (btnEliminar) {
            btnEliminar.addEventListener('click', eliminarCalendario);
        }
    }

    // Cargar torneos disponibles
    async function cargarTorneos() {
        try {
            const datos = new FormData();
            datos.append('action', 'obtener_torneos_activos');

            const respuesta = await fetch('../pages/generar-calendario.php', {
                method: 'POST',
                body: datos
            });

            const resultado = await respuesta.json();

            if (resultado.success) {
                const selectElement = document.getElementById('torneoSelect');
                if (!selectElement) return;

                selectElement.innerHTML = '<option value="">-- Seleccione un torneo --</option>';
                
                resultado.torneos.forEach(function(torneo) {
                    const opcion = document.createElement('option');
                    opcion.value = torneo.id;
                    opcion.textContent = torneo.nombre + ' - ' + torneo.temporada + ' (' + torneo.num_equipos + ' equipos)';
                    selectElement.appendChild(opcion);
                });
            } else {
                mostrarAlerta('danger', resultado.message);
            }
        } catch (error) {
            console.error('[Calendario] Error al cargar torneos:', error);
            mostrarAlerta('danger', 'Error al cargar torneos: ' + error.message);
        }
    }

    // Cargar equipos inscritos del torneo seleccionado
    async function cargarEquiposInscritos(idTorneo) {
        try {
            const datos = new FormData();
            datos.append('action', 'obtener_equipos_inscritos');
            datos.append('id_torneo', idTorneo);

            const respuesta = await fetch('../pages/generar-calendario.php', {
                method: 'POST',
                body: datos
            });

            const resultado = await respuesta.json();

            if (resultado.success) {
                state.listaEquipos = resultado.equipos;
                renderizarEquipos(resultado.equipos);
                actualizarEstadisticas(resultado.equipos);
                
                // Mostrar secciones
                mostrarElemento('equiposContainer');
                mostrarElemento('statsContainer');
                
                if (resultado.equipos.length >= 2) {
                    mostrarElemento('formGeneracion');
                } else {
                    mostrarAlerta('warning', 'Se requieren al menos 2 equipos inscritos para generar el calendario');
                }
            } else {
                mostrarAlerta('danger', resultado.message);
            }
        } catch (error) {
            console.error('[Calendario] Error al cargar equipos:', error);
            mostrarAlerta('danger', 'Error al cargar equipos: ' + error.message);
        }
    }

    // Renderizar tabla de equipos
    function renderizarEquipos(equipos) {
        const tbody = document.getElementById('equiposTableBody');
        if (!tbody) return;
        
        if (equipos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-title">No hay equipos inscritos</div>
                        <div class="empty-text">No se encontraron equipos para este torneo</div>
                    </td>
                </tr>
            `;
            return;
        }

        const filas = equipos.map(function(equipo, indice) {
            const fecha = new Date(equipo.fecha_inscripcion);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            return `
                <tr>
                    <td>${indice + 1}</td>
                    <td><span class="team-name">${escaparHTML(equipo.nombre)}</span></td>
                    <td>${escaparHTML(equipo.capitan)}</td>
                    <td>${escaparHTML(equipo.email_capitan)}</td>
                    <td>
                        <span class="status-badge status-${equipo.estado}">
                            <span class="status-dot"></span>
                            ${equipo.estado.charAt(0).toUpperCase() + equipo.estado.slice(1)}
                        </span>
                    </td>
                    <td>${fechaFormateada}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = filas;
    }

    // Actualizar estadísticas
    function actualizarEstadisticas(equipos) {
        const cantidadEquipos = equipos.length;
        const cantidadJornadas = cantidadEquipos % 2 === 0 ? cantidadEquipos - 1 : cantidadEquipos;
        const partidosPorJornada = Math.floor(cantidadEquipos / 2);
        const totalPartidos = cantidadJornadas * partidosPorJornada;

        const elemEquipos = document.getElementById('statEquipos');
        const elemJornadas = document.getElementById('statJornadas');
        const elemPartidos = document.getElementById('statPartidos');

        if (elemEquipos) elemEquipos.textContent = cantidadEquipos;
        if (elemJornadas) elemJornadas.textContent = cantidadJornadas;
        if (elemPartidos) elemPartidos.textContent = totalPartidos;
    }

    // Generar calendario
    async function generarCalendario() {
        const inputFecha = document.getElementById('fechaInicio');
        if (!inputFecha) return;

        const fechaInicio = inputFecha.value;
        
        if (!fechaInicio) {
            mostrarAlerta('warning', 'Por favor seleccione una fecha de inicio');
            return;
        }

        // Validar que sea lunes
        const fecha = new Date(fechaInicio + 'T00:00:00');
        if (fecha.getDay() !== 1) {
            mostrarAlerta('warning', 'La fecha de inicio debe ser un lunes');
            return;
        }

        const boton = document.getElementById('btnGenerar');
        if (!boton) return;

        boton.disabled = true;
        const textoOriginal = boton.innerHTML;
        boton.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0;"></div> Generando...';

        try {
            const datos = new FormData();
            datos.append('action', 'generar_calendario');
            datos.append('id_torneo', state.torneoSeleccionado);
            datos.append('fecha_inicio', fechaInicio);

            const respuesta = await fetch('../pages/generar-calendario.php', {
                method: 'POST',
                body: datos
            });

            const resultado = await respuesta.json();

            if (resultado.success) {
                mostrarAlerta('success', 
                    '¡Calendario generado exitosamente!<br>' +
                    'Jornadas: ' + resultado.estadisticas.total_jornadas + '<br>' +
                    'Partidos: ' + resultado.estadisticas.total_partidos
                );
                
                const btnEliminar = document.getElementById('btnEliminar');
                if (btnEliminar) {
                    btnEliminar.classList.remove('section-hidden');
                }
                
                setTimeout(function() {
                    window.location.reload();
                }, 3000);
            } else {
                mostrarAlerta('danger', resultado.message);
            }
        } catch (error) {
            console.error('[Calendario] Error al generar:', error);
            mostrarAlerta('danger', 'Error al generar calendario: ' + error.message);
        } finally {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }

    // Eliminar calendario existente
    async function eliminarCalendario() {
        if (!confirm('¿Está seguro de eliminar el calendario existente? Esta acción no se puede deshacer.')) {
            return;
        }

        const boton = document.getElementById('btnEliminar');
        if (!boton) return;

        boton.disabled = true;
        const textoOriginal = boton.innerHTML;
        boton.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0;"></div> Eliminando...';

        try {
            const datos = new FormData();
            datos.append('action', 'eliminar_calendario');
            datos.append('id_torneo', state.torneoSeleccionado);

            const respuesta = await fetch('../pages/generar-calendario.php', {
                method: 'POST',
                body: datos
            });

            const resultado = await respuesta.json();

            if (resultado.success) {
                mostrarAlerta('success', resultado.message);
                boton.classList.add('section-hidden');
            } else {
                mostrarAlerta('danger', resultado.message);
            }
        } catch (error) {
            console.error('[Calendario] Error al eliminar:', error);
            mostrarAlerta('danger', 'Error al eliminar calendario: ' + error.message);
        } finally {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }

    // Mostrar alerta
    function mostrarAlerta(tipo, mensaje) {
        const contenedor = document.getElementById('alertContainer');
        if (!contenedor) return;

        const alerta = document.createElement('div');
        alerta.className = 'alert alert-' + tipo;
        alerta.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${tipo === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : 
                  tipo === 'danger' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' :
                  tipo === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' :
                  '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
            </svg>
            <div>${mensaje}</div>
        `;
        alerta.style.transition = 'opacity 0.3s';
        
        contenedor.innerHTML = '';
        contenedor.appendChild(alerta);

        setTimeout(function() {
            alerta.style.opacity = '0';
            setTimeout(function() {
                if (alerta.parentNode) {
                    alerta.remove();
                }
            }, 300);
        }, 5000);
    }

    // Mostrar elemento
    function mostrarElemento(id) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.classList.remove('section-hidden');
        }
    }

    // Escapar HTML para prevenir XSS
    function escaparHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    // Inicializar cuando el script se cargue
    init();

})();