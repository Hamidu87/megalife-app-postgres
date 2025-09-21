document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    const messageContainer = document.getElementById('message-container');

    // Helper function for messages
    function showMessage(message, type) { /* ... same as in auth.js ... */ }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
               // This is the correct URL, with the /admin/login path
const response = await fetch('https://megalife-app-postgres.onrender.com/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
                const result = await response.json();

                if (response.ok) {
                    showMessage(result.message, 'success');
                    // Save the ADMIN token separately
                    localStorage.setItem('admin_token', result.token);
                    // Redirect to the admin dashboard
                    setTimeout(() => {
                        window.location.href = 'Admin\'sdashboard.html'; // Make sure filename is correct
                    }, 1500);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Login failed due to a network error.', 'error');
            }
        });
    }
});