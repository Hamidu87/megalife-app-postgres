document.addEventListener('DOMContentLoaded', () => {
    const topupForm = document.getElementById('topup-form');
    const messageContainer = document.getElementById('message-container');
    const token = localStorage.getItem('token');

    // Security Check: If the user is not logged in, redirect them.
    if (!token) {
        // CORRECT PATH: From 'UserInterfaces', go up one level to find login.html
        window.location.href = '../login.html';
        return;
    }

    // Helper function to display messages
    function showMessage(message, type) {
        if (messageContainer) {
            messageContainer.textContent = message;
            // You will need to add .success and .error styles to UserInterfaces.css
            messageContainer.className = `message ${type}`; 
        }
    }
    
    // Also, fetch and display the current balance on this page
    const balanceEl = document.getElementById('wallet-balance-topup');
    if (balanceEl) {
        fetch('https://megalife-app-postgres.onrender.com/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
            balanceEl.textContent = `GH₵ ${parseFloat(user.walletBalance).toFixed(2)}`;
        });
    }


    if (topupForm) {
        topupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = document.getElementById('topup-amount').value;
            const submitButton = topupForm.querySelector('button');

            if (!amount || amount < 1) { // Check for a minimum amount
                showMessage('Please enter a valid amount of at least 1.', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Initializing...';

            try {
                // The fetch URL is correct, pointing to the backend server
                const response = await fetch('https://megalife-app-postgres.onrender.com/initialize-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ amount: parseFloat(amount) }),
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage('Redirecting to payment page...', 'success');
                    window.location.href = result.authorization_url;
                } else {
                    showMessage(result.message, 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Topup Now';
                }

            } catch (error) {
                console.error('Top-up failed:', error);
                showMessage('An error occurred. Please try again.', 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Topup Now';
            }
        });
    }
});