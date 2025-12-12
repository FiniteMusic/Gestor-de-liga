document.addEventListener("DOMContentLoaded", () => {
    let anuncios = []; // Array de todos los anuncios
    let indiceActual = 0; // Índice del anuncio actual
    let anuncioMostradoHoy = false;
    const hoy = new Date().toDateString();
    
    // Verificar si ya se mostró hoy
    try {
        const ultimaFecha = sessionStorage.getItem("anuncio_fecha");
        if (ultimaFecha === hoy) {
            anuncioMostradoHoy = true;
            return;
        }
    } catch (e) {
        console.log("SessionStorage no disponible, continuando...");
    }

    if (anuncioMostradoHoy) return;

    // Obtener todos los anuncios
    fetch("pages/anuncio.php")
        .then(r => {
            if (!r.ok) throw new Error('Error en la respuesta del servidor');
            return r.json();
        })
        .then(data => {
            if (data.status !== "ok") return;

            anuncios = data.anuncios; // Guardar todos los anuncios
            
            if (anuncios.length === 0) return;

            // Mostrar el primer anuncio
            mostrarAnuncio(0);

            // Mostrar modal con animación
            const modal = document.getElementById("modalAnuncio");
            modal.style.display = "flex";
            
            setTimeout(() => {
                modal.classList.add("active");
            }, 10);

            // Actualizar visibilidad de las flechas
            actualizarFlechas();

            // Guardar que se mostró hoy
            try {
                sessionStorage.setItem("anuncio_fecha", hoy);
            } catch (e) {
                console.log("No se pudo guardar en sessionStorage");
            }
            anuncioMostradoHoy = true;
        })
        .catch(error => {
            console.error("Error al cargar anuncios:", error);
        });

    // Función para mostrar un anuncio específico
    function mostrarAnuncio(indice) {
        if (indice < 0 || indice >= anuncios.length) return;

        const anuncio = anuncios[indice];
        indiceActual = indice;

        // Llenar contenido
        document.getElementById("tituloAnuncio").textContent = anuncio.titulo;
        document.getElementById("contenidoAnuncio").innerHTML = anuncio.contenido;

        // Elementos
        const modalBox = document.getElementById("modalBox");
        const icono = document.getElementById("iconoAnuncio");

        // LIMPIAR clases anteriores
        modalBox.classList.remove("modal-info", "modal-urgente", "modal-suspension", "modal-cambio");

        // Aplicar estilos por tipo
        switch (anuncio.tipo) {
            case "informativo":
                modalBox.classList.add("modal-info");
                icono.textContent = "ℹ️";
                break;

            case "urgente":
                modalBox.classList.add("modal-urgente");
                icono.textContent = "⚠️";
                break;

            case "suspension":
                modalBox.classList.add("modal-suspension");
                icono.textContent = "⛔";
                break;

            case "cambio_horario":
                modalBox.classList.add("modal-cambio");
                icono.textContent = "🕒";
                break;
            
            default:
                modalBox.classList.add("modal-info");
                icono.textContent = "📢";
        }

        // Actualizar contador
        actualizarContador();
        actualizarFlechas();
    }

    // Función para actualizar el contador
    function actualizarContador() {
        const contador = document.getElementById("contadorAnuncios");
        if (anuncios.length > 1) {
            contador.textContent = `${indiceActual + 1} / ${anuncios.length}`;
            contador.style.display = "block";
        } else {
            contador.style.display = "none";
        }
    }

    // Función para actualizar visibilidad de flechas
    function actualizarFlechas() {
        const flechaAnterior = document.getElementById("flechaAnteriorAnuncio");
        const flechaSiguiente = document.getElementById("flechaSiguienteAnuncio");

        if (anuncios.length <= 1) {
            // Si solo hay 1 anuncio, ocultar las flechas
            flechaAnterior.style.display = "none";
            flechaSiguiente.style.display = "none";
        } else {
            flechaAnterior.style.display = "flex";
            flechaSiguiente.style.display = "flex";

            // Deshabilitar flechas en los extremos
            if (indiceActual === 0) {
                flechaAnterior.classList.add("disabled");
            } else {
                flechaAnterior.classList.remove("disabled");
            }

            if (indiceActual === anuncios.length - 1) {
                flechaSiguiente.classList.add("disabled");
            } else {
                flechaSiguiente.classList.remove("disabled");
            }
        }
    }

    // Navegar al anuncio anterior
    document.getElementById("flechaAnteriorAnuncio").onclick = function() {
        if (indiceActual > 0) {
            mostrarAnuncio(indiceActual - 1);
        }
    };

    // Navegar al siguiente anuncio
    document.getElementById("flechaSiguienteAnuncio").onclick = function() {
        if (indiceActual < anuncios.length - 1) {
            mostrarAnuncio(indiceActual + 1);
        }
    };

    // Cerrar modal con animación
    document.getElementById("cerrarAnuncio").onclick = function () {
        const modal = document.getElementById("modalAnuncio");
        modal.classList.remove("active");
        
        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
    };

    // Cerrar al hacer clic fuera del modal
    document.getElementById("modalAnuncio").onclick = function(e) {
        if (e.target === this) {
            document.getElementById("cerrarAnuncio").click();
        }
    };

    // Navegación con teclado (flechas izquierda/derecha)
    document.addEventListener("keydown", function(e) {
        const modal = document.getElementById("modalAnuncio");
        
        // Solo funciona si el modal está visible
        if (modal.style.display !== "flex") return;

        if (e.key === "ArrowLeft") {
            document.getElementById("flechaAnteriorAnuncio").click();
        } else if (e.key === "ArrowRight") {
            document.getElementById("flechaSiguienteAnuncio").click();
        } else if (e.key === "Escape") {
            document.getElementById("cerrarAnuncio").click();
        }
    });
});