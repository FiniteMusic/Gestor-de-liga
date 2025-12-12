<?php
/**
 * API para gestión de equipos
 * Maneja las solicitudes AJAX del módulo de equipos
 */

session_start();
header('Content-Type: application/json');

// Verificar sesión
if (!isset($_SESSION['user_id']) || $_SESSION['rol'] !== 'administrador') {
    echo json_encode([
        'success' => false,
        'message' => 'No autorizado'
    ]);
    exit();
}

// Incluir conexión a BD
require_once 'db_conexion.php';

// Obtener acción
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch($action) {
        case 'getEquipos':
            getEquipos($pdo);
            break;
            
        case 'getTorneos':
            getTorneos($pdo);
            break;
            
        case 'cambiarEstado':
            cambiarEstado($pdo);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Acción no válida'
            ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
}

/**
 * Obtener lista de equipos con información relacionada
 */
function getEquipos($pdo) {
    $query = "
        SELECT 
            e.id,
            e.nombre,
            e.estado,
            e.fecha_inscripcion,
            e.fecha_confirmacion,
            e.notas,
            e.id_torneo,
            t.nombre AS torneo_nombre,
            t.temporada AS torneo_temporada,
            t.tipo_futbol,
            u.nombre AS capitan_nombre,
            u.email AS capitan_email,
            u.telefono AS capitan_telefono
        FROM equipos e
        INNER JOIN torneos t ON e.id_torneo = t.id
        INNER JOIN usuarios u ON e.id_capitan = u.id
        ORDER BY 
            CASE e.estado
                WHEN 'preinscrito' THEN 1
                WHEN 'confirmado' THEN 2
                WHEN 'descalificado' THEN 3
                WHEN 'eliminado' THEN 4
            END,
            e.fecha_inscripcion DESC
    ";
    
    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $equipos = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'equipos' => $equipos
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener equipos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Obtener lista de torneos para filtro
 */
function getTorneos($pdo) {
    $query = "
        SELECT 
            id,
            nombre,
            temporada,
            tipo_futbol,
            estado
        FROM torneos
        WHERE estado IN ('inscripcion', 'en_curso', 'finalizado')
        ORDER BY 
            CASE estado
                WHEN 'inscripcion' THEN 1
                WHEN 'en_curso' THEN 2
                WHEN 'finalizado' THEN 3
            END,
            fecha_creacion DESC
    ";
    
    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $torneos = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'torneos' => $torneos
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener torneos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Cambiar estado de un equipo
 */
function cambiarEstado($pdo) {
    // Validar parámetros
    $id_equipo = filter_input(INPUT_POST, 'id_equipo', FILTER_VALIDATE_INT);
    $nuevo_estado = filter_input(INPUT_POST, 'nuevo_estado', FILTER_SANITIZE_STRING);
    $notas = filter_input(INPUT_POST, 'notas', FILTER_SANITIZE_STRING);
    
    if (!$id_equipo || !$nuevo_estado) {
        echo json_encode([
            'success' => false,
            'message' => 'Parámetros inválidos'
        ]);
        return;
    }
    
    // Validar estado
    $estados_validos = ['preinscrito', 'confirmado', 'descalificado', 'eliminado'];
    if (!in_array($nuevo_estado, $estados_validos)) {
        echo json_encode([
            'success' => false,
            'message' => 'Estado no válido'
        ]);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Obtener información del equipo
        $stmt = $pdo->prepare("
            SELECT e.nombre, e.estado, t.nombre AS torneo
            FROM equipos e
            INNER JOIN torneos t ON e.id_torneo = t.id
            WHERE e.id = :id
        ");
        $stmt->execute([':id' => $id_equipo]);
        $equipo = $stmt->fetch();
        
        if (!$equipo) {
            throw new Exception('Equipo no encontrado');
        }
        
        // Preparar datos de actualización
        $updateData = [
            'estado' => $nuevo_estado,
            'id' => $id_equipo
        ];
        
        $updateFields = "estado = :estado";
        
        // Si se confirma, agregar fecha de confirmación
        if ($nuevo_estado === 'confirmado') {
            $updateFields .= ", fecha_confirmacion = CURRENT_TIMESTAMP";
        }
        
        // Agregar notas si se proporcionan
        if (!empty($notas)) {
            $updateFields .= ", notas = :notas";
            $updateData['notas'] = $notas;
        }
        
        // Actualizar equipo
        $query = "UPDATE equipos SET $updateFields WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->execute($updateData);
        
        // Si el equipo se descalifica o elimina después de estar confirmado,
        // recalcular estadísticas del torneo
        if ($equipo['estado'] === 'confirmado' && in_array($nuevo_estado, ['descalificado', 'eliminado'])) {
            $stmt = $pdo->prepare("
                SELECT id_torneo FROM equipos WHERE id = :id
            ");
            $stmt->execute([':id' => $id_equipo]);
            $id_torneo = $stmt->fetchColumn();
            
            if ($id_torneo) {
                // Llamar al procedimiento de recalcular estadísticas
                $stmt = $pdo->prepare("CALL sp_recalcular_estadisticas_torneo(:id_torneo)");
                $stmt->execute([':id_torneo' => $id_torneo]);
            }
        }
        
        $pdo->commit();
        
        // Mensaje de éxito personalizado
        $mensajes = [
            'confirmado' => "Equipo '{$equipo['nombre']}' confirmado exitosamente",
            'descalificado' => "Equipo '{$equipo['nombre']}' descalificado",
            'eliminado' => "Equipo '{$equipo['nombre']}' eliminado del sistema",
            'preinscrito' => "Equipo '{$equipo['nombre']}' marcado como preinscrito"
        ];
        
        echo json_encode([
            'success' => true,
            'message' => $mensajes[$nuevo_estado] ?? 'Estado actualizado correctamente'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode([
            'success' => false,
            'message' => 'Error al cambiar estado: ' . $e->getMessage()
        ]);
    }
}
?>