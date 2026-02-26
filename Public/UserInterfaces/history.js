
/*

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


*/











// This script handles logic for all user order history pages.
document.addEventListener('DOMContentLoaded', () => {
    
    const token = localStorage.getItem('token');

    // --- 1. SECURITY CHECK ---
    if (!token) {
        window.location.href = '../login.html';
        return;
    }
 // --- 1. NEW: EVENT LISTENER FOR DYNAMIC CANCEL BUTTONS ---
    document.addEventListener('click', async (e) => {
        // Check if a 'cancel-btn' was clicked
        if (e.target.classList.contains('cancel-btn')) {
            e.preventDefault();
            const transactionId = e.target.dataset.id;
            
            if (confirm('Are you sure you want to cancel this order? The amount will be refunded to your wallet.')) {
                try {
                    e.target.disabled = true; // Disable button immediately
                    e.target.textContent = 'Cancelling...';

                    const response = await fetch(`https://megalife-app-postgres.onrender.com/user/transactions/${transactionId}/cancel`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    const result = await response.json();
                    alert(result.message);
                    
                    if (response.ok) {
                        // Refresh the list to show the new 'Cancelled' status
                        // We check which page we are on and refresh the correct list
                        if (document.getElementById('bundle-orders-table')) fetchBundleOrders();
                        if (document.getElementById('all-orders-list')) fetchAllOrders();
                    }
                } catch (error) {
                    console.error('Cancellation failed:', error);
                    alert('An error occurred. Please try again.');
                    e.target.disabled = false; // Re-enable button on failure
                    e.target.textContent = 'Cancel';
                }
            }
        }
    });

    // --- 2. PAGINATION STATE & ELEMENTS (NEW) ---
    let currentPage = 1;
    let totalPages = 1;
    const backBtn = document.getElementById('back-btn');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const pageInfo = document.getElementById('page-info');

    // --- 3. DATA FETCHING & DISPLAY FUNCTIONS ---



    // Function to fetch and build the BUNDLE ORDERS table (UPDATED)
    async function fetchBundleOrders(page = 1) {
        const tableContainer = document.getElementById('bundle-orders-table');
        if (!tableContainer) return;

        tableContainer.innerHTML = '<div class="empty-state">Loading...</div>';
        try {
            const response = await fetch(`https://megalife-app-postgres.onrender.com/user/transactions/bundles?page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            
            const data = await response.json();
            currentPage = data.currentPage;
            totalPages = data.totalPages;

            let tableHTML = `
                <div class="table-header">
                    <span>Action</span><span>Order ID</span><span>Recipient</span><span>Status</span><span>Volume</span><span>Amount(GHS)</span><span>Network</span><span>Date & Time</span><span>Notice</span>
                </div>`;
            
            if (data.transactions.length > 0) {
                data.transactions.forEach(tx => {
                    const dateObj = new Date(tx.transactionsDate);
                    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    let status = tx.status.toLowerCase();
                    let statusBadgeClass = 'status-pending';
                    let noticeCell = 'Your order is currently being processed';

                    if (status === 'completed') {
                        statusBadgeClass = 'status-delivered';
                        noticeCell = 'Order delivered successfully';
                    } else if (status === 'failed') {
                        statusBadgeClass = 'status-failed';
                        noticeCell = 'Order failed. Please contact support.';
                    } else if (status === 'cancelled') {
                        statusBadgeClass = 'status-cancelled'; // You'll need to add CSS for this
                        noticeCell = 'This order has been cancelled.';
                    }
                    
                    // THIS IS THE CRITICAL CHANGE:
                    // If the order is 'Processing', the noticeCell becomes a Cancel button
                    if (status === 'processing') {
                        noticeCell = `<button class="cancel-btn" data-id="${tx.id}">Cancel</button>`;
                    }
                    
                    tableHTML += `
                        <div class="table-row">
                            <span><a href="#" class="order-id-link">#${tx.orderId || tx.id}</a></span>
                            <span>${tx.recipient || 'N/A'}</span>
                            <span><span class="status-badge ${statusBadgeClass}">${tx.status}</span></span>
                            <span class="volume"><a href="#">${tx.details}</a></span>
                            <span>GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                            <span>${tx.type}</span>
                            <span class="date-time">${formattedDate}<br>${formattedTime}</span>
                            <td>${noticeCell}</td>
                        </div>
                    `;
                });
            } else {
                tableHTML += `<div class="empty-state">No bundle orders found.</div>`;
            }
            tableContainer.innerHTML = tableHTML;
            updatePaginationControls();
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


    // --- 4. PAGINATION HELPER FUNCTIONS (NEW) ---
    function updatePaginationControls() {
        if (pageInfo && backBtn && loadMoreBtn) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            backBtn.disabled = (currentPage <= 1);
            // Hide "Load More" on the last page, show it otherwise
            loadMoreBtn.style.display = (currentPage >= totalPages) ? 'none' : 'inline-block';
        }
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchBundleOrders(currentPage + 1);
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchBundleOrders(currentPage - 1);
            }
        });
    }

    // --- 5. INITIALIZE THE PAGE ---
    // The script now intelligently calls only the function that matches the current page.
    fetchBundleOrders();
    fetchAllOrders();
    fetchTopUpHistory();
});