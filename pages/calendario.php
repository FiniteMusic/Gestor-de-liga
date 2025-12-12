<?php
/**
 * calendario.php - API para obtener los partidos de la semana actual
 * Retorna los partidos programados desde el lunes hasta el domingo de la semana actual
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once 'db_conexion.php';

/**
 * Obtiene el lunes de la semana actual
 */
function getLunesSemana() {
    $hoy = new DateTime();
    $diaSemana = $hoy->format('N'); // 1 (lunes) a 7 (domingo)
    
    if ($diaSemana == 1) {
        // Si es lunes, retornar hoy
        return $hoy;
    } else {
        // Retroceder al lunes de esta semana
        $diasRetroceder = $diaSemana - 1;
        $hoy->modify("-{$diasRetroceder} days");
        return $hoy;
    }
}

/**
 * Obtiene el domingo de la semana actual
 */
function getDomingoSemana() {
    $hoy = new DateTime();
    $diaSemana = $hoy->format('N'); // 1 (lunes) a 7 (domingo)
    
    if ($diaSemana == 7) {
        // Si es domingo, retornar hoy
        return $hoy;
    } else {
        // Avanzar al domingo de esta semana
        $diasAvanzar = 7 - $diaSemana;
        $hoy->modify("+{$diasAvanzar} days");
        return $hoy;
    }
}

/**
 * Formatea la fecha en español
 */
function formatearFechaEspanol($fecha) {
    $diasSemana = [
        'Monday' => 'Lunes',
        'Tuesday' => 'Martes',
        'Wednesday' => 'Miércoles',
        'Thursday' => 'Jueves',
        'Friday' => 'Viernes',
        'Saturday' => 'Sábado',
        'Sunday' => 'Domingo'
    ];
    
    $meses = [
        'January' => 'Enero',
        'February' => 'Febrero',
        'March' => 'Marzo',
        'April' => 'Abril',
        'May' => 'Mayo',
        'June' => 'Junio',
        'July' => 'Julio',
        'August' => 'Agosto',
        'September' => 'Septiembre',
        'October' => 'Octubre',
        'November' => 'Noviembre',
        'December' => 'Diciembre'
    ];
    
    $dt = new DateTime($fecha);
    $diaSemana = $diasSemana[$dt->format('l')];
    $dia = $dt->format('d');
    $mes = $meses[$dt->format('F')];
    
    return "{$diaSemana} {$dia} de {$mes}";
}

try {
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();
    
    // Calcular fechas de la semana actual
    $lunesSemana = getLunesSemana();
    $domingoSemana = getDomingoSemana();
    
    // Formatear fechas para la consulta
    $fechaInicio = $lunesSemana->format('Y-m-d 00:00:00');
    $fechaFin = $domingoSemana->format('Y-m-d 23:59:59');
    
    // Consulta SQL para obtener los partidos de la semana
    $sql = "
        SELECT 
            p.id,
            p.fecha_partido,
            p.lugar,
            p.estado,
            el.nombre AS equipo_local,
            ev.nombre AS equipo_visitante,
            t.tipo_futbol,
            t.nombre AS torneo_nombre,
            j.nombre AS jornada_nombre,
            DATE_FORMAT(p.fecha_partido, '%H:%i') AS hora_formateada,
            DATE_FORMAT(p.fecha_partido, '%Y-%m-%d') AS fecha_simple
        FROM partidos p
        INNER JOIN jornadas j ON p.id_jornada = j.id
        INNER JOIN torneos t ON j.id_torneo = t.id
        INNER JOIN equipos el ON p.id_equipo_local = el.id
        INNER JOIN equipos ev ON p.id_equipo_visitante = ev.id
        WHERE p.fecha_partido BETWEEN :fecha_inicio AND :fecha_fin
            AND p.estado IN ('programado', 'en_curso')
            AND t.estado IN ('inscripcion', 'en_curso')
        ORDER BY p.fecha_partido ASC, t.tipo_futbol ASC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':fecha_inicio', $fechaInicio, PDO::PARAM_STR);
    $stmt->bindParam(':fecha_fin', $fechaFin, PDO::PARAM_STR);
    $stmt->execute();
    
    $partidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear los datos para el frontend
    $partidosFormateados = [];
    foreach ($partidos as $partido) {
        $partidosFormateados[] = [
            'id' => $partido['id'],
            'fecha_partido' => $partido['fecha_partido'],
            'fecha_formateada' => formatearFechaEspanol($partido['fecha_partido']),
            'hora_formateada' => $partido['hora_formateada'],
            'equipo_local' => $partido['equipo_local'],
            'equipo_visitante' => $partido['equipo_visitante'],
            'lugar' => $partido['lugar'] ?: 'Cancha ESCOM',
            'estado' => $partido['estado'],
            'tipo_futbol' => $partido['tipo_futbol'],
            'torneo_nombre' => $partido['torneo_nombre'],
            'jornada_nombre' => $partido['jornada_nombre']
        ];
    }
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'partidos' => $partidosFormateados,
        'total' => count($partidosFormateados),
        'semana' => [
            'inicio' => $lunesSemana->format('Y-m-d'),
            'fin' => $domingoSemana->format('Y-m-d'),
            'texto' => formatearFechaEspanol($lunesSemana->format('Y-m-d')) . ' - ' . 
                      formatearFechaEspanol($domingoSemana->format('Y-m-d'))
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    // Error de base de datos
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al consultar la base de datos',
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