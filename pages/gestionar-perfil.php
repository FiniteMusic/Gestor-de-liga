<?php
/**
 * API para Gestión de Perfil de Administrador
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

// Verificar que el usuario esté logueado
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Sesión no válida. Por favor inicia sesión nuevamente.'
    ]);
    exit();
}

require_once 'db_conexion.php';

// Obtener la acción solicitada
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    switch ($action) {
        case 'get_perfil':
            obtenerPerfil($pdo);
            break;
            
        case 'actualizar_perfil':
            actualizarPerfil($pdo);
            break;
            
        case 'crear_admin':
            crearAdministrador($pdo);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Acción no válida'
            ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
}

/**
 * Obtiene los datos del perfil del usuario logueado
 */
function obtenerPerfil($pdo) {
    $userId = $_SESSION['user_id'];
    
    $stmt = $pdo->prepare("
        SELECT id, nombre, email, telefono, rol 
        FROM usuarios 
        WHERE id = ? AND activo = 1
    ");
    
    $stmt->execute([$userId]);
    $usuario = $stmt->fetch();
    
    if ($usuario) {
        echo json_encode([
            'success' => true,
            'usuario' => $usuario
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario no encontrado'
        ]);
    }
}

/**
 * Actualiza los datos del perfil del usuario logueado
 */
function actualizarPerfil($pdo) {
    $userId = $_SESSION['user_id'];
    $nombre = trim($_POST['nombre'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validaciones básicas
    if (empty($nombre)) {
        echo json_encode([
            'success' => false,
            'message' => 'El nombre es obligatorio'
        ]);
        return;
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'El correo electrónico no es válido'
        ]);
        return;
    }
    
    // Verificar si el email ya existe (excepto para el usuario actual)
    $stmt = $pdo->prepare("
        SELECT id FROM usuarios 
        WHERE email = ? AND id != ?
    ");
    $stmt->execute([$email, $userId]);
    
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El correo electrónico ya está registrado'
        ]);
        return;
    }
    
    // Construir la consulta de actualización
    if (!empty($password)) {
        // Validar longitud de contraseña
        if (strlen($password) < 6) {
            echo json_encode([
                'success' => false,
                'message' => 'La contraseña debe tener al menos 6 caracteres'
            ]);
            return;
        }
        
        // Actualizar con nueva contraseña
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET nombre = ?, 
                email = ?, 
                telefono = ?, 
                password_hash = ?
            WHERE id = ?
        ");
        
        $stmt->execute([$nombre, $email, $telefono, $passwordHash, $userId]);
    } else {
        // Actualizar sin cambiar contraseña
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET nombre = ?, 
                email = ?, 
                telefono = ?
            WHERE id = ?
        ");
        
        $stmt->execute([$nombre, $email, $telefono, $userId]);
    }
    
    if ($stmt->rowCount() > 0 || !empty($password)) {
        echo json_encode([
            'success' => true,
            'message' => 'Perfil actualizado exitosamente'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se realizaron cambios en el perfil'
        ]);
    }
}

/**
 * Crea un nuevo usuario administrador
 */
function crearAdministrador($pdo) {
    // Verificar que el usuario actual sea administrador
    $userId = $_SESSION['user_id'];
    
    $stmt = $pdo->prepare("SELECT rol FROM usuarios WHERE id = ?");
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch();
    
    if (!$currentUser || $currentUser['rol'] !== 'administrador') {
        echo json_encode([
            'success' => false,
            'message' => 'No tienes permisos para crear administradores'
        ]);
        return;
    }
    
    // Obtener datos del formulario
    $nombre = trim($_POST['nombre'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validaciones
    if (empty($nombre)) {
        echo json_encode([
            'success' => false,
            'message' => 'El nombre es obligatorio'
        ]);
        return;
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'El correo electrónico no es válido'
        ]);
        return;
    }
    
    if (empty($password) || strlen($password) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'La contraseña debe tener al menos 6 caracteres'
        ]);
        return;
    }
    
    // Verificar si el email ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'El correo electrónico ya está registrado'
        ]);
        return;
    }
    
    // Hash de la contraseña
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insertar nuevo administrador
    $stmt = $pdo->prepare("
        INSERT INTO usuarios (nombre, email, telefono, password_hash, rol, activo) 
        VALUES (?, ?, ?, ?, 'administrador', 1)
    ");
    
    try {
        $stmt->execute([$nombre, $email, $telefono, $passwordHash]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Administrador creado exitosamente',
            'admin_id' => $pdo->lastInsertId()
        ]);
        
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error al crear el administrador: ' . $e->getMessage()
        ]);
    }
}
?>