
/*
// This is the final, correct version of the layout script.
document.addEventListener('DOMContentLoaded', () => {
    
    const sidebarPlaceholder = document.querySelector('aside.sidebar');
    const headerPlaceholder = document.querySelector('header.main-header');
    
    if (sidebarPlaceholder && headerPlaceholder) {
        
        async function loadLayout() {
            try {
                // ... (Your existing, correct fetch and inject logic is here)
                const [sidebarResponse, headerResponse] = await Promise.all([ fetch('Sidebar.html'), fetch('Header.html') ]);
                if (!sidebarResponse.ok || !headerResponse.ok) throw new Error('Layout files not found.');
                sidebarPlaceholder.innerHTML = await sidebarResponse.text();
                headerPlaceholder.innerHTML = await headerResponse.text();

                setupLayoutEventListeners();
                document.dispatchEvent(new CustomEvent('layoutReady'));

            } catch(error) {
                console.error("Error loading layout:", error);
            }
        }

        function setupLayoutEventListeners() {
            // Get references to all the interactive elements
            const menuToggle = document.getElementById('menu-toggle');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            const submenuToggle = document.querySelector('.sidebar-nav .has-submenu > a');
            const logoutLink = document.querySelector('.logout-link a');
            
            // --- This is the key change: One main click handler ---
            document.addEventListener('click', (e) => {
                // 1. Logic for the Hamburger Menu Icon
                if (menuToggle && menuToggle.contains(e.target)) {
                    document.body.classList.toggle('sidebar-open');
                }
                
                // 2. Logic for the Overlay (closes the sidebar)
                if (sidebarOverlay && sidebarOverlay.contains(e.target)) {
                    document.body.classList.remove('sidebar-open');
                }

                // 3. Logic for the Submenu Toggle
                if (submenuToggle && submenuToggle.contains(e.target)) {
                    e.preventDefault(); // Always prevent default for this one
                    submenuToggle.parentElement.classList.toggle('open');
                }

                // 4. Logic for the Logout Link
                if (logoutLink && logoutLink.contains(e.target)) {
                    e.preventDefault();
                    localStorage.clear();
                    window.location.href = '../login.html';
                }
            });
            
            // --- Active Link Highlighting (runs once on page load) ---
            const currentPage = window.location.pathname.split('/').pop();
            const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
            sidebarLinks.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.parentElement.classList.add('active');
                    const submenu = link.closest('.submenu');
                    if (submenu) submenu.parentElement.classList.add('open');
                }
            });
            
        }
        
       
        loadLayout();
    }
});

*/






// This script now handles the primary security check and the layout for all protected pages.

function initializeLayout() {
    // This function will contain all the layout-building logic.
    
    const sidebarPlaceholder = document.querySelector('aside.sidebar');
    const headerPlaceholder = document.querySelector('header.main-header');
    
    if (!sidebarPlaceholder || !headerPlaceholder) {
        // Not a protected page, so do nothing.
        return;
    }
    
    async function loadLayout() {
        try {
            const [sidebarResponse, headerResponse] = await Promise.all([ fetch('Sidebar.html'), fetch('Header.html') ]);
            if (!sidebarResponse.ok || !headerResponse.ok) throw new Error('Layout files not found.');
            
            sidebarPlaceholder.innerHTML = await sidebarResponse.text();
            headerPlaceholder.innerHTML = await headerResponse.text();

            setupLayoutEventListeners();
            document.dispatchEvent(new CustomEvent('layoutReady'));
        } catch(error) {
            console.error("Error loading layout:", error);
        }
    }

    function setupLayoutEventListeners() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const submenuToggle = document.querySelector('.sidebar-nav .has-submenu > a');
        const logoutLink = document.querySelector('.logout-link a');
        
        document.addEventListener('click', (e) => {
            if (menuToggle && menuToggle.contains(e.target)) { document.body.classList.toggle('sidebar-open'); }
            if (sidebarOverlay && sidebarOverlay.contains(e.target)) { document.body.classList.remove('sidebar-open'); }
            if (submenuToggle && submenuToggle.contains(e.target)) { e.preventDefault(); submenuToggle.parentElement.classList.toggle('open'); }
            if (logoutLink && logoutLink.contains(e.target)) {
                e.preventDefault();
                localStorage.clear();
                window.location.replace('../login.html');
            }
        });
        
        const currentPage = window.location.pathname.split('/').pop();
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.parentElement.classList.add('active');
                const submenu = link.closest('.submenu');
                if (submenu) submenu.parentElement.classList.add('open');
            }
        });
    }

    loadLayout();
}

// --- THIS IS THE CRITICAL FIX FOR THE "BACK BUTTON" BUG ---
window.addEventListener('pageshow', function(event) {
    const isProtectedPage = window.location.pathname.includes('/UserInterfaces/');
    if (isProtectedPage) {
        const token = localStorage.getItem('token');
        if (!token) {
            // If no token exists, the user is logged out. Force redirect.
            window.location.replace('../login.html');
        } else {
            // If a token exists, initialize the layout. This ensures the page
            // is always fresh, even when loaded from the back-forward cache.
            initializeLayout();
        }
    }
});