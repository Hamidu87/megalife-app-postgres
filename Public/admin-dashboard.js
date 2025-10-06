

document.addEventListener('DOMContentLoaded', () => {
    // This script handles ALL logic for the admin dashboard page.

    const isAdminDashboardPage = document.querySelector('.admin-container');
    if (!isAdminDashboardPage) return; 

    const token = localStorage.getItem('admin_token');

    // --- 1. SECURITY CHECK ---
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    // --- 2. GET ALL UI ELEMENTS ---
    const logoutLink = document.querySelector('.logout-link'); 
    const tabs = document.querySelectorAll('.content-tabs .tab-item');
    const contentPanes = document.querySelectorAll('.tab-content-wrapper .tab-pane');
    const modal = document.getElementById('bundle-modal');
    const bundleForm = document.getElementById('bundle-form');
    const cancelBtn = document.getElementById('cancel-btn');
    // NEW: Get references to Support Settings elements
    const saveSupportBtn = document.getElementById('save-support-btn');
    const sendTestEmailBtn = document.getElementById('send-test-email-btn');
    const whatsappLinkInput = document.getElementById('whatsapp-link-input');
    const testEmailInput = document.getElementById('test-email-input');

    // --- 3. EVENT LISTENERS ---

    // Logout Logic
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('admin_token');
            window.location.href = 'admin-login.html';
        });
    }







    // Tab Switching Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', function (event) {
            event.preventDefault();
            tabs.forEach(item => item.classList.remove('active'));
            contentPanes.forEach(pane => pane.classList.remove('active'));
            this.classList.add('active');
            const targetPane = document.getElementById(this.getAttribute('data-target'));
            if (targetPane) targetPane.classList.add('active');
            
            const targetId = this.getAttribute('data-target');
            if (targetId === 'userManagementContent') fetchAllUsers();
            else if (targetId === 'allTransactionsContent') fetchAllTransactions();
            else if (targetId === 'dataBundlesContent') fetchAllBundles();
            // NEW: Add handler for the Support tab
            else if (targetId === 'supportContent') fetchAllSettings();
        });
    });


    // Modal Form Logic
    if (cancelBtn) cancelBtn.addEventListener('click', closeBundleModal);
    if (bundleForm) bundleForm.addEventListener('submit', handleBundleFormSubmit);

    // Page-wide listener for dynamic buttons (Edit, Delete, Add)
    document.addEventListener('click', handleDynamicClicks);

    // NEW: Support Settings button listeners
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






    




// --- FUNCTIONS ---

    function openBundleModal(bundle = null) {
        console.log("openBundleModal function was called.");
        if (!bundleForm) return;
        bundleForm.reset();
        if (bundle) {
            document.getElementById('modal-title').textContent = 'Edit Bundle';
            document.getElementById('bundle-id').value = bundle.id;
            document.getElementById('bundle-provider').value = bundle.provider;
            document.getElementById('bundle-volume').value = bundle.volume;
            document.getElementById('bundle-price').value = bundle.price;
        } else {
            document.getElementById('modal-title').textContent = 'Add New Bundle';
            document.getElementById('bundle-id').value = '';
        }
        if (modal) modal.hidden = false;
    }

    function closeBundleModal() {
        console.log("closeBundleModal function was called.");
        if (modal) modal.hidden = true;
    }

    async function handleBundleFormSubmit(e) {
        console.log("--- SAVE BUNDLE (FORM SUBMIT) TRIGGERED ---");
        e.preventDefault();
        const id = document.getElementById('bundle-id').value;
        const bundleData = { provider: document.getElementById('bundle-provider').value, volume: document.getElementById('bundle-volume').value, price: document.getElementById('bundle-price').value };
        const isEditing = !!id;
        const url = isEditing ? `https://megalife-app-postgres.onrender.com/admin/bundles/${id}` : 'https://megalife-app-postgres.onrender.com/admin/bundles';
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(bundleData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save bundle.');
            }
            console.log("Bundle saved successfully!");
            closeBundleModal();

            console.log("About to call fetchAllBundles() after saving..."); // DEBUG
    fetchAllBundles(); // Refresh the list

            fetchAllBundles();
        } catch (error) {
            console.error('Error saving bundle:', error);
            alert(`Error: ${error.message}`);
        }
    }







    




    // ... inside handleDynamicClicks ...
    async function handleDynamicClicks(e) {
        if (e.target.closest('.add-bundle-btn')) {
            console.log("Add Bundle button was clicked!");
            openBundleModal();
        }
        const editBtn = e.target.closest('.action-edit');
        if (editBtn) {
            console.log("Edit button was clicked!");
            const id = editBtn.closest('.table-row').dataset.id;
            try {
                const response = await fetch('https://megalife-app-postgres.onrender.com/admin/bundles', { headers: { 'Authorization': `Bearer ${token}`,'Cache-Control': 'no-cache' } });
                const bundles = await response.json();
                const bundleToEdit = bundles.find(b => b.id == id);
                if (bundleToEdit) openBundleModal(bundleToEdit);
            } catch (error) { console.error('Error preparing edit:', error); }
        }
        const deleteBtn = e.target.closest('.action-delete');
        if (deleteBtn) {
            console.log("Delete button was clicked!");
            if (confirm('Are you sure you want to delete this bundle?')) 
                {
                const id = deleteBtn.closest('.table-row').dataset.id;

                try {
                    await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    console.log("About to call fetchAllBundles() after deleting..."); // DEBUG
        fetchAllBundles(); // Refresh
                    fetchAllBundles();
                } catch (error) { console.error('Failed to delete bundle:', error); }
            }
        }
    }



    



    // --- DATA FETCHING FUNCTIONS ---
    async function fetchAllUsers() {
        const userTableContainer = document.querySelector('#userManagementContent .user-table');
        const userCountBadge = document.querySelector('.tab-item[data-target="userManagementContent"] .badge');
        if (!userTableContainer || !userCountBadge) return;
        userTableContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();
            userCountBadge.textContent = users.length;
            let tableHTML = `<div class="table-header"><span>Full Name</span><span>Email</span><span>Telephone</span><span>Country</span><span>Wallet Balance</span><span>Registered On</span><span>Status</span><span>Actions</span></div>`;
            if (users.length > 0) {
                users.forEach(user => {
                    const registrationDate = new Date(user.registrationDate).toLocaleString();
                    tableHTML += `<div class="table-row" data-id="${user.id}"> <span>${user.fullName}</span> <span>${user.email}</span><span>${user.telephone || 'N/A'}</span><span>${user.country || 'N/A'}</span><span>GH₵ ${parseFloat(user.walletBalance).toFixed(2)}</span><span>${registrationDate}</span><span><span class="status-badge status-active">Active</span></span><div class="actions"><i class="fas fa-edit action-edit"></i><i class="fas fa-trash action-delete"></i></div></div>`;
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

   // Function to fetch and display ALL TRANSACTIONS (Corrected)
// Function to fetch and display ALL TRANSACTIONS (Final Corrected Version)

    async function fetchAllTransactions() {
        const transTableContainer = document.querySelector('#allTransactionsContent .transactions-table');
        if (!transTableContainer) return;
        transTableContainer.innerHTML = '<div class="empty-state">Loading...</div>';
        try {
            const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/transactions`, { headers: { 'Authorization': `Bearer ${token}` } });
            const transactions = await response.json();
            let tableHTML = `<div class="table-header">...<span>Actions</span></div>`; // Add Actions header
            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    let actionButton = '';
                    if (tx.status !== 'Completed') {
                        actionButton = `<button class="forward-btn" data-id="${tx.id}">Forward Now</button>`;
                    }
                    tableHTML += `<div class="table-row" data-id="${tx.id}">...<span>${actionButton}</span></div>`; // Add button cell
                });
        } else {
            // If there are no transactions, add the empty state message inside the body
            tableHTML += `<div class="empty-state">No transactions found.</div>`;
        }

        tableHTML += `</div>`; // Close the body container
        transTableContainer.innerHTML = tableHTML; // Replace the entire content at once

    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        transTableContainer.innerHTML = `<div class="empty-state">Failed to load transactions.</div>`;
    }
}
    // NEW FUNCTION for fetching settings
    async function fetchAllSettings() {
        if (!whatsappLinkInput) return; // Only run if we are on the support page
        try {
            const response = await fetch('https://megalife-app-postgres.onrender.com/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch settings');
            const settings = await response.json();
            const whatsappLinkSetting = settings.find(s => s.setting_name === 'whatsapp_link');
            if (whatsappLinkSetting) {
                whatsappLinkInput.value = whatsappLinkSetting.setting_value;
            }
        } catch (error) { 
            console.error('Failed to fetch settings:', error); 
            // Optionally, show an error message to the admin
            whatsappLinkInput.value = 'Error loading setting.';
        }
    }

    // THIS IS THE CORRECTED FUNCTION
    async function fetchAllBundles() {
    const bundlesContainer = document.querySelector('#dataBundlesContent');
    if (!bundlesContainer) return;
    try {
        const response = await fetch(`https://megalife-app-postgres.onrender.com/admin/bundles`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
        });
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
                        // THIS IS THE CRITICAL FIX: Ensure data-id="${bundle.id}" is present and correct
                        tableBody.innerHTML += `
                            <div class="table-row" data-id="${bundle.id}">
                                <span>${bundle.volume}</span>
                                <span>${parseFloat(bundle.price).toFixed(2)}</span>
                                <div class="actions">
                                    <i class="fas fa-edit action-edit" title="Edit"></i>
                                    <i class="fas fa-trash action-delete" title="Delete"></i>
                                </div>
                            </div>`;
                    });
                }
            }
        });
    } catch (error) { console.error('Error fetching/rendering bundles:', error); }
}
          
        

    // --- INITIALIZE THE DASHBOARD ---
    console.log("Step 8: Initializing dashboard by fetching users.");
    fetchAllUsers();
});







/*

document.addEventListener('DOMContentLoaded', () => {
    // This script handles ALL logic for the admin dashboard page.

    const isAdminDashboardPage = document.querySelector('.admin-container');
    if (!isAdminDashboardPage) return; 

    const token = localStorage.getItem('admin_token');

    // --- 1. SECURITY CHECK ---
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    // --- 2. GET ALL UI ELEMENTS ---
    const logoutLink = document.querySelector('.logout-link'); 
    const tabs = document.querySelectorAll('.content-tabs .tab-item');
    const contentPanes = document.querySelectorAll('.tab-content-wrapper .tab-pane');
    const modal = document.getElementById('bundle-modal');
    const bundleForm = document.getElementById('bundle-form');
    const cancelBtn = document.getElementById('cancel-btn');
    // NEW: Get references to Support Settings elements
    const saveSupportBtn = document.getElementById('save-support-btn');
    const sendTestEmailBtn = document.getElementById('send-test-email-btn');
    const whatsappLinkInput = document.getElementById('whatsapp-link-input');
    const testEmailInput = document.getElementById('test-email-input');

    // --- 3. EVENT LISTENERS ---

    // Logout Logic
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('admin_token');
            window.location.href = 'admin-login.html';
        });
    }

    // Tab Switching Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', function (event) {
            event.preventDefault();
            tabs.forEach(item => item.classList.remove('active'));
            contentPanes.forEach(pane => pane.classList.remove('active'));
            this.classList.add('active');
            const targetPane = document.getElementById(this.getAttribute('data-target'));
            if (targetPane) targetPane.classList.add('active');
            
            const targetId = this.getAttribute('data-target');
            if (targetId === 'userManagementContent') fetchAllUsers();
            else if (targetId === 'allTransactionsContent') fetchAllTransactions();
            else if (targetId === 'dataBundlesContent') fetchAllBundles();
            // NEW: Add handler for the Support tab
            else if (targetId === 'supportContent') fetchAllSettings();
        });
    });

    // Modal Form Logic
    if (cancelBtn) cancelBtn.addEventListener('click', closeBundleModal);
    if (bundleForm) bundleForm.addEventListener('submit', handleBundleFormSubmit);

    // Page-wide listener for dynamic buttons (Edit, Delete, Add)
    document.addEventListener('click', handleDynamicClicks);

    // NEW: Support Settings button listeners
    if(saveSupportBtn) {
        saveSupportBtn.addEventListener('click', async () => {
            const link = whatsappLinkInput.value;
            try {
                const response = await fetch('http://localhost:3000/admin/settings', {
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
                const response = await fetch('http://localhost:3000/admin/send-test-email', {
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
// --- FUNCTIONS ---

    function openBundleModal(bundle = null) {
        console.log("openBundleModal function was called.");
        if (!bundleForm) return;
        bundleForm.reset();
        if (bundle) {
            document.getElementById('modal-title').textContent = 'Edit Bundle';
            document.getElementById('bundle-id').value = bundle.id;
            document.getElementById('bundle-provider').value = bundle.provider;
            document.getElementById('bundle-volume').value = bundle.volume;
            document.getElementById('bundle-price').value = bundle.price;
        } else {
            document.getElementById('modal-title').textContent = 'Add New Bundle';
            document.getElementById('bundle-id').value = '';
        }
        if (modal) modal.hidden = false;
    }

    function closeBundleModal() {
        console.log("closeBundleModal function was called.");
        if (modal) modal.hidden = true;
    }

    async function handleBundleFormSubmit(e) {
        console.log("--- SAVE BUNDLE (FORM SUBMIT) TRIGGERED ---");
        e.preventDefault();
        const id = document.getElementById('bundle-id').value;
        const bundleData = { provider: document.getElementById('bundle-provider').value, volume: document.getElementById('bundle-volume').value, price: document.getElementById('bundle-price').value };
        const isEditing = !!id;
        const url = isEditing ? `http://localhost:3000/admin/bundles/${id}` : 'http://localhost:3000/admin/bundles';
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(bundleData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save bundle.');
            }
            console.log("Bundle saved successfully!");
            closeBundleModal();
            fetchAllBundles();
        } catch (error) {
            console.error('Error saving bundle:', error);
            alert(`Error: ${error.message}`);
        }
    }

    async function handleDynamicClicks(e) {
        if (e.target.closest('.add-bundle-btn')) {
            console.log("Add Bundle button was clicked!");
            openBundleModal();
        }
        const editBtn = e.target.closest('.action-edit');
        if (editBtn) {
            console.log("Edit button was clicked!");
            const id = editBtn.closest('.table-row').dataset.id;
            try {
                const response = await fetch('http://localhost:3000/admin/bundles', { headers: { 'Authorization': `Bearer ${token}` } });
                const bundles = await response.json();
                const bundleToEdit = bundles.find(b => b.id == id);
                if (bundleToEdit) openBundleModal(bundleToEdit);
            } catch (error) { console.error('Error preparing edit:', error); }
        }
        const deleteBtn = e.target.closest('.action-delete');
        if (deleteBtn) {
            console.log("Delete button was clicked!");
            if (confirm('Are you sure you want to delete this bundle?')) {
                const id = deleteBtn.closest('.table-row').dataset.id;
                try {
                    await fetch(`http://localhost:3000/admin/bundles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    fetchAllBundles();
                } catch (error) { console.error('Failed to delete bundle:', error); }
            }
        }
    }
    // --- DATA FETCHING FUNCTIONS ---
    async function fetchAllUsers() {
        const userTableContainer = document.querySelector('#userManagementContent .user-table');
        const userCountBadge = document.querySelector('.tab-item[data-target="userManagementContent"] .badge');
        if (!userTableContainer || !userCountBadge) return;
        userTableContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
        try {
            const response = await fetch('http://localhost:3000/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();
            userCountBadge.textContent = users.length;
            let tableHTML = `<div class="table-header"><span>Full Name</span><span>Email</span><span>Telephone</span><span>Country</span><span>Wallet Balance</span><span>Registered On</span><span>Status</span><span>Actions</span></div>`;
            if (users.length > 0) {
                users.forEach(user => {
                    const registrationDate = new Date(user.registrationDate).toLocaleString();
                    tableHTML += `<div class="table-row"><span>${user.fullName}</span><span>${user.email}</span><span>${user.telephone || 'N/A'}</span><span>${user.country || 'N/A'}</span><span>GH₵ ${parseFloat(user.walletBalance).toFixed(2)}</span><span>${registrationDate}</span><span><span class="status-badge status-active">Active</span></span><div class="actions"><i class="fas fa-edit action-edit"></i><i class="fas fa-trash action-delete"></i></div></div>`;
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

   // Function to fetch and display ALL TRANSACTIONS (Corrected)
async function fetchAllTransactions() {
    const transTableContainer = document.querySelector('#allTransactionsContent .transactions-table');
    if (!transTableContainer) return;
    
    transTableContainer.innerHTML = '<div class="empty-state">Loading transactions...</div>';

    try {
        const response = await fetch('http://localhost:3000/admin/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        
        const transactions = await response.json();
        
        // 1. ADD "RECIPIENT" TO THE TABLE HEADER
        let tableHTML = `
            <div class="table-header">
                <span>User</span>
                <span>Type</span>
                <span>Details</span>
                <span>Recipient</span> <!-- NEW COLUMN -->
                <span>Amount</span>
                <span>Date</span>
                <span>Status</span>
            </div>
            <div class="table-body">`;

        if (transactions.length > 0) {
            transactions.forEach(tx => {
                const transDate = new Date(tx.transactionsDate).toLocaleString();
                let statusBadgeClass = 'status-completed';
                if (tx.status.toLowerCase() === 'failed') statusBadgeClass = 'status-failed';
                if (tx.status.toLowerCase() === 'pending') statusBadgeClass = 'status-pending';

                // 2. ADD THE RECIPIENT DATA TO THE TABLE ROW
                tableHTML += `
                    <div class="table-row">
                        <span>${tx.fullName || 'N/A'}</span>
                        <span>${tx.type}</span>
                        <span>${tx.details}</span>
                        <span>${tx.recipient || 'N/A'}</span> <!-- NEW DATA CELL -->
                        <span>GH₵ ${parseFloat(tx.amount).toFixed(2)}</span>
                        <span>${transDate}</span>
                        <span><span class="status-badge ${statusBadgeClass}">${tx.status}</span></span>
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
    // NEW FUNCTION for fetching settings
    async function fetchAllSettings() {
        if (!whatsappLinkInput) return; // Only run if we are on the support page
        try {
            const response = await fetch('http://localhost:3000/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch settings');
            const settings = await response.json();
            const whatsappLinkSetting = settings.find(s => s.setting_name === 'whatsapp_link');
            if (whatsappLinkSetting) {
                whatsappLinkInput.value = whatsappLinkSetting.setting_value;
            }
        } catch (error) { 
            console.error('Failed to fetch settings:', error); 
            // Optionally, show an error message to the admin
            whatsappLinkInput.value = 'Error loading setting.';
        }
    }

    // THIS IS THE CORRECTED FUNCTION
    async function fetchAllBundles() {
        console.log("Fetching all bundles to refresh display...");
        const bundlesContainer = document.querySelector('#dataBundlesContent');
        if (!bundlesContainer) return;
        try {
            const response = await fetch('http://localhost:3000/admin/bundles', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch bundles from server.');
            const bundles = await response.json();
            console.log("Bundles fetched successfully:", bundles);
            const bundlesByProvider = { MTN: [], AirtelTigo: [], Telecel: [] };
            bundles.forEach(bundle => {
                if (bundlesByProvider[bundle.provider]) {
                    bundlesByProvider[bundle.provider].push(bundle);
                }
            });
            ['MTN', 'AirtelTigo', 'Telecel'].forEach(provider => {
                const card = bundlesContainer.querySelector(`.bundle-title.${provider.toLowerCase()}`).closest('.bundle-card');
                const tableBody = card.querySelector('.bundle-table .table-body');
                if (tableBody) {
                    tableBody.innerHTML = '';
                    const providerBundles = bundlesByProvider[provider];
                    if (providerBundles && providerBundles.length > 0) {
                        providerBundles.forEach(bundle => {
                            tableBody.innerHTML += `
                                <div class="table-row" data-id="${bundle.id}">
                                    <span>${bundle.volume}</span>
                                    <span>${parseFloat(bundle.price).toFixed(2)}</span>
                                    <div class="actions">
                                        <i class="fas fa-edit action-edit"></i>
                                        <i class="fas fa-trash action-delete"></i>
                                    </div>
                                </div>`;
                        });
                    }
                }
            });
            console.log("Bundle display refreshed successfully.");
        } catch (error) { 
            console.error('Error fetching and rendering bundles:', error); 
        }
    }

    // --- INITIALIZE THE DASHBOARD ---
    console.log("Step 8: Initializing dashboard by fetching users.");
    fetchAllUsers();
});



*/