/**
 * Utility functions for the Sudoku Solver
 */

const Utils = {
    /**
     * Display a status message to the user
     * @param {string} message - The message to display
     * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 = permanent, capped at 2000ms)
     */
    showMessage(message, type = 'info', duration = 3000) {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Make message clickable to dismiss
        const dismissHandler = () => {
            this.clearMessage();
            statusElement.removeEventListener('click', dismissHandler);
        };
        statusElement.addEventListener('click', dismissHandler);
        statusElement.style.cursor = 'pointer';
        
        // Trigger animation by adding 'show' class after a brief delay
        setTimeout(() => {
            statusElement.classList.add('show');
        }, 10);

        if (duration > 0) {
            // Cap duration at 2 seconds
            const cappedDuration = Math.min(duration, 2000);
            setTimeout(() => {
                statusElement.classList.remove('show');
                statusElement.removeEventListener('click', dismissHandler);
                // Clear message after animation completes
                setTimeout(() => {
                    statusElement.textContent = '';
                    statusElement.className = 'status-message';
                }, 400); // Match CSS transition duration
            }, cappedDuration);
        }
    },

    /**
     * Clear the status message
     */
    clearMessage() {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.classList.remove('show');
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'status-message';
            }, 400);
        }
    },

    /**
     * Convert row and column to cell index (0-80)
     * @param {number} row - Row number (0-8)
     * @param {number} col - Column number (0-8)
     * @returns {number} Cell index
     */
    getIndex(row, col) {
        return row * 9 + col;
    },

    /**
     * Convert cell index to row and column
     * @param {number} index - Cell index (0-80)
     * @returns {{row: number, col: number}}
     */
    getRowCol(index) {
        return {
            row: Math.floor(index / 9),
            col: index % 9
        };
    },

    /**
     * Get the 3x3 box number for a given row and column
     * @param {number} row - Row number (0-8)
     * @param {number} col - Column number (0-8)
     * @returns {number} Box number (0-8)
     */
    getBoxNumber(row, col) {
        return Math.floor(row / 3) * 3 + Math.floor(col / 3);
    },

    /**
     * Create a deep copy of a 2D array
     * @param {Array} grid - 2D array to copy
     * @returns {Array} Deep copy of the grid
     */
    copyGrid(grid) {
        return grid.map(row => [...row]);
    },

    /**
     * Check if a value is a valid Sudoku number (1-9)
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isValidNumber(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 9;
    },

    /**
     * Debounce function to limit execution rate
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Format time in seconds to MM:SS
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};
