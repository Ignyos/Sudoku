/**
 * Settings page logic and preferences management
 */

const Settings = {
    defaultPreferences: {
        showTimer: true,
        autoCheckErrors: true,
        highlightRelated: true,
        showPauseButton: true
    },

    /**
     * Initialize the settings page
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Load preferences
            this.loadPreferences();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Settings page initialized');
        } catch (error) {
            console.error('Failed to initialize settings page:', error);
            Utils.showMessage('Failed to load settings', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Settings toggles
        const showTimerToggle = document.getElementById('showTimer');
        const showPauseButtonToggle = document.getElementById('showPauseButton');
        
        showTimerToggle.addEventListener('change', (e) => {
            this.savePreference('showTimer', e.target.checked);
            // Disable pause button toggle if timer is disabled
            showPauseButtonToggle.disabled = !e.target.checked;
            if (!e.target.checked) {
                showPauseButtonToggle.checked = false;
                this.savePreference('showPauseButton', false);
            }
        });

        showPauseButtonToggle.addEventListener('change', (e) => {
            this.savePreference('showPauseButton', e.target.checked);
        });

        document.getElementById('autoCheckErrors').addEventListener('change', (e) => {
            this.savePreference('autoCheckErrors', e.target.checked);
        });

        document.getElementById('highlightRelated').addEventListener('change', (e) => {
            this.savePreference('highlightRelated', e.target.checked);
        });

        // Clear data button
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.showClearDataModal();
        });

        // Clear data modal
        document.getElementById('cancelClearBtn').addEventListener('click', () => {
            this.closeClearDataModal();
        });

        document.getElementById('confirmClearBtn').addEventListener('click', () => {
            this.clearAllData();
        });
    },

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        const prefs = this.getPreferences();
        
        document.getElementById('showTimer').checked = prefs.showTimer;
        document.getElementById('showPauseButton').checked = prefs.showPauseButton;
        document.getElementById('autoCheckErrors').checked = prefs.autoCheckErrors;
        document.getElementById('highlightRelated').checked = prefs.highlightRelated;
        
        // Disable pause button toggle if timer is disabled
        document.getElementById('showPauseButton').disabled = !prefs.showTimer;
    },

    /**
     * Get all preferences
     */
    getPreferences() {
        const stored = localStorage.getItem('sudoku-preferences');
        if (stored) {
            try {
                return { ...this.defaultPreferences, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Failed to parse preferences:', e);
            }
        }
        return { ...this.defaultPreferences };
    },

    /**
     * Get a single preference value
     */
    getPreference(key) {
        const prefs = this.getPreferences();
        return prefs[key] !== undefined ? prefs[key] : this.defaultPreferences[key];
    },

    /**
     * Save a preference
     */
    savePreference(key, value) {
        const prefs = this.getPreferences();
        prefs[key] = value;
        localStorage.setItem('sudoku-preferences', JSON.stringify(prefs));
        console.log(`Preference saved: ${key} = ${value}`);
    },

    /**
     * Show clear data confirmation modal
     */
    showClearDataModal() {
        const modal = document.getElementById('clearDataModal');
        modal.style.display = 'flex';
    },

    /**
     * Close clear data modal
     */
    closeClearDataModal() {
        const modal = document.getElementById('clearDataModal');
        modal.style.display = 'none';
    },

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            await Storage.clearAll();
            this.closeClearDataModal();
            Utils.showMessage('All data cleared successfully', 'success', 3000);
            
            // Redirect to home after a delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Failed to clear data:', error);
            Utils.showMessage('Failed to clear data', 'error');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Settings;
}
