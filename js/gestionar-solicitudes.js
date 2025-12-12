// gestionar-solicitudes.js    
console.log('=== SCRIPT INICIADO ===');

var API_URL = '../pages/solicitudes.php';
console.log('API_URL:', API_URL);

// Función de inicialización
function initGestionarSolicitudes() {
    console.log('=== INICIALIZACIÓN EJECUTADA ===');
    cargarSolicitudes();
}

// Ejecutar inmediatamente si el DOM ya está listo, o esperar si no lo está
if (document.readyState === 'loading') {
    console.log('DOM aún cargando, esperando...');
    document.addEventListener('DOMContentLoaded', initGestionarSolicitudes);
} else {
    console.log('DOM ya cargado, ejecutando inmediatamente');
    initGestionarSolicitudes();
}

async function cargarSolicitudes() {
    console.log('=== cargarSolicitudes() EJECUTADA ===');
    console.log('Haciendo fetch a:', API_URL);
    
    try {
        const response = await fetch(API_URL);
        console.log('✅ Respuesta recibida');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        const textResponse = await response.text();
        console.log('Respuesta en texto:', textResponse);
        
        let data;
        try {
            data = JSON.parse(textResponse);
            console.log('✅ JSON parseado correctamente:', data);
        } catch (e) {
            console.error('❌ Error al parsear JSON:', e);
            console.error('Texto recibido:', textResponse);
            throw new Error('Respuesta no es JSON válido');
        }

        const loadingState = document.getElementById('loadingState');
        const tableElement = document.getElementById('solicitudesTable');
        const emptyState = document.getElementById('emptyState');

        if (!loadingState || !tableElement || !emptyState) {
            console.error('❌ Elementos HTML no encontrados');
            console.error('loadingState:', loadingState);
            console.error('tableElement:', tableElement);
            console.error('emptyState:', emptyState);
            return;
        }

        loadingState.style.display = 'none';

        if (data.error) {
            console.error('Error en respuesta:', data.error);
            mostrarToast('Error', data.error, 'error');
            emptyState.style.display = 'block';
            return;
        }

        if (!Array.isArray(data)) {
            console.error('Data no es un array:', typeof data, data);
            mostrarToast('Error', 'Formato de datos inválido', 'error');
            emptyState.style.display = 'block';
            return;
        }

        console.log('Cantidad de registros:', data.length);

        if (data.length === 0) {
            console.log('No hay equipos pendientes');
            emptyState.style.display = 'block';
            actualizarEstadisticas(0);
            return;
        }

        console.log('Renderizando tabla con', data.length, 'equipos');
        renderizarTabla(data);
        tableElement.style.display = 'table';
        actualizarEstadisticas(data.length);

    } catch (error) {
        console.error('❌ ERROR COMPLETO:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        mostrarToast('Error', 'No se pudieron cargar las solicitudes: ' + error.message, 'error');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }
}

function renderizarTabla(equipos) {
    console.log('renderizarTabla() llamada con', equipos.length, 'equipos');
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    equipos.forEach(equipo => {
        const row = document.createElement('tr');
        row.id = `equipo-${equipo.id}`;
        
        row.innerHTML = `
            <td>
                <div class="team-info">
                    <span class="team-name">${escapeHtml(equipo.nombre_equipo)}</span>
                    <span class="team-meta">
                        Torneo: ${escapeHtml(equipo.nombre_torneo)} 
                        ${equipo.grupo ? `• Grupo ${equipo.grupo}` : ''}
                    </span>
                    <span class="team-meta">
                        Inscrito: ${formatearFecha(equipo.fecha_inscripcion)}
                    </span>
                </div>
            </td>
            <td>
                <div class="captain-info">
                    <span class="captain-name">${escapeHtml(equipo.nombre_capitan)}</span>
                    <span class="captain-contact">${escapeHtml(equipo.email_capitan)}</span>
                    ${equipo.telefono_capitan ? `<span class="captain-contact">${escapeHtml(equipo.telefono_capitan)}</span>` : ''}
                </div>
            </td>
            <td>
                <span class="status-badge status-preinscrito">
                    <span class="status-dot"></span>
                    Preinscrito
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-confirm" onclick="actualizarEstado(${equipo.id}, 'confirmado')">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Confirmar
                    </button>
                    <button class="btn btn-reject" onclick="actualizarEstado(${equipo.id}, 'descalificado')">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rechazar
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('Tabla renderizada correctamente');
}

async function actualizarEstado(idEquipo, nuevoEstado) {
    console.log('actualizarEstado() llamada:', idEquipo, nuevoEstado);
    const accion = nuevoEstado === 'confirmado' ? 'confirmar' : 'rechazar';
    
    if (!confirm(`¿Está seguro de ${accion} este equipo?`)) {
        return;
    }

    const row = document.getElementById(`equipo-${idEquipo}`);
    const buttons = row.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_equipo: idEquipo,
                nuevo_estado: nuevoEstado
            })
        });

        const resultado = await response.json();
        console.log('Resultado actualización:', resultado);

        if (resultado.success) {
            mostrarToast(
                '¡Éxito!',
                `Equipo ${nuevoEstado === 'confirmado' ? 'confirmado' : 'rechazado'} correctamente`,
                'success'
            );
            
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            row.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                row.remove();
                
                const tbody = document.getElementById('tableBody');
                if (tbody.children.length === 0) {
                    document.getElementById('solicitudesTable').style.display = 'none';
                    document.getElementById('emptyState').style.display = 'block';
                    actualizarEstadisticas(0);
                } else {
                    actualizarEstadisticas(tbody.children.length);
                }
            }, 300);
        } else {
            mostrarToast('Error', resultado.message, 'error');
            buttons.forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Error al actualizar estado:', error);
        mostrarToast('Error', 'No se pudo actualizar el estado del equipo', 'error');
        buttons.forEach(btn => btn.disabled = false);
    }
}

function actualizarEstadisticas(total) {
    const element = document.getElementById('totalPendientes');
    if (element) {
        element.textContent = total;
    }
}

function mostrarToast(titulo, mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const iconSuccess = `<svg class="toast-icon" style="color: var(--success);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
    
    const iconError = `<svg class="toast-icon" style="color: var(--danger);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
    
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        ${tipo === 'success' ? iconSuccess : iconError}
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    // Protección contra null/undefined
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}