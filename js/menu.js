/**
 * Menu/Landing page logic
 */

const Menu = {
    /**
     * Initialize the menu page
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Set up event listeners
            this.attachEventListeners();
            
            // Check if we should auto-open the new game modal
            if (window.location.hash === '#new-puzzle') {
                this.showNewGameModal();
                // Clear the hash without reloading
                history.replaceState(null, null, ' ');
            }
            
            console.log('Menu initialized');
        } catch (error) {
            console.error('Failed to initialize menu:', error);
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // New Game button - show modal
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.showNewGameModal();
        });

        // Enter Puzzle button
        document.getElementById('enterPuzzleBtn').addEventListener('click', () => {
            window.location.href = 'play.html?mode=entry';
        });

        // History button
        document.getElementById('historyBtn').addEventListener('click', () => {
            window.location.href = 'history.html';
        });

        // New Game modal
        document.getElementById('closeNewGameBtn').addEventListener('click', () => {
            this.closeNewGameModal();
        });

        // Difficulty selection
        document.querySelectorAll('.difficulty-option').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                this.closeNewGameModal();
                await this.startNewGame(difficulty);
            });
        });

        // Close modal on backdrop click
        document.getElementById('newGameModal').addEventListener('click', (e) => {
            if (e.target.id === 'newGameModal') {
                this.closeNewGameModal();
            }
        });
    },

    /**
     * Show new game modal
     */
    showNewGameModal() {
        document.getElementById('newGameModal').style.display = 'flex';
    },

    /**
     * Close new game modal
     */
    closeNewGameModal() {
        document.getElementById('newGameModal').style.display = 'none';
    },

    /**
     * Start new game with selected difficulty
     */
    async startNewGame(difficulty) {
        try {
            Utils.showMessage(`Generating ${difficulty} puzzle...`, 'info', 0);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const puzzleData = await Storage.generateAndSavePuzzle(difficulty);
            
            // Navigate to play page with new puzzle
            window.location.href = `play.html?mode=new&puzzleId=${puzzleData.id}`;
        } catch (error) {
            console.error('Failed to generate puzzle:', error);
            Utils.showMessage('Failed to generate puzzle. Please try again.', 'error');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Menu.init();
});
