function initializeDashboard() {
    // This check ensures this code only runs when on the dashboard page.
    if (!window.location.pathname.includes('userdashboard.html')) {
        return;
    }

    console.log("'layoutReady' event received. Initializing dashboard data...");

    // The security check is now handled by layout.js, so we can get the token directly.
    const token = localStorage.getItem('token');
    
    // --- 1. GET UI ELEMENTS ---
    const walletBalanceEl = document.getElementById('wallet-balance');
    const totalOrdersEl = document.getElementById('total-orders');
    const totalSalesEl = document.getElementById('total-sales');
    const eWalletTopUpsEl = document.getElementById('e-wallet-topups');
    
    // --- 2. DATA FETCHING AND DISPLAY ---
    async function fetchDashboardSummary() {
        console.log("Fetching dashboard summary from server...");
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/dashboard-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                // If the token is bad, layout.js will handle the redirect,
                // but we can log an error here for debugging.
                console.error(`Authorization failed, status: ${response.status}`);
                return;
            }
            
            const summary = await response.json();
            
            // Update all dashboard cards
            if (walletBalanceEl) walletBalanceEl.textContent = `GH₵ ${parseFloat(summary.walletBalance).toFixed(2)}`;
            if (totalOrdersEl) totalOrdersEl.textContent = summary.totalOrders;
            if (totalSalesEl) totalSalesEl.textContent = `GH₵ ${parseFloat(summary.totalSales).toFixed(2)}`;
            if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = `${summary.totalTopUps} (GH₵ ${parseFloat(summary.totalTopUpValue).toFixed(2)})`;

            // Update sidebar profile (guaranteed to exist now)
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                const sidebarUserName = document.getElementById('sidebar-user-name');
                if (sidebarUserName) sidebarUserName.textContent = user.fullName;
            }

        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
        }
    }
    
    // This function handles the "real-time" update after a payment
    function handlePaymentStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_status') === 'success') {
            if (walletBalanceEl) walletBalanceEl.textContent = 'Updating...';
            setTimeout(fetchDashboardSummary, 3000); 
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            fetchDashboardSummary(); 
        }
    }

    // --- 3. INITIALIZE THE DASHBOARD PAGE ---
    handlePaymentStatus();
}

// THIS IS THE KEY CHANGE:
// We now listen for the custom 'layoutReady' event that layout.js fires.
// This guarantees the layout and security check are done before this code runs.
document.addEventListener('layoutReady', initializeDashboard);































// This script now ONLY handles data logic for the dashboard page.
// It WAITS for the 'layoutReady' signal from layout.js before running.





/*
function initializeDashboard() {
    // This check ensures this code only runs when on the dashboard page.
    if (!window.location.pathname.includes('userdashboard.html')) {
        return;
    }

    console.log("'layoutReady' event received. Initializing dashboard data...");

    // The security check is now handled by layout.js, so we can get the token directly.
    const token = localStorage.getItem('token');
    
    // --- 1. GET UI ELEMENTS ---
    const walletBalanceEl = document.getElementById('wallet-balance');
    const totalOrdersEl = document.getElementById('total-orders');
    const totalSalesEl = document.getElementById('total-sales');
    const eWalletTopUpsEl = document.getElementById('e-wallet-topups');
    
    // --- 2. DATA FETCHING AND DISPLAY ---
    async function fetchDashboardSummary() {
        console.log("Fetching dashboard summary from server...");
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/dashboard-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                // If the token is bad, layout.js will handle the redirect,
                // but we can log an error here for debugging.
                console.error(`Authorization failed, status: ${response.status}`);
                return;
            }
            
            const summary = await response.json();
            
            // Update all dashboard cards
            if (walletBalanceEl) walletBalanceEl.textContent = `GH₵ ${parseFloat(summary.walletBalance).toFixed(2)}`;
            if (totalOrdersEl) totalOrdersEl.textContent = summary.totalOrders;
            if (totalSalesEl) totalSalesEl.textContent = `GH₵ ${parseFloat(summary.totalSales).toFixed(2)}`;
            if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = `${summary.totalTopUps} (GH₵ ${parseFloat(summary.totalTopUpValue).toFixed(2)})`;

            // Update sidebar profile (guaranteed to exist now)
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                const sidebarUserName = document.getElementById('sidebar-user-name');
                if (sidebarUserName) sidebarUserName.textContent = user.fullName;
            }

        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
        }
    }
    
    // This function handles the "real-time" update after a payment
    function handlePaymentStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_status') === 'success') {
            if (walletBalanceEl) walletBalanceEl.textContent = 'Updating...';
            setTimeout(fetchDashboardSummary, 3000); 
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            fetchDashboardSummary(); 
        }
    }

    // --- 3. INITIALIZE THE DASHBOARD PAGE ---
    handlePaymentStatus();
}

// THIS IS THE KEY CHANGE:
// We now listen for the custom 'layoutReady' event that layout.js fires.
// This guarantees the layout and security check are done before this code runs.
document.addEventListener('layoutReady', initializeDashboard);

*/







