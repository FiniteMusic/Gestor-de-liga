<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Incluir archivo de conexión a la base de datos
require_once 'db_conexion.php';

// Configurar headers para JSON
header('Content-Type: application/json');

try {
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();

    // Preparar la consulta SQL (ID fijo = 1, rol = administrador)
    $sql = "
        SELECT 
            id,
            nombre,
            email,
            telefono,
            fecha_registro
        FROM usuarios
        WHERE id = 1 
        AND rol = 'administrador'
        AND activo = TRUE
        LIMIT 1
    ";

    // Preparar y ejecutar la consulta
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    // Obtener el resultado
    $profesor = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificar si se encontró el profesor
    if ($profesor) {
        // No incluir el ID, password_hash ni rol en la respuesta
        // Solo devolver la información relevante para el contacto
        $profesorInfo = [
            'nombre' => $profesor['nombre'],
            'email' => $profesor['email'],
            'telefono' => $profesor['telefono']
        ];

        // Responder con los datos
        echo json_encode([
            'success' => true,
            'profesor' => $profesorInfo
        ]);
    } else {
        // No se encontró el profesor
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró información de contacto del profesor'
        ]);
    }

} catch (PDOException $e) {
    // Error de base de datos
    error_log("Error en obtener_contacto.php: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error al consultar la base de datos'
    ]);

} catch (Exception $e) {
    // Otros errores
    error_log("Error general en obtener_contacto.php: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor'
    ]);
}
?>