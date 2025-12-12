/**
 * Módulo para manejar la visualización de resultados por jornadas
 */

// Variable global para almacenar las jornadas y la jornada actual
let todasLasJornadas = [];
let jornadaActualId = null;

/**
 * Inicializa el módulo de resultados
 */
async function inicializarResultados() {
    try {
        mostrarCargando(true);
        await cargarJornadas();
        mostrarCargando(false);
    } catch (error) {
        console.error('Error al inicializar resultados:', error);
        mostrarError(true);
        mostrarCargando(false);
    }
}

/**
 * Carga todas las jornadas disponibles desde el backend
 */
async function cargarJornadas() {
    try {
        const response = await fetch('pages/obtener_jornadas.php');
        
        if (!response.ok) {
            throw new Error('Error al cargar jornadas');
        }
        
        const data = await response.json();
        
        if (data.success) {
            todasLasJornadas = data.jornadas;
            
            if (todasLasJornadas.length === 0) {
                mostrarMensajeVacio();
                return;
            }
            
            // Generar la navegación de jornadas
            generarNavegacionJornadas();
            
            // Determinar cuál jornada mostrar por defecto
            determinarJornadaPorDefecto();
            
            // Cargar los resultados de la jornada seleccionada
            if (jornadaActualId) {
                await cargarResultadosJornada(jornadaActualId);
            }
        } else {
            throw new Error(data.message || 'Error al cargar jornadas');
        }
    } catch (error) {
        console.error('Error en cargarJornadas:', error);
        throw error;
    }
}

/**
 * Genera los botones de navegación de jornadas
 */
function generarNavegacionJornadas() {
    const contenedor = document.getElementById('jornadas-navegacion');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    todasLasJornadas.forEach(jornada => {
        const btn = document.createElement('button');
        btn.className = 'jornada-btn';
        btn.textContent = jornada.nombre;
        btn.dataset.jornadaId = jornada.id;
        
        // Event listener para cambiar de jornada
        btn.addEventListener('click', async () => {
            // Remover clase activa de todos los botones
            document.querySelectorAll('.jornada-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Agregar clase activa al botón clickeado
            btn.classList.add('active');
            
            // Actualizar la jornada actual
            jornadaActualId = jornada.id;
            
            // Cargar los resultados de esta jornada
            await cargarResultadosJornada(jornada.id);
            
            // Scroll suave hacia el botón
            btn.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'center' 
            });
        });
        
        contenedor.appendChild(btn);
    });
}

/**
 * Determina cuál jornada debe mostrarse por defecto
 * (La última jornada finalizada o en curso)
 */
function determinarJornadaPorDefecto() {
    // Buscar la última jornada finalizada o en curso
    let jornadaDefecto = null;
    
    // Primero buscar jornadas con partidos finalizados
    for (let i = todasLasJornadas.length - 1; i >= 0; i--) {
        const jornada = todasLasJornadas[i];
        const fechaFin = new Date(jornada.fecha_fin);
        const ahora = new Date();
        
        // Si la fecha de fin ya pasó, esta es la última jornada finalizada
        if (fechaFin <= ahora) {
            jornadaDefecto = jornada;
            break;
        }
    }
    
    // Si no hay ninguna finalizada, tomar la primera
    if (!jornadaDefecto && todasLasJornadas.length > 0) {
        jornadaDefecto = todasLasJornadas[0];
    }
    
    if (jornadaDefecto) {
        jornadaActualId = jornadaDefecto.id;
        
        // Marcar el botón como activo
        setTimeout(() => {
            const btnActivo = document.querySelector(
                `.jornada-btn[data-jornada-id="${jornadaActualId}"]`
            );
            if (btnActivo) {
                btnActivo.classList.add('active');
                btnActivo.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'center' 
                });
            }
        }, 100);
    }
}

/**
 * Carga los resultados de una jornada específica
 */
async function cargarResultadosJornada(jornadaId) {
    try {
        mostrarCargando(true);
        
        const response = await fetch(`pages/obtener_resultados_jornada.php?jornada_id=${jornadaId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar resultados');
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarResultados(data.partidos, data.jornada_estado);
        } else {
            throw new Error(data.message || 'Error al cargar resultados');
        }
        
        mostrarCargando(false);
        mostrarError(false);
    } catch (error) {
        console.error('Error en cargarResultadosJornada:', error);
        mostrarError(true);
        mostrarCargando(false);
    }
}

/**
 * Muestra los resultados en la interfaz
 */
function mostrarResultados(partidos, jornadaEstado) {
    const futbol11Container = document.getElementById('futbol11-container');
    const futbol7Container = document.getElementById('futbol7-container');
    const futbol11Matches = document.getElementById('futbol11-matches');
    const futbol7Matches = document.getElementById('futbol7-matches');
    const noPartidosMsg = document.getElementById('no-partidos-message');
    
    // Limpiar contenedores
    futbol11Matches.innerHTML = '';
    futbol7Matches.innerHTML = '';
    
    // Ocultar todo inicialmente
    futbol11Container.style.display = 'none';
    futbol7Container.style.display = 'none';
    noPartidosMsg.style.display = 'none';
    
    if (!partidos || partidos.length === 0) {
        noPartidosMsg.style.display = 'block';
        return;
    }
    
    // Separar partidos por tipo de fútbol
    const partidosFutbol11 = partidos.filter(p => p.tipo_futbol === 'futbol11');
    const partidosFutbol7 = partidos.filter(p => p.tipo_futbol === 'futbol7');
    
    // Generar HTML para Fútbol 11
    if (partidosFutbol11.length > 0) {
        futbol11Container.style.display = 'block';
        partidosFutbol11.forEach(partido => {
            futbol11Matches.appendChild(crearElementoPartido(partido));
        });
    }
    
    // Generar HTML para Fútbol 7
    if (partidosFutbol7.length > 0) {
        futbol7Container.style.display = 'block';
        partidosFutbol7.forEach(partido => {
            futbol7Matches.appendChild(crearElementoPartido(partido));
        });
    }
}

/**
 * Crea el elemento HTML para un partido - DISEÑO MEJORADO
 */
function crearElementoPartido(partido) {
    // Determinar si mostrar marcador o estado
    const mostrarMarcador = partido.estado === 'finalizado' || partido.estado === 'forfeit';
    const marcadorLocal = mostrarMarcador ? partido.marcador_local : '-';
    const marcadorVisitante = mostrarMarcador ? partido.marcador_visitante : '-';
    
    // Clase especial para partidos programados
    const claseEstado = !mostrarMarcador ? 'partido-programado' : '';
    
    // Crear la card del partido directamente
    const matchCard = document.createElement('div');
    matchCard.className = `resultado-match ${claseEstado}`;
    
    // Estructura del contenido
    matchCard.innerHTML = `
        <div class="equipo-resultado">
            <svg class="escudo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span title="${partido.equipo_local}">${partido.equipo_local}</span>
        </div>
        
        ${mostrarMarcador 
            ? `<span class="marcador">${marcadorLocal}</span>
               <span class="marcador">${marcadorVisitante}</span>`
            : `<span class="vs-separador">VS</span>`
        }
        
        <div class="equipo-resultado">
            <svg class="escudo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span title="${partido.equipo_visitante}">${partido.equipo_visitante}</span>
        </div>
    `;
    
    // Si el partido está programado, agregar información adicional
    if (!mostrarMarcador) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-partido-programado';
        
        const fechaPartido = new Date(partido.fecha_partido);
        const opciones = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const fechaFormateada = fechaPartido.toLocaleDateString('es-MX', opciones);
        
        infoDiv.innerHTML = `
            <strong>Programado</strong>
            <p>${fechaFormateada}</p>
            <p>${partido.lugar || 'Lugar por confirmar'}</p>
        `;
        matchCard.appendChild(infoDiv);
    }
    
    return matchCard;
}

/**
 * Muestra u oculta el indicador de carga
 */
function mostrarCargando(mostrar) {
    const loading = document.getElementById('resultados-loading');
    const container = document.getElementById('resultados-container');
    
    if (loading) {
        loading.style.display = mostrar ? 'block' : 'none';
    }
    
    if (container) {
        container.style.display = mostrar ? 'none' : 'block';
    }
}

/**
 * Muestra u oculta el mensaje de error
 */
function mostrarError(mostrar) {
    const error = document.getElementById('resultados-error');
    const container = document.getElementById('resultados-container');
    
    if (error) {
        error.style.display = mostrar ? 'block' : 'none';
    }
    
    if (container) {
        container.style.display = mostrar ? 'none' : 'block';
    }
}

/**
 * Muestra mensaje cuando no hay partidos
 */
function mostrarMensajeVacio() {
    const container = document.getElementById('resultados-container');
    
    if (container) {
        container.innerHTML = '<p style="text-align: center; padding: 3rem; color: var(--text-muted);">No hay jornadas disponibles en este momento.</p>';
    }
}

/**
 * Función de recarga para cuando se navega a la sección
 */
function recargarResultados() {
    if (todasLasJornadas.length === 0) {
        inicializarResultados();
    } else if (jornadaActualId) {
        cargarResultadosJornada(jornadaActualId);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de resultados cargado');
});

// Exportar funciones para uso externo
if (typeof window !== 'undefined') {
    window.resultadosModule = {
        inicializar: inicializarResultados,
        recargar: recargarResultados
    };
}