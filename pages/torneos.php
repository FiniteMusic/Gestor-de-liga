<?php
session_start();
require_once 'db_conexion.php';

// Validación de sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Configurar respuesta JSON
header('Content-Type: application/json');

// Obtener la acción solicitada
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'listar':
            listarTorneos($pdo);
            break;
            
        case 'cambiar_estado':
            cambiarEstadoTorneo($pdo);
            break;
            
        case 'crear':
            crearTorneo($pdo);
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Listar todos los torneos con el número de equipos
 */
function listarTorneos($pdo) {
    $sql = "
        SELECT 
            t.id,
            t.nombre,
            t.temporada,
            t.tipo_futbol,
            t.estado,
            t.fecha_inicio,
            t.fecha_fin,
            COUNT(e.id) as num_equipos
        FROM torneos t
        LEFT JOIN equipos e ON t.id = e.id_torneo AND e.estado IN ('preinscrito', 'confirmado')
        GROUP BY t.id
        ORDER BY 
            CASE t.estado
                WHEN 'en_curso' THEN 1
                WHEN 'inscripcion' THEN 2
                WHEN 'inactivo' THEN 3
                WHEN 'finalizado' THEN 4
                WHEN 'archivado' THEN 5
            END,
            t.fecha_creacion DESC
    ";
    
    $stmt = $pdo->query($sql);
    $torneos = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => $torneos
    ]);
}

/**
 * Cambiar el estado de un torneo
 */
function cambiarEstadoTorneo($pdo) {
    $id = $_POST['id'] ?? null;
    $nuevoEstado = $_POST['estado'] ?? null;
    
    // Validar parámetros
    if (!$id || !$nuevoEstado) {
        throw new Exception('Parámetros incompletos');
    }
    
    // Validar estado
    $estadosValidos = ['inactivo', 'inscripcion', 'en_curso', 'finalizado', 'archivado'];
    if (!in_array($nuevoEstado, $estadosValidos)) {
        throw new Exception('Estado no válido');
    }
    
    // Obtener estado actual
    $sql = "SELECT estado FROM torneos WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    $torneo = $stmt->fetch();
    
    if (!$torneo) {
        throw new Exception('Torneo no encontrado');
    }
    
    $estadoActual = $torneo['estado'];
    
    // Validar transiciones de estado
    $transicionesPermitidas = [
        'inactivo' => ['inscripcion'],
        'inscripcion' => ['en_curso', 'inactivo'],
        'en_curso' => ['finalizado'],
        'finalizado' => ['archivado'],
        'archivado' => [] // No se puede cambiar desde archivado
    ];
    
    if (!in_array($nuevoEstado, $transicionesPermitidas[$estadoActual])) {
        $mensajes = [
            'inactivo' => 'Solo puedes cambiar a "Inscripción"',
            'inscripcion' => 'Solo puedes cambiar a "En Curso" o "Inactivo"',
            'en_curso' => 'Solo puedes cambiar a "Finalizado"',
            'finalizado' => 'Solo puedes cambiar a "Archivado"',
            'archivado' => 'No puedes cambiar el estado de un torneo archivado'
        ];
        
        throw new Exception($mensajes[$estadoActual]);
    }
    
    // Actualizar estado
    $sql = "UPDATE torneos SET estado = :estado, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':estado' => $nuevoEstado,
        ':id' => $id
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Estado actualizado correctamente'
    ]);
}

/**
 * Crear un nuevo torneo
 */
function crearTorneo($pdo) {
    $nombre = trim($_POST['nombre'] ?? '');
    $temporada = trim($_POST['temporada'] ?? '');
    $tipoFutbol = $_POST['tipo_futbol'] ?? 'futbol11';
    
    // Validar parámetros
    if (empty($nombre) || empty($temporada)) {
        throw new Exception('Todos los campos son obligatorios');
    }
    
    // Validar tipo de fútbol
    if (!in_array($tipoFutbol, ['futbol11', 'futbol7'])) {
        throw new Exception('Tipo de fútbol no válido');
    }
    
    // Verificar si ya existe un torneo con ese nombre y temporada
    $sql = "SELECT id FROM torneos WHERE nombre = :nombre AND temporada = :temporada";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nombre' => $nombre,
        ':temporada' => $temporada
    ]);
    
    if ($stmt->fetch()) {
        throw new Exception('Ya existe un torneo con ese nombre en esa temporada');
    }
    
    // Insertar nuevo torneo
    $sql = "
        INSERT INTO torneos (nombre, temporada, tipo_futbol, estado, fecha_creacion, fecha_actualizacion)
        VALUES (:nombre, :temporada, :tipo_futbol, 'inscripcion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nombre' => $nombre,
        ':temporada' => $temporada,
        ':tipo_futbol' => $tipoFutbol
    ]);
    
    $torneoId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Torneo creado exitosamente',
        'data' => [
            'id' => $torneoId
        ]
    ]);
}
?>