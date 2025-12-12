<?php
/**
 * API para obtener la tabla de clasificación
 * Endpoint: api/obtener_clasificacion.php
 */

// Configuración de headers para JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Incluir archivo de conexión
require_once 'db_conexion.php';

/**
 * Función para enviar respuesta JSON
 */
function enviarRespuesta($success, $data = null, $message = '') {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'clasificacion' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Obtener parámetros
    $tipoFutbol = isset($_GET['tipo_futbol']) ? $_GET['tipo_futbol'] : 'futbol11';
    
    // Validar tipo de fútbol
    if (!in_array($tipoFutbol, ['futbol11', 'futbol7'])) {
        enviarRespuesta(false, null, 'Tipo de fútbol no válido');
    }
    
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();
    
    // Consulta SQL para obtener la clasificación
    // Busca el torneo más reciente activo del tipo especificado
    $sql = "
        SELECT 
            ee.posicion,
            e.nombre AS equipo,
            ee.partidos_jugados,
            ee.partidos_ganados,
            ee.partidos_empatados,
            ee.partidos_perdidos,
            ee.goles_favor,
            ee.goles_contra,
            ee.diferencia_goles,
            ee.puntos,
            ee.ultimos_5_resultados
        FROM estadisticas_equipos ee
        INNER JOIN equipos e ON ee.id_equipo = e.id
        INNER JOIN torneos t ON ee.id_torneo = t.id
        WHERE t.tipo_futbol = :tipo_futbol
            AND t.estado IN ('inscripcion', 'en_curso')
            AND e.estado = 'confirmado'
        ORDER BY 
            t.fecha_inicio DESC,
            ee.posicion ASC,
            ee.puntos DESC,
            ee.diferencia_goles DESC,
            ee.goles_favor DESC
        LIMIT 100
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':tipo_futbol', $tipoFutbol, PDO::PARAM_STR);
    $stmt->execute();
    
    $clasificacion = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Si no hay datos, verificar si hay torneos de ese tipo
    if (empty($clasificacion)) {
        // Verificar si existe algún torneo del tipo especificado
        $sqlVerificar = "
            SELECT COUNT(*) as total 
            FROM torneos 
            WHERE tipo_futbol = :tipo_futbol 
                AND estado IN ('inscripcion', 'en_curso')
        ";
        $stmtVerificar = $pdo->prepare($sqlVerificar);
        $stmtVerificar->bindParam(':tipo_futbol', $tipoFutbol, PDO::PARAM_STR);
        $stmtVerificar->execute();
        $resultado = $stmtVerificar->fetch(PDO::FETCH_ASSOC);
        
        if ($resultado['total'] == 0) {
            enviarRespuesta(true, [], 'No hay torneos activos de este tipo');
        } else {
            enviarRespuesta(true, [], 'No hay equipos registrados en el torneo');
        }
    }
    
    // Formatear los datos para el frontend
    $clasificacionFormateada = [];
    foreach ($clasificacion as $equipo) {
        $clasificacionFormateada[] = [
            'posicion' => (int)$equipo['posicion'],
            'equipo' => $equipo['equipo'],
            'partidos_jugados' => (int)$equipo['partidos_jugados'],
            'partidos_ganados' => (int)$equipo['partidos_ganados'],
            'partidos_empatados' => (int)$equipo['partidos_empatados'],
            'partidos_perdidos' => (int)$equipo['partidos_perdidos'],
            'goles_favor' => (int)$equipo['goles_favor'],
            'goles_contra' => (int)$equipo['goles_contra'],
            'diferencia_goles' => (int)$equipo['diferencia_goles'],
            'puntos' => (int)$equipo['puntos'],
            'ultimos_5_resultados' => $equipo['ultimos_5_resultados'] ?: ''
        ];
    }
    
    // Enviar respuesta exitosa
    enviarRespuesta(true, $clasificacionFormateada, 'Clasificación obtenida correctamente');
    
} catch (PDOException $e) {
    // Error de base de datos
    error_log("Error en obtener_clasificacion.php: " . $e->getMessage());
    enviarRespuesta(false, null, 'Error al consultar la base de datos');
    
} catch (Exception $e) {
    // Error general
    error_log("Error general en obtener_clasificacion.php: " . $e->getMessage());
    enviarRespuesta(false, null, 'Error interno del servidor');
}
?>