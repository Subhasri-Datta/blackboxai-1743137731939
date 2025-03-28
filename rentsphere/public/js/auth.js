document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check for redirect parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    if (redirectUrl) {
        localStorage.setItem('redirectAfterLogin', redirectUrl);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember').checked;
    
    // Show loading state
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    loginText.textContent = 'Logging in...';
    loginSpinner.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.msg || 'Login failed');
        }

        const { token } = await response.json();
        
        // Store token based on remember me choice
        if (rememberMe) {
            localStorage.setItem('token', token);
        } else {
            sessionStorage.setItem('token', token);
        }

        // Show success message
        showToast('Login successful!', 'success');

        // Redirect user
        const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/';
        setTimeout(() => {
            window.location.href = redirectUrl;
            localStorage.removeItem('redirectAfterLogin');
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
        loginText.textContent = 'Login';
        loginSpinner.classList.add('hidden');
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle registration page if needed
if (window.location.pathname === '/register') {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.msg || 'Registration failed');
        }

        const { token } = await response.json();
        localStorage.setItem('token', token);
        showToast('Registration successful!', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
    }
}