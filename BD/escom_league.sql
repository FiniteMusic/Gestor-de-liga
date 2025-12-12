-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 12-12-2025 a las 07:11:47
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `escom_league`
--
CREATE DATABASE IF NOT EXISTS `escom_league` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `escom_league`;

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_estadisticas_equipo` (IN `p_id_partido` INT)   BEGIN
    DECLARE v_id_local INT;
    DECLARE v_id_visitante INT;
    DECLARE v_marcador_local INT;
    DECLARE v_marcador_visitante INT;
    DECLARE v_id_torneo INT;
    DECLARE v_estado VARCHAR(20);
    DECLARE v_equipo_forfeit INT;
    
    -- Obtener datos del partido
    SELECT 
        p.id_equipo_local, 
        p.id_equipo_visitante, 
        p.marcador_local, 
        p.marcador_visitante,
        j.id_torneo,
        p.estado,
        p.equipo_forfeit
    INTO v_id_local, v_id_visitante, v_marcador_local, v_marcador_visitante, v_id_torneo, v_estado, v_equipo_forfeit
    FROM partidos p
    JOIN jornadas j ON p.id_jornada = j.id
    WHERE p.id = p_id_partido;
    
    -- Si es forfeit, asignar resultado 3-0
    IF v_estado = 'forfeit' THEN
        IF v_equipo_forfeit = v_id_local THEN
            SET v_marcador_local = 0;
            SET v_marcador_visitante = 3;
        ELSE
            SET v_marcador_local = 3;
            SET v_marcador_visitante = 0;
        END IF;
    END IF;
    
    -- Recalcular todas las estadísticas del torneo
    CALL sp_recalcular_estadisticas_torneo(v_id_torneo);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_avanzar_ganador` (IN `p_id_partido` INT)   proc_label: BEGIN
    /* DECLARACIONES (al inicio) */
    DECLARE v_id_jornada INT;
    DECLARE v_id_torneo INT;
    DECLARE v_ronda VARCHAR(20);
    DECLARE v_marcador_local INT;
    DECLARE v_marcador_visitante INT;
    DECLARE v_estado VARCHAR(20);
    DECLARE v_equipo_local INT;
    DECLARE v_equipo_visitante INT;
    DECLARE v_equipo_forfeit INT;
    DECLARE v_ganador INT;

    /* 1) Obtener datos del partido */
    SELECT 
        p.id_jornada,
        j.id_torneo,
        j.tipo AS ronda,
        p.marcador_local,
        p.marcador_visitante,
        p.estado,
        p.id_equipo_local,
        p.id_equipo_visitante,
        p.equipo_forfeit
    INTO 
        v_id_jornada,
        v_id_torneo,
        v_ronda,
        v_marcador_local,
        v_marcador_visitante,
        v_estado,
        v_equipo_local,
        v_equipo_visitante,
        v_equipo_forfeit
    FROM partidos p
    INNER JOIN jornadas j ON p.id_jornada = j.id
    WHERE p.id = p_id_partido;

    /* 2) Validar que sea eliminatoria (si no, salir) */
    IF v_ronda NOT IN ('cuartos','semifinal','final','tercer_lugar') THEN
        LEAVE proc_label;
    END IF;

    /* 3) Determinar ganador */
    IF v_estado = 'forfeit' THEN
        IF v_equipo_forfeit IS NOT NULL AND v_equipo_forfeit = v_equipo_local THEN
            SET v_ganador = v_equipo_visitante;
        ELSE
            SET v_ganador = v_equipo_local;
        END IF;
    ELSE
        /* Asumimos que en eliminatoria no quedan empates al momento de marcar finalizado */
        IF v_marcador_local > v_marcador_visitante THEN
            SET v_ganador = v_equipo_local;
        ELSE
            SET v_ganador = v_equipo_visitante;
        END IF;
    END IF;

    /* 4) Actualizar partido hijo donde este partido aparece como origen local */
    UPDATE partidos AS h
    INNER JOIN fase_eliminacion AS fe_local ON fe_local.id_partido = h.id
    SET h.id_equipo_local = v_ganador
    WHERE fe_local.id_partido_origen_local = p_id_partido;

    /* 5) Actualizar partido hijo donde este partido aparece como origen visitante */
    UPDATE partidos AS h2
    INNER JOIN fase_eliminacion AS fe_vis ON fe_vis.id_partido = h2.id
    SET h2.id_equipo_visitante = v_ganador
    WHERE fe_vis.id_partido_origen_visitante = p_id_partido;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generar_calendario_completo` (IN `p_id_torneo` INT, IN `p_fecha_inicio` DATE)   BEGIN
    DECLARE v_total_equipos INT;
    DECLARE v_num_jornadas INT;
    DECLARE v_partidos_por_jornada INT;
    DECLARE v_id_jornada INT;
    DECLARE v_fecha_actual DATE;
    DECLARE v_hora_actual TIME;

    DECLARE v_id_equipo_local INT;
    DECLARE v_id_equipo_visitante INT;

    DECLARE v_ronda INT DEFAULT 1;
    DECLARE v_partido_en_ronda INT;

    -- Crear tabla temporal
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_equipos (
        posicion INT AUTO_INCREMENT PRIMARY KEY,
        id_equipo INT
    );

    TRUNCATE TABLE temp_equipos;

    -- Contar equipos
    SELECT COUNT(*) INTO v_total_equipos
    FROM equipos
    WHERE id_torneo = p_id_torneo
      AND estado IN ('confirmado');

    IF v_total_equipos < 2 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Se requieren al menos 2 equipos para generar el calendario';
    END IF;

    INSERT INTO temp_equipos (id_equipo)
    SELECT id
    FROM equipos
    WHERE id_torneo = p_id_torneo AND estado IN ('confirmado')
    ORDER BY id;

    -- Si impar → agregar BYE
    IF v_total_equipos % 2 = 1 THEN
        INSERT INTO temp_equipos (id_equipo) VALUES (NULL);
        SET v_total_equipos = v_total_equipos + 1;
    END IF;

    -- Calcular jornadas
    SET v_num_jornadas = v_total_equipos - 1;
    SET v_partidos_por_jornada = v_total_equipos / 2;

    -- Limpiar calendario anterior
    DELETE p FROM partidos p
    INNER JOIN jornadas j ON p.id_jornada = j.id
    WHERE j.id_torneo = p_id_torneo;

    DELETE FROM jornadas WHERE id_torneo = p_id_torneo;

    -- INICIA EN LA FECHA QUE SELECCIONASTE
    SET v_fecha_actual = p_fecha_inicio;

    -- Asegurar que la jornada comience en lunes
    WHILE WEEKDAY(v_fecha_actual) != 0 DO
        SET v_fecha_actual = DATE_ADD(v_fecha_actual, INTERVAL 1 DAY);
    END WHILE;

    -- GENERAR TODAS LAS JORNADAS
    WHILE v_ronda <= v_num_jornadas DO

        -- Fecha fin: viernes de esa semana
        SET @fecha_fin_jornada = DATE_ADD(v_fecha_actual, INTERVAL (4 - WEEKDAY(v_fecha_actual)) DAY);

        INSERT INTO jornadas (id_torneo, numero_jornada, nombre, tipo, fecha_inicio, fecha_fin, publicada)
        VALUES (
            p_id_torneo,
            v_ronda,
            CONCAT('Jornada ', v_ronda),
            'regular',
            v_fecha_actual,
            @fecha_fin_jornada,
            TRUE
        );

        SET v_id_jornada = LAST_INSERT_ID();

        -- INICIO DE HORARIOS PARA LOS PARTIDOS
        SET v_hora_actual = '10:30:00';

        -- FECHA INTERNA DE LA JORNADA = lunes actual (NO RESETEAR)
        SET @fecha_jornada = v_fecha_actual;

        -- GENERAR PARTIDOS DE ESTA JORNADA
        SET v_partido_en_ronda = 0;

        WHILE v_partido_en_ronda < v_partidos_por_jornada DO

            -- ROUND ROBIN MATCHING
            IF v_partido_en_ronda = 0 THEN
                
                SELECT id_equipo INTO v_id_equipo_local 
                FROM temp_equipos WHERE posicion = 1;

                SELECT id_equipo INTO v_id_equipo_visitante
                FROM temp_equipos
                WHERE posicion = (v_ronda % v_total_equipos) + 1;

            ELSE
                SET @pos_local = ((v_ronda + v_partido_en_ronda - 1) % (v_total_equipos - 1)) + 2;
                SET @pos_visitante = ((v_ronda - v_partido_en_ronda - 1 + v_total_equipos - 1) % (v_total_equipos - 1)) + 2;

                SELECT id_equipo INTO v_id_equipo_local 
                FROM temp_equipos WHERE posicion = @pos_local;

                SELECT id_equipo INTO v_id_equipo_visitante
                FROM temp_equipos WHERE posicion = @pos_visitante;
            END IF;

            -- Saltar BYE
            IF v_id_equipo_local IS NOT NULL AND v_id_equipo_visitante IS NOT NULL THEN

                INSERT INTO partidos (
                    id_jornada,
                    id_equipo_local,
                    id_equipo_visitante,
                    fecha_partido,
                    lugar,
                    estado
                )
                VALUES (
                    v_id_jornada,
                    v_id_equipo_local,
                    v_id_equipo_visitante,
                    TIMESTAMP(@fecha_jornada, v_hora_actual),
                    'Cancha ESCOM',
                    'programado'
                );

                -- Avanzar hora
                SET v_hora_actual = ADDTIME(v_hora_actual, '01:30:00');

                -- Si ya se pasó de 15:00 → siguiente día
                IF v_hora_actual > '15:00:00' THEN
                    SET @fecha_jornada = DATE_ADD(@fecha_jornada, INTERVAL 1 DAY);
                    SET v_hora_actual = '10:30:00';
                END IF;

                -- Si cae sábado o domingo → bríncalo a lunes
                IF WEEKDAY(@fecha_jornada) > 4 THEN
                    SET @fecha_jornada = DATE_ADD(@fecha_jornada, INTERVAL (7 - WEEKDAY(@fecha_jornada)) DAY);
                END IF;

            END IF;

            SET v_partido_en_ronda = v_partido_en_ronda + 1;

        END WHILE;

        -- Cambiar a la SIGUIENTE SEMANA
        SET v_fecha_actual = DATE_ADD(@fecha_fin_jornada, INTERVAL 3 DAY);

        -- Asegurar que empieza en lunes
        WHILE WEEKDAY(v_fecha_actual) != 0 DO
            SET v_fecha_actual = DATE_ADD(v_fecha_actual, INTERVAL 1 DAY);
        END WHILE;

        SET v_ronda = v_ronda + 1;

    END WHILE;

    UPDATE torneos
    SET estado = 'en_curso',
        fecha_inicio = p_fecha_inicio,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = p_id_torneo;

    DROP TEMPORARY TABLE IF EXISTS temp_equipos;

    SELECT CONCAT('Calendario generado con éxito: ', v_num_jornadas,
                  ' jornadas con ', v_partidos_por_jornada,
                  ' partidos por jornada') AS resultado;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generar_fase_eliminatoria` (IN `p_id_torneo` INT)   BEGIN
    -- ========== DECLARACIONES (deben ir primero) ==========
    DECLARE v_num_equipos INT;
    DECLARE v_fecha_base DATE;
    DECLARE v_jornada_id INT;
    DECLARE v_partido_id INT;
    DECLARE i INT DEFAULT 0;
    DECLARE semi1 INT;
    DECLARE semi2 INT;
    DECLARE tmp_count INT;

    -- =============================
    -- 1) OBTENER NUM_EQUIPOS
    -- =============================
    SELECT num_equipos_fase_final INTO v_num_equipos
    FROM torneos
    WHERE id = p_id_torneo;

    IF v_num_equipos IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Torneo no encontrado o num_equipos_fase_final es NULL';
    END IF;

    IF v_num_equipos NOT IN (2,4,8,16) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'num_equipos_fase_final debe ser 2,4,8 o 16.';
    END IF;

    SET v_fecha_base = CURRENT_DATE;

    -- =============================
    -- 2) LIMPIAR FASE FINAL ANTERIOR
    -- =============================
    DELETE fe FROM fase_eliminacion fe WHERE fe.id_torneo = p_id_torneo;
    DELETE p FROM partidos p 
    INNER JOIN jornadas j ON p.id_jornada = j.id
    WHERE j.id_torneo = p_id_torneo AND j.tipo IN ('octavos','cuartos','semifinal','final','tercer_lugar');
    DELETE FROM jornadas WHERE id_torneo = p_id_torneo AND tipo IN ('octavos','cuartos','semifinal','final','tercer_lugar');

    -- =============================
    -- 3) OBTENER CLASIFICADOS (EN TABLA TEMPORAL CON RN)
    -- =============================
    DROP TEMPORARY TABLE IF EXISTS tmp_clasificados;
    CREATE TEMPORARY TABLE tmp_clasificados (
        rn INT NOT NULL PRIMARY KEY,
        id_equipo INT NOT NULL
    ) ENGINE=MEMORY;

    /* Rellenar tmp_clasificados con fila numerada según posicion */
    SET @r := 0;
    INSERT INTO tmp_clasificados (rn, id_equipo)
    SELECT (@r := @r + 1) AS rn, id_equipo
    FROM (
        SELECT ee.id_equipo
        FROM estadisticas_equipos ee
        WHERE ee.id_torneo = p_id_torneo
        ORDER BY ee.posicion ASC
        LIMIT v_num_equipos
    ) AS sel;

    SELECT COUNT(*) INTO tmp_count FROM tmp_clasificados;
    IF tmp_count < v_num_equipos THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay suficientes equipos confirmados/clasificados para la fase final';
    END IF;

    -- =============================
    -- 4) CREAR JORNADAS (cuartos/semis/final/tercer_lugar)
    -- =============================
    DROP TEMPORARY TABLE IF EXISTS tmp_jornadas;
    CREATE TEMPORARY TABLE tmp_jornadas (
        tipo VARCHAR(20) PRIMARY KEY,
        id_jornada INT
    ) ENGINE=MEMORY;

    INSERT INTO jornadas (id_torneo, numero_jornada, nombre, tipo, fecha_inicio, fecha_fin, publicada)
    VALUES (p_id_torneo, 100, 'Cuartos de final', 'cuartos', v_fecha_base, v_fecha_base, 1);
    INSERT INTO tmp_jornadas VALUES ('cuartos', LAST_INSERT_ID());

    INSERT INTO jornadas (id_torneo, numero_jornada, nombre, tipo, fecha_inicio, fecha_fin, publicada)
    VALUES (p_id_torneo, 101, 'Semifinales', 'semifinal', v_fecha_base, v_fecha_base, 1);
    INSERT INTO tmp_jornadas VALUES ('semifinal', LAST_INSERT_ID());

    INSERT INTO jornadas (id_torneo, numero_jornada, nombre, tipo, fecha_inicio, fecha_fin, publicada)
    VALUES (p_id_torneo, 102, 'Final', 'final', v_fecha_base, v_fecha_base, 1);
    INSERT INTO tmp_jornadas VALUES ('final', LAST_INSERT_ID());

    INSERT INTO jornadas (id_torneo, numero_jornada, nombre, tipo, fecha_inicio, fecha_fin, publicada)
    VALUES (p_id_torneo, 103, 'Tercer lugar', 'tercer_lugar', v_fecha_base, v_fecha_base, 1);
    INSERT INTO tmp_jornadas VALUES ('tercer_lugar', LAST_INSERT_ID());

    -- =============================
    -- 5) CREAR PARTIDOS DE CUARTOS (si aplica)
    -- =============================
    IF v_num_equipos = 8 THEN
        SET i = 1;
        WHILE i <= 4 DO
            SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='cuartos' LIMIT 1;

            INSERT INTO partidos (id_jornada, id_equipo_local, id_equipo_visitante, fecha_partido, lugar, estado)
            VALUES (
                v_jornada_id,
                (SELECT id_equipo FROM tmp_clasificados WHERE rn = i),
                (SELECT id_equipo FROM tmp_clasificados WHERE rn = (v_num_equipos - i + 1)),
                TIMESTAMP(v_fecha_base, CONCAT(LPAD(9 + i,2,'0'),':00:00')),
                'Cancha ESCOM',
                'programado'
            );

            SET v_partido_id = LAST_INSERT_ID();

            INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido)
            VALUES (p_id_torneo, 'cuartos', i, v_partido_id);

            SET i = i + 1;
        END WHILE;
    END IF;

    -- Si v_num_equipos = 4, interpretamos que se empiezan en semifinales directas
    IF v_num_equipos = 4 THEN
        -- crear 2 partidos directamente con pares 1v4 y 2v3
        SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='semifinal' LIMIT 1;
        INSERT INTO partidos (id_jornada, id_equipo_local, id_equipo_visitante, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, (SELECT id_equipo FROM tmp_clasificados WHERE rn=1), (SELECT id_equipo FROM tmp_clasificados WHERE rn=4), TIMESTAMP(v_fecha_base,'10:00:00'), 'Cancha ESCOM','programado');
        SET v_partido_id = LAST_INSERT_ID();
        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido) VALUES (p_id_torneo,'semifinal',1,v_partido_id);

        INSERT INTO partidos (id_jornada, id_equipo_local, id_equipo_visitante, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, (SELECT id_equipo FROM tmp_clasificados WHERE rn=2), (SELECT id_equipo FROM tmp_clasificados WHERE rn=3), TIMESTAMP(v_fecha_base,'12:00:00'), 'Cancha ESCOM','programado');
        SET v_partido_id = LAST_INSERT_ID();
        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido) VALUES (p_id_torneo,'semifinal',2,v_partido_id);
    END IF;

    -- Si v_num_equipos = 2 -> final directa
    IF v_num_equipos = 2 THEN
        SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='final' LIMIT 1;
        INSERT INTO partidos (id_jornada, id_equipo_local, id_equipo_visitante, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, (SELECT id_equipo FROM tmp_clasificados WHERE rn=1), (SELECT id_equipo FROM tmp_clasificados WHERE rn=2), TIMESTAMP(v_fecha_base,'16:00:00'), 'Cancha ESCOM','programado');
        SET v_partido_id = LAST_INSERT_ID();
        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido) VALUES (p_id_torneo,'final',1,v_partido_id);
    END IF;

    -- =============================
    -- 6) CREAR SEMIFINALES (si hay cuartos)
    -- =============================
    IF v_num_equipos = 8 THEN
        -- obtener ids de cuartos
        SELECT id_partido INTO semi1 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='cuartos' AND numero_llave=1;
        SELECT id_partido INTO semi2 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='cuartos' AND numero_llave=2;

        SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='semifinal' LIMIT 1;

        INSERT INTO partidos (id_jornada, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, TIMESTAMP(v_fecha_base,'12:00:00'), 'Cancha ESCOM', 'programado');
        SET v_partido_id = LAST_INSERT_ID();
        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido, id_partido_origen_local, id_partido_origen_visitante)
        VALUES (p_id_torneo, 'semifinal', 1, v_partido_id, semi1, semi2);

        SELECT id_partido INTO semi1 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='cuartos' AND numero_llave=3;
        SELECT id_partido INTO semi2 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='cuartos' AND numero_llave=4;

        INSERT INTO partidos (id_jornada, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, TIMESTAMP(v_fecha_base,'14:00:00'), 'Cancha ESCOM', 'programado');
        SET v_partido_id = LAST_INSERT_ID();
        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido, id_partido_origen_local, id_partido_origen_visitante)
        VALUES (p_id_torneo, 'semifinal', 2, v_partido_id, semi1, semi2);
    END IF;

    -- =============================
    -- 7) CREAR FINAL y TERCER LUGAR (si aplica)
    -- =============================
    -- final
    IF v_num_equipos IN (4,8,16) OR v_num_equipos = 2 THEN
        -- obtener semifinales (si v_num_equipos=4 las semifinales ya fueron creadas; si =2, no hay semifinales pero se creó final antes)
        IF v_num_equipos <> 2 THEN
            SELECT id_partido INTO semi1 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='semifinal' AND numero_llave=1;
            SELECT id_partido INTO semi2 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='semifinal' AND numero_llave=2;
        END IF;

        SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='final' LIMIT 1;

        INSERT INTO partidos (id_jornada, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, TIMESTAMP(v_fecha_base,'16:00:00'), 'Cancha ESCOM', 'programado');
        SET v_partido_id = LAST_INSERT_ID();

        IF v_num_equipos = 2 THEN
            -- si v_num_equipos=2, ya asigné equipos en la creación anterior; aquí solo vinculamos orígenes null
            INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido)
            VALUES (p_id_torneo, 'final', 1, v_partido_id);
        ELSE
            INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido, id_partido_origen_local, id_partido_origen_visitante)
            VALUES (p_id_torneo, 'final', 1, v_partido_id, semi1, semi2);
        END IF;
    END IF;

    -- tercer lugar (si hay semifinales)
    IF (v_num_equipos = 4 OR v_num_equipos = 8) THEN
        SELECT id_jornada INTO v_jornada_id FROM tmp_jornadas WHERE tipo='tercer_lugar' LIMIT 1;

        INSERT INTO partidos (id_jornada, fecha_partido, lugar, estado)
        VALUES (v_jornada_id, TIMESTAMP(v_fecha_base,'18:00:00'), 'Cancha ESCOM', 'programado');
        SET v_partido_id = LAST_INSERT_ID();

        -- usar las semifinales como origen para tercer lugar
        SELECT id_partido INTO semi1 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='semifinal' AND numero_llave=1;
        SELECT id_partido INTO semi2 FROM fase_eliminacion WHERE id_torneo = p_id_torneo AND ronda='semifinal' AND numero_llave=2;

        INSERT INTO fase_eliminacion (id_torneo, ronda, numero_llave, id_partido, id_partido_origen_local, id_partido_origen_visitante)
        VALUES (p_id_torneo, 'tercer_lugar', 1, v_partido_id, semi1, semi2);
    END IF;

    -- =============================
    -- 8) LIMPIEZA TEMPORALES
    -- =============================
    DROP TEMPORARY TABLE IF EXISTS tmp_clasificados;
    DROP TEMPORARY TABLE IF EXISTS tmp_jornadas;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_recalcular_estadisticas_torneo` (IN `p_id_torneo` INT)   BEGIN
    -- 1) Limpiar estadísticas existentes para el torneo
    DELETE FROM estadisticas_equipos WHERE id_torneo = p_id_torneo;
    
    -- 2) Insertar estadísticas base para todos los equipos confirmados
    INSERT INTO estadisticas_equipos (id_equipo, id_torneo)
    SELECT id, p_id_torneo
    FROM equipos
    WHERE id_torneo = p_id_torneo AND estado = 'confirmado';
    
    -- 3) Actualizar estadísticas basadas en partidos finalizados
    UPDATE estadisticas_equipos ee
    JOIN (
        SELECT 
            e.id AS id_equipo,
            COUNT(DISTINCT p.id) AS pj,
            SUM(CASE 
                WHEN (p.id_equipo_local = e.id AND p.marcador_local > p.marcador_visitante) OR 
                     (p.id_equipo_visitante = e.id AND p.marcador_visitante > p.marcador_local) 
                THEN 1 ELSE 0 END) AS pg,
            SUM(CASE 
                WHEN p.marcador_local = p.marcador_visitante 
                THEN 1 ELSE 0 END) AS pe,
            SUM(CASE 
                WHEN (p.id_equipo_local = e.id AND p.marcador_local < p.marcador_visitante) OR 
                     (p.id_equipo_visitante = e.id AND p.marcador_visitante < p.marcador_local) 
                THEN 1 ELSE 0 END) AS pp,
            SUM(CASE 
                WHEN p.id_equipo_local = e.id THEN p.marcador_local 
                WHEN p.id_equipo_visitante = e.id THEN p.marcador_visitante 
                ELSE 0 END) AS gf,
            SUM(CASE 
                WHEN p.id_equipo_local = e.id THEN p.marcador_visitante 
                WHEN p.id_equipo_visitante = e.id THEN p.marcador_local 
                ELSE 0 END) AS gc
        FROM equipos e
        JOIN partidos p ON (p.id_equipo_local = e.id OR p.id_equipo_visitante = e.id)
        JOIN jornadas j ON p.id_jornada = j.id
        WHERE j.id_torneo = p_id_torneo AND p.estado IN ('finalizado', 'forfeit')
        GROUP BY e.id
    ) AS stats ON ee.id_equipo = stats.id_equipo
    SET 
        ee.partidos_jugados = COALESCE(stats.pj,0),
        ee.partidos_ganados = COALESCE(stats.pg,0),
        ee.partidos_empatados = COALESCE(stats.pe,0),
        ee.partidos_perdidos = COALESCE(stats.pp,0),
        ee.goles_favor = COALESCE(stats.gf,0),
        ee.goles_contra = COALESCE(stats.gc,0),
        ee.puntos = (COALESCE(stats.pg,0) * 3) + (COALESCE(stats.pe,0) * 1)
    WHERE ee.id_torneo = p_id_torneo;
    
    -- 4) Asegurar que equipos sin partidos queden con 0 en campos numéricos (por si no entraron en el JOIN anterior)
    UPDATE estadisticas_equipos
    SET partidos_jugados = COALESCE(partidos_jugados,0),
        partidos_ganados = COALESCE(partidos_ganados,0),
        partidos_empatados = COALESCE(partidos_empatados,0),
        partidos_perdidos = COALESCE(partidos_perdidos,0),
        goles_favor = COALESCE(goles_favor,0),
        goles_contra = COALESCE(goles_contra,0),
        puntos = COALESCE(puntos,0)
    WHERE id_torneo = p_id_torneo;
    
        -- 5) Calcular posiciones (reset variable de ranking)
    SET @pos = 0;
    UPDATE estadisticas_equipos ee
    JOIN (
        SELECT id, (@pos := @pos + 1) AS nueva_posicion
        FROM estadisticas_equipos
        WHERE id_torneo = p_id_torneo
        ORDER BY puntos DESC, (goles_favor - goles_contra) DESC, goles_favor DESC
    ) AS posiciones ON ee.id = posiciones.id
    SET ee.posicion = posiciones.nueva_posicion
    WHERE ee.id_torneo = p_id_torneo;
		
       -- 6) Calcular últimos 5 resultados
UPDATE estadisticas_equipos ee
INNER JOIN (
    SELECT 
        equipo_id,
        GROUP_CONCAT(resultado ORDER BY fecha DESC SEPARATOR '') AS ultimos_resultados
    FROM (
        SELECT 
            CASE 
                WHEN p.id_equipo_local = e.id_equipo THEN p.id_equipo_local
                ELSE p.id_equipo_visitante
            END AS equipo_id,
            CASE
                WHEN (p.id_equipo_local = e.id_equipo AND p.marcador_local > p.marcador_visitante)
                    OR (p.id_equipo_visitante = e.id_equipo AND p.marcador_visitante > p.marcador_local)
                    THEN 'G'
                WHEN p.marcador_local = p.marcador_visitante
                    THEN 'E'
                ELSE 'P'
            END AS resultado,
            p.fecha_partido AS fecha,
            ROW_NUMBER() OVER (
                PARTITION BY CASE 
                    WHEN p.id_equipo_local = e.id_equipo THEN p.id_equipo_local
                    ELSE p.id_equipo_visitante
                END 
                ORDER BY p.fecha_partido DESC
            ) AS rn
        FROM estadisticas_equipos e
        JOIN jornadas j ON j.id_torneo = e.id_torneo
        JOIN partidos p ON p.id_jornada = j.id
            AND (p.id_equipo_local = e.id_equipo OR p.id_equipo_visitante = e.id_equipo)
        WHERE e.id_torneo = p_id_torneo
          AND p.estado IN ('finalizado', 'forfeit')
    ) AS partidos_recientes
    WHERE rn <= 5
    GROUP BY equipo_id
) AS resultados ON ee.id_equipo = resultados.equipo_id
SET ee.ultimos_5_resultados = resultados.ultimos_resultados
WHERE ee.id_torneo = p_id_torneo;
    
    -- 7) Actualizar timestamp de la tabla de torneos (opcional)
    UPDATE torneos
    SET fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = p_id_torneo;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `anuncios`
--

CREATE TABLE `anuncios` (
  `id` int(11) NOT NULL,
  `id_torneo` int(11) DEFAULT NULL,
  `titulo` varchar(200) NOT NULL,
  `contenido` text NOT NULL,
  `tipo` enum('informativo','urgente','suspension','cambio_horario') NOT NULL DEFAULT 'informativo',
  `visible` tinyint(1) DEFAULT 1,
  `fecha_inicio` datetime DEFAULT current_timestamp(),
  `fecha_fin` datetime DEFAULT NULL,
  `id_autor` int(11) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `anuncios`
--

INSERT INTO `anuncios` (`id`, `id_torneo`, `titulo`, `contenido`, `tipo`, `visible`, `fecha_inicio`, `fecha_fin`, `id_autor`, `fecha_creacion`) VALUES
(7, 5, 'Periodo de Inscripciones abierto', 'Inician las inscripciones.\r\n¡Inscribe a tu equipo!\r\nCategorías:\r\n* Fútbol 11\r\n* Fútbol 7', 'informativo', 1, '2025-12-11 21:38:05', '2025-12-13 00:00:00', 1, '2025-12-12 03:38:05'),
(8, NULL, 'Inicio de Inscripciones - Torneo Primavera 2026', '¡Bienvenidos al nuevo torneo!\r\n\r\n📋 Información General:\r\n• Fecha de inicio: 15 de Enero 2026\r\n• Modalidad: Fútbol 7\r\n• Categoría: Libre\r\n\r\n📝 Requisitos de Inscripción:\r\n1. Equipo completo (mínimo 7 jugadores)\r\n2. Identificación oficial del capitán\r\n3. Pago de inscripción: $500 MXN\r\n\r\n⏰ Fechas Importantes:\r\n- Inscripciones: 20 Dic 2025 - 10 Ene 2026\r\n- Sorteo de grupos: 12 Enero 2026\r\n- Primera jornada: 15 Enero 2026\r\n\r\nPara más información, contacta a:\r\n📧 contacto@escomleague.mx\r\n📱 55-1234-5678\r\n\r\n¡Los esperamos!', 'informativo', 1, '2025-12-11 21:43:51', '2026-01-10 23:59:59', 1, '2025-12-12 03:43:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_sistema`
--

CREATE TABLE `configuracion_sistema` (
  `id` int(11) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `valor` text DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_sistema`
--

INSERT INTO `configuracion_sistema` (`id`, `clave`, `valor`, `descripcion`, `fecha_actualizacion`) VALUES
(1, 'puntos_victoria', '3', 'Puntos otorgados por victoria', '2025-12-06 20:38:43'),
(2, 'puntos_empate', '1', 'Puntos otorgados por empate', '2025-12-06 20:38:43'),
(3, 'puntos_derrota', '0', 'Puntos otorgados por derrota', '2025-12-06 20:38:43'),
(4, 'marcador_forfeit', '3-0', 'Marcador por defecto en caso de forfeit', '2025-12-06 20:38:43'),
(5, 'max_equipos_torneo', '20', 'Máximo de equipos por torneo', '2025-12-06 20:38:43'),
(6, 'minutos_tolerancia', '15', 'Minutos de tolerancia antes de forfeit', '2025-12-06 20:38:43');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos`
--

CREATE TABLE `equipos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `id_capitan` int(11) NOT NULL,
  `id_torneo` int(11) NOT NULL,
  `estado` enum('preinscrito','confirmado','eliminado','descalificado') NOT NULL DEFAULT 'preinscrito',
  `fecha_inscripcion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_confirmacion` timestamp NULL DEFAULT NULL,
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `equipos`
--

INSERT INTO `equipos` (`id`, `nombre`, `id_capitan`, `id_torneo`, `estado`, `fecha_inscripcion`, `fecha_confirmacion`, `notas`) VALUES
(125, 'Atlético Halcones', 38, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(126, 'Deportivo Centellas', 39, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(127, 'Real Gladiadores', 40, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(128, 'Club Titanes', 41, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(129, 'Fuerza Azul FC', 42, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(130, 'Estudiantes FC', 43, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(131, 'Juventus ESCO', 44, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(132, 'Leones Negros', 45, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(133, 'Cobra Kai FC', 46, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(134, 'Raptors United', 47, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(135, 'Vikingos del Norte', 48, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(136, 'Inter Lagunilla', 49, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(137, 'Panteras Rojas', 50, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(138, 'Toros Salvajes', 51, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(139, 'Águilas Imperiales', 52, 4, 'preinscrito', '2025-12-11 07:39:51', NULL, NULL),
(140, 'Atlético Reforma', 53, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:47:57', NULL),
(141, 'Deportivo Condores', 54, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:18', NULL),
(142, 'Real Mineros', 55, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:47:46', NULL),
(143, 'Club Guerreros', 56, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:03', NULL),
(144, 'Escuadrón Tricolor', 57, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:24', NULL),
(145, 'Nómadas FC', 58, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:47:51', NULL),
(146, 'Dragones del Valle', 59, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:10', NULL),
(147, 'Sporting Solaris', 60, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:30', NULL),
(148, 'Atléticos del Sur', 61, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:00', NULL),
(149, 'Club Montañeses', 62, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:20', NULL),
(150, 'Tiburones Dorados', 63, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:47:48', NULL),
(151, 'Revolución FC', 64, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:06', NULL),
(152, 'Fénix Imperial', 65, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:27', NULL),
(153, 'Rojos de Aragón', 66, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:47:54', NULL),
(154, 'Club Horizonte', 67, 5, 'confirmado', '2025-12-11 07:39:51', '2025-12-11 07:48:13', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estadisticas_equipos`
--

CREATE TABLE `estadisticas_equipos` (
  `id` int(11) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  `id_torneo` int(11) NOT NULL,
  `partidos_jugados` int(11) DEFAULT 0,
  `partidos_ganados` int(11) DEFAULT 0,
  `partidos_empatados` int(11) DEFAULT 0,
  `partidos_perdidos` int(11) DEFAULT 0,
  `goles_favor` int(11) DEFAULT 0,
  `goles_contra` int(11) DEFAULT 0,
  `diferencia_goles` int(11) GENERATED ALWAYS AS (`goles_favor` - `goles_contra`) STORED,
  `puntos` int(11) DEFAULT 0,
  `posicion` int(11) DEFAULT NULL,
  `ultimos_5_resultados` varchar(10) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `estadisticas_equipos`
--

INSERT INTO `estadisticas_equipos` (`id`, `id_equipo`, `id_torneo`, `partidos_jugados`, `partidos_ganados`, `partidos_empatados`, `partidos_perdidos`, `goles_favor`, `goles_contra`, `puntos`, `posicion`, `ultimos_5_resultados`, `fecha_actualizacion`) VALUES
(91, 140, 5, 1, 1, 0, 0, 3, 1, 3, 2, 'G', '2025-12-11 08:20:59'),
(92, 141, 5, 1, 0, 0, 1, 1, 3, 0, 13, 'P', '2025-12-11 08:20:59'),
(93, 142, 5, 0, 0, 0, 0, 0, 0, 0, 10, NULL, '2025-12-11 08:20:59'),
(94, 143, 5, 1, 0, 0, 1, 2, 3, 0, 12, 'P', '2025-12-11 08:20:59'),
(95, 144, 5, 1, 0, 1, 0, 1, 1, 1, 7, 'E', '2025-12-11 08:20:59'),
(96, 145, 5, 1, 1, 0, 0, 4, 1, 3, 1, 'G', '2025-12-11 08:20:59'),
(97, 146, 5, 1, 0, 1, 0, 0, 0, 1, 8, 'E', '2025-12-11 08:20:59'),
(98, 147, 5, 1, 1, 0, 0, 2, 0, 3, 3, 'G', '2025-12-11 08:20:59'),
(99, 148, 5, 1, 0, 0, 1, 3, 4, 0, 11, 'P', '2025-12-11 08:20:59'),
(100, 149, 5, 1, 1, 0, 0, 4, 3, 3, 4, 'G', '2025-12-11 08:20:59'),
(101, 150, 5, 1, 0, 0, 1, 0, 2, 0, 14, 'P', '2025-12-11 08:20:59'),
(102, 151, 5, 1, 0, 1, 0, 0, 0, 1, 9, 'E', '2025-12-11 08:20:59'),
(103, 152, 5, 1, 0, 0, 1, 1, 4, 0, 15, 'P', '2025-12-11 08:20:59'),
(104, 153, 5, 1, 0, 1, 0, 1, 1, 1, 6, 'E', '2025-12-11 08:20:59'),
(105, 154, 5, 1, 1, 0, 0, 3, 2, 3, 5, 'G', '2025-12-11 08:20:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fase_eliminacion`
--

CREATE TABLE `fase_eliminacion` (
  `id` int(11) NOT NULL,
  `id_torneo` int(11) NOT NULL,
  `ronda` enum('octavos','cuartos','semifinal','final','tercer_lugar') NOT NULL,
  `numero_llave` int(11) NOT NULL,
  `id_partido` int(11) NOT NULL,
  `id_partido_origen_local` int(11) DEFAULT NULL,
  `id_partido_origen_visitante` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_partidos`
--

CREATE TABLE `historial_partidos` (
  `id` int(11) NOT NULL,
  `id_partido` int(11) NOT NULL,
  `marcador_local_anterior` int(11) DEFAULT NULL,
  `marcador_visitante_anterior` int(11) DEFAULT NULL,
  `marcador_local_nuevo` int(11) DEFAULT NULL,
  `marcador_visitante_nuevo` int(11) DEFAULT NULL,
  `estado_anterior` varchar(20) DEFAULT NULL,
  `estado_nuevo` varchar(20) DEFAULT NULL,
  `motivo` text DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial_partidos`
--

INSERT INTO `historial_partidos` (`id`, `id_partido`, `marcador_local_anterior`, `marcador_visitante_anterior`, `marcador_local_nuevo`, `marcador_visitante_nuevo`, `estado_anterior`, `estado_nuevo`, `motivo`, `id_usuario`, `fecha_modificacion`) VALUES
(1, 122, NULL, NULL, 3, 1, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:03'),
(2, 123, NULL, NULL, 2, 3, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:15'),
(3, 124, NULL, NULL, 1, 1, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:21'),
(4, 125, NULL, NULL, 4, 1, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:34'),
(5, 126, NULL, NULL, 0, 0, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:43'),
(6, 127, NULL, NULL, 2, 0, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:51'),
(7, 128, NULL, NULL, 3, 4, 'programado', 'finalizado', 'Captura de resultado', 1, '2025-12-11 08:20:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `jornadas`
--

CREATE TABLE `jornadas` (
  `id` int(11) NOT NULL,
  `id_torneo` int(11) NOT NULL,
  `numero_jornada` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `tipo` enum('regular','octavos','cuartos','semifinal','final','tercer_lugar') NOT NULL DEFAULT 'regular',
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `publicada` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `jornadas`
--

INSERT INTO `jornadas` (`id`, `id_torneo`, `numero_jornada`, `nombre`, `tipo`, `fecha_inicio`, `fecha_fin`, `publicada`) VALUES
(17, 5, 1, 'Jornada 1', 'regular', '2025-12-08', '2025-12-12', 1),
(18, 5, 2, 'Jornada 2', 'regular', '2025-12-15', '2025-12-19', 1),
(19, 5, 3, 'Jornada 3', 'regular', '2025-12-22', '2025-12-26', 1),
(20, 5, 4, 'Jornada 4', 'regular', '2025-12-29', '2026-01-02', 1),
(21, 5, 5, 'Jornada 5', 'regular', '2026-01-05', '2026-01-09', 1),
(22, 5, 6, 'Jornada 6', 'regular', '2026-01-12', '2026-01-16', 1),
(23, 5, 7, 'Jornada 7', 'regular', '2026-01-19', '2026-01-23', 1),
(24, 5, 8, 'Jornada 8', 'regular', '2026-01-26', '2026-01-30', 1),
(25, 5, 9, 'Jornada 9', 'regular', '2026-02-02', '2026-02-06', 1),
(26, 5, 10, 'Jornada 10', 'regular', '2026-02-09', '2026-02-13', 1),
(27, 5, 11, 'Jornada 11', 'regular', '2026-02-16', '2026-02-20', 1),
(28, 5, 12, 'Jornada 12', 'regular', '2026-02-23', '2026-02-27', 1),
(29, 5, 13, 'Jornada 13', 'regular', '2026-03-02', '2026-03-06', 1),
(30, 5, 14, 'Jornada 14', 'regular', '2026-03-09', '2026-03-13', 1),
(31, 5, 15, 'Jornada 15', 'regular', '2026-03-16', '2026-03-20', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `partidos`
--

CREATE TABLE `partidos` (
  `id` int(11) NOT NULL,
  `id_jornada` int(11) NOT NULL,
  `id_equipo_local` int(11) NOT NULL,
  `id_equipo_visitante` int(11) NOT NULL,
  `fecha_partido` datetime DEFAULT NULL,
  `lugar` varchar(200) DEFAULT NULL,
  `grupo` varchar(5) DEFAULT NULL,
  `marcador_local` int(11) DEFAULT NULL,
  `marcador_visitante` int(11) DEFAULT NULL,
  `estado` enum('programado','en_curso','finalizado','suspendido','forfeit','cancelado') NOT NULL DEFAULT 'programado',
  `equipo_forfeit` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `partidos`
--

INSERT INTO `partidos` (`id`, `id_jornada`, `id_equipo_local`, `id_equipo_visitante`, `fecha_partido`, `lugar`, `grupo`, `marcador_local`, `marcador_visitante`, `estado`, `equipo_forfeit`, `observaciones`, `fecha_actualizacion`) VALUES
(122, 17, 140, 141, '2025-12-08 10:30:00', 'Cancha ESCOM', NULL, 3, 1, 'finalizado', NULL, NULL, '2025-12-11 08:20:03'),
(123, 17, 143, 154, '2025-12-08 12:00:00', 'Cancha ESCOM', NULL, 2, 3, 'finalizado', NULL, NULL, '2025-12-11 08:20:15'),
(124, 17, 144, 153, '2025-12-08 13:30:00', 'Cancha ESCOM', NULL, 1, 1, 'finalizado', NULL, NULL, '2025-12-11 08:20:21'),
(125, 17, 145, 152, '2025-12-08 15:00:00', 'Cancha ESCOM', NULL, 4, 1, 'finalizado', NULL, NULL, '2025-12-11 08:20:34'),
(126, 17, 146, 151, '2025-12-09 10:30:00', 'Cancha ESCOM', NULL, 0, 0, 'finalizado', NULL, NULL, '2025-12-11 08:20:43'),
(127, 17, 147, 150, '2025-12-09 12:00:00', 'Cancha ESCOM', NULL, 2, 0, 'finalizado', NULL, NULL, '2025-12-11 08:20:51'),
(128, 17, 148, 149, '2025-12-09 13:30:00', 'Cancha ESCOM', NULL, 3, 4, 'finalizado', NULL, NULL, '2025-12-11 08:20:59'),
(129, 18, 140, 142, '2025-12-15 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(130, 18, 143, 141, '2025-12-15 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(131, 18, 145, 154, '2025-12-15 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(132, 18, 146, 153, '2025-12-15 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(133, 18, 147, 152, '2025-12-16 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(134, 18, 148, 151, '2025-12-16 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(135, 18, 149, 150, '2025-12-16 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(136, 19, 140, 143, '2025-12-22 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(137, 19, 144, 142, '2025-12-22 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(138, 19, 145, 141, '2025-12-22 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(139, 19, 147, 154, '2025-12-22 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(140, 19, 148, 153, '2025-12-23 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(141, 19, 149, 152, '2025-12-23 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(142, 19, 150, 151, '2025-12-23 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(143, 20, 140, 144, '2025-12-29 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(144, 20, 145, 143, '2025-12-29 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(145, 20, 146, 142, '2025-12-29 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(146, 20, 147, 141, '2025-12-29 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(147, 20, 149, 154, '2025-12-30 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(148, 20, 150, 153, '2025-12-30 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(149, 20, 151, 152, '2025-12-30 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(150, 21, 140, 145, '2026-01-05 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(151, 21, 146, 144, '2026-01-05 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(152, 21, 147, 143, '2026-01-05 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(153, 21, 148, 142, '2026-01-05 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(154, 21, 149, 141, '2026-01-06 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(155, 21, 151, 154, '2026-01-06 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(156, 21, 152, 153, '2026-01-06 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(157, 22, 140, 146, '2026-01-12 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(158, 22, 147, 145, '2026-01-12 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(159, 22, 148, 144, '2026-01-12 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(160, 22, 149, 143, '2026-01-12 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(161, 22, 150, 142, '2026-01-13 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(162, 22, 151, 141, '2026-01-13 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(163, 22, 153, 154, '2026-01-13 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(164, 23, 140, 147, '2026-01-19 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(165, 23, 148, 146, '2026-01-19 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(166, 23, 149, 145, '2026-01-19 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(167, 23, 150, 144, '2026-01-19 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(168, 23, 151, 143, '2026-01-20 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(169, 23, 152, 142, '2026-01-20 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(170, 23, 153, 141, '2026-01-20 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(171, 24, 140, 148, '2026-01-26 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(172, 24, 149, 147, '2026-01-26 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(173, 24, 150, 146, '2026-01-26 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(174, 24, 151, 145, '2026-01-26 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(175, 24, 152, 144, '2026-01-27 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(176, 24, 153, 143, '2026-01-27 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(177, 24, 154, 142, '2026-01-27 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(178, 25, 140, 149, '2026-02-02 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(179, 25, 150, 148, '2026-02-02 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(180, 25, 151, 147, '2026-02-02 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(181, 25, 152, 146, '2026-02-02 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(182, 25, 153, 145, '2026-02-03 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(183, 25, 154, 144, '2026-02-03 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(184, 25, 141, 142, '2026-02-03 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:44'),
(185, 26, 140, 150, '2026-02-09 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(186, 26, 151, 149, '2026-02-09 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(187, 26, 152, 148, '2026-02-09 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(188, 26, 153, 147, '2026-02-09 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(189, 26, 154, 146, '2026-02-10 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(190, 26, 141, 144, '2026-02-10 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(191, 26, 142, 143, '2026-02-10 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(192, 27, 140, 151, '2026-02-16 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(193, 27, 152, 150, '2026-02-16 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(194, 27, 153, 149, '2026-02-16 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(195, 27, 154, 148, '2026-02-16 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(196, 27, 141, 146, '2026-02-17 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(197, 27, 142, 145, '2026-02-17 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(198, 27, 143, 144, '2026-02-17 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(199, 28, 140, 152, '2026-02-23 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(200, 28, 153, 151, '2026-02-23 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(201, 28, 154, 150, '2026-02-23 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(202, 28, 141, 148, '2026-02-23 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(203, 28, 142, 147, '2026-02-24 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(204, 28, 143, 146, '2026-02-24 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(205, 28, 144, 145, '2026-02-24 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(206, 29, 140, 153, '2026-03-02 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(207, 29, 154, 152, '2026-03-02 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(208, 29, 141, 150, '2026-03-02 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(209, 29, 142, 149, '2026-03-02 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(210, 29, 143, 148, '2026-03-03 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(211, 29, 144, 147, '2026-03-03 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(212, 29, 145, 146, '2026-03-03 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(213, 30, 140, 154, '2026-03-09 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(214, 30, 141, 152, '2026-03-09 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(215, 30, 142, 151, '2026-03-09 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(216, 30, 143, 150, '2026-03-09 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(217, 30, 144, 149, '2026-03-10 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(218, 30, 145, 148, '2026-03-10 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(219, 30, 146, 147, '2026-03-10 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(220, 31, 141, 154, '2026-03-16 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(221, 31, 142, 153, '2026-03-16 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(222, 31, 143, 152, '2026-03-16 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(223, 31, 144, 151, '2026-03-16 15:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(224, 31, 145, 150, '2026-03-17 10:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(225, 31, 146, 149, '2026-03-17 12:00:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45'),
(226, 31, 147, 148, '2026-03-17 13:30:00', 'Cancha ESCOM', NULL, NULL, NULL, 'programado', NULL, NULL, '2025-12-11 07:48:45');

--
-- Disparadores `partidos`
--
DELIMITER $$
CREATE TRIGGER `trg_actualizar_estadisticas_after_partido` AFTER UPDATE ON `partidos` FOR EACH ROW BEGIN
    IF NEW.estado IN ('finalizado', 'forfeit') AND OLD.estado != NEW.estado THEN
        CALL sp_actualizar_estadisticas_equipo(NEW.id);
        CALL sp_avanzar_ganador(NEW.id);   -- ???? AVANZA AUTOMÁTICAMENTE
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_capitanes`
--

CREATE TABLE `solicitudes_capitanes` (
  `id` int(11) NOT NULL,
  `id_capitan` int(11) NOT NULL,
  `id_equipo` int(11) NOT NULL,
  `id_partido` int(11) DEFAULT NULL,
  `tipo` enum('cambio_horario','queja_arbitraje','queja_otro','consulta') NOT NULL,
  `asunto` varchar(200) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('pendiente','en_revision','resuelta','rechazada') NOT NULL DEFAULT 'pendiente',
  `respuesta` text DEFAULT NULL,
  `id_administrador_respuesta` int(11) DEFAULT NULL,
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_respuesta` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `torneos`
--

CREATE TABLE `torneos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `temporada` varchar(50) NOT NULL,
  `tipo_futbol` enum('futbol11','futbol7') NOT NULL DEFAULT 'futbol11',
  `estado` enum('inactivo','inscripcion','en_curso','finalizado','archivado') NOT NULL DEFAULT 'inactivo',
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `num_equipos_fase_final` int(11) DEFAULT 8,
  `id_ganador` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `torneos`
--

INSERT INTO `torneos` (`id`, `nombre`, `temporada`, `tipo_futbol`, `estado`, `fecha_inicio`, `fecha_fin`, `num_equipos_fase_final`, `id_ganador`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(4, 'Torneo Futbol 7 - ESCOM', '2025', 'futbol7', 'inscripcion', NULL, NULL, 8, NULL, '2025-12-11 07:39:51', '2025-12-11 07:39:51'),
(5, 'Torneo Futbol 11 - ESCOM', '2025', 'futbol11', 'en_curso', '2025-12-08', NULL, 8, NULL, '2025-12-11 07:39:51', '2025-12-11 08:20:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `rol` enum('administrador','capitan') NOT NULL DEFAULT 'capitan',
  `activo` tinyint(1) DEFAULT 1,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `ultimo_acceso` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `telefono`, `rol`, `activo`, `fecha_registro`, `ultimo_acceso`) VALUES
(1, 'Diego Espinosa Gómez', 'admin@escomleague.com', '$2y$10$LWQzEfXI71hzIL26OSmhKuFJOxoKSjyFD9fMfe5VNFlA.6JP6SRfS', '5576358591', 'administrador', 1, '2025-11-30 19:41:23', '2025-12-12 05:28:55'),
(38, 'Luis Hernández', 'luis.hernandez@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340001', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(39, 'Carlos Martínez', 'carlos.martinez@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340002', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(40, 'Miguel Torres', 'miguel.torres@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340003', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(41, 'Sergio Reyes', 'sergio.reyes@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340004', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(42, 'Daniel Romero', 'daniel.romero@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340005', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(43, 'Jorge Navarro', 'jorge.navarro@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340006', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(44, 'Ricardo Sánchez', 'ricardo.sanchez@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340007', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(45, 'Héctor Aguilar', 'hector.aguilar@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340008', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(46, 'Adrián Flores', 'adrian.flores@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340009', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(47, 'Fernando Ríos', 'fernando.rios@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340010', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(48, 'Diego Castro', 'diego.castro@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340011', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(49, 'Óscar Lozano', 'oscar.lozano@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340012', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(50, 'Iván Delgado', 'ivan.delgado@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340013', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(51, 'Manuel Rubio', 'manuel.rubio@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340014', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(52, 'Alexis Mendoza', 'alexis.mendoza@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340015', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(53, 'Mauricio Villalba', 'mauricio.villalba@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340016', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(54, 'Eduardo Campos', 'eduardo.campos@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340017', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(55, 'Roberto Vázquez', 'roberto.vazquez@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340018', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(56, 'Pablo Estrada', 'pablo.estrada@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340019', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(57, 'Erick Salinas', 'erick.salinas@example.com', '$2y$10$OPyzSkN2oW.quG/M1a3P2.CtStPMlflwj2buqkoCQ0vq1GdbQTkBu', '5512340020', 'capitan', 1, '2025-12-11 07:39:51', '2025-12-12 06:02:42'),
(58, 'Tomás Galindo', 'tomas.galindo@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340021', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(59, 'Ramiro Beltrán', 'ramiro.beltran@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340022', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(60, 'Julián Cervantes', 'julian.cervantes@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340023', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(61, 'Ramón Páez', 'ramon.paez@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340024', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(62, 'Kevin Herrera', 'kevin.herrera@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340025', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(63, 'Alberto Silva', 'alberto.silva@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340026', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(64, 'Bruno Rangel', 'bruno.rangel@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340027', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(65, 'Hugo Palma', 'hugo.palma@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340028', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(66, 'Esteban Molina', 'esteban.molina@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340029', 'capitan', 1, '2025-12-11 07:39:51', NULL),
(67, 'Mario Pineda', 'mario.pineda@example.com', '$2b$12$XPR6Oy2ni/ygKvz8DXHX8.TscfKoYaGW0NoAJawqkXCpdmzufHRa6', '5512340030', 'capitan', 1, '2025-12-11 07:39:51', NULL);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_proximos_partidos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_proximos_partidos` (
`id` int(11)
,`fecha_partido` datetime
,`lugar` varchar(200)
,`jornada` varchar(100)
,`torneo` varchar(150)
,`equipo_local` varchar(100)
,`equipo_visitante` varchar(100)
,`estado` enum('programado','en_curso','finalizado','suspendido','forfeit','cancelado')
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_resultados_recientes`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_resultados_recientes` (
`id` int(11)
,`fecha_partido` datetime
,`jornada` varchar(100)
,`torneo` varchar(150)
,`equipo_local` varchar(100)
,`equipo_visitante` varchar(100)
,`marcador_local` int(11)
,`marcador_visitante` int(11)
,`estado` enum('programado','en_curso','finalizado','suspendido','forfeit','cancelado')
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_tabla_posiciones`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_tabla_posiciones` (
`id_equipo` int(11)
,`equipo` varchar(100)
,`torneo` varchar(150)
,`id_torneo` int(11)
,`posicion` int(11)
,`partidos_jugados` int(11)
,`partidos_ganados` int(11)
,`partidos_empatados` int(11)
,`partidos_perdidos` int(11)
,`goles_favor` int(11)
,`goles_contra` int(11)
,`diferencia_goles` int(11)
,`puntos` int(11)
,`ultimos_5_resultados` varchar(10)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_proximos_partidos`
--
DROP TABLE IF EXISTS `v_proximos_partidos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_proximos_partidos`  AS SELECT `p`.`id` AS `id`, `p`.`fecha_partido` AS `fecha_partido`, `p`.`lugar` AS `lugar`, `j`.`nombre` AS `jornada`, `t`.`nombre` AS `torneo`, `el`.`nombre` AS `equipo_local`, `ev`.`nombre` AS `equipo_visitante`, `p`.`estado` AS `estado` FROM ((((`partidos` `p` join `jornadas` `j` on(`p`.`id_jornada` = `j`.`id`)) join `torneos` `t` on(`j`.`id_torneo` = `t`.`id`)) join `equipos` `el` on(`p`.`id_equipo_local` = `el`.`id`)) join `equipos` `ev` on(`p`.`id_equipo_visitante` = `ev`.`id`)) WHERE `p`.`estado` = 'programado' AND `p`.`fecha_partido` >= current_timestamp() ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_resultados_recientes`
--
DROP TABLE IF EXISTS `v_resultados_recientes`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_resultados_recientes`  AS SELECT `p`.`id` AS `id`, `p`.`fecha_partido` AS `fecha_partido`, `j`.`nombre` AS `jornada`, `t`.`nombre` AS `torneo`, `el`.`nombre` AS `equipo_local`, `ev`.`nombre` AS `equipo_visitante`, `p`.`marcador_local` AS `marcador_local`, `p`.`marcador_visitante` AS `marcador_visitante`, `p`.`estado` AS `estado` FROM ((((`partidos` `p` join `jornadas` `j` on(`p`.`id_jornada` = `j`.`id`)) join `torneos` `t` on(`j`.`id_torneo` = `t`.`id`)) join `equipos` `el` on(`p`.`id_equipo_local` = `el`.`id`)) join `equipos` `ev` on(`p`.`id_equipo_visitante` = `ev`.`id`)) WHERE `p`.`estado` = 'finalizado' ORDER BY `p`.`fecha_partido` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_tabla_posiciones`
--
DROP TABLE IF EXISTS `v_tabla_posiciones`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tabla_posiciones`  AS SELECT `e`.`id` AS `id_equipo`, `e`.`nombre` AS `equipo`, `t`.`nombre` AS `torneo`, `t`.`id` AS `id_torneo`, `ee`.`posicion` AS `posicion`, `ee`.`partidos_jugados` AS `partidos_jugados`, `ee`.`partidos_ganados` AS `partidos_ganados`, `ee`.`partidos_empatados` AS `partidos_empatados`, `ee`.`partidos_perdidos` AS `partidos_perdidos`, `ee`.`goles_favor` AS `goles_favor`, `ee`.`goles_contra` AS `goles_contra`, `ee`.`diferencia_goles` AS `diferencia_goles`, `ee`.`puntos` AS `puntos`, `ee`.`ultimos_5_resultados` AS `ultimos_5_resultados` FROM ((`estadisticas_equipos` `ee` join `equipos` `e` on(`ee`.`id_equipo` = `e`.`id`)) join `torneos` `t` on(`ee`.`id_torneo` = `t`.`id`)) WHERE `e`.`estado` = 'confirmado' ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `anuncios`
--
ALTER TABLE `anuncios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_torneo` (`id_torneo`),
  ADD KEY `idx_visible` (`visible`),
  ADD KEY `idx_fecha_inicio` (`fecha_inicio`),
  ADD KEY `id_autor` (`id_autor`);

--
-- Indices de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`),
  ADD KEY `idx_clave` (`clave`);

--
-- Indices de la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_equipo_torneo` (`nombre`,`id_torneo`),
  ADD KEY `idx_capitan` (`id_capitan`),
  ADD KEY `idx_torneo` (`id_torneo`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_equipos_grupo` (`id_torneo`,`estado`);

--
-- Indices de la tabla `estadisticas_equipos`
--
ALTER TABLE `estadisticas_equipos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_estadisticas` (`id_equipo`,`id_torneo`),
  ADD KEY `idx_equipo` (`id_equipo`),
  ADD KEY `idx_torneo` (`id_torneo`),
  ADD KEY `idx_puntos` (`puntos`),
  ADD KEY `idx_posicion` (`posicion`),
  ADD KEY `idx_estadisticas_clasificacion` (`id_torneo`,`puntos`,`diferencia_goles`,`goles_favor`);

--
-- Indices de la tabla `fase_eliminacion`
--
ALTER TABLE `fase_eliminacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_torneo` (`id_torneo`),
  ADD KEY `idx_ronda` (`ronda`),
  ADD KEY `id_partido` (`id_partido`),
  ADD KEY `id_partido_origen_local` (`id_partido_origen_local`),
  ADD KEY `id_partido_origen_visitante` (`id_partido_origen_visitante`);

--
-- Indices de la tabla `historial_partidos`
--
ALTER TABLE `historial_partidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_partido` (`id_partido`),
  ADD KEY `idx_usuario` (`id_usuario`);

--
-- Indices de la tabla `jornadas`
--
ALTER TABLE `jornadas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_jornada_torneo` (`id_torneo`,`numero_jornada`),
  ADD KEY `idx_torneo` (`id_torneo`),
  ADD KEY `idx_publicada` (`publicada`);

--
-- Indices de la tabla `partidos`
--
ALTER TABLE `partidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jornada` (`id_jornada`),
  ADD KEY `idx_equipo_local` (`id_equipo_local`),
  ADD KEY `idx_equipo_visitante` (`id_equipo_visitante`),
  ADD KEY `idx_fecha` (`fecha_partido`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `equipo_forfeit` (`equipo_forfeit`),
  ADD KEY `idx_partidos_calendario` (`fecha_partido`,`estado`);

--
-- Indices de la tabla `solicitudes_capitanes`
--
ALTER TABLE `solicitudes_capitanes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_capitan` (`id_capitan`),
  ADD KEY `idx_equipo` (`id_equipo`),
  ADD KEY `idx_partido` (`id_partido`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `id_administrador_respuesta` (`id_administrador_respuesta`);

--
-- Indices de la tabla `torneos`
--
ALTER TABLE `torneos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_tipo_futbol` (`tipo_futbol`),
  ADD KEY `fk_torneos_id_ganador` (`id_ganador`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_rol` (`rol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `anuncios`
--
ALTER TABLE `anuncios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `equipos`
--
ALTER TABLE `equipos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=155;

--
-- AUTO_INCREMENT de la tabla `estadisticas_equipos`
--
ALTER TABLE `estadisticas_equipos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT de la tabla `fase_eliminacion`
--
ALTER TABLE `fase_eliminacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `historial_partidos`
--
ALTER TABLE `historial_partidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `jornadas`
--
ALTER TABLE `jornadas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `partidos`
--
ALTER TABLE `partidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=227;

--
-- AUTO_INCREMENT de la tabla `solicitudes_capitanes`
--
ALTER TABLE `solicitudes_capitanes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `torneos`
--
ALTER TABLE `torneos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `anuncios`
--
ALTER TABLE `anuncios`
  ADD CONSTRAINT `anuncios_ibfk_1` FOREIGN KEY (`id_torneo`) REFERENCES `torneos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `anuncios_ibfk_2` FOREIGN KEY (`id_autor`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD CONSTRAINT `equipos_ibfk_1` FOREIGN KEY (`id_capitan`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `equipos_ibfk_2` FOREIGN KEY (`id_torneo`) REFERENCES `torneos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `estadisticas_equipos`
--
ALTER TABLE `estadisticas_equipos`
  ADD CONSTRAINT `estadisticas_equipos_ibfk_1` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `estadisticas_equipos_ibfk_2` FOREIGN KEY (`id_torneo`) REFERENCES `torneos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `fase_eliminacion`
--
ALTER TABLE `fase_eliminacion`
  ADD CONSTRAINT `fase_eliminacion_ibfk_1` FOREIGN KEY (`id_torneo`) REFERENCES `torneos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fase_eliminacion_ibfk_2` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fase_eliminacion_ibfk_3` FOREIGN KEY (`id_partido_origen_local`) REFERENCES `partidos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fase_eliminacion_ibfk_4` FOREIGN KEY (`id_partido_origen_visitante`) REFERENCES `partidos` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `historial_partidos`
--
ALTER TABLE `historial_partidos`
  ADD CONSTRAINT `historial_partidos_ibfk_1` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_partidos_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `jornadas`
--
ALTER TABLE `jornadas`
  ADD CONSTRAINT `jornadas_ibfk_1` FOREIGN KEY (`id_torneo`) REFERENCES `torneos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `partidos`
--
ALTER TABLE `partidos`
  ADD CONSTRAINT `partidos_ibfk_1` FOREIGN KEY (`id_jornada`) REFERENCES `jornadas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `partidos_ibfk_2` FOREIGN KEY (`id_equipo_local`) REFERENCES `equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `partidos_ibfk_3` FOREIGN KEY (`id_equipo_visitante`) REFERENCES `equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `partidos_ibfk_4` FOREIGN KEY (`equipo_forfeit`) REFERENCES `equipos` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `solicitudes_capitanes`
--
ALTER TABLE `solicitudes_capitanes`
  ADD CONSTRAINT `solicitudes_capitanes_ibfk_1` FOREIGN KEY (`id_capitan`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `solicitudes_capitanes_ibfk_2` FOREIGN KEY (`id_equipo`) REFERENCES `equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `solicitudes_capitanes_ibfk_3` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `solicitudes_capitanes_ibfk_4` FOREIGN KEY (`id_administrador_respuesta`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `torneos`
--
ALTER TABLE `torneos`
  ADD CONSTRAINT `fk_torneos_id_ganador` FOREIGN KEY (`id_ganador`) REFERENCES `equipos` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
