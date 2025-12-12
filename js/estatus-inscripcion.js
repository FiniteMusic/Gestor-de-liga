// estatus-inscripcion.js
// JavaScript para manejar la página de estatus de inscripción

(function() {
    'use strict';

    // Función para formatear fechas
    function formatearFecha(fechaStr) {
        if (!fechaStr) return 'No disponible';
        
        const fecha = new Date(fechaStr);
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return fecha.toLocaleDateString('es-MX', opciones);
    }

    // Función para obtener el badge de estado
    function obtenerBadgeEstado(estado) {
        const estados = {
            'preinscrito': {
                clase: 'status-preinscrito',
                texto: 'Pre-inscrito'
            },
            'confirmado': {
                clase: 'status-confirmado',
                texto: 'Confirmado'
            },
            'eliminado': {
                clase: 'status-eliminado',
                texto: 'Eliminado'
            },
            'descalificado': {
                clase: 'status-descalificado',
                texto: 'Descalificado'
            }
        };

        const estadoInfo = estados[estado.toLowerCase()] || {
            clase: 'status-preinscrito',
            texto: estado
        };

        return `
            <div class="status-badge ${estadoInfo.clase}">
                <span class="status-dot"></span>
                ${estadoInfo.texto}
            </div>
        `;
    }

    // Función para mostrar el estado vacío (sin equipo)
    function mostrarEstadoVacio() {
        const contenido = `
            <div class="empty-state">
                <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h2 class="empty-title">No tienes ningún equipo registrado</h2>
                <p class="empty-text">Aún no has inscrito un equipo a ningún torneo. Comienza registrando tu equipo ahora.</p>
                <button class="btn-primary" onclick="window.location.href='inscripcion.html'">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Inscribir Equipo
                </button>
            </div>
        `;
        
        document.getElementById('estatusContent').innerHTML = contenido;
    }

    // Función para mostrar la información del equipo
    function mostrarInformacionEquipo(equipo) {
        const contenido = `
            <div class="team-card">
                <div class="team-card-header">
                    <h2 class="team-name">${equipo.nombre_equipo}</h2>
                    <p class="team-tournament">${equipo.nombre_torneo}</p>
                </div>
                
                <div class="team-card-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Estado de Inscripción</span>
                            ${obtenerBadgeEstado(equipo.estado)}
                        </div>
                        
                        <div class="info-item">
                            <span class="info-label">Fecha de Inscripción</span>
                            <span class="info-value">${formatearFecha(equipo.fecha_inscripcion)}</span>
                        </div>
                        
                        ${equipo.fecha_confirmacion ? `
                            <div class="info-item">
                                <span class="info-label">Fecha de Confirmación</span>
                                <span class="info-value">${formatearFecha(equipo.fecha_confirmacion)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="info-item">
                            <span class="info-label">ID del Equipo</span>
                            <span class="info-value">#${equipo.id}</span>
                        </div>
                    </div>
                    
                    ${equipo.notas ? `
                        <div class="divider"></div>
                        <div class="info-item">
                            <span class="info-label">Notas del Organizador</span>
                            <span class="info-value">${equipo.notas}</span>
                        </div>
                    ` : ''}
                    
                    <div class="divider"></div>
                    
                    <div class="captain-section">
                        <h3 class="section-title">
                            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Información del Capitán
                        </h3>
                        
                        <div class="contact-info">
                            <div class="contact-item">
                                <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>${equipo.nombre_capitan}</span>
                            </div>
                            
                            <div class="contact-item">
                                <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>${equipo.email_capitan}</span>
                            </div>
                            
                            ${equipo.telefono_capitan ? `
                                <div class="contact-item">
                                    <svg class="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>${equipo.telefono_capitan}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('estatusContent').innerHTML = contenido;
    }

    // Función para mostrar error
    function mostrarError(mensaje) {
        const contenido = `
            <div class="error-state">
                <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 class="error-title">Error al cargar información</h2>
                <p class="error-text">${mensaje}</p>
                <button class="btn-primary" onclick="location.reload()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reintentar
                </button>
            </div>
        `;
        
        document.getElementById('estatusContent').innerHTML = contenido;
    }

    // Función principal para cargar el estatus
    async function cargarEstatusEquipo() {
        try {
            const response = await fetch('../pages/get-estatus-equipo.php', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin' // Para incluir las cookies de sesión
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // No autorizado - redirigir al login
                    window.location.href = '../login.html';
                    return;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                if (data.equipo) {
                    // Mostrar información del equipo
                    mostrarInformacionEquipo(data.equipo);
                } else {
                    // No tiene equipo registrado
                    mostrarEstadoVacio();
                }
            } else {
                // Error en la respuesta
                mostrarError(data.message || 'No se pudo cargar la información del equipo');
            }

        } catch (error) {
            console.error('Error al cargar estatus del equipo:', error);
            mostrarError('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargarEstatusEquipo);
    } else {
        cargarEstatusEquipo();
    }

})();