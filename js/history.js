/**
 * History page logic
 */

const History = {
    currentFilter: 'all',
    deleteModalPuzzleId: null,

    /**
     * Initialize the history page
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Setup delete modal
            this.setupDeleteModal();
            
            // Set up event listeners
            this.attachEventListeners();
            
            // Load history
            await this.loadHistory();
            
            console.log('History page initialized');
        } catch (error) {
            console.error('Failed to initialize history page:', error);
            Utils.showMessage('Failed to load history', 'error');
        }
    },

    /**
     * Setup delete modal event listeners
     */
    setupDeleteModal() {
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeDeleteModal());
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmDelete());
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.loadHistory();
            });
        });
    },

    /**
     * Load and display history
     */
    async loadHistory() {
        const historyList = document.getElementById('historyList');
        const allPuzzles = await Storage.getAllPuzzles();
        
        if (allPuzzles.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No puzzles yet. Start playing to build your history!</p>';
            return;
        }
        
        // Filter puzzles
        let puzzles = allPuzzles;
        if (this.currentFilter === 'in-progress') {
            puzzles = allPuzzles.filter(p => !p.isCompleted);
        } else if (this.currentFilter === 'completed') {
            puzzles = allPuzzles.filter(p => p.isCompleted);
        }
        
        if (puzzles.length === 0) {
            historyList.innerHTML = `<p class="empty-history">No ${this.currentFilter} puzzles found.</p>`;
            return;
        }
        
        // Display puzzles
        historyList.innerHTML = puzzles.map(puzzle => this.renderHistoryItem(puzzle)).join('');
        
        // Attach event listeners to history items
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('history-item-btn')) {
                    const puzzleId = parseInt(item.dataset.puzzleId);
                    window.location.href = `play.html?mode=continue&puzzleId=${puzzleId}`;
                }
            });
        });
        
        // Attach delete button listeners
        document.querySelectorAll('.history-item-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const puzzleId = parseInt(btn.dataset.puzzleId);
                this.showDeleteModal(puzzleId);
            });
        });
    },

    /**
     * Render a single history item
     */
    renderHistoryItem(puzzle) {
        const date = new Date(puzzle.dateCreated || puzzle.dateModified);
        const startedDate = this.formatDate(date);
        const status = puzzle.isCompleted ? 'Completed' : 'In Progress';
        const statusClass = puzzle.isCompleted ? 'completed' : 'in-progress';
        
        // Add solved method indicator for completed puzzles
        let solvedMethod = '';
        if (puzzle.isCompleted && puzzle.solvedBy) {
            solvedMethod = puzzle.solvedBy === 'manual' ? ' ✓' : ' ⚡';
        }
        
        // Determine title and difficulty badge
        let titleHtml = '';
        if (puzzle.difficulty) {
            // Auto-generated puzzle
            titleHtml = `<span class="difficulty-badge ${puzzle.difficulty}">${puzzle.difficulty}</span>`;
        } else {
            // Custom puzzle - estimate difficulty based on number of filled cells
            const filledCells = puzzle.originalGrid.flat().filter(cell => cell !== 0).length;
            const estimatedDifficulty = this.estimateDifficulty(filledCells);
            titleHtml = `Custom Puzzle <span class="difficulty-badge ${estimatedDifficulty.level}">${estimatedDifficulty.label}</span>`;
        }
        
        return `
            <div class="history-item" data-puzzle-id="${puzzle.id}">
                <div class="history-item-info">
                    <div class="history-item-title">${titleHtml}</div>
                    <div class="history-item-meta">
                        <span class="history-status ${statusClass}">${status}${solvedMethod}</span> 
                        ${startedDate}
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="history-item-btn delete" data-puzzle-id="${puzzle.id}">Delete</button>
                </div>
            </div>
        `;
    },

    /**
     * Estimate difficulty based on number of filled cells
     * Beginner: 46-50 clues, Easy: 40-45 clues, Medium: 32-39 clues, 
     * Hard: 27-31 clues, Expert: 22-26 clues, Master: 18-21 clues
     */
    estimateDifficulty(filledCells) {
        if (filledCells >= 46) {
            return { level: 'beginner', label: 'Beginner' };
        } else if (filledCells >= 40) {
            return { level: 'easy', label: 'Easy' };
        } else if (filledCells >= 32) {
            return { level: 'medium', label: 'Medium' };
        } else if (filledCells >= 27) {
            return { level: 'hard', label: 'Hard' };
        } else if (filledCells >= 22) {
            return { level: 'expert', label: 'Expert' };
        } else if (filledCells >= 18) {
            return { level: 'master', label: 'Master' };
        } else {
            return { level: 'master', label: 'Master' };
        }
    },

    /**
     * Format date as "Jan 5, 2026 3:45 PM"
     */
    formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert to 12-hour format
        
        return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
    },

    /**
     * Show delete confirmation modal
     */
    showDeleteModal(puzzleId) {
        this.deleteModalPuzzleId = puzzleId;
        const modal = document.getElementById('deletePuzzleModal');
        modal.style.display = 'flex';
    },

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        this.deleteModalPuzzleId = null;
        const modal = document.getElementById('deletePuzzleModal');
        modal.style.display = 'none';
    },

    /**
     * Confirm and execute puzzle deletion
     */
    async confirmDelete() {
        if (this.deleteModalPuzzleId !== null) {
            try {
                await Storage.deletePuzzle(this.deleteModalPuzzleId);
                this.closeDeleteModal();
                await this.loadHistory();
            } catch (error) {
                console.error('Failed to delete puzzle:', error);
                this.closeDeleteModal();
            }
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    History.init();
});
