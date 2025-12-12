/**
 * Script para gestionar la visualización de información de contacto
 */

(function() {
    'use strict';

    // Función para formatear el número de teléfono
    function formatearTelefono(telefono) {
        if (!telefono) return '';
        // Eliminar espacios y caracteres especiales
        const limpio = telefono.replace(/\D/g, '');
        
        // Formato: (XXX) XXX-XXXX o similar
        if (limpio.length === 10) {
            return `(${limpio.slice(0, 3)}) ${limpio.slice(3, 6)}-${limpio.slice(6)}`;
        }
        return telefono;
    }

    // Función para obtener el número limpio para WhatsApp (solo dígitos)
    function obtenerNumeroWhatsApp(telefono) {
        if (!telefono) return '';
        // Eliminar todo excepto números
        let limpio = telefono.replace(/\D/g, '');
        
        // Si no tiene código de país, agregar el de México (52)
        if (limpio.length === 10) {
            limpio = '52' + limpio;
        }
        
        return limpio;
    }

    // Función para renderizar la información de contacto
    function renderizarContacto(profesor) {
        // Mostrar nombre
        const nombreElement = document.getElementById('profesor-nombre');
        nombreElement.textContent = profesor.nombre;

        // Mostrar email
        const emailElement = document.getElementById('profesor-email');
        emailElement.textContent = profesor.email;
        emailElement.href = `mailto:${profesor.email}`;

        // Mostrar teléfono
        const telefonoElement = document.getElementById('profesor-telefono');
        telefonoElement.textContent = formatearTelefono(profesor.telefono);

        // Configurar botón de WhatsApp
        const whatsappBtn = document.getElementById('whatsapp-btn');
        const numeroWhatsApp = obtenerNumeroWhatsApp(profesor.telefono);
        
        whatsappBtn.addEventListener('click', function() {
            const mensaje = encodeURIComponent('Hola, me gustaría contactar respecto a la liga deportiva.');
            const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`;
            window.open(urlWhatsApp, '_blank');
        });
    }

    // Función principal para cargar la información de contacto
    async function cargarContacto() {
        const loadingElement = document.getElementById('loading-contacto');
        const errorElement = document.getElementById('error-contacto');
        const contactoContent = document.getElementById('contacto-content');

        try {
            // Mostrar loading
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';
            contactoContent.style.display = 'none';

            // Hacer petición al backend
            const response = await fetch('../pages/obtener_contacto.php');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Ocultar loading
            loadingElement.style.display = 'none';

            if (data.success && data.profesor) {
                // Mostrar información de contacto
                contactoContent.style.display = 'block';
                renderizarContacto(data.profesor);
            } else {
                // Mostrar error
                errorElement.style.display = 'block';
                document.getElementById('error-message').textContent = 
                    data.message || 'No se pudo cargar la información de contacto';
            }

        } catch (error) {
            console.error('Error al cargar información de contacto:', error);
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
            document.getElementById('error-message').textContent = 
                'Error de conexión. Por favor, intenta de nuevo más tarde.';
        }
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargarContacto);
    } else {
        cargarContacto();
    }

})();