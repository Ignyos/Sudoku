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
        const difficulty = puzzle.difficulty || 'Manual Entry';
        const status = puzzle.isCompleted ? 'Completed' : 'In Progress';
        const statusClass = puzzle.isCompleted ? 'completed' : 'in-progress';
        
        // Add solved method indicator for completed puzzles
        let solvedMethod = '';
        if (puzzle.isCompleted && puzzle.solvedBy) {
            solvedMethod = puzzle.solvedBy === 'manual' ? ' ✓' : ' ⚡';
        }
        
        return `
            <div class="history-item" data-puzzle-id="${puzzle.id}">
                <div class="history-item-info">
                    <div class="history-item-title">${difficulty}</div>
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
     * Format date as "Started YYYY MM DD"
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `Started ${year} ${month} ${day}`;
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
