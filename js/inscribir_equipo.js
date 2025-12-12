(function() {
    'use strict';
    
    console.log('[REGISTRO EQUIPO] Script inicializado');

    // Elementos del DOM
    const form = document.getElementById('formRegistroEquipo');
    const tipoFutbolSelect = document.getElementById('tipoFutbol');
    const infoTorneoDiv = document.getElementById('infoTorneo');
    const noTorneoMsg = document.getElementById('noTorneoMsg');
    const nombreTorneoSpan = document.getElementById('nombreTorneo');
    const temporadaTorneoSpan = document.getElementById('temporadaTorneo');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const alertContainer = document.getElementById('alertContainer');

    // Variable para almacenar el ID del torneo seleccionado
    let torneoSeleccionadoId = null;

    /**
     * Muestra una alerta en la página
     */
    function mostrarAlerta(mensaje, tipo = 'info') {
        const iconos = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };

        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo}`;
        alerta.innerHTML = `
            <span class="alert-icon">${iconos[tipo]}</span>
            <span>${mensaje}</span>
        `;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alerta);

        // Auto-ocultar después de 5 segundos (excepto errores)
        if (tipo !== 'error') {
            setTimeout(() => {
                alerta.style.transition = 'opacity 0.3s';
                alerta.style.opacity = '0';
                setTimeout(() => alerta.remove(), 300);
            }, 5000);
        }

        // Scroll hacia la alerta
        alerta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Obtiene el torneo más reciente según el tipo de fútbol seleccionado
     */
    async function obtenerTorneoDisponible(tipoFutbol) {
        try {
            const response = await fetch(`../pages/procesar_registro_equipo.php?action=obtener_torneo&tipo=${tipoFutbol}`);
            const data = await response.json();

            if (data.success && data.torneo) {
                // Mostrar información del torneo
                torneoSeleccionadoId = data.torneo.id;
                nombreTorneoSpan.textContent = data.torneo.nombre;
                temporadaTorneoSpan.textContent = `${data.torneo.temporada} - ${data.torneo.tipo_futbol === 'futbol11' ? 'Fútbol 11' : 'Fútbol 7'}`;
                
                infoTorneoDiv.classList.remove('hidden');
                noTorneoMsg.classList.add('hidden');
            } else {
                // No hay torneo disponible
                torneoSeleccionadoId = null;
                infoTorneoDiv.classList.add('hidden');
                noTorneoMsg.classList.remove('hidden');
                noTorneoMsg.textContent = data.mensaje || 'No hay torneos disponibles para este tipo de fútbol';
                noTorneoMsg.style.color = 'var(--danger)';
            }
        } catch (error) {
            console.error('Error al obtener torneo:', error);
            torneoSeleccionadoId = null;
            infoTorneoDiv.classList.add('hidden');
            noTorneoMsg.classList.remove('hidden');
            noTorneoMsg.textContent = 'Error al cargar información del torneo';
            noTorneoMsg.style.color = 'var(--danger)';
        }
    }

    /**
     * Verifica si el capitán ya tiene un equipo registrado
     */
    async function verificarEquipoExistente() {
        try {
            const response = await fetch('../pages/procesar_registro_equipo.php?action=verificar_equipo');
            const data = await response.json();

            if (data.tiene_equipo) {
                mostrarAlerta(
                    `Ya tienes un equipo registrado: "${data.nombre_equipo}". Solo puedes registrar un equipo por capitán.`,
                    'warning'
                );
                btnSubmit.disabled = true;
                btnText.textContent = 'Ya tienes un equipo registrado';
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al verificar equipo:', error);
            return false;
        }
    }

    /**
     * Maneja el cambio en el selector de tipo de fútbol
     */
    if (tipoFutbolSelect) {
        tipoFutbolSelect.addEventListener('change', async function() {
            const tipoSeleccionado = this.value;
            
            if (tipoSeleccionado) {
                await obtenerTorneoDisponible(tipoSeleccionado);
            } else {
                // Ocultar información si no hay selección
                torneoSeleccionadoId = null;
                infoTorneoDiv.classList.add('hidden');
                noTorneoMsg.classList.remove('hidden');
                noTorneoMsg.textContent = 'Selecciona un tipo de fútbol para ver el torneo disponible';
                noTorneoMsg.style.color = 'var(--text-muted)';
            }
        });
    }

    /**
     * Maneja el envío del formulario
     */
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validar que se haya seleccionado un torneo
            if (!torneoSeleccionadoId) {
                mostrarAlerta('No hay un torneo disponible para el tipo de fútbol seleccionado. Por favor, contacta al administrador.', 'error');
                return;
            }

            // Deshabilitar botón y mostrar spinner
            btnSubmit.disabled = true;
            btnText.textContent = 'Registrando...';
            btnSpinner.classList.remove('hidden');

            // Recopilar datos del formulario
            const formData = new FormData();
            formData.append('action', 'registrar_equipo');
            formData.append('nombreEquipo', document.getElementById('nombreEquipo').value.trim());
            formData.append('tipoFutbol', document.getElementById('tipoFutbol').value);
            formData.append('escuela', document.getElementById('escuela').value.trim());
            formData.append('idTorneo', torneoSeleccionadoId);

            try {
                const response = await fetch('../pages/procesar_registro_equipo.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    mostrarAlerta(data.mensaje, 'success');
                    
                    // Limpiar formulario
                    form.reset();
                    infoTorneoDiv.classList.add('hidden');
                    noTorneoMsg.classList.remove('hidden');
                    noTorneoMsg.textContent = 'Selecciona un tipo de fútbol para ver el torneo disponible';
                    noTorneoMsg.style.color = 'var(--text-muted)';

                    // Deshabilitar el formulario para evitar re-inscripción
                    btnSubmit.disabled = true;
                    btnText.textContent = 'Equipo Registrado Exitosamente';
                } else {
                    mostrarAlerta(data.mensaje, 'error');
                    // Rehabilitar botón en caso de error
                    btnSubmit.disabled = false;
                    btnText.textContent = 'Registrar Equipo';
                    btnSpinner.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error al registrar equipo:', error);
                mostrarAlerta('Ocurrió un error al procesar el registro. Por favor, intenta de nuevo.', 'error');
                // Rehabilitar botón en caso de error
                btnSubmit.disabled = false;
                btnText.textContent = 'Registrar Equipo';
                btnSpinner.classList.add('hidden');
            }
        });
    }

    /**
     * Inicialización
     */
    console.log('[REGISTRO EQUIPO] Verificando equipo existente...');
    verificarEquipoExistente();
})();