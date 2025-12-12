<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$required = ['firstname', 'lastname', 'email', 'password', 'confirm-password', 'telefono'];
foreach ($required as $field) {
    if (empty($_POST[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Todos los campos son obligatorios']);
        exit;
    }
}

$nombre = trim($_POST['firstname']) . ' ' . trim($_POST['lastname']);
$email = trim($_POST['email']);
$password = $_POST['password'];
$confirm = $_POST['confirm-password'];
$telefono = $_POST['telefono'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'error' => 'El email no es válido']);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode(['success' => false, 'error' => 'La contraseña debe tener al menos 8 caracteres']);
    exit;
}
if ($password !== $confirm) {
    echo json_encode(['success' => false, 'error' => 'Las contraseñas no coinciden']);
    exit;
}
if (!preg_match('/^[0-9]{10}$/', $telefono)) {
    echo json_encode(['success' => false, 'error' => 'El número telefónico debe tener 10 dígitos']);
    exit;
}

require_once "db_conexion.php";

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'error' => 'Ya existe una cuenta con ese correo electrónico']);
        exit;
    }

    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    $insert = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash, telefono, rol, activo) VALUES (?, ?, ?, ?, 'capitan', 1)");
    $insert->execute([$nombre, $email, $password_hash, $telefono]);

    session_start();
    $_SESSION['user_id'] = $pdo->lastInsertId();
    $_SESSION['nombre'] = $nombre;
    $_SESSION['rol'] = 'capitan';
    $_SESSION['email'] = $email;
    $_SESSION['telefono'] = $telefono;

    echo json_encode([
        'success' => true,
        'redirect' => 'login.html',
        'user' => [
            'nombre' => $nombre,
            'email' => $email,
            'rol' => 'capitan',
            'telefono' => $telefono
        ]
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de servidor, intente más tarde.']);
    exit;
}
?>