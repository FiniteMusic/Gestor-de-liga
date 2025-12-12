/**
 * Script para Gestionar Perfil de Administrador
 */

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    const container = document.getElementById('alert-container');
    const alertClass = `alert-${tipo}`;
    
    const alertHTML = `
        <div class="alert ${alertClass}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                ${tipo === 'success' ? '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>' : 
                tipo === 'danger' ? '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>' :
                '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>'}
            </svg>
            ${mensaje}
        </div>
    `;
    
    container.innerHTML = alertHTML;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Cargar datos del perfil actual
async function cargarPerfil() {
    try {
        const response = await fetch('../pages/gestionar-perfil.php?action=get_perfil');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('edit-nombre').value = data.usuario.nombre || '';
            document.getElementById('edit-email').value = data.usuario.email || '';
            document.getElementById('edit-telefono').value = data.usuario.telefono || '';
        } else {
            mostrarAlerta(data.message || 'Error al cargar el perfil', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al cargar el perfil', 'danger');
    }
}

// Toggle sección de nuevo administrador
document.getElementById('btn-toggle-nuevo-admin').addEventListener('click', () => {
    const section = document.getElementById('section-nuevo-admin');
    section.classList.toggle('section-hidden');
    
    if (!section.classList.contains('section-hidden')) {
        // Scroll suave a la sección
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// Cancelar nuevo administrador
document.getElementById('btn-cancelar-nuevo').addEventListener('click', () => {
    document.getElementById('section-nuevo-admin').classList.add('section-hidden');
    document.getElementById('form-nuevo-admin').reset();
});

// Guardar cambios del perfil
document.getElementById('form-editar-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const passwordConfirm = formData.get('password_confirm');
    
    // Validar contraseñas si se están cambiando
    if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
            mostrarAlerta('Las contraseñas no coinciden', 'danger');
            return;
        }
        
        if (password.length < 6) {
            mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'danger');
            return;
        }
    }
    
    // Deshabilitar botón
    const btnGuardar = document.getElementById('btn-guardar-perfil');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    
    try {
        formData.append('action', 'actualizar_perfil');
        
        const response = await fetch('../pages/gestionar-perfil.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message, 'success');
            // Limpiar campos de contraseña
            document.getElementById('edit-password').value = '';
            document.getElementById('edit-password-confirm').value = '';
        } else {
            mostrarAlerta(data.message || 'Error al actualizar el perfil', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al actualizar el perfil', 'danger');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15.854 4.146a.5.5 0 0 1 0 .708l-11 11a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4.5 14.793l10.646-10.647a.5.5 0 0 1 .708 0z"/>
            </svg>
            Guardar Cambios
        `;
    }
});

// Crear nuevo administrador
document.getElementById('form-nuevo-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const passwordConfirm = formData.get('password_confirm');
    
    // Validar contraseñas
    if (password !== passwordConfirm) {
        mostrarAlerta('Las contraseñas no coinciden', 'danger');
        return;
    }
    
    if (password.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'danger');
        return;
    }
    
    // Deshabilitar botón
    const btnCrear = document.getElementById('btn-crear-admin');
    btnCrear.disabled = true;
    btnCrear.textContent = 'Creando...';
    
    try {
        formData.append('action', 'crear_admin');
        
        const response = await fetch('../pages/gestionar-perfil.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message, 'success');
            // Limpiar y ocultar formulario
            e.target.reset();
            document.getElementById('section-nuevo-admin').classList.add('section-hidden');
            
            // Scroll al inicio
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            mostrarAlerta(data.message || 'Error al crear el administrador', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al crear el administrador', 'danger');
    } finally {
        btnCrear.disabled = false;
        btnCrear.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Crear Administrador
        `;
    }
});

// Cargar perfil al iniciar
cargarPerfil();