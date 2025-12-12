<?php
/**
 * Obtiene los resultados de una jornada específica
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Incluir archivo de conexión
require_once 'db_conexion.php';

try {
    // Validar que se reciba el ID de la jornada
    if (!isset($_GET['jornada_id']) || empty($_GET['jornada_id'])) {
        throw new Exception('ID de jornada no proporcionado');
    }
    
    $jornadaId = intval($_GET['jornada_id']);
    
    if ($jornadaId <= 0) {
        throw new Exception('ID de jornada inválido');
    }
    
    $pdo = getDBConnection();
    
    // Primero obtener información de la jornada
    $sqlJornada = "
        SELECT 
            j.id,
            j.numero_jornada,
            j.nombre,
            j.tipo,
            j.fecha_inicio,
            j.fecha_fin,
            j.publicada,
            t.id as torneo_id,
            t.nombre as torneo_nombre,
            t.tipo_futbol,
            t.estado as torneo_estado
        FROM jornadas j
        INNER JOIN torneos t ON j.id_torneo = t.id
        WHERE j.id = :jornada_id
            AND j.publicada = 1
    ";
    
    $stmtJornada = $pdo->prepare($sqlJornada);
    $stmtJornada->bindParam(':jornada_id', $jornadaId, PDO::PARAM_INT);
    $stmtJornada->execute();
    
    $jornada = $stmtJornada->fetch(PDO::FETCH_ASSOC);
    
    if (!$jornada) {
        throw new Exception('Jornada no encontrada');
    }
    
    // Determinar el estado de la jornada
    $ahora = new DateTime();
    $fechaInicio = new DateTime($jornada['fecha_inicio']);
    $fechaFin = new DateTime($jornada['fecha_fin']);
    
    if ($ahora < $fechaInicio) {
        $estadoJornada = 'proxima';
    } elseif ($ahora > $fechaFin) {
        $estadoJornada = 'finalizada';
    } else {
        $estadoJornada = 'en_curso';
    }
    
    // Obtener todos los partidos de esta jornada
    $sqlPartidos = "
        SELECT 
            p.id,
            p.id_jornada,
            p.fecha_partido,
            p.lugar,
            p.marcador_local,
            p.marcador_visitante,
            p.estado,
            p.equipo_forfeit,
            p.observaciones,
            el.id as id_equipo_local,
            el.nombre as equipo_local,
            ev.id as id_equipo_visitante,
            ev.nombre as equipo_visitante,
            t.tipo_futbol
        FROM partidos p
        INNER JOIN equipos el ON p.id_equipo_local = el.id
        INNER JOIN equipos ev ON p.id_equipo_visitante = ev.id
        INNER JOIN jornadas j ON p.id_jornada = j.id
        INNER JOIN torneos t ON j.id_torneo = t.id
        WHERE p.id_jornada = :jornada_id
        ORDER BY p.fecha_partido ASC, t.tipo_futbol DESC
    ";
    
    $stmtPartidos = $pdo->prepare($sqlPartidos);
    $stmtPartidos->bindParam(':jornada_id', $jornadaId, PDO::PARAM_INT);
    $stmtPartidos->execute();
    
    $partidos = $stmtPartidos->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar cada partido para agregar información adicional
    foreach ($partidos as &$partido) {
        // Formatear fecha
        if ($partido['fecha_partido']) {
            $fechaPartido = new DateTime($partido['fecha_partido']);
            $partido['fecha_formateada'] = $fechaPartido->format('d/m/Y');
            $partido['hora_formateada'] = $fechaPartido->format('H:i');
            $partido['dia_semana'] = $fechaPartido->format('l');
        }
        
        // Determinar ganador si el partido está finalizado
        if ($partido['estado'] === 'finalizado' || $partido['estado'] === 'forfeit') {
            if ($partido['marcador_local'] > $partido['marcador_visitante']) {
                $partido['ganador'] = 'local';
            } elseif ($partido['marcador_local'] < $partido['marcador_visitante']) {
                $partido['ganador'] = 'visitante';
            } else {
                $partido['ganador'] = 'empate';
            }
        } else {
            $partido['ganador'] = null;
        }
        
        // Información de forfeit
        if ($partido['estado'] === 'forfeit' && $partido['equipo_forfeit']) {
            if ($partido['equipo_forfeit'] == $partido['id_equipo_local']) {
                $partido['equipo_forfeit_nombre'] = $partido['equipo_local'];
            } else {
                $partido['equipo_forfeit_nombre'] = $partido['equipo_visitante'];
            }
        }
    }
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'jornada' => $jornada,
        'jornada_estado' => $estadoJornada,
        'partidos' => $partidos,
        'total_partidos' => count($partidos)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    // Error de base de datos
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener resultados de la jornada',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Error general
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>