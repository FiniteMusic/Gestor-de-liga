/**
 * proximos-juegos.js - Gestión dinámica de próximos juegos en Home
 * Carga y muestra los próximos partidos desde la base de datos
 */

// Estado global de próximos juegos
const proximosJuegosState = {
    partidosCargados: [],
    ultimaActualizacion: null
};

/**
 * Inicializa el módulo de próximos juegos
 */
function inicializarProximosJuegos() {
    cargarProximosJuegos();
    configurarNavegacionCarrusel();
    
    // Verificar actualización cada hora
    setInterval(verificarActualizacion, 3600000); // 1 hora
}

/**
 * Verifica si necesita actualizar los datos
 */
function verificarActualizacion() {
    const ahora = new Date();
    const ultimaActualizacion = proximosJuegosState.ultimaActualizacion;
    
    // Recargar si han pasado más de 1 hora
    if (!ultimaActualizacion || ahora - ultimaActualizacion > 3600000) {
        cargarProximosJuegos();
    }
}

/**
 * Carga los próximos juegos desde el servidor
 */
async function cargarProximosJuegos() {
    mostrarEstadoCargaJuegos('loading');
    
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
            proximosJuegosState.partidosCargados = data.partidos || [];
            proximosJuegosState.ultimaActualizacion = new Date();
            renderizarProximosJuegos();
        } else {
            throw new Error(data.message || 'Error al cargar los partidos');
        }
        
    } catch (error) {
        console.error('Error al cargar próximos juegos:', error);
        mostrarEstadoCargaJuegos('error');
    }
}

/**
 * Renderiza las cards de próximos juegos
 */
function renderizarProximosJuegos() {
    const container = document.getElementById('juegosContainer');
    
    if (!container) {
        console.error('No se encontró el contenedor de juegos');
        return;
    }
    
    const partidosFuturos = filtrarPartidosFuturos(proximosJuegosState.partidosCargados);
    
    if (partidosFuturos.length === 0) {
        mostrarEstadoCargaJuegos('vacio');
        return;
    }
    
    mostrarEstadoCargaJuegos('success');
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear cards para cada partido (máximo 10)
    const partidosAMostrar = partidosFuturos.slice(0, 10);
    
    partidosAMostrar.forEach(partido => {
        const card = crearCardJuego(partido);
        container.appendChild(card);
    });
}

/**
 * Filtra solo los partidos futuros o de hoy
 */
function filtrarPartidosFuturos(partidos) {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0); // Inicio del día actual
    
    return partidos
        .filter(p => {
            const fechaPartido = new Date(p.fecha_partido);
            return fechaPartido >= ahora;
        })
        .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido));
}

/**
 * Crea una card de juego
 */
function crearCardJuego(partido) {
    const card = document.createElement('div');
    card.className = 'juego-card';
    
    // Determinar si es hoy
    const esHoy = esPartidoHoy(partido.fecha_partido);
    if (esHoy) {
        card.classList.add('partido-hoy');
    }
    
    card.innerHTML = `
        <div class="juego-fecha">${partido.fecha_formateada} - ${partido.hora_formateada}</div>
        <div class="juego-equipo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>${partido.equipo_local}</span>
        </div>
        <div class="vs-separator">VS</div>
        <div class="juego-equipo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>${partido.equipo_visitante}</span>
        </div>
        ${partido.tipo_futbol === 'futbol7' ? '<div class="badge-tipo">Fútbol 7</div>' : '<div class="badge-tipo">Fútbol 11</div>'}
        ${partido.lugar ? `<div class="juego-lugar">${partido.lugar}</div>` : '<div class="juego-lugar">Cancha ESCOM</div>'}
    `;
    
    return card;
}

/**
 * Verifica si un partido es hoy
 */
function esPartidoHoy(fechaStr) {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
}

/**
 * Crea el SVG del estadio animado
 */
function crearEstadioSVG() {
    return `
        <svg class="estadio-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>
                    @keyframes pulseStadium {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.01); }
                    }
                    @keyframes glowField {
                        0%, 100% { opacity: 0.9; }
                        50% { opacity: 1; }
                    }
                    @keyframes rotateBall {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes blinkLight {
                        0%, 100% { opacity: 0.6; }
                        50% { opacity: 1; }
                    }
                    .estadio-container {
                        animation: pulseStadium 4s ease-in-out infinite;
                        transform-origin: center;
                    }
                    .cancha-glow {
                        animation: glowField 3s ease-in-out infinite;
                    }
                    .balon-rotate {
                        animation: rotateBall 6s linear infinite;
                        transform-origin: center;
                    }
                    .light-blink {
                        animation: blinkLight 2s ease-in-out infinite;
                    }
                </style>
                
                <!-- Gradientes para profundidad -->
                <radialGradient id="fieldGradient" cx="50%" cy="40%">
                    <stop offset="0%" style="stop-color:#3d8361;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1a4d2e;stop-opacity:1" />
                </radialGradient>
                
                <radialGradient id="structureGradient" cx="50%" cy="30%">
                    <stop offset="0%" style="stop-color:#4a5568;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1a202c;stop-opacity:1" />
                </radialGradient>
                
                <linearGradient id="roofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#cbd5e0;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#718096;stop-opacity:0.7" />
                </linearGradient>
            </defs>
            
            <g class="estadio-container">
                <!-- Sombra base -->
                <ellipse cx="200" cy="245" rx="150" ry="20" fill="#000" opacity="0.2"/>
                
                <!-- Estructura exterior del estadio -->
                <ellipse cx="200" cy="200" rx="160" ry="95" fill="url(#structureGradient)" stroke="#2d3748" stroke-width="2"/>
                
                <!-- Techo curvo -->
                <ellipse cx="200" cy="105" rx="145" ry="25" fill="url(#roofGradient)" stroke="#4a5568" stroke-width="1.5"/>
                <path d="M 55 105 Q 55 200, 55 200 L 55 105" fill="url(#roofGradient)" opacity="0.8"/>
                <path d="M 345 105 Q 345 200, 345 200 L 345 105" fill="url(#roofGradient)" opacity="0.8"/>
                
                <!-- Torres de iluminación -->
                <g class="light-blink">
                    <circle cx="65" cy="90" r="6" fill="#fbbf24" opacity="0.9">
                        <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <line x1="65" y1="96" x2="65" y2="105" stroke="#4a5568" stroke-width="2"/>
                </g>
                <g class="light-blink" style="animation-delay: 0.5s">
                    <circle cx="335" cy="90" r="6" fill="#fbbf24" opacity="0.9">
                        <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <line x1="335" y1="96" x2="335" y2="105" stroke="#4a5568" stroke-width="2"/>
                </g>
                <g class="light-blink" style="animation-delay: 1s">
                    <circle cx="200" cy="75" r="6" fill="#fbbf24" opacity="0.9">
                        <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <line x1="200" y1="81" x2="200" y2="90" stroke="#4a5568" stroke-width="2"/>
                </g>
                
                <!-- Niveles de asientos -->
                <!-- Nivel superior - Rojo -->
                ${generarSeccionAsientos(200, 145, 142, 85, '#dc2626', '#b91c1c', 36, 0.75)}
                
                <!-- Nivel medio - Azul -->
                ${generarSeccionAsientos(200, 163, 122, 72, '#2563eb', '#1e40af', 32, 0.65)}
                
                <!-- Nivel inferior - Verde -->
                ${generarSeccionAsientos(200, 178, 105, 62, '#16a34a', '#15803d', 28, 0.55)}
                
                <!-- Barandillas entre niveles -->
                <ellipse cx="200" cy="145" rx="142" ry="85" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.6"/>
                <ellipse cx="200" cy="163" rx="122" ry="72" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.6"/>
                <ellipse cx="200" cy="178" rx="105" ry="62" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.6"/>
                
                <!-- Campo de juego -->
                <g class="cancha-glow">
                    <ellipse cx="200" cy="200" rx="90" ry="53" fill="url(#fieldGradient)"/>
                    
                    <!-- Líneas del campo -->
                    <g stroke="#fff" stroke-width="1.2" fill="none" opacity="0.9">
                        <!-- Línea central -->
                        <line x1="200" y1="150" x2="200" y2="250"/>
                        
                        <!-- Círculo central -->
                        <ellipse cx="200" cy="200" rx="18" ry="11"/>
                        <circle cx="200" cy="200" r="1.5" fill="#fff"/>
                        
                        <!-- Áreas pequeñas -->
                        <rect x="115" y="192" width="20" height="16" rx="1"/>
                        <rect x="265" y="192" width="20" height="16" rx="1"/>
                        
                        <!-- Áreas grandes -->
                        <rect x="130" y="182" width="12" height="36" rx="1"/>
                        <rect x="258" y="182" width="12" height="36" rx="1"/>
                        
                        <!-- Puntos de penalti -->
                        <circle cx="145" cy="200" r="1.5" fill="#fff"/>
                        <circle cx="255" cy="200" r="1.5" fill="#fff"/>
                        
                        <!-- Porterías -->
                        <rect x="108" y="194" width="3" height="12" fill="#fff"/>
                        <rect x="289" y="194" width="3" height="12" fill="#fff"/>
                        
                        <!-- Líneas de banda (perímetro) -->
                        <ellipse cx="200" cy="200" rx="90" ry="53"/>
                    </g>
                    
                    <!-- Patrón de césped -->
                    <g opacity="0.15">
                        ${generarPatronCesped(200, 200, 90, 53)}
                    </g>
                </g>
                
                <!-- Balón de fútbol -->
                <g transform="translate(200, 200)">
                    <g class="balon-rotate">
                        <circle r="8" fill="#fff" stroke="#000" stroke-width="0.8"/>
                        <path d="M -4,-4 L 0,-7 L 4,-4 L 3,3 L -3,3 Z" fill="#000"/>
                        <path d="M -7,0 L -4,-4 L -3,3 Z" fill="#000"/>
                        <path d="M 7,0 L 4,-4 L 3,3 Z" fill="#000"/>
                        <path d="M 0,7 L -3,3 L 3,3 Z" fill="#000"/>
                    </g>
                </g>
            </g>
        </svg>
    `;
}

/**
 * Genera una sección de asientos con efecto 3D
 */
function generarSeccionAsientos(cx, cy, rx, ry, color1, color2, cantidad, arcoCurvatura) {
    let html = '<g>';
    const angleStart = Math.PI * 0.2; // Iniciar desde más abajo
    const angleEnd = Math.PI * 0.8; // Terminar más abajo
    const angleRange = angleEnd - angleStart;
    
    for (let i = 0; i < cantidad; i++) {
        const t = i / (cantidad - 1);
        const angle = angleStart + angleRange * t;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        
        // Alternar colores para efecto de secciones
        const color = i % 2 === 0 ? color1 : color2;
        const width = 8;
        const height = 5;
        
        // Calcular rotación para seguir la curva
        const rotation = (angle * 180 / Math.PI) + 90;
        
        html += `<rect x="${x - width/2}" y="${y - height/2}" 
                       width="${width}" height="${height}" 
                       fill="${color}" rx="1"
                       transform="rotate(${rotation}, ${x}, ${y})"
                       opacity="0.95"/>`;
    }
    html += '</g>';
    return html;
}

/**
 * Genera patrón de césped rayado
 */
function generarPatronCesped(cx, cy, rx, ry) {
    let html = '';
    const numLineas = 12;
    const ancho = rx * 2 / numLineas;
    
    for (let i = 0; i < numLineas; i++) {
        if (i % 2 === 0) {
            const x = cx - rx + (i * ancho);
            html += `<rect x="${x}" y="${cy - ry}" width="${ancho}" height="${ry * 2}" fill="#000" opacity="0.1"/>`;
        }
    }
    return html;
}

/**
 * Configura la navegación del carrusel
 */
function configurarNavegacionCarrusel() {
    const container = document.getElementById('juegosContainer');
    const btnLeft = document.getElementById('scrollLeft');
    const btnRight = document.getElementById('scrollRight');
    
    if (!container || !btnLeft || !btnRight) return;
    
    btnLeft.addEventListener('click', () => {
        container.scrollBy({
            left: -300,
            behavior: 'smooth'
        });
    });
    
    btnRight.addEventListener('click', () => {
        container.scrollBy({
            left: 300,
            behavior: 'smooth'
        });
    });
    
    // Mostrar/ocultar flechas según scroll
    container.addEventListener('scroll', () => {
        actualizarVisibilidadFlechas(container, btnLeft, btnRight);
    });
    
    // Verificación inicial
    actualizarVisibilidadFlechas(container, btnLeft, btnRight);
}

/**
 * Actualiza la visibilidad de las flechas de navegación
 */
function actualizarVisibilidadFlechas(container, btnLeft, btnRight) {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Ocultar flecha izquierda si está al inicio
    btnLeft.style.opacity = scrollLeft <= 0 ? '0.3' : '1';
    btnLeft.style.pointerEvents = scrollLeft <= 0 ? 'none' : 'auto';
    
    // Ocultar flecha derecha si está al final
    btnRight.style.opacity = scrollLeft + clientWidth >= scrollWidth - 10 ? '0.3' : '1';
    btnRight.style.pointerEvents = scrollLeft + clientWidth >= scrollWidth - 10 ? 'none' : 'auto';
}

/**
 * Muestra el estado de carga correspondiente
 */
function mostrarEstadoCargaJuegos(estado) {
    const container = document.getElementById('juegosContainer');
    const proximosJuegosSection = document.querySelector('.proximos-juegos');
    
    if (!container || !proximosJuegosSection) return;
    
    // Limpiar mensajes previos
    const mensajesPrevios = proximosJuegosSection.querySelectorAll('.mensaje-estado');
    mensajesPrevios.forEach(m => m.remove());
    
    switch(estado) {
        case 'loading':
            const loading = document.createElement('div');
            loading.className = 'mensaje-estado loading-juegos';
            loading.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-muted);';
            loading.textContent = 'Cargando próximos juegos...';
            container.parentNode.insertBefore(loading, container);
            container.style.display = 'none';
            break;
            
        case 'error':
            const error = document.createElement('div');
            error.className = 'mensaje-estado error-juegos';
            error.style.cssText = 'text-align: center; padding: 2rem; color: var(--danger);';
            error.textContent = 'Error al cargar los juegos. Por favor, intenta de nuevo.';
            container.parentNode.insertBefore(error, container);
            container.style.display = 'none';
            break;
            
        case 'vacio':
            const vacio = document.createElement('div');
            vacio.className = 'mensaje-estado vacio-juegos';
            vacio.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem 2rem;
                gap: 1.5rem;
            `;
            
            vacio.innerHTML = `
                ${crearEstadioSVG()}
                <p style="
                    font-size: 1.3rem; 
                    color: var(--text-muted); 
                    margin: 0;
                    font-weight: 500;
                    text-align: center;
                ">Los próximos partidos están por anunciarse.</p>
            `;
            
            // Agregar estilos CSS para el estadio si no existen
            if (!document.getElementById('estadio-styles')) {
                const style = document.createElement('style');
                style.id = 'estadio-styles';
                style.textContent = `
                    .estadio-svg {
                        width: 350px;
                        height: 280px;
                        filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.25));
                    }
                    
                    @media (max-width: 768px) {
                        .estadio-svg {
                            width: 280px;
                            height: 220px;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .estadio-svg {
                            width: 240px;
                            height: 190px;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            container.parentNode.insertBefore(vacio, container);
            container.style.display = 'none';
            break;
            
        case 'success':
            container.style.display = 'flex';
            break;
    }
}

/**
 * Fuerza la recarga de próximos juegos
 */
function recargarProximosJuegos() {
    cargarProximosJuegos();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarProximosJuegos);
} else {
    inicializarProximosJuegos();
}

// Exportar funciones para uso externo
window.proximosJuegosModule = {
    recargar: recargarProximosJuegos,
    getPartidos: () => proximosJuegosState.partidosCargados
};