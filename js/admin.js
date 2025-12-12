/** 💡 Utility Functions 💡 */

// Hides all menu item active states (removes highlighting)
function removeActiveState() {
    const activeItems = document.querySelectorAll('.convocatoria-content-item, .gestion-torneo-content-item');
    activeItems.forEach(item => {
        item.classList.remove('active-menu-item');
    });
}

// Function to execute scripts from loaded HTML
function executeScripts(container, basePath) {
    const scripts = container.querySelectorAll('script');
    
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        
        // Mark script as dynamically loaded
        newScript.setAttribute('data-dynamic-script', 'true');
        
        // Copy all attributes
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy inline script content or handle external scripts
        if (oldScript.src) {
            // External script - adjust relative paths
            let scriptSrc = oldScript.src;
            
            // If it's a relative path (not starting with http:// or https:// or /)
            if (!scriptSrc.match(/^(https?:)?\/\//i) && scriptSrc.includes('../')) {
                // Extract just the filename part after ../../
                const pathParts = scriptSrc.split('/');
                const filename = pathParts[pathParts.length - 1];
                const folder = pathParts[pathParts.length - 2];
                
                // Reconstruct the path from the root
                scriptSrc = `${folder}/${filename}`;
            }
            
            newScript.src = scriptSrc;
            console.log('[SCRIPT LOADING] Adjusted path:', scriptSrc);
        } else {
            // Inline script - wrap in IIFE to avoid variable collisions
            newScript.textContent = `(function() { ${oldScript.textContent} })();`;
        }
        
        // Replace old script with new one to trigger execution
        oldScript.parentNode.replaceChild(newScript, oldScript);
        
        // Store reference to remove it later
        loadedScripts.push(newScript);
    });
}

// Store loaded scripts to remove them later
let loadedScripts = [];

// Function to remove previously loaded dynamic scripts
function removePreviousScripts() {
    loadedScripts.forEach(script => {
        if (script && script.parentNode) {
            script.parentNode.removeChild(script);
        }
    });
    loadedScripts = [];
    console.log('[CLEANUP] Scripts anteriores removidos');
}

// Function to fetch and load HTML content into the main container
async function loadContent(path, mainContentArea) {
    if (!mainContentArea) {
        console.error("Critical Error: Main content container with id='content' not found.");
        return;
    }

    try {
        // Remove previous scripts before loading new content
        removePreviousScripts();
        
        // Show a loading message and make the container visible
        mainContentArea.innerHTML = '<div style="text-align: center; padding: 20px;">Cargando...</div>';
        mainContentArea.style.display = 'block';

        // Fetch the HTML content
        const response = await fetch(path);
       
        if (!response.ok) {
            // Check specifically for 404 error if the partial file doesn't exist
            if (response.status === 404) {
                throw new Error(`404: Archivo no encontrado. Asegúrate de que existe ${path}`);
            }
            throw new Error(`HTTP error! Estado: ${response.status}`);
        }

        const htmlContent = await response.text();

        // Insert the loaded HTML into the main content container
        mainContentArea.innerHTML = htmlContent;
        
        // Execute any scripts that were in the loaded HTML
        executeScripts(mainContentArea, path);
       
    } catch (error) {
        console.error(`Error al cargar el contenido desde ${path}:`, error);
        mainContentArea.innerHTML = `<p style="color: red; padding: 20px;">Error al cargar el contenido. Ver consola para más detalles.</p>`;
    }
}

/** 🎯 Main Setup Function 🎯 */

function setupListeners() {
    const mainContentArea = document.getElementById("content");

    // Define all menu items and their data
    const allMenuItems = [
        // Convocatoria Items
        { id: 'gestionar-perfil', description: 'Gestionar Perfil' },
        { id: 'gestionar-solicitudes', description: 'Gestionar Solicitudes' },
        { id: 'comunicacion-con-capitanes', description: 'Comunicación con Capitanes' },
        { id: 'generar-calendario', description: 'Generar Calendario' },

        // Gestión del Torneo Items
        { id: 'torneos', description: 'Torneos' },
        { id: 'equipos', description: 'Equipos' },
        { id: 'capturar-resultados', description: 'Capturar Resultados' },
        { id: 'publicar-anuncio', description: 'Publicar Anuncio' },
        { id: 'solicitudes', description: 'Solicitudes' },
        { id: 'contacto', description: 'Contacto' },
        { id: 'jornadas', description: 'Jornadas' },
        { id: 'eliminatoria', description: 'Eliminatoria' }
    ];

    allMenuItems.forEach(item => {
        const element = document.getElementById(item.id);

        if (element) {
            element.addEventListener('click', function (event) {
                event.preventDefault(); // Prevent any default link behavior if element was an anchor

                const itemId = item.id;

                // 1. Construct the path (e.g., 'admin-pages/publicar-convocatoria.html')
                const contentPath = `admin-pages/${itemId}.html`;

                console.log(`[MENU CLICKED] Item: ${item.description}`);
                console.log(`[PATH REQUESTED] Loading content from: ${contentPath}`);

                // 2. Load the external content into the main #content container
                loadContent(contentPath, mainContentArea);

                // 3. Logic for Active State Styling
                removeActiveState();
                element.classList.add('active-menu-item'); // Highlight the clicked item
            });
        }
    });

    // Optional: Load a default content page on initial load (e.g., the first item)
    const defaultItemId = 'gestionar-solicitudes';
    const defaultPath = `admin-pages/${defaultItemId}.html`;
    loadContent(defaultPath, mainContentArea);

    // Highlight the default item
    const defaultElement = document.getElementById(defaultItemId);
    if (defaultElement) {
        removeActiveState();
        defaultElement.classList.add('active-menu-item');
    }
}

document.addEventListener('DOMContentLoaded', setupListeners);