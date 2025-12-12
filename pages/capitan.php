<?php
session_start();
// Validación básica de sesión
if (!isset($_SESSION['user_id'])) {
    header('Location: login.html');
    exit();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liga Deportiva - Capitan</title>
    <link rel="icon" href="../img/logo.png" type="image/png">
    <link rel="stylesheet" href="../css/admin.css">
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/boostrap.css">
    <link rel="stylesheet" href="../css/responsive.css">
</head>
<body>
<nav class="navbar">
    <div class="container-nav">
        <div class="logo">
            <img src="../img/logo.png" alt="Logo" class="logo-img">
            <span class="logo-text">Sports League</span>
        </div>
        <ul class="nav-links">
            <li><a href="#" id="link-admin" class="active">Panel de Capitan</a></li>
            <li><a href="logout.php" id="link-logout">Log Out</a></li>
        </ul>
        <div class="toggle-container">
            <label class="toggle-switch">
                <input type="checkbox" id="darkModeToggle">
                <span class="slider"></span>
            </label>
        </div>
    </div>
</nav>



<div class="admin-container">
    <section id="pantalla-admin" class="pantalla admin-pantalla">
        <div class="grid-1-5 grid-gap-3">
            <div class="controles d-flex flex-column">
                <div class="gestion-torneo">
                    <div class="gestion-torneo-title d-flex flex-column align-center">
                        <h1>GESTIÓN DEL</h1>
                        <h1>EQUIPO</h1>
                    </div>
                    <div class="gestion-torneo-content grid-2x4">
                        <div class="gestion-torneo-content-item">
                            <div class="gestion-torneo-content-item-icon">
                                <!-- EQUIPOS SVG -->
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="12" fill="none" overflow="visible">
                                    <path d="M 0 12 L 0 10.425 C 0 9.708 0.367 9.125 1.1 8.675 C 1.833 8.225 2.8 8 4 8 C 4.217 8 4.425 8.004 4.625 8.013 C 4.825 8.021 5.017 8.042 5.2 8.075 C 4.967 8.425 4.792 8.792 4.675 9.175 C 4.558 9.558 4.5 9.958 4.5 10.375 L 4.5 12 Z M 6 12 L 6 10.375 C 6 9.842 6.146 9.354 6.438 8.913 C 6.729 8.471 7.142 8.083 7.675 7.75 C 8.208 7.417 8.846 7.167 9.588 7 C 10.329 6.833 11.133 6.75 12 6.75 C 12.883 6.75 13.696 6.833 14.438 7 C 15.179 7.167 15.817 7.417 16.35 7.75 C 16.883 8.083 17.292 8.471 17.575 8.913 C 17.858 9.354 18 9.842 18 10.375 L 18 12 Z M 19.5 12 L 19.5 10.375 C 19.5 9.942 19.446 9.533 19.338 9.15 C 19.229 8.767 19.067 8.408 18.85 8.075 C 19.033 8.042 19.221 8.021 19.413 8.013 C 19.604 8.004 19.8 8 20 8 C 21.2 8 22.167 8.221 22.9 8.663 C 23.633 9.104 24 9.692 24 10.425 L 24 12 Z M 8.125 10 L 15.9 10 C 15.733 9.667 15.271 9.375 14.512 9.125 C 13.754 8.875 12.917 8.75 12 8.75 C 11.083 8.75 10.246 8.875 9.488 9.125 C 8.729 9.375 8.275 9.667 8.125 10 Z M 4 7 C 3.45 7 2.979 6.804 2.588 6.413 C 2.196 6.021 2 5.55 2 5 C 2 4.433 2.196 3.958 2.588 3.575 C 2.979 3.192 3.45 3 4 3 C 4.567 3 5.042 3.192 5.425 3.575 C 5.808 3.958 6 4.433 6 5 C 6 5.55 5.808 6.021 5.425 6.413 C 5.042 6.804 4.567 7 4 7 Z M 20 7 C 19.45 7 18.979 6.804 18.587 6.413 C 18.196 6.021 18 5.55 18 5 C 18 4.433 18.196 3.958 18.587 3.575 C 18.979 3.192 19.45 3 20 3 C 20.567 3 21.042 3.192 21.425 3.575 C 21.808 3.958 22 4.433 22 5 C 22 5.55 21.808 6.021 21.425 6.413 C 21.042 6.804 20.567 7 20 7 Z M 12 6 C 11.167 6 10.458 5.708 9.875 5.125 C 9.292 4.542 9 3.833 9 3 C 9 2.15 9.292 1.438 9.875 0.863 C 10.458 0.287 11.167 0 12 0 C 12.85 0 13.563 0.288 14.137 0.863 C 14.712 1.438 15 2.15 15 3 C 15 3.833 14.712 4.542 14.137 5.125 C 13.563 5.708 12.85 6 12 6 Z M 12 4 C 12.283 4 12.521 3.904 12.712 3.712 C 12.904 3.521 13 3.283 13 3 C 13 2.717 12.904 2.479 12.712 2.288 C 12.521 2.096 12.283 2 12 2 C 11.717 2 11.479 2.096 11.288 2.288 C 11.096 2.479 11 2.717 11 3 C 11 3.283 11.096 3.521 11.288 3.712 C 11.479 3.904 11.717 4 12 4 Z M 12.025 10 M 12 3" fill="currentColor"></path>
                                </svg>
                            </div>
                            <div class="gestion-torneo-content-item-description">
                                INSCRIBIR EQUIPO
                            </div>
                        </div>
                        <div class="gestion-torneo-content-item">
                            <div class="gestion-torneo-content-item-icon">
                                <!-- TORNEOS SVG -->
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" overflow="visible">
                                    <path d="M 4 18 L 4 16 L 8 16 L 8 12.9 C 7.183 12.717 6.454 12.371 5.813 11.862 C 5.171 11.354 4.7 10.717 4.4 9.95 C 3.15 9.8 2.104 9.254 1.263 8.313 C 0.421 7.371 0 6.267 0 5 L 0 4 C 0 3.45 0.196 2.979 0.588 2.588 C 0.979 2.196 1.45 2 2 2 L 4 2 L 4 0 L 14 0 L 14 2 L 16 2 C 16.55 2 17.021 2.196 17.412 2.588 C 17.804 2.979 18 3.45 18 4 L 18 5 C 18 6.267 17.579 7.371 16.737 8.313 C 15.896 9.254 14.85 9.8 13.6 9.95 C 13.3 10.717 12.829 11.354 12.188 11.862 C 11.546 12.371 10.817 12.717 10 12.9 L 10 16 L 14 16 L 14 18 Z M 4 7.8 L 4 4 L 2 4 L 2 5 C 2 5.633 2.183 6.204 2.55 6.712 C 2.917 7.221 3.4 7.583 4 7.8 Z M 9 11 C 9.833 11 10.542 10.708 11.125 10.125 C 11.708 9.542 12 8.833 12 8 L 12 2 L 6 2 L 6 8 C 6 8.833 6.292 9.542 6.875 10.125 C 7.458 10.708 8.167 11 9 11 Z M 14 7.8 C 14.6 7.583 15.083 7.221 15.45 6.712 C 15.817 6.204 16 5.633 16 5 L 16 4 L 14 4 Z M 9 6.5" fill="currentColor"></path>
                                </svg>
                            </div>
                            <div class="gestion-torneo-content-item-description">
                                ESTATUS DE INSCRIPCION
                            </div>
                        </div>
                        
                       
                        
                        <div class="gestion-torneo-content-item">
                            <div class="gestion-torneo-content-item-icon">
                                <!-- CONTACTO SVG -->
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" fill="none" overflow="visible">
                                    <path d="M 2 16 C 1.45 16 0.979 15.804 0.588 15.412 C 0.196 15.021 0 14.55 0 14 L 0 2 C 0 1.45 0.196 0.979 0.588 0.588 C 0.979 0.196 1.45 0 2 0 L 18 0 C 18.55 0 19.021 0.196 19.413 0.588 C 19.804 0.979 20 1.45 20 2 L 20 14 C 20 14.55 19.804 15.021 19.413 15.412 C 19.021 15.804 18.55 16 18 16 Z M 10 9 L 2 4 L 2 14 L 18 14 L 18 4 Z M 10 7 L 18 2 L 2 2 Z M 2 4 L 2 2 L 2 14 Z" fill="currentColor"></path>
                                </svg>
                            </div>
                            <div class="gestion-torneo-content-item-description">
                                CONTACTO
                            </div>
                        </div>
                        <div class="gestion-torneo-content-item">
                            <div class="gestion-torneo-content-item-icon">
                                <!-- JORNADAS SVG -->
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" overflow="visible">
                                    <path d="M 8.35 17.8 L 8.65 16.4 C 8.7 16.183 8.804 16.004 8.963 15.863 C 9.121 15.721 9.317 15.633 9.55 15.6 L 12.65 15.35 C 12.867 15.317 13.067 15.358 13.25 15.475 C 13.433 15.592 13.567 15.75 13.65 15.95 L 14.05 16.9 C 14.7 16.517 15.283 16.054 15.8 15.512 C 16.317 14.971 16.75 14.367 17.1 13.7 L 16.8 13.55 C 16.617 13.417 16.483 13.254 16.4 13.063 C 16.317 12.871 16.3 12.667 16.35 12.45 L 17.05 9.4 C 17.1 9.2 17.204 9.033 17.363 8.9 C 17.521 8.767 17.7 8.683 17.9 8.65 C 17.817 8.233 17.713 7.829 17.588 7.438 C 17.463 7.046 17.3 6.667 17.1 6.3 C 16.95 6.383 16.788 6.421 16.613 6.412 C 16.438 6.404 16.283 6.35 16.15 6.25 L 13.5 4.65 C 13.317 4.533 13.183 4.375 13.1 4.175 C 13.017 3.975 13 3.767 13.05 3.55 L 13.25 2.7 C 12.733 2.467 12.204 2.292 11.662 2.175 C 11.121 2.058 10.567 2 10 2 C 9.767 2 9.525 2.012 9.275 2.037 C 9.025 2.063 8.783 2.1 8.55 2.15 L 9.3 3.85 C 9.383 4.05 9.404 4.258 9.363 4.475 C 9.321 4.692 9.217 4.867 9.05 5 L 6.7 7.05 C 6.533 7.2 6.338 7.283 6.113 7.3 C 5.887 7.317 5.683 7.267 5.5 7.15 L 3.2 5.75 C 2.817 6.383 2.521 7.063 2.313 7.787 C 2.104 8.512 2 9.25 2 10 C 2 10.267 2.033 10.7 2.1 11.3 L 4.3 11.1 C 4.533 11.067 4.746 11.104 4.938 11.213 C 5.129 11.321 5.267 11.483 5.35 11.7 L 6.55 14.55 C 6.633 14.75 6.654 14.958 6.613 15.175 C 6.571 15.392 6.467 15.567 6.3 15.7 L 5.35 16.5 C 5.8 16.833 6.279 17.108 6.787 17.325 C 7.296 17.542 7.817 17.7 8.35 17.8 Z M 10.15 13.5 C 9.933 13.533 9.733 13.492 9.55 13.375 C 9.367 13.258 9.233 13.1 9.15 12.9 L 7.8 9.8 C 7.717 9.6 7.704 9.392 7.763 9.175 C 7.821 8.958 7.933 8.783 8.1 8.65 L 10.65 6.5 C 10.8 6.35 10.983 6.267 11.2 6.25 C 11.417 6.233 11.617 6.283 11.8 6.4 L 14.6 8.05 C 14.783 8.167 14.925 8.325 15.025 8.525 C 15.125 8.725 15.15 8.933 15.1 9.15 L 14.3 12.4 C 14.25 12.617 14.15 12.796 14 12.938 C 13.85 13.079 13.667 13.167 13.45 13.2 Z M 10 20 C 8.617 20 7.317 19.738 6.1 19.213 C 4.883 18.688 3.825 17.975 2.925 17.075 C 2.025 16.175 1.312 15.117 0.787 13.9 C 0.263 12.683 0 11.383 0 10 C 0 8.617 0.262 7.317 0.787 6.1 C 1.313 4.883 2.025 3.825 2.925 2.925 C 3.825 2.025 4.883 1.312 6.1 0.787 C 7.317 0.263 8.617 0 10 0 C 11.383 0 12.683 0.262 13.9 0.787 C 15.117 1.313 16.175 2.025 17.075 2.925 C 17.975 3.825 18.688 4.883 19.213 6.1 C 19.737 7.317 20 8.617 20 10 C 20 11.383 19.738 12.683 19.213 13.9 C 18.688 15.117 17.975 16.175 17.075 17.075 C 16.175 17.975 15.117 18.688 13.9 19.213 C 12.683 19.737 11.383 20 10 20 Z" fill="currentColor"></path>
                                </svg>
                            </div>
                            <div class="gestion-torneo-content-item-description">
                                JORNADAS
                            </div>
                        </div>
                        <div class="gestion-torneo-content-item">
                            <div class="gestion-torneo-content-item-icon">
                                <!-- PERFIL SVG -->
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8zm0 10c-4.4 0-8 2.24-8 5v1h16v-1c0-2.76-3.6-5-8-5z"/>
                                    </svg>
                            </div>
                            <div class="gestion-torneo-content-item-description">
                                PERFIL
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="content">
                Aquí irá contenido dinámico
            </div>
        </div>
    </section>
</div>

<script src="../js/scrip.js"></script>
<script src="../js/changeScreen.js"></script>
<script src="../js/capitan.js"></script>
</body>
</html>