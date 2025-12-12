// publicar-anuncio.js

// Configurar fecha mínima (solo fechas futuras)
function configurarFechaMinima() {
    const inputFecha = document.getElementById('fecha_fin');
    if (inputFecha) {
        const hoy = new Date();
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        
        const fechaMin = manana.toISOString().split('T')[0];
        inputFecha.setAttribute('min', fechaMin);
    }
}

// Mostrar alertas
function mostrarAlerta(mensaje, tipo = 'success') {
    const alertContainer = document.getElementById('alert-container');
    const alertClass = tipo === 'success' ? 'alert-success' : 'alert-danger';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.innerHTML = `
        <span>${mensaje}</span>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Limpiar formulario
function limpiarFormulario() {
    document.getElementById('form-anuncio').reset();
}

// Cargar torneos activos
async function cargarTorneos() {
    try {
        const response = await fetch('../pages/gestionar_anuncios.php?action=obtener_torneos');
        const data = await response.json();
        
        const select = document.getElementById('id_torneo');
        select.innerHTML = '<option value="">Seleccione un torneo</option>';
        
        if (data.success && data.torneos.length > 0) {
            data.torneos.forEach(torneo => {
                const option = document.createElement('option');
                option.value = torneo.id;
                option.textContent = `${torneo.nombre} - ${torneo.temporada}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar torneos:', error);
        mostrarAlerta('Error al cargar la lista de torneos', 'danger');
    }
}

// Cargar anuncios recientes
async function cargarAnuncios() {
    const loadingDiv = document.getElementById('loading-anuncios');
    const tablaDiv = document.getElementById('tabla-anuncios-container');
    const emptyDiv = document.getElementById('empty-anuncios');
    
    loadingDiv.style.display = 'block';
    tablaDiv.style.display = 'none';
    emptyDiv.style.display = 'none';
    
    try {
        const response = await fetch('../pages/gestionar_anuncios.php?action=listar_anuncios');
        const data = await response.json();
        
        loadingDiv.style.display = 'none';
        
        if (data.success && data.anuncios.length > 0) {
            const tbody = document.getElementById('tbody-anuncios');
            tbody.innerHTML = '';
            
            data.anuncios.forEach(anuncio => {
                const tr = document.createElement('tr');
                
                // Determinar icono y estilo según tipo
                let tipoIcono = '';
                let tipoBadgeClass = '';
                
                switch(anuncio.tipo) {
                    case 'informativo':
                        tipoIcono = '📢';
                        tipoBadgeClass = 'status-preinscrito';
                        break;
                    case 'urgente':
                        tipoIcono = '⚠️';
                        tipoBadgeClass = 'status-badge';
                        break;
                    case 'suspension':
                        tipoIcono = '🚫';
                        tipoBadgeClass = 'status-badge';
                        break;
                    case 'cambio_horario':
                        tipoIcono = '⏰';
                        tipoBadgeClass = 'status-preinscrito';
                        break;
                }
                
                // Estado visible/no visible
                const estadoBadge = anuncio.visible == 1 
                    ? '<span class="status-badge status-confirmado">✓ Visible</span>'
                    : '<span class="status-badge" style="background: rgba(239, 68, 68, 0.1); color: #dc2626; border-color: #dc2626;">✗ Oculto</span>';
                
                // Formatear fechas
                const fechaInicio = new Date(anuncio.fecha_inicio).toLocaleDateString('es-MX');
                const fechaFin = anuncio.fecha_fin 
                    ? new Date(anuncio.fecha_fin).toLocaleDateString('es-MX') 
                    : 'Sin límite';
                
                tr.innerHTML = `
                    <td>
                        <span class="status-badge ${tipoBadgeClass}">
                            ${tipoIcono} ${anuncio.tipo.replace('_', ' ').toUpperCase()}
                        </span>
                    </td>
                    <td><strong>${anuncio.titulo}</strong></td>
                    <td>${anuncio.torneo_nombre || 'General'}</td>
                    <td>${fechaInicio}</td>
                    <td>${fechaFin}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button 
                            class="btn" 
                            style="padding: 0.5rem 1rem; font-size: 0.85rem; background: ${anuncio.visible == 1 ? '#6b7280' : 'var(--color-accent-600)'}; color: white;"
                            onclick="toggleVisibilidad(${anuncio.id}, ${anuncio.visible})">
                            ${anuncio.visible == 1 ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
            
            tablaDiv.style.display = 'block';
        } else {
            emptyDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar anuncios:', error);
        loadingDiv.style.display = 'none';
        emptyDiv.style.display = 'block';
        mostrarAlerta('Error al cargar los anuncios', 'danger');
    }
}

// Toggle visibilidad de anuncio
async function toggleVisibilidad(idAnuncio, estadoActual) {
    const nuevoEstado = estadoActual == 1 ? 0 : 1;
    
    try {
        const response = await fetch('../pages/gestionar_anuncios.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=toggle_visibilidad&id=${idAnuncio}&visible=${nuevoEstado}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message, 'success');
            cargarAnuncios();
        } else {
            mostrarAlerta(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cambiar la visibilidad del anuncio', 'danger');
    }
}

// Manejar envío del formulario
document.getElementById('form-anuncio').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Publicando...';
    
    const formData = new FormData(this);
    formData.append('action', 'crear_anuncio');
    
    try {
        const response = await fetch('../pages/gestionar_anuncios.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message, 'success');
            limpiarFormulario();
            cargarAnuncios();
        } else {
            mostrarAlerta(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al publicar el anuncio', 'danger');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Publicar Anuncio';
    }
});

// Inicializar al cargar la página
(function init() {
    configurarFechaMinima();
    cargarTorneos();
    cargarAnuncios();
})();