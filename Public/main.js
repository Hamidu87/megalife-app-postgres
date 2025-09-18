

// This is the single, master script for the entire user-facing application.
document.addEventListener('DOMContentLoaded', () => {

    // --- SHARED HELPER FUNCTION ---
    function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        messageContainer.textContent = message;
        // This is the key change. We will set the color directly.
        // This avoids any issues with CSS class names.
        messageContainer.style.color = (type === 'success') ? 'green' : 'red';
        messageContainer.style.marginTop = '15px'; // Ensure it's visible
    }
}
    // --- LOGIC FOR PUBLIC PAGES (NO LOGIN REQUIRED) ---

    // Logic for signup.html
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const telephone = document.getElementById('telephone').value;
            const country = document.getElementById('country').value;

            if (password !== confirmPassword) return showMessage('Passwords do not match.', 'error');
            
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName: `${firstName} ${lastName}`, email, password, telephone, country }),
                });
                const result = await response.json();
                showMessage(result.message, response.ok ? 'success' : 'error');
                if (response.ok) setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (error) {
                showMessage('Network error. Please try again.', 'error');
            }
        });
    }

    // Logic for login.html
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const result = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    window.location.href = 'UserInterfaces/userdashboard.html';
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Network error. Please try again.', 'error');
            }
        });
    }
    
    // Logic for forgot-password.html
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const submitButton = forgotPasswordForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const result = await response.json();
                showMessage(result.message, 'success');
            } catch (error) {
                console.error('Forgot password request failed:', error);
                showMessage('An error occurred. Please try again later.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Reset Link';
            }
        });
    }

    // Logic for reset-password.html
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const newPassword = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (newPassword !== confirmPassword) return showMessage('Passwords do not match.', 'error');
            if (!token) return showMessage('Invalid or missing token.', 'error');
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword }),
                });
                const result = await response.json();
                showMessage(result.message, response.ok ? 'success' : 'error');
                if (response.ok) setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (error) {
                showMessage('Network error. Please try again.', 'error');
            }
        });
    }


    // --- LOGIC FOR PROTECTED PAGES (INSIDE UserInterfaces folder) ---
    const isProtectedPage = window.location.pathname.includes('/UserInterfaces/');
    if (isProtectedPage) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login.html';
            return;
        }

        // This is where you would put the logic from your old 'dashboard.js', 'history.js', etc.
        // For simplicity, we are focusing on the auth logic right now.
        // We can add the dynamic layout loading back in the next step.
    }
});