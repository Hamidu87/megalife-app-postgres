// This script handles security and data logic ONLY for the userdashboard.html page.

// THIS IS THE KEY CHANGE: We wait for the 'load' event instead of 'DOMContentLoaded'.
// 'load' waits for ALL resources (including other scripts and images) to finish loading.
/*window.addEventListener('load', () => {
    
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
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            // No timeout needed now, because 'load' ensures the sidebar is present.
            const sidebarUserName = document.getElementById('sidebar-user-name');
            if (sidebarUserName) sidebarUserName.textContent = user.fullName;
        }

        // --- 3. DATA FETCHING AND DISPLAY ---
        async function fetchDashboardSummary() {
            try {
                const response = await fetch('http://localhost:3000/user/dashboard-summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    console.error(`Authorization failed with status: ${response.status}`);
                    localStorage.clear();
                    window.location.href = '../login.html';
                    return;
                }
                
                const summary = await response.json();
                
                if (walletBalanceEl) walletBalanceEl.textContent = `GH₵ ${parseFloat(summary.walletBalance).toFixed(2)}`;
                if (totalOrdersEl) totalOrdersEl.textContent = summary.totalOrders;
                if (totalSalesEl) totalSalesEl.textContent = `GH₵ ${parseFloat(summary.totalSales).toFixed(2)}`;
                if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = `${summary.totalTopUps} (GH₵ ${parseFloat(summary.totalTopUpValue).toFixed(2)})`;

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
});*/

















// This script now waits for the layout to be ready before running.
/*function initializeDashboard() {
    
    // This check ensures this code only runs when on the dashboard page.
    if (window.location.pathname.includes('userdashboard.html')) {

        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = '../login.html';
            return;
        }

        // --- DATA FETCHING AND DISPLAY ---
        async function fetchDashboardSummary() {
            // ... (Your existing, correct logic to fetch and display the 4 summary cards)
        }
        
        function handlePaymentStatus() {
            // ... (Your existing, correct logic to handle the payment status URL)
        }

        // Initialize the dashboard
        handlePaymentStatus();
    }
}

// THIS IS THE CRITICAL CHANGE:
// Instead of running on DOMContentLoaded, we wait for our custom 'layoutReady' event.
document.addEventListener('layoutReady', initializeDashboard);*/












// This script handles security and data logic ONLY for the userdashboard.html page.
/*document.addEventListener('DOMContentLoaded', () => {
    
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
                
                // Update the sidebar profile
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
                if (eWalletTopUpsEl) eWalletTopUpsEl.textContent = 'Updating...';
                
                setTimeout(fetchDashboardSummary, 3000); 
                
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                fetchDashboardSummary(); 
            }
        }

        // --- 4. INITIALIZE THE DASHBOARD PAGE ---
        
        // THIS IS THE CRITICAL FIX:
        // We will repeatedly check if the sidebar has been loaded by layout.js.
        // Once it's there, we know it's safe to run our data-fetching logic.
        const checkInterval = setInterval(() => {
            const sidebar = document.querySelector('aside.sidebar .sidebar-header');
            if (sidebar) {
                // The sidebar is loaded! Stop checking and run our functions.
                clearInterval(checkInterval);
                handlePaymentStatus();
            }
        }, 100); // Check every 100 milliseconds

    }
});*/











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

















// This script handles security and data logic ONLY for the userdashboard.html page.

// This is our main function that contains all the logic for the dashboard.
function initializeDashboard() {
    console.log("Initializing dashboard logic...");

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
        console.log("Fetching dashboard summary from server...");
        try {
            const response = await fetch('http://localhost:3000/user/dashboard-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                console.error(`Authorization failed, logging out. Status: ${response.status}`);
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

            // Update sidebar profile
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

    // --- 4. INITIALIZE THE DASHBOARD PAGE ---
    handlePaymentStatus();
}

// --- THIS IS THE CRITICAL FIX ---
// We listen for the 'pageshow' event. This fires every time the page is displayed.
window.addEventListener('pageshow', function(event) {
    // The 'persisted' property is true if the page was loaded from the back-forward cache.
    // We run our logic either way to ensure data is always fresh.
    if (event.persisted) {
        console.log("Page was restored from cache. Re-initializing dashboard.");
        // We add a small delay to ensure the browser has restored everything.
        setTimeout(initializeDashboard, 100);
    } else {
        console.log("Page was loaded normally. Initializing dashboard.");
        initializeDashboard();
    }
});