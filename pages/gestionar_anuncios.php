<?php
/**
 * Backend para Gestión de Anuncios
 * Archivo: backend/anuncios.php
 */

session_start();
require_once 'db_conexion.php';

// Verificar que el usuario esté autenticado y sea administrador
if (!isset($_SESSION['user_id']) || $_SESSION['rol'] !== 'administrador') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso no autorizado'
    ]);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = getDBConnection();
    $action = $_REQUEST['action'] ?? '';

    switch ($action) {
        case 'obtener_torneos':
            obtenerTorneos($pdo);
            break;
            
        case 'crear_anuncio':
            crearAnuncio($pdo);
            break;
            
        case 'listar_anuncios':
            listarAnuncios($pdo);
            break;
            
        case 'toggle_visibilidad':
            toggleVisibilidad($pdo);
            break;
            
        default:
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
 * Obtener lista de torneos activos
 */
function obtenerTorneos($pdo) {
    $sql = "SELECT id, nombre, temporada, estado 
            FROM torneos 
            WHERE estado IN ('inscripcion', 'en_curso') 
            ORDER BY fecha_creacion DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $torneos = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'torneos' => $torneos
    ]);
}

/**
 * Crear nuevo anuncio
 */
function crearAnuncio($pdo) {
    // Validar campos requeridos
    $campos_requeridos = ['titulo', 'contenido', 'tipo'];
    foreach ($campos_requeridos as $campo) {
        if (empty($_POST[$campo])) {
            echo json_encode([
                'success' => false,
                'message' => "El campo '$campo' es obligatorio"
            ]);
            return;
        }
    }
    
    // Validar tipo de anuncio
    $tipos_validos = ['informativo', 'urgente', 'suspension', 'cambio_horario'];
    if (!in_array($_POST['tipo'], $tipos_validos)) {
        echo json_encode([
            'success' => false,
            'message' => 'Tipo de anuncio no válido'
        ]);
        return;
    }
    
    // Preparar datos
    $id_torneo = !empty($_POST['id_torneo']) ? intval($_POST['id_torneo']) : null;
    $titulo = trim($_POST['titulo']);
    $contenido = trim($_POST['contenido']);
    $tipo = $_POST['tipo'];
    $fecha_fin = !empty($_POST['fecha_fin']) ? $_POST['fecha_fin'] : null;
    $id_autor = $_SESSION['user_id'];
    
    // Validar fecha fin (debe ser futura si se proporciona)
    if ($fecha_fin) {
        $fecha_fin_dt = new DateTime($fecha_fin);
        $hoy = new DateTime();
        
        if ($fecha_fin_dt <= $hoy) {
            echo json_encode([
                'success' => false,
                'message' => 'La fecha de finalización debe ser posterior a hoy'
            ]);
            return;
        }
    }
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Insertar anuncio
        $sql = "INSERT INTO anuncios 
                (id_torneo, titulo, contenido, tipo, visible, fecha_inicio, fecha_fin, id_autor) 
                VALUES 
                (:id_torneo, :titulo, :contenido, :tipo, 1, NOW(), :fecha_fin, :id_autor)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id_torneo' => $id_torneo,
            ':titulo' => $titulo,
            ':contenido' => $contenido,
            ':tipo' => $tipo,
            ':fecha_fin' => $fecha_fin,
            ':id_autor' => $id_autor
        ]);
        
        $id_anuncio = $pdo->lastInsertId();
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '¡Anuncio publicado exitosamente!',
            'id_anuncio' => $id_anuncio
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Listar anuncios recientes
 */
function listarAnuncios($pdo) {
    $sql = "SELECT 
                a.id,
                a.titulo,
                a.contenido,
                a.tipo,
                a.visible,
                a.fecha_inicio,
                a.fecha_fin,
                t.nombre as torneo_nombre,
                u.nombre as autor_nombre
            FROM anuncios a
            LEFT JOIN torneos t ON a.id_torneo = t.id
            LEFT JOIN usuarios u ON a.id_autor = u.id
            ORDER BY a.fecha_creacion DESC
            LIMIT 20";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $anuncios = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'anuncios' => $anuncios
    ]);
}

/**
 * Cambiar visibilidad de un anuncio
 */
function toggleVisibilidad($pdo) {
    if (!isset($_POST['id']) || !isset($_POST['visible'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Faltan parámetros requeridos'
        ]);
        return;
    }
    
    $id = intval($_POST['id']);
    $visible = intval($_POST['visible']);
    
    // Validar que visible sea 0 o 1
    if ($visible !== 0 && $visible !== 1) {
        echo json_encode([
            'success' => false,
            'message' => 'Valor de visibilidad no válido'
        ]);
        return;
    }
    
    $sql = "UPDATE anuncios SET visible = :visible WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $resultado = $stmt->execute([
        ':visible' => $visible,
        ':id' => $id
    ]);
    
    if ($resultado) {
        $mensaje = $visible == 1 
            ? 'Anuncio ahora visible' 
            : 'Anuncio ocultado';
            
        echo json_encode([
            'success' => true,
            'message' => $mensaje
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error al actualizar el anuncio'
        ]);
    }
}
?>