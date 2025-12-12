<?php
// Iniciar sesión ANTES de cualquier output
session_start();

// Configurar respuesta JSON
header('Content-Type: application/json; charset=utf-8');

// Desactivar output buffering para evitar espacios en blanco
if (ob_get_level()) {
    ob_end_clean();
}

// Importar conexión a BD
require_once 'db_conexion.php';

// Función auxiliar para enviar respuesta JSON y terminar
function sendJSON($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Verificar que el usuario esté autenticado y sea capitán
if (!isset($_SESSION['user_id']) || !isset($_SESSION['rol'])) {
    sendJSON([
        'success' => false,
        'mensaje' => 'Debes iniciar sesión para continuar.',
        'debug' => 'Sesión no iniciada'
    ]);
}

if ($_SESSION['rol'] !== 'capitan') {
    sendJSON([
        'success' => false,
        'mensaje' => 'Debes ser capitán para registrar un equipo.',
        'debug' => 'Rol incorrecto: ' . $_SESSION['rol']
    ]);
}

$idCapitan = $_SESSION['user_id'];

try {
    $pdo = getDBConnection();

    // Determinar la acción a realizar
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    switch ($action) {
        case 'obtener_torneo':
            obtenerTorneoDisponible($pdo);
            break;

        case 'verificar_equipo':
            verificarEquipoExistente($pdo, $idCapitan);
            break;

        case 'registrar_equipo':
            registrarEquipo($pdo, $idCapitan);
            break;

        default:
            sendJSON([
                'success' => false,
                'mensaje' => 'Acción no válida.',
                'debug' => 'Action recibida: ' . $action
            ]);
            break;
    }

} catch (PDOException $e) {
    sendJSON([
        'success' => false,
        'mensaje' => 'Error de base de datos.',
        'debug' => $e->getMessage()
    ]);
} catch (Exception $e) {
    sendJSON([
        'success' => false,
        'mensaje' => 'Error del servidor.',
        'debug' => $e->getMessage()
    ]);
}

/**
 * Obtiene el torneo más reciente según el tipo de fútbol
 */
function obtenerTorneoDisponible($pdo) {
    $tipoFutbol = $_GET['tipo'] ?? '';

    if (empty($tipoFutbol) || !in_array($tipoFutbol, ['futbol11', 'futbol7'])) {
        sendJSON([
            'success' => false,
            'mensaje' => 'Tipo de fútbol no válido.'
        ]);
    }

    // Buscar el torneo más reciente en estado de inscripción
    $stmt = $pdo->prepare("
        SELECT id, nombre, temporada, tipo_futbol, estado
        FROM torneos
        WHERE tipo_futbol = :tipo_futbol 
        AND estado IN ('inscripcion', 'inactivo')
        ORDER BY fecha_creacion DESC
        LIMIT 1
    ");

    $stmt->execute(['tipo_futbol' => $tipoFutbol]);
    $torneo = $stmt->fetch();

    if ($torneo) {
        sendJSON([
            'success' => true,
            'torneo' => $torneo
        ]);
    } else {
        sendJSON([
            'success' => false,
            'mensaje' => 'No hay torneos disponibles para ' . 
                        ($tipoFutbol === 'futbol11' ? 'Fútbol 11' : 'Fútbol 7') . 
                        ' en este momento.'
        ]);
    }
}

/**
 * Verifica si el capitán ya tiene un equipo registrado
 */
function verificarEquipoExistente($pdo, $idCapitan) {
    $stmt = $pdo->prepare("
        SELECT e.id, e.nombre, e.estado, t.nombre as torneo_nombre
        FROM equipos e
        JOIN torneos t ON e.id_torneo = t.id
        WHERE e.id_capitan = :id_capitan
        AND e.estado IN ('preinscrito', 'confirmado')
        LIMIT 1
    ");

    $stmt->execute(['id_capitan' => $idCapitan]);
    $equipo = $stmt->fetch();

    if ($equipo) {
        sendJSON([
            'success' => true,
            'tiene_equipo' => true,
            'nombre_equipo' => $equipo['nombre'],
            'estado' => $equipo['estado'],
            'torneo' => $equipo['torneo_nombre']
        ]);
    } else {
        sendJSON([
            'success' => true,
            'tiene_equipo' => false
        ]);
    }
}

/**
 * Registra un nuevo equipo
 */
function registrarEquipo($pdo, $idCapitan) {
    // Validar datos recibidos
    $nombreEquipo = trim($_POST['nombreEquipo'] ?? '');
    $tipoFutbol = $_POST['tipoFutbol'] ?? '';
    $escuela = trim($_POST['escuela'] ?? '');
    $idTorneo = intval($_POST['idTorneo'] ?? 0);

    // Validaciones
    if (empty($nombreEquipo)) {
        sendJSON([
            'success' => false,
            'mensaje' => 'El nombre del equipo es obligatorio.'
        ]);
    }

    if (!in_array($tipoFutbol, ['futbol11', 'futbol7'])) {
        sendJSON([
            'success' => false,
            'mensaje' => 'Tipo de fútbol no válido.'
        ]);
    }

    if (empty($escuela)) {
        sendJSON([
            'success' => false,
            'mensaje' => 'La escuela de procedencia es obligatoria.'
        ]);
    }

    if ($idTorneo <= 0) {
        sendJSON([
            'success' => false,
            'mensaje' => 'Torneo no válido.'
        ]);
    }

    // Verificar que el capitán no tenga ya un equipo registrado
    $stmtVerificar = $pdo->prepare("
        SELECT COUNT(*) as total
        FROM equipos
        WHERE id_capitan = :id_capitan
        AND estado IN ('preinscrito', 'confirmado')
    ");
    $stmtVerificar->execute(['id_capitan' => $idCapitan]);
    $resultado = $stmtVerificar->fetch();

    if ($resultado['total'] > 0) {
        sendJSON([
            'success' => false,
            'mensaje' => 'Ya tienes un equipo registrado. Solo puedes registrar un equipo por capitán.'
        ]);
    }

    // Verificar que el torneo existe y está en estado correcto
    $stmtTorneo = $pdo->prepare("
        SELECT id, nombre, tipo_futbol, estado
        FROM torneos
        WHERE id = :id_torneo
        AND tipo_futbol = :tipo_futbol
        AND estado IN ('inscripcion', 'inactivo')
    ");
    $stmtTorneo->execute([
        'id_torneo' => $idTorneo,
        'tipo_futbol' => $tipoFutbol
    ]);
    $torneo = $stmtTorneo->fetch();

    if (!$torneo) {
        sendJSON([
            'success' => false,
            'mensaje' => 'El torneo seleccionado no está disponible para inscripciones.'
        ]);
    }

    // Verificar que no exista otro equipo con el mismo nombre en el torneo
    $stmtNombreDuplicado = $pdo->prepare("
        SELECT COUNT(*) as total
        FROM equipos
        WHERE nombre = :nombre
        AND id_torneo = :id_torneo
    ");
    $stmtNombreDuplicado->execute([
        'nombre' => $nombreEquipo,
        'id_torneo' => $idTorneo
    ]);
    $duplicado = $stmtNombreDuplicado->fetch();

    if ($duplicado['total'] > 0) {
        sendJSON([
            'success' => false,
            'mensaje' => 'Ya existe un equipo con ese nombre en este torneo. Por favor, elige otro nombre.'
        ]);
    }

    // Iniciar transacción
    $pdo->beginTransaction();

    try {
        // Insertar el equipo
        $stmtInsert = $pdo->prepare("
            INSERT INTO equipos (nombre, id_capitan, id_torneo, estado, notas, fecha_inscripcion)
            VALUES (:nombre, :id_capitan, :id_torneo, 'preinscrito', :notas, NOW())
        ");

        $stmtInsert->execute([
            'nombre' => $nombreEquipo,
            'id_capitan' => $idCapitan,
            'id_torneo' => $idTorneo,
            'notas' => 'Escuela: ' . $escuela
        ]);

        $idEquipoNuevo = $pdo->lastInsertId();

        // Confirmar transacción
        $pdo->commit();

        sendJSON([
            'success' => true,
            'mensaje' => '¡Equipo registrado exitosamente! Tu equipo "' . $nombreEquipo . '" ha sido preinscrito al torneo "' . $torneo['nombre'] . '".',
            'id_equipo' => $idEquipoNuevo
        ]);

    } catch (Exception $e) {
        // Revertir transacción en caso de error
        $pdo->rollBack();
        throw $e;
    }
}
?>