// ==================== MÓDULO DE CLASIFICACIÓN ====================

const clasificacionModule = (function() {
    // Estado del módulo
    let estadoActual = {
        tipoFutbol: 'futbol11',
        cargando: false
    };

    // Referencias a elementos del DOM
    const elementos = {
        selector: null,
        tbody: null,
        loading: null,
        error: null,
        vacio: null,
        container: null
    };

    /**
     * Inicializa el módulo y carga los datos
     */
    function inicializar() {
        // Obtener referencias a elementos del DOM
        elementos.selector = document.getElementById('selector-tipo-futbol');
        elementos.tbody = document.getElementById('clasificacion-tbody');
        elementos.loading = document.getElementById('clasificacion-loading');
        elementos.error = document.getElementById('clasificacion-error');
        elementos.vacio = document.getElementById('clasificacion-vacio');
        elementos.container = document.getElementById('tabla-clasificacion-container');

        if (!elementos.selector || !elementos.tbody) {
            console.error('Elementos requeridos no encontrados');
            return;
        }

        // Configurar event listener del selector
        elementos.selector.addEventListener('change', function() {
            estadoActual.tipoFutbol = this.value;
            cargarClasificacion();
        });

        // Cargar datos iniciales
        cargarClasificacion();
    }

    /**
     * Muestra el indicador de carga
     */
    function mostrarCargando(mostrar) {
        if (elementos.loading) {
            elementos.loading.style.display = mostrar ? 'block' : 'none';
        }
        if (elementos.container) {
            elementos.container.style.display = mostrar ? 'none' : 'block';
        }
        if (elementos.error) {
            elementos.error.style.display = 'none';
        }
        if (elementos.vacio) {
            elementos.vacio.style.display = 'none';
        }
    }

    /**
     * Muestra mensaje de error
     */
    function mostrarError() {
        if (elementos.error) {
            elementos.error.style.display = 'block';
        }
        if (elementos.container) {
            elementos.container.style.display = 'none';
        }
        if (elementos.loading) {
            elementos.loading.style.display = 'none';
        }
        if (elementos.vacio) {
            elementos.vacio.style.display = 'none';
        }
    }

    /**
     * Muestra mensaje de tabla vacía
     */
    function mostrarVacio() {
        if (elementos.vacio) {
            elementos.vacio.style.display = 'block';
        }
        if (elementos.container) {
            elementos.container.style.display = 'none';
        }
        if (elementos.loading) {
            elementos.loading.style.display = 'none';
        }
        if (elementos.error) {
            elementos.error.style.display = 'none';
        }
    }

    /**
     * Carga la clasificación desde el servidor
     */
    async function cargarClasificacion() {
        if (estadoActual.cargando) return;
        
        estadoActual.cargando = true;
        mostrarCargando(true);

        try {
            const response = await fetch(`pages/obtener_clasificacion.php?tipo_futbol=${estadoActual.tipoFutbol}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (data.clasificacion && data.clasificacion.length > 0) {
                    renderizarClasificacion(data.clasificacion);
                } else {
                    mostrarVacio();
                }
            } else {
                console.error('Error en la respuesta:', data.message);
                mostrarError();
            }
        } catch (error) {
            console.error('Error al cargar clasificación:', error);
            mostrarError();
        } finally {
            estadoActual.cargando = false;
        }
    }

    /**
     * Renderiza la tabla de clasificación
     */
    function renderizarClasificacion(equipos) {
        if (!elementos.tbody) return;

        // Limpiar tabla
        elementos.tbody.innerHTML = '';

        // Crear filas
        equipos.forEach(equipo => {
            const fila = crearFilaEquipo(equipo);
            elementos.tbody.appendChild(fila);
        });

        // Mostrar tabla
        if (elementos.container) {
            elementos.container.style.display = 'block';
        }
        if (elementos.loading) {
            elementos.loading.style.display = 'none';
        }
    }

    /**
     * Crea una fila de equipo
     */
    function crearFilaEquipo(equipo) {
        const tr = document.createElement('tr');

        // Posición
        const tdPosicion = document.createElement('td');
        tdPosicion.textContent = equipo.posicion || '-';
        tr.appendChild(tdPosicion);

        // Nombre del equipo
        const tdNombre = document.createElement('td');
        tdNombre.textContent = equipo.equipo;
        tr.appendChild(tdNombre);

        // Partidos jugados
        const tdPJ = document.createElement('td');
        tdPJ.textContent = equipo.partidos_jugados || 0;
        tr.appendChild(tdPJ);

        // Ganados
        const tdG = document.createElement('td');
        tdG.textContent = equipo.partidos_ganados || 0;
        tr.appendChild(tdG);

        // Perdidos
        const tdP = document.createElement('td');
        tdP.textContent = equipo.partidos_perdidos || 0;
        tr.appendChild(tdP);

        // Empatados
        const tdE = document.createElement('td');
        tdE.textContent = equipo.partidos_empatados || 0;
        tr.appendChild(tdE);

        // Últimos 5 resultados
        const tdResultados = document.createElement('td');
        tdResultados.className = 'resultados';
        
        if (equipo.ultimos_5_resultados) {
            const resultados = equipo.ultimos_5_resultados.split('');
            resultados.forEach(resultado => {
                const span = document.createElement('span');
                span.className = 'resultado';
                
                if (resultado === 'G') {
                    span.classList.add('victoria');
                    span.textContent = '✓';
                } else if (resultado === 'P') {
                    span.classList.add('derrota');
                    span.textContent = '✗';
                } else if (resultado === 'E') {
                    span.classList.add('empate');
                    span.textContent = '-';
                }
                
                tdResultados.appendChild(span);
            });
        } else {
            // Si no hay resultados, mostrar espacios vacíos
            for (let i = 0; i < 5; i++) {
                const span = document.createElement('span');
                span.className = 'resultado empate';
                span.textContent = '-';
                span.style.opacity = '0.3';
                tdResultados.appendChild(span);
            }
        }
        
        tr.appendChild(tdResultados);

        return tr;
    }

    /**
     * Recarga la clasificación (útil para refrescar datos)
     */
    function recargar() {
        cargarClasificacion();
    }

    /**
     * Cambia el tipo de fútbol
     */
    function cambiarTipoFutbol(tipo) {
        if (tipo !== estadoActual.tipoFutbol) {
            estadoActual.tipoFutbol = tipo;
            if (elementos.selector) {
                elementos.selector.value = tipo;
            }
            cargarClasificacion();
        }
    }

    // API pública del módulo
    return {
        inicializar,
        recargar,
        cambiarTipoFutbol
    };
})();

// Exportar módulo al objeto window para acceso global
window.clasificacionModule = clasificacionModule;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        clasificacionModule.inicializar();
    });
} else {
    clasificacionModule.inicializar();
}