// ===============================
// Mostrar / ocultar contraseña
// ===============================
document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    const eyeOff = document.getElementById('eyeOff');
    const eyeOn = document.getElementById('eyeOn');

    const isHidden = passwordInput.type === 'password';

    passwordInput.type = isHidden ? 'text' : 'password';
    eyeOff.style.display = isHidden ? 'none' : 'block';
    eyeOn.style.display = isHidden ? 'block' : 'none';

    this.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
});


// ===============================
// Manejo del formulario de Login
// ===============================
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('login-error');
    const usernameGroup = document.getElementById('username').parentElement;
    const passwordGroup = document.getElementById('password').closest('.form-group');
    const loginBtn = document.querySelector('.login-btn');

    // Limpiar errores previos
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
    usernameGroup.classList.remove('error');
    passwordGroup.classList.remove('error');

    // Validación básica
    if (!username || !password) {
        errorMessage.textContent = 'Por favor, completa todos los campos';
        errorMessage.classList.add('show');

        if (!username) usernameGroup.classList.add('error');
        if (!password) passwordGroup.classList.add('error');
        return;
    }

    // Deshabilitar botón mientras se procesa
    loginBtn.disabled = true;
    loginBtn.textContent = 'INICIANDO SESIÓN...';

    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch('login.php', {
            method: 'POST',
            body: formData
        });

        // Validar JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La respuesta del servidor no es JSON válida');
        }

        const data = await response.json();
        console.log(data, "<<< data"); // Mira la consola tras falla de login

        if (data.success) {
            // ÉXITO
            loginBtn.textContent = '¡ÉXITO!';
            loginBtn.style.backgroundColor = 'var(--success)';

            setTimeout(() => {
                window.location.href = data.redirect;
            }, 800);

        } else {
            // ❌ CREDENCIALES INCORRECTAS
            errorMessage.textContent = data.error || 'Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.';
            errorMessage.classList.add('show');

            usernameGroup.classList.add('error');
            passwordGroup.classList.add('error');

            document.getElementById('password').value = '';

            // Restaurar botón
            loginBtn.disabled = false;
            loginBtn.textContent = 'LOGIN';
            loginBtn.style.backgroundColor = ''; // restaurar color normal
        }

    } catch (error) {
        console.error('Error en el login:', error);

        errorMessage.textContent = 'Error de conexión. Por favor, intenta de nuevo más tarde.';
        errorMessage.classList.add('show');

        // Restaurar botón
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
        loginBtn.style.backgroundColor = '';
    }
});


// ===============================
// Limpiar errores al escribir
// ===============================
document.getElementById('username').addEventListener('input', function () {
    this.parentElement.classList.remove('error');
    document.getElementById('login-error').classList.remove('show');
});

document.getElementById('password').addEventListener('input', function () {
    this.closest('.form-group').classList.remove('error');
    document.getElementById('login-error').classList.remove('show');
});

