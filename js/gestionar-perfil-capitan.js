/**
 * Gestión de Perfil - JavaScript
 * Maneja la carga de datos del usuario y actualización de información
 */

(function() {
    'use strict';

    // Función para mostrar alertas
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertHTML = `
            <div class="alert alert-${type}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    ${type === 'success' ? 
                        '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' :
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'
                    }
                </svg>
                <span>${message}</span>
            </div>
        `;

        alertContainer.innerHTML = alertHTML;

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    // Función para formatear fechas
    function formatDate(dateString) {
        if (!dateString) return 'No disponible';
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Función para cargar los datos del usuario
    async function cargarDatosUsuario() {
        try {
            const response = await fetch('../pages/gestionar-perfil-capitan.php?action=obtener_datos', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                const usuario = data.data;

                // Llenar campos de información personal
                document.getElementById('nombre').value = usuario.nombre || '';
                document.getElementById('email').value = usuario.email || '';
                document.getElementById('telefono').value = usuario.telefono || '';

                // Llenar información de la cuenta (solo lectura)
                document.getElementById('rol_display').value = 
                    usuario.rol === 'administrador' ? 'Administrador' : 'Capitán';
                document.getElementById('fecha_registro').value = formatDate(usuario.fecha_registro);
                document.getElementById('ultimo_acceso').value = formatDate(usuario.ultimo_acceso);

            } else {
                showAlert(data.message || 'Error al cargar los datos del usuario', 'danger');
            }

        } catch (error) {
            console.error('Error al cargar datos:', error);
            showAlert('Error de conexión al cargar los datos', 'danger');
        }
    }

    // Función para actualizar información personal
    async function actualizarInformacionPersonal(e) {
        e.preventDefault();

        const btnSubmit = document.getElementById('btnGuardarInfo');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>Guardando...</span>';

        const formData = new FormData(e.target);
        formData.append('action', 'actualizar_info');

        try {
            const response = await fetch('../pages/gestionar-perfil-capitan.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Información actualizada correctamente', 'success');
                // Recargar datos para reflejar cambios
                await cargarDatosUsuario();
            } else {
                showAlert(data.message || 'Error al actualizar la información', 'danger');
            }

        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión al actualizar la información', 'danger');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
        }
    }

    // Función para cambiar contraseña
    async function cambiarContrasena(e) {
        e.preventDefault();

        const passwordNueva = document.getElementById('password_nueva').value;
        const passwordConfirmar = document.getElementById('password_confirmar').value;

        // Validar que las contraseñas coincidan
        if (passwordNueva !== passwordConfirmar) {
            showAlert('Las contraseñas no coinciden', 'warning');
            return;
        }

        // Validar longitud mínima
        if (passwordNueva.length < 8) {
            showAlert('La contraseña debe tener al menos 8 caracteres', 'warning');
            return;
        }

        const btnSubmit = document.getElementById('btnCambiarPassword');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>Cambiando...</span>';

        const formData = new FormData(e.target);
        formData.append('action', 'cambiar_password');

        try {
            const response = await fetch('../pages/gestionar-perfil-capitan.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Contraseña actualizada correctamente', 'success');
                // Limpiar el formulario
                e.target.reset();
            } else {
                showAlert(data.message || 'Error al cambiar la contraseña', 'danger');
            }

        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión al cambiar la contraseña', 'danger');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
        }
    }

    // Inicializar cuando el DOM esté listo
    function init() {
        // Cargar datos del usuario al iniciar
        cargarDatosUsuario();

        // Configurar listeners para los formularios
        const formInfoPersonal = document.getElementById('formInfoPersonal');
        if (formInfoPersonal) {
            formInfoPersonal.addEventListener('submit', actualizarInformacionPersonal);
        }

        const formCambiarPassword = document.getElementById('formCambiarPassword');
        if (formCambiarPassword) {
            formCambiarPassword.addEventListener('submit', cambiarContrasena);
        }
    }

    // Ejecutar cuando el documento esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();