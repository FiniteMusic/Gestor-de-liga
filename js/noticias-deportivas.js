// noticias-deportivas.js
// Configuración de la API
const NEWS_API_KEY = '38b7bbbdce2348f5b70827fbdddf8d4f'; // Obtén tu API key en https://newsapi.org/register
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

// Función para obtener noticias de fútbol
async function obtenerNoticiasDeportivas() {
    const noticiasContainer = document.getElementById('noticias-container');
    const loadingIndicator = document.getElementById('noticias-loading');
    const errorMessage = document.getElementById('noticias-error');

    // Mostrar indicador de carga
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    noticiasContainer.innerHTML = '';

    try {
        // Calcular fecha de hace 7 días
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        const fechaDesde = hace7Dias.toISOString().split('T')[0];

        // Parámetros de búsqueda
        const params = new URLSearchParams({
            q: 'fútbol OR soccer OR Champions League OR Liga MX OR Premier League',
            language: 'es',
            sortBy: 'publishedAt',
            pageSize: 6,
            from: fechaDesde,
            apiKey: NEWS_API_KEY
        });

        const response = await fetch(`${NEWS_API_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        // Ocultar indicador de carga
        loadingIndicator.style.display = 'none';

        if (data.articles && data.articles.length > 0) {
            mostrarNoticias(data.articles);
        } else {
            noticiasContainer.innerHTML = '<p class="no-news">No se encontraron noticias deportivas recientes.</p>';
        }
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Error al cargar las noticias. Por favor, verifica tu API key.';
    }
}

// Función para mostrar las noticias en el DOM
function mostrarNoticias(articulos) {
    const noticiasContainer = document.getElementById('noticias-container');
    noticiasContainer.innerHTML = '';

    articulos.forEach(articulo => {
        // Validar que el artículo tenga información básica
        if (!articulo.title || articulo.title === '[Removed]') return;

        const noticiaCard = document.createElement('div');
        noticiaCard.className = 'noticia-card';

        // Imagen de la noticia (usar placeholder si no hay imagen)
        const imagenUrl = articulo.urlToImage || 'https://via.placeholder.com/400x250?text=Sin+Imagen';
        
        // Formatear fecha
        const fecha = new Date(articulo.publishedAt);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        // Limitar descripción a 120 caracteres
        const descripcion = articulo.description 
            ? (articulo.description.length > 120 
                ? articulo.description.substring(0, 120) + '...' 
                : articulo.description)
            : 'Sin descripción disponible';

        noticiaCard.innerHTML = `
            <div class="noticia-imagen" style="background-image: url('${imagenUrl}');">
                <div class="noticia-fuente">${articulo.source.name || 'Fuente desconocida'}</div>
            </div>
            <div class="noticia-contenido">
                <h3 class="noticia-titulo">${articulo.title}</h3>
                <p class="noticia-descripcion">${descripcion}</p>
                <div class="noticia-footer">
                    <span class="noticia-fecha">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${fechaFormateada}
                    </span>
                    <a href="${articulo.url}" target="_blank" rel="noopener noreferrer" class="noticia-link">
                        Leer más
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            </div>
        `;

        noticiasContainer.appendChild(noticiaCard);
    });
}

// Función para refrescar noticias
function refrescarNoticias() {
    obtenerNoticiasDeportivas();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Cargar noticias al inicio
    obtenerNoticiasDeportivas();

    // Agregar evento al botón de refrescar
    const btnRefrescar = document.getElementById('btn-refrescar-noticias');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', refrescarNoticias);
    }
});