// This script handles the logic for both forgot-password.html and reset-password.html
document.addEventListener('DOMContentLoaded', () => {

    // Helper function to display messages on the forms
    function showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = `message ${type}`;
        }
    }

    // --- LOGIC FOR THE "FORGOT PASSWORD" PAGE ---
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop the form from reloading the page
            
            const email = document.getElementById('email').value;
            const submitButton = forgotPasswordForm.querySelector('button');

            // Give user feedback
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const response = await fetch('http://localhost:3000/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                // Get the server's response message
                const result = await response.json();
                // Always show the "success" message for security, regardless of the outcome
                showMessage(result.message, 'success');
            } catch (error) {
                console.error('Forgot password request failed:', error);
                showMessage('An error occurred. Please try again later.', 'error');
            } finally {
                // Always re-enable the button
                submitButton.disabled = false;
                submitButton.textContent = 'Send Reset Link';
            }
        });
    }

    // --- LOGIC FOR THE "RESET PASSWORD" PAGE ---
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get the token from the page's URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            
            const newPassword = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) return showMessage('Passwords do not match.', 'error');
            if (!token) return showMessage('Invalid or missing password reset token.', 'error');
            
            try {
                const response = await fetch('http://localhost:3000/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword }),
                });
                const result = await response.json();

                if (response.ok) {
                    showMessage(result.message, 'success');
                    // Redirect to login page after success
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Network error. Please try again.', 'error');
            }
        });
    }
});