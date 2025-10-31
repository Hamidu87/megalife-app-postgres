











/*

// This script WAITS for the layout to be ready, then handles security and data for the dashboard.

function initializeDashboard() {
    console.log("'layoutReady' event received. Initializing dashboard.");
    
    // This check ensures this code only runs when on the dashboard page.
    if (window.location.pathname.includes('userdashboard.html')) {

        const token = localStorage.getItem('token');
        
        // --- 1. SECURITY CHECK ---
        if (!token) {
            window.location.href = '../login.html';
            return;
        }

        // --- 2. GET UI ELEMENTS ---
        const walletBalanceEl = document.getElementById('wallet-balance');
        const totalOrdersEl = document.getElementById('total-orders');
        const totalSalesEl = document.getElementById('total-sales');
        const eWalletTopUpsEl = document.getElementById('e-wallet-topups');
        
        // --- 3. DATA FETCHING AND DISPLAY ---
        async function fetchDashboardSummary() {
            try {
                const response = await fetch('http://localhost:3000/user/dashboard-summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    console.error(`Authorization failed: ${response.status}`);
                    localStorage.clear();
                    window.location.href = '../login.html';
                    return;
                }
                
                const summary = await response.json();
                
                // Update all dashboard cards
                if (walletBalanceEl) walletBalanceEl.textContent = `GH₵ ${parseFloat(summary.walletBalance).toFixed(2)}`;
                if (totalOrdersEl) totalOrdersEl.textContent = summary.totalOrders;
                if (totalSalesEl) totalSalesEl.textContent = `GH₵ ${parseFloat(summary.totalSales).toFixed(2)}`;
                if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = `${summary.totalTopUps} (GH₵ ${parseFloat(summary.totalTopUpValue).toFixed(2)})`;

                // Update the sidebar profile (guaranteed to exist now)
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    const sidebarUserName = document.getElementById('sidebar-user-name');
                    if (sidebarUserName) sidebarUserName.textContent = user.fullName;
                }

            } catch (error) {
                console.error('Error fetching dashboard summary:', error);
            }
        }
        
        function handlePaymentStatus() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('payment_status') === 'success') {
                if (walletBalanceEl) walletBalanceEl.textContent = 'Updating...';
                if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = 'Updating...';
                
                setTimeout(fetchDashboardSummary, 3000); 
                
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                fetchDashboardSummary(); 
            }
        }

        // --- 4. INITIALIZE THE DASHBOARD PAGE ---
        handlePaymentStatus();
    }
}

// THIS IS THE CRITICAL PART:
// The script does nothing until it hears the 'layoutReady' signal from layout.js.
document.addEventListener('layoutReady', initializeDashboard);



*/



















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






// This script now ONLY handles data logic for the dashboard, and waits for the layout.

function initializeDashboard() {
    // This check ensures this code only runs when we are on the dashboard page.
    if (!window.location.pathname.includes('userdashboard.html')) {
        return;
    }

    console.log("Dashboard Initializing: Layout is ready.");

    const token = localStorage.getItem('token');
    // We don't need a security check here, because layout.js already did it.
    
    // --- Get UI Elements for the dashboard ---
    const walletBalanceEl = document.getElementById('wallet-balance');
    const totalOrdersEl = document.getElementById('total-orders');
    const totalSalesEl = document.getElementById('total-sales');
    const eWalletTopUpsEl = document.getElementById('e-wallet-topups');
    
    // --- Data Fetching Function ---
    async function fetchDashboardSummary() {
        console.log("Fetching dashboard summary...");
        try {
            const response = await fetch('http://localhost:3000/user/dashboard-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                // If the token is bad, layout.js will handle the redirect on next page load,
                // but we can log out here as well for safety.
                console.error(`Authorization failed, logging out. Status: ${response.status}`);
                localStorage.clear();
                window.location.replace('../login.html');
                return;
            }
            
            const summary = await response.json();
            
            // Update all dashboard cards
            if (walletBalanceEl) walletBalanceEl.textContent = `GH₵ ${parseFloat(summary.walletBalance).toFixed(2)}`;
            if (totalOrdersEl) totalOrdersEl.textContent = summary.totalOrders;
            if (totalSalesEl) totalSalesEl.textContent = `GH₵ ${parseFloat(summary.totalSales).toFixed(2)}`;
            if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = `${summary.totalTopUps} (GH₵ ${parseFloat(summary.totalTopUpValue).toFixed(2)})`;

            // Update sidebar profile (which is guaranteed to exist now)
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

    // --- Initialize this specific page ---
    handlePaymentStatus();
}

// This is the key that prevents race conditions.
// We wait for the 'layoutReady' signal from layout.js before running our logic.
document.addEventListener('layoutReady', initializeDashboard);

// This is the key that fixes the "stale balance" back-button bug.
// It re-runs our logic if the page is restored from the browser's cache.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        initializeDashboard();
    }
});

























