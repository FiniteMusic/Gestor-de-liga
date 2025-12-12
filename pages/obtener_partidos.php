<?php
/**
 * Script para obtener los partidos del equipo del capitán
 */

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Incluir archivo de conexión a la base de datos
require_once 'db_conexion.php';

// Configurar headers para JSON
header('Content-Type: application/json');

try {
    // Verificar que el usuario esté autenticado
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario no autenticado'
        ]);
        exit;
    }

    $userId = $_SESSION['user_id'];

    // Obtener conexión a la base de datos
    $pdo = getDBConnection();

    // Preparar la consulta SQL
    $sql = "
        SELECT 
            p.id AS id_partido,
            j.numero_jornada,
            j.nombre AS jornada,
            p.fecha_partido,
            DATE(p.fecha_partido) AS dia,
            TIME(p.fecha_partido) AS hora,
            p.lugar,
            el.nombre AS equipo_local,
            ev.nombre AS equipo_visitante,
            p.estado,
            
            CASE 
                WHEN el.id = e.id THEN ev.nombre
                ELSE el.nombre
            END AS rival
            
        FROM equipos e
        JOIN partidos p 
            ON p.id_equipo_local = e.id 
            OR p.id_equipo_visitante = e.id
        JOIN jornadas j 
            ON p.id_jornada = j.id
        JOIN equipos el ON p.id_equipo_local = el.id
        JOIN equipos ev ON p.id_equipo_visitante = ev.id
        WHERE e.id_capitan = :user_id
        ORDER BY p.fecha_partido
    ";

    // Preparar y ejecutar la consulta
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();

    // Obtener todos los resultados
    $partidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Responder con los datos
    echo json_encode([
        'success' => true,
        'partidos' => $partidos,
        'total' => count($partidos)
    ]);

} catch (PDOException $e) {
    // Error de base de datos
    error_log("Error en obtener_partidos.php: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error al consultar la base de datos'
    ]);

} catch (Exception $e) {
    // Otros errores
    error_log("Error general en obtener_partidos.php: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor'
    ]);
}
?>