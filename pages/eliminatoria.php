<?php
/**
 * API para gestión de fase eliminatoria
 * Endpoints:
 * - GET get_torneos: Obtiene lista de torneos activos
 * - GET get_top8: Obtiene los 8 mejores equipos de un torneo
 * - GET check_status: Verifica si se puede generar la eliminatoria
 * - POST generar_eliminatoria: Genera la fase eliminatoria
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

// Validación de sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'No autorizado. Inicia sesión.'
    ]);
    exit();
}

// Incluir archivo de conexión
require_once('db_conexion.php');

// Obtener la acción
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'get_torneos':
            getTorneos($pdo);
            break;
            
        case 'get_top8':
            getTop8($pdo);
            break;
            
        case 'check_status':
            checkTorneoStatus($pdo);
            break;
            
        case 'generar_eliminatoria':
            generarEliminatoria($pdo);
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Acción no válida'
            ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}

/**
 * Obtiene la lista de torneos activos o en curso
 */
function getTorneos($pdo) {
    $query = "SELECT id, nombre, temporada, tipo_futbol, estado 
              FROM torneos 
              WHERE estado IN ('inscripcion', 'en_curso')
              ORDER BY fecha_creacion DESC";
    
    $stmt = $pdo->query($query);
    $torneos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'torneos' => $torneos
    ]);
}

/**
 * Obtiene el top 8 de equipos de un torneo
 */
function getTop8($pdo) {
    $torneoId = $_GET['torneo_id'] ?? null;
    $categoria = $_GET['categoria'] ?? null;
    
    if (!$torneoId) {
        echo json_encode([
            'success' => false,
            'message' => 'ID de torneo requerido'
        ]);
        return;
    }
    
    // Query base - uso :torneo_id y :torneo_id_dup para evitar error de parámetros repetidos
    $query = "SELECT 
                e.id,
                e.nombre as nombre_equipo,
                e.estado,
                u.nombre as nombre_capitan,
                u.email,
                u.telefono,
                ee.posicion,
                ee.puntos,
                ee.diferencia_goles,
                ee.goles_favor
              FROM equipos e
              INNER JOIN usuarios u ON e.id_capitan = u.id
              INNER JOIN estadisticas_equipos ee ON e.id = ee.id_equipo
              WHERE e.id_torneo = :torneo_id 
              AND e.estado = 'confirmado'
              AND ee.id_torneo = :torneo_id_dup";
    
    // Si hay filtro de categoría, agregar condición con placeholder :categoria
    if ($categoria) {
        $query .= " AND EXISTS (
                        SELECT 1 FROM torneos t 
                        WHERE t.id = e.id_torneo 
                        AND t.tipo_futbol = :categoria
                    )";
    }
    
    $query .= " ORDER BY ee.posicion ASC, ee.puntos DESC, 
                ee.diferencia_goles DESC, ee.goles_favor DESC
                LIMIT 8";
    
    $stmt = $pdo->prepare($query);
    // Enlazamos ambos placeholders del torneo
    $stmt->bindValue(':torneo_id', $torneoId, PDO::PARAM_INT);
    $stmt->bindValue(':torneo_id_dup', $torneoId, PDO::PARAM_INT);
    
    if ($categoria) {
        $stmt->bindValue(':categoria', $categoria, PDO::PARAM_STR);
    }
    
    $stmt->execute();
    $equipos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'equipos' => $equipos,
        'total' => count($equipos)
    ]);
}

/**
 * Verifica si el torneo está listo para generar eliminatoria
 */
function checkTorneoStatus($pdo) {
    $torneoId = $_GET['torneo_id'] ?? null;
    
    if (!$torneoId) {
        echo json_encode([
            'success' => false,
            'message' => 'ID de torneo requerido'
        ]);
        return;
    }
    
    // Verificar si ya existe fase eliminatoria
    $queryExiste = "SELECT COUNT(*) as total FROM fase_eliminacion WHERE id_torneo = :torneo_id";
    $stmtExiste = $pdo->prepare($queryExiste);
    $stmtExiste->bindParam(':torneo_id', $torneoId, PDO::PARAM_INT);
    $stmtExiste->execute();
    $existe = $stmtExiste->fetch(PDO::FETCH_ASSOC);
    
    if ($existe['total'] > 0) {
        echo json_encode([
            'success' => true,
            'puede_generar' => false,
            'mensaje' => 'La fase eliminatoria ya ha sido generada para este torneo'
        ]);
        return;
    }
    
    // Verificar si todas las jornadas regulares están finalizadas
    $query = "SELECT 
                COUNT(*) as total_partidos,
                SUM(CASE WHEN p.estado = 'finalizado' THEN 1 ELSE 0 END) as partidos_finalizados,
                SUM(CASE WHEN p.estado IN ('programado', 'en_curso') THEN 1 ELSE 0 END) as partidos_pendientes
              FROM partidos p
              INNER JOIN jornadas j ON p.id_jornada = j.id
              WHERE j.id_torneo = :torneo_id 
              AND j.tipo = 'regular'";
    
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':torneo_id', $torneoId, PDO::PARAM_INT);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $puedeGenerar = ($result['partidos_pendientes'] == 0 && $result['total_partidos'] > 0);
    
    $mensaje = $puedeGenerar 
        ? 'Todos los partidos de la fase regular han finalizado. Listo para generar eliminatoria.'
        : "Hay {$result['partidos_pendientes']} partido(s) pendiente(s) de finalizar en la fase regular.";
    
    echo json_encode([
        'success' => true,
        'puede_generar' => $puedeGenerar,
        'mensaje' => $mensaje,
        'estadisticas' => [
            'total_partidos' => (int)$result['total_partidos'],
            'finalizados' => (int)$result['partidos_finalizados'],
            'pendientes' => (int)$result['partidos_pendientes']
        ]
    ]);
}

/**
 * Genera la fase eliminatoria llamando al procedimiento almacenado
 */
function generarEliminatoria($pdo) {
    $torneoId = $_POST['torneo_id'] ?? null;
    
    if (!$torneoId) {
        echo json_encode([
            'success' => false,
            'message' => 'ID de torneo requerido'
        ]);
        return;
    }
    
    try {
        // Iniciar transacción
        $pdo->beginTransaction();
        
        // Verificar nuevamente el estado antes de generar
        $queryCheck = "SELECT 
                        COUNT(*) as partidos_pendientes
                       FROM partidos p
                       INNER JOIN jornadas j ON p.id_jornada = j.id
                       WHERE j.id_torneo = :torneo_id 
                       AND j.tipo = 'regular'
                       AND p.estado IN ('programado', 'en_curso')";
        
        $stmtCheck = $pdo->prepare($queryCheck);
        $stmtCheck->bindParam(':torneo_id', $torneoId, PDO::PARAM_INT);
        $stmtCheck->execute();
        $check = $stmtCheck->fetch(PDO::FETCH_ASSOC);
        
        if ($check['partidos_pendientes'] > 0) {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'Aún hay partidos pendientes en la fase regular'
            ]);
            return;
        }
        
        // Verificar si ya existe eliminatoria
        $queryExiste = "SELECT COUNT(*) as total FROM fase_eliminacion WHERE id_torneo = :torneo_id";
        $stmtExiste = $pdo->prepare($queryExiste);
        $stmtExiste->bindParam(':torneo_id', $torneoId, PDO::PARAM_INT);
        $stmtExiste->execute();
        $existe = $stmtExiste->fetch(PDO::FETCH_ASSOC);
        
        if ($existe['total'] > 0) {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'La fase eliminatoria ya ha sido generada'
            ]);
            return;
        }
        
        // Llamar al procedimiento almacenado (asumiendo que existe sp_generar_eliminatoria)
        // Si no existe, necesitarás crear la lógica manualmente
        $stmt = $pdo->prepare("CALL sp_generar_eliminatoria(:torneo_id)");
        $stmt->bindParam(':torneo_id', $torneoId, PDO::PARAM_INT);
        $stmt->execute();
        
        // Confirmar transacción
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Fase eliminatoria generada exitosamente'
        ]);
        
    } catch (PDOException $e) {
        // Revertir en caso de error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        // Verificar si el error es porque no existe el procedimiento
        if (strpos($e->getMessage(), 'PROCEDURE') !== false) {
            echo json_encode([
                'success' => false,
                'message' => 'El procedimiento almacenado sp_generar_eliminatoria no existe. Contacta al administrador.'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Error al generar eliminatoria: ' . $e->getMessage()
            ]);
        }
    }
}
?>