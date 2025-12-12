<?php
session_start();
require_once 'db_conexion.php';

// Validación de sesión
if (!isset($_SESSION['user_id']) || $_SESSION['rol'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'obtener_equipos_inscritos':
            $id_torneo = $_POST['id_torneo'] ?? null;
            
            if (!$id_torneo) {
                throw new Exception('ID de torneo requerido');
            }
            
            $stmt = $pdo->prepare("
                SELECT 
                    e.id,
                    e.nombre,
                    e.estado,
                    u.nombre AS capitan,
                    u.email AS email_capitan,
                    e.fecha_inscripcion
                FROM equipos e
                INNER JOIN usuarios u ON e.id_capitan = u.id
                WHERE e.id_torneo = :id_torneo 
                AND e.estado IN ('preinscrito', 'confirmado')
                ORDER BY e.fecha_inscripcion ASC
            ");
            
            $stmt->execute(['id_torneo' => $id_torneo]);
            $equipos = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'equipos' => $equipos,
                'total' => count($equipos)
            ]);
            break;
            
        case 'generar_calendario':
            $id_torneo = $_POST['id_torneo'] ?? null;
            $fecha_inicio = $_POST['fecha_inicio'] ?? null;
            
            if (!$id_torneo || !$fecha_inicio) {
                throw new Exception('Faltan datos requeridos');
            }
            
            // Validar que la fecha sea un lunes
            $fecha = new DateTime($fecha_inicio);
            if ($fecha->format('N') != 1) {
                throw new Exception('La fecha de inicio debe ser un lunes');
            }
            
            // Validar que no existan jornadas previas
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM jornadas WHERE id_torneo = :id_torneo");
            $stmt->execute(['id_torneo' => $id_torneo]);
            $jornadas_existentes = $stmt->fetchColumn();
            
            if ($jornadas_existentes > 0) {
                throw new Exception('Ya existen jornadas para este torneo. Elimínelas primero si desea regenerar el calendario.');
            }
            
            // Llamar al procedimiento almacenado
            $stmt = $pdo->prepare("CALL sp_generar_calendario_completo(:id_torneo, :fecha_inicio)");
            $stmt->execute([
                'id_torneo' => $id_torneo,
                'fecha_inicio' => $fecha_inicio
            ]);
            $stmt->closeCursor();
            $resultado = $stmt->fetch();
            
            // Obtener estadísticas del calendario generado
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(DISTINCT j.id) as total_jornadas,
                    COUNT(p.id) as total_partidos
                FROM jornadas j
                LEFT JOIN partidos p ON j.id = p.id_jornada
                WHERE j.id_torneo = :id_torneo
            ");
            $stmt->execute(['id_torneo' => $id_torneo]);
            $stats = $stmt->fetch();
            
            echo json_encode([
                'success' => true,
                'message' => 'Calendario generado exitosamente',
                'estadisticas' => $stats
            ]);
            break;
            
        case 'obtener_torneos_activos':
            $stmt = $pdo->query("
                SELECT 
                    id,
                    nombre,
                    temporada,
                    tipo_futbol,
                    estado,
                    (SELECT COUNT(*) FROM equipos WHERE id_torneo = torneos.id AND estado IN ('preinscrito', 'confirmado')) as num_equipos
                FROM torneos
                WHERE estado IN ('inactivo', 'inscripcion')
                ORDER BY fecha_creacion DESC
            ");
            
            $torneos = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'torneos' => $torneos
            ]);
            break;
            
        case 'eliminar_calendario':
            $id_torneo = $_POST['id_torneo'] ?? null;
            
            if (!$id_torneo) {
                throw new Exception('ID de torneo requerido');
            }
            
            $pdo->beginTransaction();
            
            // Eliminar partidos primero
            $stmt = $pdo->prepare("
                DELETE p FROM partidos p
                INNER JOIN jornadas j ON p.id_jornada = j.id
                WHERE j.id_torneo = :id_torneo
            ");
            $stmt->execute(['id_torneo' => $id_torneo]);
            
            // Eliminar jornadas
            $stmt = $pdo->prepare("DELETE FROM jornadas WHERE id_torneo = :id_torneo");
            $stmt->execute(['id_torneo' => $id_torneo]);
            
            // Resetear estado del torneo
            $stmt = $pdo->prepare("
                UPDATE torneos 
                SET estado = 'inscripcion', fecha_inicio = NULL 
                WHERE id = :id_torneo
            ");
            $stmt->execute(['id_torneo' => $id_torneo]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Calendario eliminado exitosamente'
            ]);
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>