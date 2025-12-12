<?php
/**
 * Script de login para ESCOM LEAGUE
 * Devuelve SIEMPRE JSON válido.
 */

header('Content-Type: application/json; charset=utf-8');

// Evita cacheo
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// Solo peticiones POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Validación básica
if (empty($_POST['username']) || empty($_POST['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Faltan credenciales']);
    exit;
}

$email = trim($_POST['username']);
$password = $_POST['password'];

require_once 'db_conexion.php';

try {
    $pdo = getDBConnection();

    // Buscar al usuario
    $stmt = $pdo->prepare('SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Usuario no encontrado
    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'Usuario o contraseña incorrectos']);
        exit;
    }

    // Cuenta inactiva
    if (!$user['activo']) {
        echo json_encode(['success' => false, 'error' => 'La cuenta está inactiva. Contacta al administrador.']);
        exit;
    }

    // Verificar contraseña
    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'error' => 'Usuario o contraseña incorrectos']);
        exit;
    }

    // Actualizar último acceso
    $upd = $pdo->prepare('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?');
    $upd->execute([$user['id']]);

    // Iniciar sesión
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['nombre'] = $user['nombre'];
    $_SESSION['rol'] = $user['rol'];
    $_SESSION['email'] = $user['email'];

    // Redirección según rol
    switch ($user['rol']) {
        case 'administrador':
            $redirect = 'admin.php';
            break;
        case 'capitan':
            $redirect = 'capitan.php';
            break;
        default:
            $redirect = 'perfil.php';
            break;
    }

    // Respuesta final JSON
    echo json_encode([
        'success' => true,
        'redirect' => $redirect,
        'user' => [
            'id'     => $user['id'],
            'nombre' => $user['nombre'],
            'rol'    => $user['rol']
        ]
    ]);

} catch (Exception $e) {

    // Seguridad: NO enviar mensaje completo al cliente
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de servidor, inténtalo más tarde.'
    ]);

    // Log privado opcional
    // error_log($e->getMessage());
}

exit;
?>
