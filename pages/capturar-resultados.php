<?php
session_start();
require_once 'db_conexion.php';

// Verificar que el usuario esté autenticado
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Configurar headers para JSON
header('Content-Type: application/json');

// Obtener la acción solicitada
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'getTorneos':
            getTorneos($pdo);
            break;
            
        case 'getJornadas':
            getJornadas($pdo);
            break;
            
        case 'getPartidos':
            getPartidos($pdo);
            break;
            
        case 'guardarResultado':
            guardarResultado($pdo);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}

/**
 * Obtiene la lista de torneos activos o en curso
 */
function getTorneos($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nombre,
                temporada,
                tipo_futbol,
                estado
            FROM torneos
            WHERE estado IN ('inscripcion', 'en_curso')
            ORDER BY fecha_creacion DESC
        ");
        
        $stmt->execute();
        $torneos = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => $torneos
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener torneos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Obtiene las jornadas de un torneo específico
 */
function getJornadas($pdo) {
    try {
        $torneoId = $_GET['torneo_id'] ?? null;
        
        if (!$torneoId) {
            echo json_encode(['success' => false, 'message' => 'ID de torneo requerido']);
            return;
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                numero_jornada,
                nombre,
                tipo,
                fecha_inicio,
                fecha_fin
            FROM jornadas
            WHERE id_torneo = :torneo_id
            AND publicada = 1
            ORDER BY numero_jornada ASC
        ");
        
        $stmt->execute(['torneo_id' => $torneoId]);
        $jornadas = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => $jornadas
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener jornadas: ' . $e->getMessage()
        ]);
    }
}

/**
 * Obtiene los partidos de una jornada específica
 */
function getPartidos($pdo) {
    try {
        $jornadaId = $_GET['jornada_id'] ?? null;
        
        if (!$jornadaId) {
            echo json_encode(['success' => false, 'message' => 'ID de jornada requerido']);
            return;
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                p.id,
                p.fecha_partido,
                p.lugar,
                p.marcador_local,
                p.marcador_visitante,
                p.estado,
                el.nombre AS equipo_local,
                ev.nombre AS equipo_visitante,
                p.id_equipo_local,
                p.id_equipo_visitante
            FROM partidos p
            INNER JOIN equipos el ON p.id_equipo_local = el.id
            INNER JOIN equipos ev ON p.id_equipo_visitante = ev.id
            WHERE p.id_jornada = :jornada_id
            ORDER BY p.fecha_partido ASC
        ");
        
        $stmt->execute(['jornada_id' => $jornadaId]);
        $partidos = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'data' => $partidos
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al obtener partidos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Guarda el resultado de un partido y actualiza su estado a finalizado
 */
function guardarResultado($pdo) {
    try {
        // Validar datos recibidos
        $partidoId = $_POST['partido_id'] ?? null;
        $marcadorLocal = $_POST['marcador_local'] ?? null;
        $marcadorVisitante = $_POST['marcador_visitante'] ?? null;
        
        if (!$partidoId || $marcadorLocal === null || $marcadorVisitante === null) {
            echo json_encode([
                'success' => false,
                'message' => 'Datos incompletos'
            ]);
            return;
        }
        
        // Validar que los marcadores sean números válidos
        if (!is_numeric($marcadorLocal) || !is_numeric($marcadorVisitante) || 
            $marcadorLocal < 0 || $marcadorVisitante < 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Los marcadores deben ser números positivos'
            ]);
            return;
        }
        
        // Verificar que el partido existe y no está finalizado
        $stmtCheck = $pdo->prepare("
            SELECT estado 
            FROM partidos 
            WHERE id = :partido_id
        ");
        $stmtCheck->execute(['partido_id' => $partidoId]);
        $partido = $stmtCheck->fetch();
        
        if (!$partido) {
            echo json_encode([
                'success' => false,
                'message' => 'Partido no encontrado'
            ]);
            return;
        }
        
        if ($partido['estado'] === 'finalizado') {
            echo json_encode([
                'success' => false,
                'message' => 'Este partido ya está finalizado'
            ]);
            return;
        }
        
        // Iniciar transacción
        $pdo->beginTransaction();
        
        try {
            // Actualizar el partido con los marcadores y cambiar estado a finalizado
            $stmt = $pdo->prepare("
                UPDATE partidos 
                SET 
                    marcador_local = :marcador_local,
                    marcador_visitante = :marcador_visitante,
                    estado = 'finalizado',
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = :partido_id
            ");
            
            $stmt->execute([
                'marcador_local' => $marcadorLocal,
                'marcador_visitante' => $marcadorVisitante,
                'partido_id' => $partidoId
            ]);
            
            // Registrar en historial (opcional pero recomendado)
            $stmtHistorial = $pdo->prepare("
                INSERT INTO historial_partidos 
                (id_partido, marcador_local_nuevo, marcador_visitante_nuevo, 
                 estado_anterior, estado_nuevo, motivo, id_usuario)
                VALUES 
                (:partido_id, :marcador_local, :marcador_visitante, 
                 :estado_anterior, 'finalizado', 'Captura de resultado', :user_id)
            ");
            
            $stmtHistorial->execute([
                'partido_id' => $partidoId,
                'marcador_local' => $marcadorLocal,
                'marcador_visitante' => $marcadorVisitante,
                'estado_anterior' => $partido['estado'],
                'user_id' => $_SESSION['user_id']
            ]);
            
            // Commit de la transacción
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Resultado guardado exitosamente'
            ]);
            
        } catch (PDOException $e) {
            // Rollback en caso de error
            $pdo->rollBack();
            throw $e;
        }
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al guardar resultado: ' . $e->getMessage()
        ]);
    }
}
?>