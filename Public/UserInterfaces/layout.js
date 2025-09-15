
/*
// This script's only job is to load the shared layout and handle its events.
document.addEventListener('DOMContentLoaded', () => {
    
    const sidebarPlaceholder = document.querySelector('aside.sidebar');
    const headerPlaceholder = document.querySelector('header.main-header');
    
    if (sidebarPlaceholder && headerPlaceholder) {
        
        async function loadLayout() {
            try {
                const [sidebarResponse, headerResponse] = await Promise.all([
                    fetch('Sidebar.html'),
                    fetch('Header.html')
                ]);

                if (!sidebarResponse.ok || !headerResponse.ok) throw new Error('Layout files not found.');
                
                sidebarPlaceholder.innerHTML = await sidebarResponse.text();
                headerPlaceholder.innerHTML = await headerResponse.text();

                // Call the function to set up event listeners AFTER the HTML is loaded
                setupLayoutEventListeners();

                // Announce that the layout is ready for other scripts
                document.dispatchEvent(new CustomEvent('layoutReady'));

            } catch(error) {
                console.error("Error loading protected page layout:", error);
            }
        }

        function setupLayoutEventListeners() {
            // --- Handle Logout ---
            const logoutLink = document.querySelector('.logout-link a');
            if (logoutLink) {
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.clear();
                    window.location.href = '../login.html';
                });
            }

            // --- Handle Submenu Toggle (CORRECTED) ---
            const submenuToggle = document.querySelector('.sidebar-nav .has-submenu > a');
            if (submenuToggle) {
                submenuToggle.addEventListener('click', function(event) {
                    event.preventDefault(); // Stop the link from navigating
                    // Toggle the 'open' class on the PARENT <li> element
                    this.parentElement.classList.toggle('open');
                });
            }
            
            // --- Handle Active Link Highlighting ---
            const currentPage = window.location.pathname.split('/').pop();
            const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
            sidebarLinks.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.parentElement.classList.add('active');
                    const submenu = link.closest('.submenu');
                    if (submenu) {
                        // If the active link is inside a submenu, also open the parent
                        submenu.parentElement.classList.add('open');
                    }
                }
            });
        }

        // Run the function to build the page layout
        loadLayout();
    }
    // --- NEW: LOGIC FOR HAMBURGER MENU ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // Add or remove the 'sidebar-open' class from the body
            document.body.classList.toggle('sidebar-open');
        });
    }

    if (sidebarOverlay) {
        // Clicking the overlay should also close the sidebar
        sidebarOverlay.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });
    }
});

*/

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