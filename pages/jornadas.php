<?php
/**
 * jornadas.php - Backend para gestión de partidos por jornada
 */

session_start();
require_once 'db_conexion.php';

// Validación de sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Headers para JSON
header('Content-Type: application/json');

// Determinar acción
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'obtener_torneos':
            obtenerTorneos($pdo);
            break;
            
        case 'obtener_jornadas':
            obtenerJornadas($pdo);
            break;
            
        case 'obtener_partidos':
            obtenerPartidos($pdo);
            break;
            
        case 'actualizar_partido':
            actualizarPartido($pdo);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}

/**
 * Obtener torneos activos agrupados por tipo de fútbol
 */
function obtenerTorneos($pdo) {
    try {
        $sql = "SELECT id, nombre, tipo_futbol, temporada 
                FROM torneos 
                WHERE estado IN ('inscripcion', 'en_curso')
                ORDER BY tipo_futbol, fecha_creacion DESC";
        
        $stmt = $pdo->prepare($sql);
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
 * Obtener jornadas de un torneo
 */
function obtenerJornadas($pdo) {
    try {
        $idTorneo = $_GET['id_torneo'] ?? null;
        
        if (!$idTorneo) {
            echo json_encode([
                'success' => false,
                'message' => 'ID de torneo requerido'
            ]);
            return;
        }
        
        $sql = "SELECT 
                    id,
                    numero_jornada,
                    nombre,
                    tipo,
                    DATE_FORMAT(fecha_inicio, '%d/%m/%Y') as fecha_inicio,
                    DATE_FORMAT(fecha_fin, '%d/%m/%Y') as fecha_fin,
                    publicada
                FROM jornadas
                WHERE id_torneo = :id_torneo
                ORDER BY numero_jornada ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id_torneo' => $idTorneo]);
        $jornadas = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'jornadas' => $jornadas
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener jornadas: ' . $e->getMessage()
        ]);
    }
}

/**
 * Obtener partidos de una jornada
 */
function obtenerPartidos($pdo) {
    try {
        $idJornada = $_GET['id_jornada'] ?? null;
        
        if (!$idJornada) {
            echo json_encode([
                'success' => false,
                'message' => 'ID de jornada requerido'
            ]);
            return;
        }
        
        $sql = "SELECT 
                    p.id,
                    p.fecha_partido,
                    p.lugar,
                    p.estado,
                    p.marcador_local,
                    p.marcador_visitante,
                    el.nombre as equipo_local,
                    ev.nombre as equipo_visitante,
                    p.id_equipo_local,
                    p.id_equipo_visitante
                FROM partidos p
                INNER JOIN equipos el ON p.id_equipo_local = el.id
                INNER JOIN equipos ev ON p.id_equipo_visitante = ev.id
                WHERE p.id_jornada = :id_jornada
                ORDER BY p.fecha_partido ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id_jornada' => $idJornada]);
        $partidos = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'partidos' => $partidos
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener partidos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Actualizar fecha/hora de un partido
 */
function actualizarPartido($pdo) {
    try {
        $idPartido = $_POST['id_partido'] ?? null;
        $fechaPartido = $_POST['fecha_partido'] ?? null;
        $lugar = $_POST['lugar'] ?? 'Cancha ESCOM';
        
        if (!$idPartido || !$fechaPartido) {
            echo json_encode([
                'success' => false,
                'message' => 'Datos incompletos'
            ]);
            return;
        }
        
        // Verificar que el partido esté en estado "programado"
        $sqlCheck = "SELECT estado FROM partidos WHERE id = :id";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute(['id' => $idPartido]);
        $partido = $stmtCheck->fetch();
        
        if (!$partido) {
            echo json_encode([
                'success' => false,
                'message' => 'Partido no encontrado'
            ]);
            return;
        }
        
        if ($partido['estado'] !== 'programado') {
            echo json_encode([
                'success' => false,
                'message' => 'Solo se pueden editar partidos en estado "programado"'
            ]);
            return;
        }
        
        // Actualizar el partido
        $sqlUpdate = "UPDATE partidos 
                      SET fecha_partido = :fecha_partido,
                          lugar = :lugar,
                          fecha_actualizacion = CURRENT_TIMESTAMP
                      WHERE id = :id";
        
        $stmtUpdate = $pdo->prepare($sqlUpdate);
        $resultado = $stmtUpdate->execute([
            'fecha_partido' => $fechaPartido,
            'lugar' => $lugar,
            'id' => $idPartido
        ]);
        
        if ($resultado) {
            // Registrar en historial (opcional)
            registrarHistorialCambio($pdo, $idPartido, $_SESSION['user_id'], 
                'Cambio de fecha/hora', $fechaPartido, $lugar);
            
            echo json_encode([
                'success' => true,
                'message' => 'Partido actualizado correctamente'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Error al actualizar el partido'
            ]);
        }
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al actualizar partido: ' . $e->getMessage()
        ]);
    }
}

/**
 * Registrar cambio en historial (función auxiliar)
 */
function registrarHistorialCambio($pdo, $idPartido, $idUsuario, $motivo, $fechaNueva, $lugarNuevo) {
    try {
        $sql = "INSERT INTO historial_partidos 
                (id_partido, id_usuario, motivo, fecha_modificacion)
                VALUES (:id_partido, :id_usuario, :motivo, CURRENT_TIMESTAMP)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id_partido' => $idPartido,
            'id_usuario' => $idUsuario,
            'motivo' => $motivo . " - Nueva fecha: $fechaNueva, Lugar: $lugarNuevo"
        ]);
        
    } catch (PDOException $e) {
        // Log error pero no detener el proceso principal
        error_log("Error al registrar historial: " . $e->getMessage());
    }
}
?>