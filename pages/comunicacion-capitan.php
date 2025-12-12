<?php
/**
 * API para gestión de equipos
 * Maneja las solicitudes AJAX para visualizar equipos registrados
 */

header('Content-Type: application/json');
require_once 'db_conexion.php';

// Función para enviar respuesta JSON
function sendResponse($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}

// Obtener la acción solicitada
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'getEquipos':
            getEquipos($pdo);
            break;
            
        case 'getTorneos':
            getTorneos($pdo);
            break;
            
        default:
            sendResponse(false, null, 'Acción no válida');
    }
    
} catch (Exception $e) {
    sendResponse(false, null, 'Error del servidor: ' . $e->getMessage());
}

/**
 * Obtiene todos los equipos con información de capitán y torneo
 */
function getEquipos($pdo) {
    try {
        $sql = "SELECT 
                    e.id,
                    e.nombre,
                    e.estado,
                    e.id_torneo,
                    e.fecha_inscripcion,
                    e.fecha_confirmacion,
                    t.nombre AS torneo_nombre,
                    t.temporada AS torneo_temporada,
                    t.tipo_futbol,
                    u.nombre AS capitan_nombre,
                    u.email,
                    u.telefono
                FROM equipos e
                INNER JOIN torneos t ON e.id_torneo = t.id
                INNER JOIN usuarios u ON e.id_capitan = u.id
                ORDER BY 
                    CASE e.estado
                        WHEN 'confirmado' THEN 1
                        WHEN 'preinscrito' THEN 2
                        WHEN 'eliminado' THEN 3
                        WHEN 'descalificado' THEN 4
                    END,
                    e.nombre ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $equipos = $stmt->fetchAll();
        
        sendResponse(true, ['equipos' => $equipos], 'Equipos cargados correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al obtener equipos: ' . $e->getMessage());
    }
}

/**
 * Obtiene la lista de torneos disponibles
 */
function getTorneos($pdo) {
    try {
        $sql = "SELECT 
                    id,
                    nombre,
                    temporada,
                    tipo_futbol,
                    estado
                FROM torneos
                ORDER BY fecha_creacion DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $torneos = $stmt->fetchAll();
        
        sendResponse(true, ['torneos' => $torneos], 'Torneos cargados correctamente');
        
    } catch (PDOException $e) {
        sendResponse(false, null, 'Error al obtener torneos: ' . $e->getMessage());
    }
}
?>