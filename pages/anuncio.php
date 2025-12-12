<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

try {
    // Cargar conexión usando tu archivo existente
    require_once 'db_conexion.php';
    
    // Obtener conexión PDO
    $conn = getDBConnection();
    
    // Fecha y hora actual
    $hoy = date('Y-m-d H:i:s');
    
    // Obtener TODOS los anuncios activos
    // SOLUCIÓN: Usar parámetros distintos para cada uso
    $sql = "SELECT id, titulo, contenido, tipo, fecha_inicio, fecha_fin
            FROM anuncios
            WHERE visible = 1
            AND fecha_inicio <= :fecha_inicio
            AND (fecha_fin IS NULL OR fecha_fin >= :fecha_fin)
            ORDER BY fecha_creacion DESC";
    
    $stmt = $conn->prepare($sql);
    
    // Vincular ambos parámetros (aunque tienen el mismo valor)
    $stmt->bindParam(':fecha_inicio', $hoy, PDO::PARAM_STR);
    $stmt->bindParam(':fecha_fin', $hoy, PDO::PARAM_STR);
    
    $stmt->execute();
    
    // Obtener todos los resultados
    $anuncios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($anuncios) > 0) {
        echo json_encode([
            "status" => "ok",
            "anuncios" => $anuncios,
            "total" => count($anuncios)
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            "status" => "no_anuncio",
            "msg" => "No hay anuncios activos en este momento"
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (PDOException $e) {
    // En producción, registrar el error en un log
    error_log("Error en anuncio.php: " . $e->getMessage());
    
    echo json_encode([
        "status" => "error",
        "msg" => "Error al obtener anuncios"
    ], JSON_UNESCAPED_UNICODE);
}
?>