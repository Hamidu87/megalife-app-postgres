

// This is the single, master script for all public-facing auth pages.
document.addEventListener('DOMContentLoaded', () => {

    // --- SHARED HELPER FUNCTION (CORRECTED) ---
    function showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.textContent = message;
            // This is the key: We add the 'success' or 'error' class to the element
            messageContainer.className = `message ${type}`; 
        }
    }

    // --- LOGIC FOR SIGNUP.HTML ---
    // Logic for signup.html (Final Corrected Version)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = signupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';

        try {
            // Get all the values from the form inputs
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const telephone = document.getElementById('telephone').value;
            const country = document.getElementById('country').value;
            
            // Combine first and last name
            const fullName = `${firstName} ${lastName}`;

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }
            if (!fullName.trim() || !email || !password) {
                throw new Error('Full name, email, and password are required.');
            }
            
            const response = await fetch('https://megalife-app-postgres.onrender.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password, telephone, country }),
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Throw the error message from the server (e.g., "Email already exists")
                throw new Error(result.message);
            }
            
            // This code only runs on success
            showMessage(result.message, 'success');
            signupForm.reset();
            submitButton.textContent = 'Success!';

        } catch (error) {
            // This single catch block handles all errors (validation, network, server)
            showMessage(error.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    });
}
    

// Logic for login.html (Final Corrected Version)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // Toggle the input's type attribute
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // THIS IS THE CORRECTED LOGIC FOR THE ICON
        // Check if the 'fa-eye-slash' class is currently on the icon
        const isPasswordVisible = this.classList.contains('fa-eye-slash');

        if (isPasswordVisible) {
            // If the password IS visible, change the icon back to the open eye
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        } else {
            // If the password is NOT visible, change the icon to the slashed eye
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        }
    });
}


        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Signing In...';

            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                
                const result = await response.json();

                if (!response.ok) {
                    // This handles server errors like "Invalid credentials" or "Not verified"
                    throw new Error(result.message);
                }

                // This code only runs on a successful login
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Redirect to the dashboard
                window.location.href = 'UserInterfaces/userdashboard.html';

            } catch (error) {
                // This catch block handles all errors (network, server, validation)
                showMessage(error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    }



    // Logic for forgot-password.html (UNCHANGED)
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

    // Logic for reset-password.html (UNCHANGED)
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

    // --- LOGIC FOR PROTECTED PAGES (UNCHANGED) ---
    const isProtectedPage = window.location.pathname.includes('/UserInterfaces/');
    if (isProtectedPage) {
        // ... (This section is untouched)
        // --- NEW: INACTIVITY LOGOUT TIMER ---
        let inactivityTimer;

        function resetInactivityTimer() {
            // Clear the old timer
            clearTimeout(inactivityTimer);
            
            // Set a new timer. 15 minutes is a good standard.
            // 15 minutes * 60 seconds/minute * 1000 milliseconds/second
            inactivityTimer = setTimeout(() => {
                // If the timer finishes, the user has been inactive.
                alert("You have been logged out due to inactivity.");
                localStorage.clear();
                window.location.href = '../login.html';
            }, 15 * 60 * 1000); 
        }

        // Listen for any user activity on the page
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('mousedown', resetInactivityTimer);
        window.addEventListener('keypress', resetInactivityTimer);
        window.addEventListener('scroll', resetInactivityTimer);

        // Start the timer when the page loads
        resetInactivityTimer();
    }

    



    
});


