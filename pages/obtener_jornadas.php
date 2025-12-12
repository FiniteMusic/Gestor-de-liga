<?php
/**
 * Obtiene todas las jornadas disponibles para mostrar en la navegación
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Incluir archivo de conexión
require_once 'db_conexion.php';

try {
    $pdo = getDBConnection();
    
    // Consulta para obtener todas las jornadas con información del torneo
    $sql = "
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
            t.estado as torneo_estado,
            COUNT(p.id) as total_partidos,
            SUM(CASE WHEN p.estado IN ('finalizado', 'forfeit') THEN 1 ELSE 0 END) as partidos_finalizados
        FROM jornadas j
        INNER JOIN torneos t ON j.id_torneo = t.id
        LEFT JOIN partidos p ON p.id_jornada = j.id
        WHERE j.publicada = 1
            AND t.estado IN ('en_curso', 'finalizado')
        GROUP BY j.id, j.numero_jornada, j.nombre, j.tipo, j.fecha_inicio, j.fecha_fin, 
                 j.publicada, t.id, t.nombre, t.tipo_futbol, t.estado
        ORDER BY j.numero_jornada ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    $jornadas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Procesar cada jornada para agregar información adicional
    foreach ($jornadas as &$jornada) {
        // Determinar el estado de la jornada
        $ahora = new DateTime();
        $fechaInicio = new DateTime($jornada['fecha_inicio']);
        $fechaFin = new DateTime($jornada['fecha_fin']);
        
        if ($ahora < $fechaInicio) {
            $jornada['estado_jornada'] = 'proxima';
        } elseif ($ahora > $fechaFin) {
            $jornada['estado_jornada'] = 'finalizada';
        } else {
            $jornada['estado_jornada'] = 'en_curso';
        }
        
        // Calcular porcentaje de partidos finalizados
        if ($jornada['total_partidos'] > 0) {
            $jornada['porcentaje_finalizados'] = round(
                ($jornada['partidos_finalizados'] / $jornada['total_partidos']) * 100,
                2
            );
        } else {
            $jornada['porcentaje_finalizados'] = 0;
        }
    }
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'jornadas' => $jornadas,
        'total' => count($jornadas)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    // Error de base de datos
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener jornadas',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Error general
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>