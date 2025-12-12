<?php
/**
 * Gestionar Perfil - Backend PHP
 * Maneja las operaciones de actualización de perfil del usuario
 */

session_start();

// Verificar que el usuario esté autenticado
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'No autorizado. Por favor inicia sesión.'
    ]);
    exit();
}

require_once 'db_conexion.php';

header('Content-Type: application/json');

// Función para validar email
function validarEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Función para validar teléfono (10-15 dígitos)
function validarTelefono($telefono) {
    if (empty($telefono)) return true; // El teléfono es opcional
    return preg_match('/^[0-9]{10,15}$/', $telefono);
}

try {
    $pdo = getDBConnection();
    $userId = $_SESSION['user_id'];
    $action = $_REQUEST['action'] ?? '';

    switch ($action) {
        
        /**
         * OBTENER DATOS DEL USUARIO
         */
        case 'obtener_datos':
            $stmt = $pdo->prepare("
                SELECT id, nombre, email, telefono, rol, 
                       fecha_registro, ultimo_acceso
                FROM usuarios 
                WHERE id = :user_id
            ");
            
            $stmt->execute(['user_id' => $userId]);
            $usuario = $stmt->fetch();

            if ($usuario) {
                echo json_encode([
                    'success' => true,
                    'data' => $usuario
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ]);
            }
            break;

        /**
         * ACTUALIZAR INFORMACIÓN PERSONAL
         */
        case 'actualizar_info':
            // Validar datos recibidos
            $nombre = trim($_POST['nombre'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $telefono = trim($_POST['telefono'] ?? '');

            // Validaciones
            if (empty($nombre)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'El nombre es obligatorio'
                ]);
                break;
            }

            if (empty($email) || !validarEmail($email)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'El correo electrónico no es válido'
                ]);
                break;
            }

            if (!validarTelefono($telefono)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'El teléfono debe contener entre 10 y 15 dígitos'
                ]);
                break;
            }

            // Verificar que el email no esté en uso por otro usuario
            $stmtCheck = $pdo->prepare("
                SELECT id FROM usuarios 
                WHERE email = :email AND id != :user_id
            ");
            $stmtCheck->execute([
                'email' => $email,
                'user_id' => $userId
            ]);

            if ($stmtCheck->fetch()) {
                echo json_encode([
                    'success' => false,
                    'message' => 'El correo electrónico ya está en uso por otro usuario'
                ]);
                break;
            }

            // Actualizar información
            $stmtUpdate = $pdo->prepare("
                UPDATE usuarios 
                SET nombre = :nombre,
                    email = :email,
                    telefono = :telefono
                WHERE id = :user_id
            ");

            $resultado = $stmtUpdate->execute([
                'nombre' => $nombre,
                'email' => $email,
                'telefono' => $telefono,
                'user_id' => $userId
            ]);

            if ($resultado) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Información actualizada correctamente'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al actualizar la información'
                ]);
            }
            break;

        /**
         * CAMBIAR CONTRASEÑA
         */
        case 'cambiar_password':
            $passwordActual = $_POST['password_actual'] ?? '';
            $passwordNueva = $_POST['password_nueva'] ?? '';
            $passwordConfirmar = $_POST['password_confirmar'] ?? '';

            // Validaciones
            if (empty($passwordActual) || empty($passwordNueva) || empty($passwordConfirmar)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Todos los campos son obligatorios'
                ]);
                break;
            }

            if (strlen($passwordNueva) < 8) {
                echo json_encode([
                    'success' => false,
                    'message' => 'La nueva contraseña debe tener al menos 8 caracteres'
                ]);
                break;
            }

            if ($passwordNueva !== $passwordConfirmar) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Las contraseñas no coinciden'
                ]);
                break;
            }

            // Obtener el hash actual de la contraseña
            $stmtGetHash = $pdo->prepare("
                SELECT password_hash FROM usuarios WHERE id = :user_id
            ");
            $stmtGetHash->execute(['user_id' => $userId]);
            $usuario = $stmtGetHash->fetch();

            if (!$usuario) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ]);
                break;
            }

            // Verificar la contraseña actual
            if (!password_verify($passwordActual, $usuario['password_hash'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'La contraseña actual es incorrecta'
                ]);
                break;
            }

            // Hashear la nueva contraseña
            $nuevoHash = password_hash($passwordNueva, PASSWORD_DEFAULT);

            // Actualizar la contraseña
            $stmtUpdatePass = $pdo->prepare("
                UPDATE usuarios 
                SET password_hash = :password_hash
                WHERE id = :user_id
            ");

            $resultado = $stmtUpdatePass->execute([
                'password_hash' => $nuevoHash,
                'user_id' => $userId
            ]);

            if ($resultado) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Contraseña actualizada correctamente'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al actualizar la contraseña'
                ]);
            }
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'Acción no válida'
            ]);
            break;
    }

} catch (PDOException $e) {
    // En producción, no mostrar el error completo
    error_log("Error en gestionar-perfil-capitan.php: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor. Por favor intenta más tarde.'
    ]);
}
?>