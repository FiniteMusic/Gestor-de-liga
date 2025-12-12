<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Validar que el usuario esté autenticado
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'No autorizado. Por favor, inicia sesión.'
    ]);
    exit();
}

// Incluir archivo de conexión a la base de datos
require_once('db_conexion.php');

try {
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();
    
    // ID del capitán desde la sesión
    $id_capitan = $_SESSION['user_id'];
    
    // Query para obtener información del equipo del capitán
    // Nota: Se removió la coma extra que había en tu query original
    $query = "
        SELECT 
            e.id,
            e.nombre AS nombre_equipo,
            e.estado,
            e.fecha_inscripcion,
            e.fecha_confirmacion,
            e.notas,
            u.nombre AS nombre_capitan,
            u.email AS email_capitan,
            u.telefono AS telefono_capitan,
            t.nombre AS nombre_torneo,
            t.id AS id_torneo
        FROM equipos e
        INNER JOIN usuarios u ON e.id_capitan = u.id
        INNER JOIN torneos t ON e.id_torneo = t.id
        WHERE e.id_capitan = :id_capitan
        ORDER BY e.fecha_inscripcion DESC
        LIMIT 1
    ";
    
    // Preparar y ejecutar la consulta
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id_capitan', $id_capitan, PDO::PARAM_INT);
    $stmt->execute();
    
    // Obtener resultado
    $equipo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($equipo) {
        // El capitán tiene un equipo registrado
        echo json_encode([
            'success' => true,
            'equipo' => $equipo,
            'message' => 'Equipo encontrado'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // El capitán no tiene equipo registrado
        echo json_encode([
            'success' => true,
            'equipo' => null,
            'message' => 'No se encontró ningún equipo registrado para este capitán'
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (PDOException $e) {
    // Error de base de datos
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al consultar la base de datos',
        'error' => $e->getMessage() // En producción, no mostrar este detalle
    ], JSON_UNESCAPED_UNICODE);
    
    // Log del error (en producción deberías usar un sistema de logs apropiado)
    error_log("Error en get-estatus-equipo.php: " . $e->getMessage());
    
} catch (Exception $e) {
    // Otros errores
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor',
        'error' => $e->getMessage() // En producción, no mostrar este detalle
    ], JSON_UNESCAPED_UNICODE);
    
    error_log("Error general en get-estatus-equipo.php: " . $e->getMessage());
}
?>