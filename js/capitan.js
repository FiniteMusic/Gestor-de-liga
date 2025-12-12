/** 💡 Utility Functions 💡 */

// Hides all menu item active states (removes highlighting)
function removeActiveState() {
    const activeItems = document.querySelectorAll('.gestion-torneo-content-item');
    activeItems.forEach(item => {
        item.classList.remove('active-menu-item');
    });
}

// Function to execute scripts from loaded HTML
function executeScripts(container, basePath) {
    const scripts = container.querySelectorAll('script');
    
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        newScript.setAttribute('data-dynamic-script', 'true');
        
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        if (oldScript.src) {
            let scriptSrc = oldScript.src;
            if (!scriptSrc.match(/^(https?:)?\/\//i) && scriptSrc.includes('../')) {
                const pathParts = scriptSrc.split('/');
                const filename = pathParts[pathParts.length - 1];
                const folder = pathParts[pathParts.length - 2];
                scriptSrc = `${folder}/${filename}`;
            }
            newScript.src = scriptSrc;
        } else {
            newScript.textContent = `(function() { ${oldScript.textContent} })();`;
        }
        
        oldScript.parentNode.replaceChild(newScript, oldScript);
        loadedScripts.push(newScript);
    });
}

let loadedScripts = [];

function removePreviousScripts() {
    loadedScripts.forEach(script => {
        if (script && script.parentNode) {
            script.parentNode.removeChild(script);
        }
    });
    loadedScripts = [];
}

async function loadContent(path, mainContentArea) {
    if (!mainContentArea) {
        console.error("Critical Error: Main content container with class='content' not found.");
        return;
    }

    try {
        removePreviousScripts();
        mainContentArea.innerHTML = '<div style="text-align: center; padding: 20px;">Cargando...</div>';
        mainContentArea.style.display = 'block';

        console.log(`[LOADING] ${path}`);
        const response = await fetch(path);
       
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`404: Archivo no encontrado: ${path}`);
            }
            throw new Error(`HTTP error! Estado: ${response.status}`);
        }

        const htmlContent = await response.text();
        console.log(`[SUCCESS] Contenido cargado: ${path}`);

        mainContentArea.innerHTML = htmlContent;
        executeScripts(mainContentArea, path);
       
    } catch (error) {
        console.error(`Error al cargar ${path}:`, error);
        mainContentArea.innerHTML = `
            <div style="color: red; padding: 20px;">
                <h3>❌ Error al cargar el contenido</h3>
                <p><strong>Ruta:</strong> ${path}</p>
                <p><strong>Error:</strong> ${error.message}</p>
            </div>
        `;
    }
}

/** 🎯 Main Setup Function - VERSIÓN ROBUSTA 🎯 */

function setupListeners() {
    console.log('[SETUP] Iniciando configuración robusta...');
    
    const mainContentArea = document.querySelector(".content");
    if (!mainContentArea) {
        console.error('[CRITICAL] No se encontró el contenedor .content');
        return;
    }

    // 🎯 NUEVA ESTRATEGIA: Buscar por el texto exacto de cada botón
    const menuConfig = [
        { text: 'INSCRIBIR EQUIPO', id: 'inscribir-equipo', description: 'Inscribir Equipo' },
        { text: 'ESTATUS DE INSCRIPCION', id: 'estatus-inscripcion', description: 'Estatus de Inscripción' },
        { text: 'CONTACTO', id: 'contacto-capitan', description: 'Contacto' },
        { text: 'JORNADAS', id: 'jornadas-capitan', description: 'Jornadas' },
        { text: 'PERFIL', id: 'gestionar-perfil', description: 'Perfil' }
    ];

    // Obtener todos los items
    const allItems = document.querySelectorAll('.gestion-torneo-content-item');
    console.log(`[DEBUG] Total items encontrados: ${allItems.length}`);

    allItems.forEach((item, index) => {
        const descriptionElement = item.querySelector('.gestion-torneo-content-item-description');
        if (!descriptionElement) {
            console.warn(`[SETUP] Item ${index + 1}: No tiene elemento de descripción`);
            return;
        }

        const itemText = descriptionElement.textContent.trim();
        console.log(`[DEBUG] Item ${index + 1}: "${itemText}"`);

        // Buscar la configuración correspondiente
        const config = menuConfig.find(cfg => cfg.text === itemText);
        
        if (config) {
            console.log(`[SETUP] ✓ Configurando: ${config.description} -> ${config.id}`);
            
            item.addEventListener('click', function(event) {
                event.preventDefault();
                
                console.log('════════════════════════════════════');
                console.log(`[CLICK] 🖱️ ${config.description}`);
                console.log(`[CLICK] ID: ${config.id}`);
                console.log('════════════════════════════════════');
                
                const contentPath = `capitan-pages/${config.id}.html`;
                loadContent(contentPath, mainContentArea);
                
                removeActiveState();
                item.classList.add('active-menu-item');
            });
            
            console.log(`[SETUP] ✓ Listener agregado para: ${config.description}`);
        } else {
            console.warn(`[SETUP] ⚠️ No hay configuración para: "${itemText}"`);
        }
    });

    console.log('[SETUP] Configuración completada');

    // Cargar página por defecto
    const defaultPath = 'capitan-pages/inscribir-equipo.html';
    console.log('[INIT] Cargando página por defecto');
    loadContent(defaultPath, mainContentArea);

    // Highlight default
    if (allItems.length > 0) {
        removeActiveState();
        allItems[0].classList.add('active-menu-item');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CAPITÁN.JS - Inicializando sistema de navegación');
    setupListeners();
    console.log('✓ Inicialización completada');
});