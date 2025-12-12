📋 Guía Completa para Importar la Base de Datos en phpMyAdmin
🎯 Pasos Detallados
Paso 1: Preparar el Entorno

Iniciar XAMPP (o tu servidor local)

Abre el Panel de Control de XAMPP
Inicia el servicio Apache
Inicia el servicio MySQL
Verifica que ambos tengan luz verde



Paso 2: Acceder a phpMyAdmin

Abre tu navegador web
Navega a: http://localhost/phpmyadmin
Deberías ver la interfaz de phpMyAdmin

Paso 3: Verificar/Eliminar Base de Datos Existente (si existe)
⚠️ IMPORTANTE: Esto eliminará todos los datos actuales de escom_league

En el panel izquierdo, busca si existe la base de datos escom_league
Si existe:

Haz clic en ella
Ve a la pestaña "Operaciones"
Al final, en la sección "Eliminar base de datos", haz clic en "Eliminar (DROP)"
Confirma la eliminación



Paso 4: Importar el Archivo SQL
Opción A: Importación Directa (Recomendada)

En phpMyAdmin, haz clic en la pestaña "Importar" (en la parte superior)
En la sección "Archivo a importar":

Haz clic en "Seleccionar archivo"
Busca y selecciona escom_league.sql


Configuración de importación:

Formato: Debe estar en "SQL" (se detecta automáticamente)
Conjunto de caracteres del archivo: utf-8
Deja las demás opciones por defecto


Configuración SQL (expandir "Opciones SQL específicas de formato"):

✅ Marca: "Permitir la interrupción de una importación en caso de que el archivo SQL contenga consultas incorrectas"
✅ Marca: "No usar AUTO_INCREMENT para cero"


Haz clic en el botón "Continuar" (abajo a la derecha)
Espera a que termine la importación

Verás una barra de progreso
Puede tardar 10-30 segundos dependiendo de tu computadora



Opción B: Si el archivo es muy grande (Error de tamaño)
Si recibes un error como "El archivo excede el tamaño máximo", sigue estos pasos:

Cierra phpMyAdmin
Ve a la carpeta de instalación de XAMPP (usualmente C:\xampp\)
Navega a: C:\xampp\php\
Abre el archivo php.ini con un editor de texto (como Notepad++)
Busca y modifica estas líneas:

ini   upload_max_filesize = 128M
   post_max_size = 128M
   max_execution_time = 300
   max_input_time = 300
```
6. Guarda el archivo
7. **Reinicia Apache** desde el panel de XAMPP
8. Vuelve a intentar la importación

### **Paso 5: Verificar la Importación**

1. En el panel izquierdo de phpMyAdmin, deberías ver la base de datos **`escom_league`**

2. Haz clic en ella para expandirla

3. Verifica que se hayan creado las siguientes tablas:
```
   ✅ anuncios
   ✅ configuracion_sistema
   ✅ equipos
   ✅ estadisticas_equipos
   ✅ fase_eliminacion
   ✅ historial_partidos
   ✅ jornadas
   ✅ partidos
   ✅ solicitudes_capitanes
   ✅ torneos
   ✅ usuarios
   ✅ v_proximos_partidos (vista)
   ✅ v_resultados_recientes (vista)
   ✅ v_tabla_posiciones (vista)
```

4. Verifica los procedimientos almacenados:
   - Ve a la pestaña **"Rutinas"**
   - Deberías ver:
```
     ✅ sp_actualizar_estadisticas_equipo
     ✅ sp_avanzar_ganador
     ✅ sp_generar_calendario_completo
     ✅ sp_generar_fase_eliminatoria
     ✅ sp_recalcular_estadisticas_torneo

Verifica los datos de prueba:

Haz clic en la tabla usuarios
Deberías ver 31 usuarios (1 admin + 30 capitanes)
Haz clic en la tabla equipos
Deberías ver 30 equipos
Haz clic en la tabla torneos
Deberías ver 2 torneos



Paso 6: Verificar Credenciales de Acceso
Usuario Administrador:

Email: admin@escomleague.com
Contraseña: admin123 (debes cambiarla en producción)
Rol: Administrador

Usuario Capitán (para pruebas):

Email: erick.salinas@example.com
Contraseña: password123
Rol: Capitán
Equipo: Escuadrón Tricolor (ID: 144)

Paso 7: Probar la Conexión desde tu Aplicación

Asegúrate de que tu archivo de configuración de conexión a BD tenga estos datos:

php   // Ejemplo en PHP
   $host = 'localhost';
   $dbname = 'escom_league';
   $username = 'root';
   $password = ''; // En XAMPP por defecto está vacío

Prueba el login en tu aplicación web con las credenciales del administrador


🚨 Solución de Problemas Comunes
Error: "Table already exists"
Solución: Elimina la base de datos existente primero (Paso 3)
Error: "Access denied for user"
Solución:

Verifica que el usuario sea root
Verifica que la contraseña esté vacía (o la que configuraste)
En phpMyAdmin: Cuentas de Usuario → Verifica privilegios

Error: "Unknown collation: 'utf8mb4_unicode_ci'"
Solución: Tu versión de MySQL es muy antigua. Actualiza XAMPP o cambia:
sqlutf8mb4_unicode_ci → utf8_general_ci
Error: "Lost connection to MySQL server during query"
Solución: Aumenta max_allowed_packet en my.ini:
inimax_allowed_packet = 64M
Los procedimientos almacenados no se crean
Solución: Importa en dos pasos:

Solo la estructura (tablas)
Luego los procedimientos por separado


✅ Checklist Final

 XAMPP está ejecutándose (Apache + MySQL)
 Base de datos escom_league creada exitosamente
 11 tablas creadas
 3 vistas creadas
 5 procedimientos almacenados creados
 Datos de prueba cargados (usuarios, equipos, torneos)
 Puedes hacer login con el usuario administrador
 La aplicación se conecta correctamente a la BD


📝 Notas Adicionales

Respaldo: Siempre haz un respaldo antes de importar en producción
Seguridad: Cambia las contraseñas por defecto en un entorno real
Charset: El archivo está en UTF-8, asegúrate de que phpMyAdmin también use UTF-8
Zona horaria: Los timestamps usan la zona horaria del servidor