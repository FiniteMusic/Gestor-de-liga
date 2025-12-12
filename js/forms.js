// Envio de formulario de login via AJAX
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault(); // evita el envío tradicional

        let formData = new FormData(this);

        fetch('login.php', {
            method: 'POST',
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            if(data.success) {
                window.location.href = data.redirect;
            } else {
                document.getElementById('login-error').textContent = data.error;
            }
        })
        .catch(error => {
            document.getElementById('login-error').textContent = "Error de conexión.";
        });
    });
}

// ===============================
// Envío de formulario de registro con animación
// ===============================
const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const signupBtn = document.querySelector('.signup-btn');
        const errorElem = document.getElementById('signup-error');

        errorElem.textContent = '';

        // Obtener campos
        const firstname = document.getElementById('firstname').value.trim();
        const lastname = document.getElementById('lastname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const telefono = document.getElementById('telefono').value.trim();
        const terms = document.getElementById('terms').checked;

        // Validación básica
        if (!firstname || !lastname || !email || !password || !confirmPassword || !telefono) {
            errorElem.textContent = 'Por favor, completa todos los campos.';
            return;
        }

        if (password !== confirmPassword) {
            errorElem.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        if (!terms) {
            errorElem.textContent = 'Debes aceptar los términos y condiciones.';
            return;
        }

        // Animación de carga
        signupBtn.disabled = true;
        signupBtn.textContent = 'CREANDO CUENTA...';

        try {
            let formData = new FormData(signupForm);

            const response = await fetch('sign_up.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // ÉXITO
                signupBtn.textContent = '¡ÉXITO!';
                signupBtn.style.backgroundColor = 'var(--success)';

                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 800);

            } else {
                // Error del servidor / validación
                errorElem.textContent = data.error || 'Error desconocido.';

                signupBtn.disabled = false;
                signupBtn.textContent = 'CREAR CUENTA';
                signupBtn.style.backgroundColor = '';
            }

        } catch (err) {
            errorElem.textContent = 'Error de conexión. Intenta más tarde.';

            signupBtn.disabled = false;
            signupBtn.textContent = 'CREAR CUENTA';
            signupBtn.style.backgroundColor = '';
        }
    });
}
