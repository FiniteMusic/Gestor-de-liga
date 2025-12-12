<?php
/**
 * Archivo para obtener equipos preinscritos y gestionar su estado
 */
require_once 'db_conexion.php';

header('Content-Type: application/json');

// Función para obtener equipos preinscritos
function obtenerEquiposPreinscritos($id_torneo = null) {
    try {
        $pdo = getDBConnection();
        
        $sql = "SELECT 
                    e.id,
                    e.nombre AS nombre_equipo,
                    e.estado,
                    e.fecha_inscripcion,
                    u.nombre AS nombre_capitan,
                    u.email AS email_capitan,
                    u.telefono AS telefono_capitan,
                    t.nombre AS nombre_torneo,
                    t.id AS id_torneo
                FROM equipos e
                INNER JOIN usuarios u ON e.id_capitan = u.id
                INNER JOIN torneos t ON e.id_torneo = t.id
                WHERE e.estado = 'preinscrito'";
        
        if ($id_torneo !== null) {
            $sql .= " AND e.id_torneo = :id_torneo";
        }
        
        $sql .= " ORDER BY e.fecha_inscripcion DESC";
        
        $stmt = $pdo->prepare($sql);
        
        if ($id_torneo !== null) {
            $stmt->bindParam(':id_torneo', $id_torneo, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        return $stmt->fetchAll();
        
    } catch (PDOException $e) {
        return ['error' => 'Error al obtener equipos: ' . $e->getMessage()];
    }
}

// Función para actualizar estado de equipo
function actualizarEstadoEquipo($id_equipo, $nuevo_estado) {
    try {
        $pdo = getDBConnection();
        
        // Validar estado permitido
        $estados_validos = ['confirmado', 'descalificado'];
        if (!in_array($nuevo_estado, $estados_validos)) {
            return ['success' => false, 'message' => 'Estado no válido'];
        }
        
        $sql = "UPDATE equipos 
                SET estado = :estado";
        
        // Si se confirma, agregar fecha de confirmación
        if ($nuevo_estado === 'confirmado') {
            $sql .= ", fecha_confirmacion = CURRENT_TIMESTAMP";
        }
        
        $sql .= " WHERE id = :id_equipo AND estado = 'preinscrito'";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':estado', $nuevo_estado, PDO::PARAM_STR);
        $stmt->bindParam(':id_equipo', $id_equipo, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return ['success' => true, 'message' => 'Estado actualizado correctamente'];
        } else {
            return ['success' => false, 'message' => 'No se pudo actualizar el equipo'];
        }
        
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Error al actualizar: ' . $e->getMessage()];
    }
}

// Manejo de peticiones
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    // Obtener equipos preinscritos
    $id_torneo = isset($_GET['id_torneo']) ? (int)$_GET['id_torneo'] : null;
    $equipos = obtenerEquiposPreinscritos($id_torneo);
    echo json_encode($equipos);
    
} elseif ($metodo === 'POST') {
    // Actualizar estado de equipo
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['id_equipo']) || !isset($data['nuevo_estado'])) {
        echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
        exit;
    }
    
    $resultado = actualizarEstadoEquipo($data['id_equipo'], $data['nuevo_estado']);
    echo json_encode($resultado);
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
?>