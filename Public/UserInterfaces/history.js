


// This script handles logic for all user order history pages.
document.addEventListener('DOMContentLoaded', () => {
    
    const token = localStorage.getItem('token');

    // --- 1. SECURITY CHECK ---
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    // --- 2. DATA FETCHING & DISPLAY FUNCTIONS ---

    // Function to fetch and build the BUNDLE ORDERS table
async function fetchBundleOrders() {
    const tableContainer = document.getElementById('bundle-orders-table');
    if (!tableContainer) return;

    tableContainer.innerHTML = '<div class="empty-state">Loading your bundle orders...</div>';
    try {
        const response = await fetch('https://megalife-app-postgres.onrender.com/user/transactions/bundles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        const transactions = await response.json();
        
        let tableHTML = `
            <div class="table-header">
                <span>Order ID</span>
                <span>Recipient</span>
                <span>Status</span>
                <span>Volume</span>
                <span>Amount(GHS)</span>
                <span>Network</span>
                <span>Date & Time</span>
                <span>Notice</span>
            </div>`;
        
        if (transactions.length > 0) {
            transactions.forEach(tx => {
                // NEW: Custom date and time formatting
                const dateObj = new Date(tx.transactionsDate);
                const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                let statusBadgeClass = 'status-pending';
                let noticeText = 'Your order is currently being processed';
                if (tx.status.toLowerCase() === 'completed') {
                    statusBadgeClass = 'status-delivered';
                    noticeText = 'Order delivered successfully';
                }
                
                tableHTML += `
                    <div class="table-row">
                        <span><a href="#" class="order-id-link">#${tx.orderId || tx.id}</a></span>
                        <span>${tx.recipient || 'N/A'}</span>
                        <span><span class="status-badge ${statusBadgeClass}"><i class="fas fa-check"></i> ${tx.status}</span></span>
                        <span class="volume"><a href="#">${tx.details}</a></span>
                        <span>GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                        <span>${tx.type}</span>
                        <span class="date-time">${formattedDate}<br>${formattedTime}</span>
                        <span>${noticeText}</span>
                    </div>
                `;
            });
        } else {
            tableHTML += `<div class="empty-state">No bundle orders found.</div>`;
        }
        tableContainer.innerHTML = tableHTML;
    } catch (error) {
        console.error("Failed to fetch bundle orders:", error);
        tableContainer.innerHTML = `<div class="empty-state">Error loading orders.</div>`;
    }
}

    // Function to fetch and build the ALL ORDERS list
    async function fetchAllOrders() {
        const listContainer = document.getElementById('all-orders-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="empty-state">Loading all orders...</div>';
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/transactions/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            const transactions = await response.json();
            
            if (transactions.length > 0) {
                listContainer.innerHTML = '';
      transactions.forEach(tx => {
    let description = `${tx.type} - ${tx.details}`;
    if (tx.recipient) {
        description += ` - ${tx.recipient}`;
    }

    listContainer.innerHTML += `
        <div class="order-card">
            <div class="card-row">
                <span class="order-id">#${tx.orderId || tx.id}</span>
                <span class="date">${new Date(tx.transactionsDate).toLocaleString()}</span>
                <i class="fas fa-shopping-cart"></i>
            </div>
            <p class="order-description">${description}</p>
            <div class="card-row">
                <span class="status-badge status-completed">✓ ${tx.status}</span>
                <span class="order-price">₵${parseFloat(tx.amount).toFixed(2)}</span>
            </div>
        </div>
    `;
});



               
        


                
            } else {
                listContainer.innerHTML = `<div class="empty-state">You have no orders yet.</div>`;
            }
        } catch (error) {
            console.error("Failed to fetch all orders:", error);
            listContainer.innerHTML = `<div class="empty-state">Error loading orders.</div>`;
        }
    }

    // Function to fetch and build the TOP UP HISTORY table
    async function fetchTopUpHistory() {
        const tableContainer = document.getElementById('topup-history-table');
        if (!tableContainer) return;

        tableContainer.innerHTML = '<div class="empty-state">Loading top-up history...</div>';
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/user/transactions/topups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            const transactions = await response.json();
            
            let tableHTML = `
                <div class="table-header">
                    <span>Amount</span><span>Status</span><span>Details</span><span>Date & Time</span>
                </div>`;
            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    tableHTML += `
                        <div class="table-row">
                            <span class="amount-credited">GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                            <span><span class="status-badge status-credited">✓ ${tx.status}</span></span>
                            <span>${tx.details}</span>

                            <!-- CORRECTED: uses transactionsDate -->
                            <span>${new Date(tx.transactionsDate).toLocaleString()}</span>
                        </div>
                    `;
                });
            } else {
                tableHTML += `<div class="empty-state">No top-up history found.</div>`;
            }
            tableContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error("Failed to fetch top-up history:", error);
            tableContainer.innerHTML = `<div class="empty-state">Error loading history.</div>`;
        }
    }

    // --- 3. INITIALIZE THE PAGE ---
    fetchBundleOrders();
    fetchAllOrders();
    fetchTopUpHistory();
});
















/*

// This script now handles all logic for ALL user history pages.
document.addEventListener('DOMContentLoaded', () => {
    
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '../login.html'; return; }

    // --- DATA FETCHING & DISPLAY FUNCTIONS ---

    // Function to fetch BUNDLE orders
    async function fetchBundleOrders() {
        const tableContainer = document.getElementById('bundle-orders-table');
        if (!tableContainer) return; // Only run on this page
        // ... (Your existing, correct logic for fetching bundle orders)
    }

    // Function to fetch ALL orders
    async function fetchAllOrders() {
        const listContainer = document.getElementById('all-orders-list');
        if (!listContainer) return; // Only run on this page
        // ... (Your existing, correct logic for fetching all orders)
    }

    // NEW: Function to fetch TOP-UP history
    async function fetchTopUpHistory() {
        const tableContainer = document.getElementById('topup-history-table');
        if (!tableContainer) return; // Only run on this page

        tableContainer.innerHTML = '<div class="empty-state">Loading top-up history...</div>';
        try {
            const response = await fetch('http://localhost:3000/user/transactions/topups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            const transactions = await response.json();
            
            // Note: We need to adjust the CSS grid for this table to have fewer columns
            let tableHTML = `
                <div class="table-header">
                    <span>Order ID</span>
                    <span>Details</span>
                    <span>Amount</span>
                    <span>Date & Time</span>
                    <span>Status</span>
                </div>`;
            
            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    tableHTML += `
                        <div class="table-row">
                            <span>#${tx.orderId || tx.id}</span>
                            <span>${tx.details}</span>
                            <span class="amount-credited">GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                            <span>${new Date(tx.transactionsDate).toLocaleString()}</span>
                            <span><span class="status-badge status-credited">✓ ${tx.status}</span></span>
                        </div>
                    `;
                });
            } else {
                tableHTML += `<div class="empty-state">No top-up history found.</div>`;
            }
            tableContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error("Failed to fetch top-up history:", error);
            tableContainer.innerHTML = `<div class="empty-state">Error loading history.</div>`;
        }
    }

    // --- 3. INITIALIZE THE PAGE ---
    // The script will now call all three functions.
    // The 'if' statements inside each function ensure only the correct one runs.
    fetchBundleOrders();
    fetchAllOrders();
    fetchTopUpHistory();
});

*/
