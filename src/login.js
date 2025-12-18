// Pastikan DOM sudah siap
document.addEventListener('DOMContentLoaded', function() {
    // Toggle login/signup form
    const showSignupBtn = document.getElementById('showSignup');
    const showLoginBtn = document.getElementById('showLogin');
    
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
            document.querySelector('.signup-link').style.display = 'none';
            const errorDiv = document.getElementById('error');
            if (errorDiv) errorDiv.style.display = 'none';
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.querySelector('.signup-link').style.display = 'block';
            const errorDiv = document.getElementById('error');
            if (errorDiv) errorDiv.style.display = 'none';
        });
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const identifier = document.getElementById('identifier').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorDiv = document.getElementById('error');
            if (errorDiv) errorDiv.style.display = 'none';
            
            // Require identifier (username/email) and password for login
            if (!identifier || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Username/email dan password wajib diisi.';
                    errorDiv.style.display = 'block';
                }
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ identifier, password })
                });
                if (response.ok) {
                    const data = await response.json();
                    // Store user data in localStorage
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '../dist/dashboard.html';
                } else {
                    const data = await response.json();
                    if (errorDiv) {
                        errorDiv.textContent = data.message || 'Login gagal!';
                        errorDiv.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Login error:', err);
                if (errorDiv) {
                    errorDiv.textContent = 'Terjadi kesalahan koneksi.';
                    errorDiv.style.display = 'block';
                }
            }
        });
    }

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const username = document.getElementById('regUsername')?.value.trim() || '';
            const email = document.getElementById('regEmail')?.value.trim() || '';
            const password = document.getElementById('regPassword')?.value.trim() || '';
            const passwordConfirm = document.getElementById('regPasswordConfirm')?.value.trim() || '';
            const errorDiv = document.getElementById('error');
            
            if (errorDiv) errorDiv.style.display = 'none';

            // Validasi semua field wajib
            if (!username || !email || !password || !passwordConfirm) {
                if (errorDiv) {
                    errorDiv.textContent = 'Semua field wajib diisi.';
                    errorDiv.style.display = 'block';
                }
                return false;
            }

            // Validasi email harus ada @
            if (!email.includes('@')) {
                if (errorDiv) {
                    errorDiv.textContent = 'Email harus mengandung karakter @.';
                    errorDiv.style.display = 'block';
                }
                return false;
            }

            // Validasi password minimal 8 karakter
            if (password.length < 8) {
                if (errorDiv) {
                    errorDiv.textContent = 'Password minimal 8 karakter.';
                    errorDiv.style.display = 'block';
                }
                return false;
            }

            // Validasi password harus mengandung simbol
            const symbolRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
            if (!symbolRegex.test(password)) {
                if (errorDiv) {
                    errorDiv.textContent = 'Password harus mengandung minimal satu simbol (!@#$%^&* dll).';
                    errorDiv.style.display = 'block';
                }
                return false;
            }

            // Validasi Kondirmasi password harus sama
            if (password !== passwordConfirm) {
                if (errorDiv) {
                    errorDiv.textContent = 'Password dan Konfirmasi Password tidak sama.';
                    errorDiv.style.display = 'block';
                }
                return false;
            }

            try {
                console.log('Sending register request:', { username, email, passwordLength: password.length });
                
                const response = await fetch('http://localhost:3000/login/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                console.log('Register response status:', response.status);
                
                let data;
                try {
                    data = await response.json();
                } catch (parseErr) {
                    console.error('Failed to parse response:', parseErr);
                    const text = await response.text();
                    console.error('Response text:', text);
                    if (errorDiv) {
                        errorDiv.textContent = 'Server error: ' + text;
                        errorDiv.style.display = 'block';
                    }
                    return false;
                }
                
                if (response.ok) {
                    console.log('Register successful');
                    // Tampilkan pesan sukses dan switch ke form login
                    if (errorDiv) {
                        errorDiv.textContent = 'Registrasi berhasil! Silakan login dengan akun Anda.';
                        errorDiv.style.display = 'block';
                        errorDiv.style.color = 'green';
                        errorDiv.style.backgroundColor = '#d4edda';
                        errorDiv.style.borderColor = '#c3e6cb';
                    }
                    
                    // Switch ke form login
                    document.getElementById('registerForm').style.display = 'none';
                    document.getElementById('loginForm').style.display = 'block';
                    document.querySelector('.signup-link').style.display = 'block';
                    
                    // Kosongkan form register
                    registerForm.reset();
                    
                    // Setelah 3 detik, hilangkan pesan sukses
                    setTimeout(() => {
                        if (errorDiv) {
                            errorDiv.style.display = 'none';
                            errorDiv.style.color = '';
                            errorDiv.style.backgroundColor = '';
                            errorDiv.style.borderColor = '';
                        }
                    }, 3000);
                } else {
                    console.error('Register failed:', data);
                    if (errorDiv) {
                        errorDiv.textContent = data.message || 'Registrasi gagal! (Status: ' + response.status + ')';
                        errorDiv.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Register error:', err);
                if (errorDiv) {
                    errorDiv.textContent = 'Terjadi kesalahan koneksi: ' + (err.message || 'Unknown error');
                    errorDiv.style.display = 'block';
                }
            }
            
            return false;
        });
    }

    // ====== Password Toggle Functionality ======
    function setupPasswordToggle(toggleId, inputId, iconId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        
        if (!toggle || !input || !icon) return;
        
        toggle.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                // Icon mata tertutup (hide)
                icon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                input.type = 'password';
                // Icon mata terbuka (show)
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        });
    }

    // Setup semua password toggle
    setupPasswordToggle('passwordToggle', 'password', 'passwordToggleIcon');
    setupPasswordToggle('regPasswordToggle', 'regPassword', 'regPasswordToggleIcon');
    setupPasswordToggle('regPasswordConfirmToggle', 'regPasswordConfirm', 'regPasswordConfirmToggleIcon');
});
