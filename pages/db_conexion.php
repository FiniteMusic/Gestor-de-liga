<?php
/**
 * Archivo de conexión a la base de datos ESCOM LEAGUE *
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'escom_league');
define('DB_USER', 'root');  
define('DB_PASS', '');      

/**
 * Devuelve un objeto PDO listo para usarse.
 * Lanza una excepción en caso de error de conexión.
 */
function getDBConnection() {
    // Opciones para Mejor Seguridad y Manejo de Errores
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // En producción, registra el error en vez de mostrarlo
        die('Error de conexión a la base de datos: ' . $e->getMessage());
    }
}
?>