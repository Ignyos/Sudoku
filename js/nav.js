/**
 * Navigation Menu Handler
 * Builds and manages the hamburger menu
 */

(function() {
    // Get current page for active state
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Create hamburger button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'hamburger-menu';
    hamburgerBtn.id = 'hamburgerMenu';
    hamburgerBtn.setAttribute('aria-label', 'Menu');
    hamburgerBtn.innerHTML = '<span></span><span></span><span></span>';
    
    // Create navigation menu
    const navMenu = document.createElement('nav');
    navMenu.className = 'nav-menu';
    navMenu.id = 'navMenu';
    
    const menuItems = [
        { href: 'index.html', label: 'Home' },
        { href: 'index.html#new-puzzle', label: 'New Puzzle' },
        { href: 'play.html?mode=custom', label: 'Enter Puzzle' },
        { href: 'history.html', label: 'History' },
        { href: 'settings.html', label: 'Settings' },
        { href: 'stats.html', label: 'Statistics' }
    ];
    
    menuItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.href;
        link.className = 'nav-link';
        link.textContent = item.label;
        
        // Mark current page as active
        if (currentPage === item.href) {
            link.classList.add('active');
        }
        
        navMenu.appendChild(link);
    });
    
    // Insert menu into page
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(hamburgerBtn, container.firstChild);
        container.insertBefore(navMenu, container.firstChild);
    }
    
    // Toggle menu
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerBtn.classList.toggle('active');
        navMenu.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            hamburgerBtn.classList.remove('active');
            navMenu.classList.remove('show');
        }
    });
    
    // Close menu when pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hamburgerBtn.classList.remove('active');
            navMenu.classList.remove('show');
        }
    });
    
    // Close menu when clicking a nav link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburgerBtn.classList.remove('active');
            navMenu.classList.remove('show');
        });
    });
})();
