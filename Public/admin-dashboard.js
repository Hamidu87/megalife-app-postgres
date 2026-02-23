document.addEventListener('DOMContentLoaded', () => {
    // This script handles ALL logic for the admin dashboard page.

    const isAdminDashboardPage = document.querySelector('.admin-container');
    if (!isAdminDashboardPage) {
        return; 
    }

    const token = localStorage.getItem('admin_token');

    // --- 1. SECURITY CHECK ---
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
      const logoutLink = document.querySelector('.logout-link');
     if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('admin_token');
            window.location.href = 'admin-login.html';
        });
    }
    

    // CORRECTED: The navigation is now in the sidebar menu
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item a');
    const contentPanes = document.querySelectorAll('.tab-content-wrapper .tab-pane');
    const menuToggle = document.getElementById('admin-menu-toggle');
    const sidebarOverlay = document.getElementById('admin-sidebar-overlay');
    const tabs = document.querySelectorAll('.sidebar-menu .menu-item a');
    

    // Elements for Bundle Modal
    const modal = document.getElementById('bundle-modal');
    const bundleForm = document.getElementById('bundle-form');
    const cancelBtn = document.getElementById('cancel-btn');

    // Elements for User Modal
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    const cancelUserBtn = document.getElementById('cancel-user-btn');

    // Elements for Support Settings
    const saveSupportBtn = document.getElementById('save-support-btn');
    const sendTestEmailBtn = document.getElementById('send-test-email-btn');
    const whatsappLinkInput = document.getElementById('whatsapp-link-input');
    const testEmailInput = document.getElementById('test-email-input');

    // --- 3. EVENT LISTENERS ---

    // Logout Logic
   

    // Tab Switching Logic (CORRECTED for Sidebar Navigation)
    menuItems.forEach(menuLink => {
        menuLink.addEventListener('click', function (event) {
            event.preventDefault();
            // Visually update the sidebar active state
            menuItems.forEach(item => item.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');

            // Show the correct content pane
            contentPanes.forEach(pane => pane.classList.remove('active'));
            const targetPane = document.getElementById(this.getAttribute('data-target'));
            if (targetPane) targetPane.classList.add('active');
            
            // Fetch data for the clicked tab
            const targetId = this.getAttribute('data-target');
            if (targetId === 'analyticsContent') fetchAllAnalytics();
            else if (targetId === 'userManagementContent') fetchAllUsers();
            else if (targetId === 'allTransactionsContent') fetchAllTransactions();
            else if (targetId === 'dataBundlesContent') fetchAllBundles();
            else if (targetId === 'supportContent') fetchAllSettings();
            
            else if (targetId === 'profitAnalyticsContent') fetchProfitAnalytics();
        });
    });

    // Modal Form Listeners
    if (cancelBtn) cancelBtn.addEventListener('click', closeBundleModal);
    if (bundleForm) bundleForm.addEventListener('submit', handleBundleFormSubmit);
    if (cancelUserBtn) cancelUserBtn.addEventListener('click', () => userModal.hidden = true);
    if (userForm) userForm.addEventListener('submit', handleUserFormSubmit);

    // Support Settings Button Listeners
    if(saveSupportBtn) {
        saveSupportBtn.addEventListener('click', async () => {
            const link = whatsappLinkInput.value;
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: 'whatsapp_link', value: link })
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) { alert('Failed to save settings.'); }
        });
    }
    if(sendTestEmailBtn) {
        sendTestEmailBtn.addEventListener('click', async () => {
            const email = testEmailInput.value;
            if (!email) return alert('Please enter a recipient email.');
            sendTestEmailBtn.disabled = true;
            sendTestEmailBtn.textContent = 'Sending...';
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/admin/send-test-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ recipientEmail: email })
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) { alert('Failed to send test email.'); }
            finally {
                sendTestEmailBtn.disabled = false;
                sendTestEmailBtn.textContent = 'Send Test Email';
            }
        });
    }

    // Page-wide listener for DYNAMICALLY created buttons (Edit, Delete, Forward, etc.)
    document.addEventListener('click', async (e) => {
        // Bundle Clicks
        if (e.target.closest('.add-bundle-btn')) openBundleModal();
        
        const editBundleBtn = e.target.closest('.bundle-table .action-edit');
        if (editBundleBtn) {
            const id = editBundleBtn.closest('.table-row').dataset.id;
            try {
                const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles`, { headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' } });
                const bundles = await response.json();
                const bundleToEdit = bundles.find(b => b.id == id);
                if (bundleToEdit) openBundleModal(bundleToEdit);
            } catch (error) { console.error('Error preparing bundle edit:', error); }
        }
        
        const deleteBundleBtn = e.target.closest('.bundle-table .action-delete');
        if (deleteBundleBtn) {
            if (confirm('Are you sure you want to delete this bundle?')) {
                const id = deleteBundleBtn.closest('.table-row').dataset.id;
                try {
                    await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    fetchAllBundles();
                } catch (error) { console.error('Failed to delete bundle:', error); }
            }
        }

        // User Clicks
        const editUserBtn = e.target.closest('.user-table .action-edit');
        if (editUserBtn) {
            const id = editUserBtn.closest('.table-row').dataset.id;
            try {
                const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
                const users = await response.json();
                const userToEdit = users.find(u => u.id == id);
                if (userToEdit) openUserModal(userToEdit);
            } catch (error) { console.error('Error preparing user edit:', error); }
        }

        const deleteUserBtn = e.target.closest('.user-table .action-delete');
        if (deleteUserBtn) {
            if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
                const id = deleteUserBtn.closest('.table-row').dataset.id;
                try {
                    await fetch(`https://megalife-app-postgres.onrender.com/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    fetchAllUsers();
                } catch (error) { alert('Failed to delete user.'); }
            }
        }

        // Transaction Clicks
       // NEW: Handle "Forward Now" button click
        const forwardBtn = e.target.closest('.forward-now-btn');
        if (forwardBtn) {
            e.preventDefault();
            const id = forwardBtn.dataset.id;
            console.log(`Forward Now clicked for Tx ID: ${id}`);
            
            // Give user feedback
            forwardBtn.textContent = 'Forwarding...';
            forwardBtn.disabled = true;

            try {
                const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/transactions/${id}/forward`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error.');
                }
                
                // If successful, refresh the entire transactions list to show the new 'Completed' status
                alert('Transaction forwarded successfully!');
                fetchAllTransactions();

            } catch (error) {
                console.error('Manual forward failed:', error);
                alert('Failed to forward transaction. Please check the server logs.');
                // Re-enable the button on failure
                forwardBtn.textContent = 'Forward Now';
                forwardBtn.disabled = false;
            }
        }
    });


    // NEW: Hamburger Menu Logic
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // This will add/remove the 'admin-sidebar-open' class from the <body> tag
            document.body.classList.toggle('admin-sidebar-open');
        });
    }
    
    if (sidebarOverlay) {
        // Clicking the dark overlay will also close the sidebar
        sidebarOverlay.addEventListener('click', () => {
            document.body.classList.remove('admin-sidebar-open');
        });
    }


    // --- 4. FORM & MODAL HANDLER FUNCTIONS ---
    // UPDATED: openBundleModal now accepts userType
    function openBundleModal(provider = null, userType = null, bundle = null) {
    if (!bundleForm) return;
    bundleForm.reset();
    
    if (bundle) { // This is for editing an existing bundle
        document.getElementById('modal-title').textContent = `Edit ${bundle.user_type} Bundle`;
        document.getElementById('bundle-id').value = bundle.id;
        document.getElementById('bundle-user-type').value = bundle.user_type;
        document.getElementById('bundle-provider').value = bundle.provider;
        document.getElementById('bundle-volume').value = bundle.volume;
        document.getElementById('bundle-selling-price').value = bundle.selling_price;
        document.getElementById('bundle-supplier-cost').value = bundle.supplier_cost;
    } else { // This is for adding a new bundle
        document.getElementById('modal-title').textContent = `Add New ${userType} Bundle`;
        document.getElementById('bundle-id').value = '';
        document.getElementById('bundle-user-type').value = userType;
        document.getElementById('bundle-provider').value = provider;
    }
    if (modal) modal.hidden = false;
}

async function handleBundleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('bundle-id').value;
    const bundleData = {
        provider: document.getElementById('bundle-provider').value,
        volume: document.getElementById('bundle-volume').value,
        selling_price: document.getElementById('bundle-selling-price').value,
        supplier_cost: document.getElementById('bundle-supplier-cost').value,
        user_type: document.getElementById('bundle-user-type').value
    };
    
    const isEditing = !!id;
    
    // THIS IS THE CORRECTED CODE WITH THE REAL URL
    const baseUrl = 'https://megalife-app-postgres.onrender.com';
    const url = isEditing ? `${baseUrl}/admin/bundles/${id}` : `${baseUrl}/admin/bundles`;
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bundleData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to save bundle.');
        }
        closeBundleModal();
        fetchAllBundles(); // Refresh the view
    } catch (error) {
        console.error('Error saving bundle:', error);
        alert(`Error: ${error.message}`);
    }
}


     // --- DYNAMIC CLICK HANDLER (CORRECTED) ---
    async function handleDynamicClicks(e) {
        // ... (Your logic for users and transactions)
        const addBtn = e.target.closest('.add-bundle-btn');
        if (addBtn) {
            const provider = addBtn.dataset.provider;
            const userType = addBtn.dataset.user_type;
            openBundleModal(provider, userType);
        }
        const editBtn = e.target.closest('.bundle-table .action-edit');
        if (editBtn) {
            const id = editBtn.closest('tr').dataset.id;
            const response = await fetch(`.../admin/bundles`, { /*...*/ });
            const bundles = await response.json();
            const bundleToEdit = bundles.find(b => b.id == id);
            if (bundleToEdit) openBundleModal(null, null, bundleToEdit);
        }
    };
    
    function openUserModal(user) {
        if (!userForm) return;
        userForm.reset();
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-fullName').value = user.fullName;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-telephone').value = user.telephone;
        document.getElementById('user-country').value = user.country;
        if (userModal) userModal.hidden = false;
    }
    async function handleUserFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const userData = {
            fullName: document.getElementById('user-fullName').value,
            email: document.getElementById('user-email').value,
            telephone: document.getElementById('user-telephone').value,
            country: document.getElementById('user-country').value,
        };
        try {
            await fetch(`https://megalife-app-postgres.onrender.com/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userData)
            });
            if (userModal) userModal.hidden = true;
            fetchAllUsers();
        } catch (error) { alert('Failed to save user changes.'); }
    }

    // --- 5. DATA FETCHING FUNCTIONS ---
    
    // Replace the existing fetchAllUsers function in your admin-dashboard.js
async function fetchAllUsers() {
        const userTableContainer = document.querySelector('#userManagementContent .user-table');
        const userCountBadge = document.querySelector('.menu-item a[data-target="userManagementContent"] .badge');
        if (!userTableContainer) return;

        userTableContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/users', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
        // Update the badge count
        if (userCountBadge) {
            userCountBadge.textContent = users.length;
        } else if (headerBadge) {
            headerBadge.textContent = users.length;
        }
        
        let tableHTML = `
            <div class="table-header">
                <span>Full Name</span>
                <span>Email</span>
                <span>Telephone</span>
                <span>Country</span>
                <span>Wallet Balance</span>
                <span>Registered On</span>
                <span>Status</span>
                <span>Actions</span>
            </div>`;
        
        if (users.length > 0) {
            users.forEach(user => {
                const registrationDate = new Date(user.registrationDate).toLocaleString();
                tableHTML += `
                    <div class="table-row" data-id="${user.id}">
                        <span>${user.fullName}</span>
                        <span>${user.email}</span>
                        <span>${user.telephone || 'N/A'}</span>
                        <span>${user.country || 'N/A'}</span>
                        <span>GH₵ ${parseFloat(user.walletBalance).toFixed(2)}</span>
                        <span>${registrationDate}</span>
                        <span><span class="status-badge status-active">Active</span></span>
                        <div class="actions">
                            <i class="fas fa-edit action-edit"></i>
                            <i class="fas fa-trash action-delete"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            tableHTML += `<div class="empty-state">No users found.</div>`;
        }
        userTableContainer.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Failed to fetch users:', error);
        userTableContainer.innerHTML = `<div class="empty-state">Failed to load users.</div>`;
    }
}
   





    async function fetchAllTransactions() {
        const transTableContainer = document.querySelector('#allTransactionsContent .transactions-table');
        if (!transTableContainer) return;
        
        transTableContainer.innerHTML = '<div class="empty-state">Loading transactions...</div>';

        try {
            const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/transactions`, { 
                headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' } 
            });
            if (!response.ok) throw new Error('Failed to fetch transactions');
            
            const transactions = await response.json();
            
            let tableHTML = `
                <div class="table-header">
                    <span>User</span>
                    <span>Type</span>
                    <span>Details</span>
                    <span>Recipient</span>
                    <span>Amount</span>
                    <span>Date</span>
                    <span>Status</span>
                </div>
                <div class="table-body">`;

            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    const transDate = new Date(tx.transactionsDate).toLocaleString();
                    const status = tx.status ? tx.status.toLowerCase() : 'unknown';
                    
                    let statusCellHTML = '';
                    
                    // THIS IS THE CRITICAL FIX:
                    // Check if status is 'processing' OR 'failed' to show the button
                    if (status === 'processing' || status === 'failed') {
                        statusCellHTML = `<button class="forward-now-btn" data-id="${tx.id}">Forward Now</button>`;
                    } else {
                        // For 'Completed' or any other status, show the badge
                        let statusBadgeClass = 'status-completed'; // default
                        statusCellHTML = `<span class="status-badge ${statusBadgeClass}">${tx.status}</span>`;
                    }

                    tableHTML += `
                        <div class="table-row">
                            <span>${tx.fullName || 'N/A'}</span>
                            <span>${tx.type}</span>
                            <span>${tx.details}</span>
                            <span>${tx.recipient || 'N/A'}</span>
                            <span>GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                            <span>${transDate}</span>
                            <td>${statusCellHTML}</td>
                        </div>
                    `;
                });
            } else {
                tableHTML += `<div class="empty-state">No transactions found.</div>`;
            }

            tableHTML += `</div>`;
            transTableContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            transTableContainer.innerHTML = '<div class="empty-state">Failed to load transactions.</div>';
        }
    }



// THIS IS THE NEW, CORRECTED fetchAllBundles FUNCTION
    async function fetchAllBundles() {
        const container = document.querySelector('.bundle-management-container');
        if (!container) return;
        container.innerHTML = '<div class="empty-state">Loading bundles...</div>';

        try {
            const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch bundles');
            const bundles = await response.json();
            
            // Group bundles by provider, then by user_type
            const bundlesByProvider = {
                MTN: { Agent: [], Subscriber: [] },
                AirtelTigo: { Agent: [], Subscriber: [] },
                Telecel: { Agent: [], Subscriber: [] }
            };
            bundles.forEach(bundle => {
                if (bundlesByProvider[bundle.provider] && bundlesByProvider[bundle.provider][bundle.user_type]) {
                    bundlesByProvider[bundle.provider][bundle.user_type].push(bundle);
                }
            });

            container.innerHTML = ''; // Clear loading message
            
            // Dynamically build the entire section for each provider
            for (const provider in bundlesByProvider) {
                const providerSection = document.createElement('div');
                providerSection.className = 'provider-section';
                
                let sectionHTML = `<h4 class="provider-title ${provider.toLowerCase()}"><i class="fas fa-circle"></i> ${provider}</h4>`;
                
                // Loop through Agent and Subscriber types
                for (const userType of ['Agent', 'Subscriber']) {
                    const typeBundles = bundlesByProvider[provider][userType];
                    
                    sectionHTML += `
                        <div class="bundle-table-wrapper">
                            <h5>${userType} Pricing</h5>
                            <table class="bundle-table" id="bundle-table-${provider}-${userType}">
                                <thead><tr><th>Volume</th><th>Selling Price</th><th>Supplier Cost</th><th>Actions</th></tr></thead>
                                <tbody>`;
                    
                    if (typeBundles.length > 0) {
                        typeBundles.forEach(bundle => {
                            sectionHTML += `
                                <tr class="table-row" data-id="${bundle.id}">
                                    <td>${bundle.volume}</td>
                                    <td>${parseFloat(bundle.selling_price).toFixed(2)}</td>
                                    <td>${parseFloat(bundle.supplier_cost).toFixed(2)}</td>
                                    <td class="actions">
                                        <i class="fas fa-edit action-edit" title="Edit"></i>
                                        <i class="fas fa-trash action-delete" title="Delete"></i>
                                    </td>
                                </tr>`;
                        });
                    } else {
                        sectionHTML += `<tr><td colspan="4" class="empty-state-small">No bundles for this type.</td></tr>`;
                    }

                    sectionHTML += `</tbody></table>
                            <button class="add-bundle-btn" data-provider="${provider}" data-user_type="${userType}">
                                <i class="fas fa-plus"></i> Add ${userType} Bundle
                            </button>
                        </div>`;
                }
                
                providerSection.innerHTML = sectionHTML;
                container.appendChild(providerSection);
            }
        } catch (error) {
            console.error('Error fetching/rendering bundles:', error);
            container.innerHTML = '<div class="empty-state">Failed to load bundles.</div>';
        }
    }








/*
    async function fetchAllBundles() {
        const bundlesContainer = document.querySelector('#dataBundlesContent');
        if (!bundlesContainer) return;
        try {
            const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles`, { headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' } });
            if (!response.ok) throw new Error('Failed to fetch bundles.');
            const bundles = await response.json();
            const bundlesByProvider = { MTN: [], AirtelTigo: [], Telecel: [] };
            bundles.forEach(bundle => { if (bundlesByProvider[bundle.provider]) bundlesByProvider[bundle.provider].push(bundle); });
            ['MTN', 'AirtelTigo', 'Telecel'].forEach(provider => {
                const card = bundlesContainer.querySelector(`.bundle-title.${provider.toLowerCase()}`).closest('.bundle-card');
                if (card) {
                    const tableBody = card.querySelector('.bundle-table .table-body');
                    tableBody.innerHTML = '';
                    const providerBundles = bundlesByProvider[provider];
                    if (providerBundles && providerBundles.length > 0) {
                        providerBundles.forEach(bundle => {
                            tableBody.innerHTML += `<div class="table-row" data-id="${bundle.id}"><span>${bundle.volume}</span><span>${parseFloat(bundle.price).toFixed(2)}</span><div class="actions"><i class="fas fa-edit action-edit"></i><i class="fas fa-trash action-delete"></i></div></div>`;
                        });
                    }
                }
            });
        } catch (error) { 
            console.error('Error fetching/rendering bundles:', error); 
        }
    }
*/



    async function fetchAllSettings() {
        if (!whatsappLinkInput) return;
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            const settings = await response.json();
            const whatsappLinkSetting = settings.find(s => s.setting_name === 'whatsapp_link');
            if (whatsappLinkSetting) whatsappLinkInput.value = whatsappLinkSetting.setting_value;
        } catch (error) { 
            console.error('Failed to fetch settings:', error);
            whatsappLinkInput.value = 'Error loading setting.';
        }
    }




// NEW FUNCTION for fetching and displaying analytics
     let annualChart = null;
    async function fetchAllAnalytics() {
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/analytics/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch analytics.');
            const summary = await response.json();
            // Populate Top-Ups Table
            document.getElementById('topups-today-count').textContent = summary.topUps.today.count;
            document.getElementById('topups-today-sum').textContent = summary.topUps.today.sum.toFixed(2);
            document.getElementById('topups-week-count').textContent = summary.topUps.week.count;
            document.getElementById('topups-week-sum').textContent = summary.topUps.week.sum.toFixed(2);
            document.getElementById('topups-month-count').textContent = summary.topUps.month.count;
            document.getElementById('topups-month-sum').textContent = summary.topUps.month.sum.toFixed(2);

            // Populate Bundles Table
            document.getElementById('bundles-today-count').textContent = summary.bundles.today.count;
            document.getElementById('bundles-today-sum').textContent = summary.bundles.today.sum.toFixed(2);
            document.getElementById('bundles-week-count').textContent = summary.bundles.week.count;
            document.getElementById('bundles-week-sum').textContent = summary.bundles.week.sum.toFixed(2);
            document.getElementById('bundles-month-count').textContent = summary.bundles.month.count;
            document.getElementById('bundles-month-sum').textContent = summary.bundles.month.sum.toFixed(2);

            // Create/Update the Chart
            const chartCtx = document.getElementById('annualSalesChart').getContext('2d');
            
            const labels = summary.annualSales.map(item => item.month);
            const data = summary.annualSales.map(item => item.total_sales);

            if (annualChart) {
                annualChart.destroy(); // Destroy old chart before creating a new one
            }
            annualChart = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Sales (GH₵)',
                        data: data,
                        backgroundColor: 'rgba(0, 74, 173, 0.7)',
                        borderColor: 'rgba(0, 74, 173, 1)',
                        borderWidth: 1
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        } catch (error) {
            console.error("Failed to load analytics:", error);
        }
    }


    // NEW FUNCTION for fetching and displaying profit analytics
   

// NEW FUNCTION for fetching and displaying profit analytics
    async function fetchProfitAnalytics() {
        const todayEl = document.getElementById('profit-today');
        const weekEl = document.getElementById('profit-week');
        const monthEl = document.getElementById('profit-month');
        if (!todayEl) return; // Only run if we are on the right page

        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/analytics/profit', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch profit analytics.');
            
            const summary = await response.json();
            
            todayEl.textContent = summary.today.toFixed(2);
            weekEl.textContent = summary.week.toFixed(2);
            monthEl.textContent = summary.month.toFixed(2);

        } catch (error) {
            console.error("Failed to load profit analytics:", error);
        }
    }

    // --- 6. INITIALIZE THE DASHBOARD ---
    // The default tab is Analytics, so we call its function on page load.
    fetchAllAnalytics();
});
















