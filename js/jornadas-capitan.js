/**
 * Script para gestionar la visualización de jornadas del capitán
 */

(function() {
    'use strict';

    // Función para formatear la fecha
    function formatearFecha(fechaString) {
        // Separar la fecha en partes para evitar problemas de zona horaria
        const [year, month, day] = fechaString.split('-');
        const fecha = new Date(year, month - 1, day);
        
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return fecha.toLocaleDateString('es-MX', opciones);
    }

    // Función para formatear la hora
    function formatearHora(horaString) {
        if (!horaString) return '';
        const [hora, minutos] = horaString.split(':');
        return `${hora}:${minutos}`;
    }

    // Función para agrupar partidos por jornada
    function agruparPorJornada(partidos) {
        const jornadas = {};
        
        partidos.forEach(partido => {
            const jornadaId = partido.numero_jornada;
            
            if (!jornadas[jornadaId]) {
                jornadas[jornadaId] = {
                    numero: partido.numero_jornada,
                    nombre: partido.jornada,
                    partidos: []
                };
            }
            
            jornadas[jornadaId].partidos.push(partido);
        });
        
        return Object.values(jornadas);
    }

    // Función para crear el HTML de una jornada
    function crearJornadaHTML(jornada) {
        const partidosHTML = jornada.partidos.map(partido => {
            return `
                <div class="partido-item">
                    <div class="partido-header">
                        <div class="partido-equipos">
                            <div class="vs-container">
                                <span class="equipo-nombre equipo-local">${partido.equipo_local}</span>
                                <span class="vs-text">VS</span>
                                <span class="equipo-nombre">${partido.equipo_visitante}</span>
                            </div>
                        </div>
                        <div class="rival-badge">
                            Tu rival: ${partido.rival}
                        </div>
                    </div>
                    <div class="partido-detalles">
                        <div class="detalle-item">
                            <svg class="detalle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>${formatearFecha(partido.dia)}</span>
                        </div>
                        <div class="detalle-item">
                            <svg class="detalle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${formatearHora(partido.hora)}</span>
                        </div>
                        <div class="detalle-item">
                            <svg class="detalle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span>${partido.lugar}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="jornada-card">
                <div class="jornada-header">
                    <div class="jornada-info">
                        <div class="jornada-numero">J${jornada.numero}</div>
                        <div class="jornada-nombre">${jornada.nombre}</div>
                    </div>
                </div>
                <div class="jornada-body">
                    ${partidosHTML}
                </div>
            </div>
        `;
    }

    // Función para renderizar todas las jornadas
    function renderizarJornadas(partidos) {
        const container = document.getElementById('partidos-container');
        const jornadas = agruparPorJornada(partidos);
        
        // Ordenar jornadas por número
        jornadas.sort((a, b) => a.numero - b.numero);
        
        const jornadasHTML = jornadas.map(jornada => crearJornadaHTML(jornada)).join('');
        container.innerHTML = jornadasHTML;
    }

    // Función principal para cargar los partidos
    async function cargarPartidos() {
        const loadingElement = document.getElementById('loading-jornadas');
        const emptyElement = document.getElementById('empty-jornadas');
        const errorElement = document.getElementById('error-jornadas');
        const partidosContainer = document.getElementById('partidos-container');

        try {
            // Mostrar loading
            loadingElement.style.display = 'block';
            emptyElement.style.display = 'none';
            errorElement.style.display = 'none';
            partidosContainer.style.display = 'none';

            // Hacer petición al backend
            const response = await fetch('../pages/obtener_partidos.php');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Ocultar loading
            loadingElement.style.display = 'none';

            if (data.success) {
                if (data.partidos && data.partidos.length > 0) {
                    // Mostrar partidos
                    partidosContainer.style.display = 'block';
                    renderizarJornadas(data.partidos);
                } else {
                    // Mostrar estado vacío
                    emptyElement.style.display = 'block';
                }
            } else {
                // Mostrar error
                errorElement.style.display = 'block';
                document.getElementById('error-message').textContent = 
                    data.message || 'Error al cargar los partidos';
            }

        } catch (error) {
            console.error('Error al cargar partidos:', error);
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
            document.getElementById('error-message').textContent = 
                'Error de conexión. Por favor, intenta de nuevo más tarde.';
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargarPartidos);
    } else {
        cargarPartidos();
    }

})();