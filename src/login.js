// Toggle login/signup form
document.getElementById('showSignup').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelector('.signup-link').style.display = 'none';
    // Hilangkan error login saat pindah ke signup
    document.getElementById('error').style.display = 'none';
});

document.getElementById('showLogin').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelector('.signup-link').style.display = 'block';
    // Hilangkan error login saat pindah ke login
    document.getElementById('error').style.display = 'none';
});
// login.js

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'none';

    if (!username || !password) {
        errorDiv.textContent = 'Username dan password wajib diisi.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            window.location.href = '../dist/dashboard.html';
        } else {
            const data = await response.json();
            errorDiv.textContent = data.message || 'Login gagal!';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Terjadi kesalahan koneksi.';
        errorDiv.style.display = 'block';
    }
});

// Register event
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'none';

    if (!username || !password) {
        errorDiv.textContent = 'Username dan password wajib diisi.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/login/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            // Registrasi berhasil, langsung login otomatis
            const loginResponse = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            if (loginResponse.ok) {
                window.location.href = '../dist/dashboard.html';
            } else {
                errorDiv.textContent = 'Registrasi berhasil, tapi gagal login.';
                errorDiv.style.display = 'block';
            }
        } else {
            const data = await response.json();
            errorDiv.textContent = data.message || 'Registrasi gagal!';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Terjadi kesalahan koneksi.';
        errorDiv.style.display = 'block';
    }
});
