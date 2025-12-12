<?php
session_start();
session_unset();
session_destroy();
header('Location: login.html'); // redirige a la página de login (puedes cambiar la ruta si quieres)
exit();
?>