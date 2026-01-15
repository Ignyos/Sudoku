/**
 * Main application with state management
 */

const App = {
    currentState: 'menu', // 'menu', 'entry', 'playing'
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Initialize grid (hidden initially)
            Grid.init();
            
            // Set up event listeners
            this.attachEventListeners();
            
            // Check for saved app state
            const savedState = localStorage.getItem('appState');
            const savedPuzzleId = localStorage.getItem('currentPuzzleId');
            
            if (savedState && savedPuzzleId) {
                // Resume to saved state
                const puzzle = await Storage.getPuzzle(parseInt(savedPuzzleId));
                if (puzzle) {
                    await this.setState(savedState, puzzle);
                    return;
                }
            }
            
            // Default to menu
            await this.showMenu();
            
            console.log('Sudoku v1.0.0 initialized');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.showMessage('Failed to initialize. Some features may not work.', 'error');
        }
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Menu actions
        document.getElementById('newGameBtn').addEventListener('click', () => this.showNewGameModal());
        document.getElementById('enterPuzzleBtn').addEventListener('click', () => this.startEntry());
        document.getElementById('continueBtn').addEventListener('click', () => this.continuePuzzle());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());
        
        // New Game modal
        document.getElementById('closeNewGameBtn').addEventListener('click', () => this.closeNewGameModal());
        document.querySelectorAll('.difficulty-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                this.closeNewGameModal();
                this.startNewGame(difficulty);
            });
        });
        
        // History modal (will be implemented later)
        // document.getElementById('historyBtn')?.addEventListener('click', () => this.showHistory());
        const closeHistoryBtn = document.getElementById('closeHistoryBtn');
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', () => this.closeHistory());
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const filter = e.target.dataset.filter;
                this.filterHistory(filter);
            });
        });
    },

    /**
     * Show the menu/landing page
     */
    async showMenu() {
        document.getElementById('landingPage').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        
        const continueBtn = document.getElementById('continueBtn');
        
        // Check for recent puzzle
        const recentPuzzle = await Storage.getMostRecentPuzzle();
        if (recentPuzzle) {
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
        } else {
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.5';
        }
        
        this.currentState = 'menu';
        localStorage.removeItem('appState');
        localStorage.removeItem('currentPuzzleId');
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
     * Start entry mode
     */
    async startEntry() {
        await this.setState('entry');
        Utils.showMessage('Enter your puzzle. Click "Done Entering" when finished.', 'info', 5000);
    },

    /**
     * Start new generated game
     */
    async startNewGame(difficulty) {
        try {
            Utils.showMessage(`Generating ${difficulty} puzzle...`, 'info', 0);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const puzzleData = await Storage.generateAndSavePuzzle(difficulty);
            await this.setState('playing', puzzleData);
            
            Utils.showMessage(`New ${difficulty} puzzle loaded!`, 'success', 3000);
        } catch (error) {
            console.error('Failed to generate puzzle:', error);
            Utils.showMessage('Failed to generate puzzle. Please try again.', 'error');
        }
    },

    /**
     * Continue most recent puzzle
     */
    async continuePuzzle() {
        const puzzle = await Storage.getMostRecentPuzzle();
        if (puzzle) {
            const state = puzzle.difficulty ? 'playing' : 'entry';
            await this.setState(state, puzzle);
        }
    },

    /**
     * Set application state
     */
    async setState(state, puzzleData = null) {
        this.currentState = state;
        
        // Hide menu, show game area
        document.getElementById('landingPage').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        
        // Load puzzle if provided
        if (puzzleData) {
            Grid.loadPuzzleData(puzzleData);
            localStorage.setItem('currentPuzzleId', puzzleData.id);
        }
        
        // Update UI based on state
        this.updateGameUI(state, puzzleData);
        
        // Save state
        localStorage.setItem('appState', state);
    },

    /**
     * Update game UI based on state
     */
    updateGameUI(state, puzzleData) {
        const gameMode = document.getElementById('gameMode');
        const difficultyBadge = document.getElementById('difficultyBadge');
        const controlsBottom = document.getElementById('controlsBottom');
        
        if (state === 'entry') {
            gameMode.textContent = 'Entering Puzzle';
            difficultyBadge.style.display = 'none';
            
            controlsBottom.innerHTML = `
                <button id="doneEnteringBtn" class="action-btn primary">Done Entering</button>
                <button id="clearAllBtn" class="action-btn secondary">Clear All</button>
            `;
            
            document.getElementById('doneEnteringBtn').addEventListener('click', () => this.doneEntering());
            document.getElementById('clearAllBtn').addEventListener('click', () => Grid.clearAll());
            
        } else if (state === 'playing') {
            gameMode.textContent = 'Solving';
            
            if (puzzleData?.difficulty) {
                difficultyBadge.textContent = puzzleData.difficulty;
                difficultyBadge.className = `difficulty-badge ${puzzleData.difficulty}`;
                difficultyBadge.style.display = 'inline-block';
            } else {
                difficultyBadge.style.display = 'none';
            }
            
            controlsBottom.innerHTML = `
                <button id="solveBtn" class="action-btn primary">Solve Puzzle</button>
                <button id="resetBtn" class="action-btn secondary">Reset to Original</button>
                <button id="clearProgressBtn" class="action-btn secondary">Clear Progress</button>
            `;
            
            document.getElementById('solveBtn').addEventListener('click', () => Grid.solvePuzzle());
            document.getElementById('resetBtn').addEventListener('click', () => Grid.resetToOriginal());
            document.getElementById('clearProgressBtn').addEventListener('click', () => Grid.clearProgress());
        }
    },

    /**
     * Done entering puzzle
     */
    async doneEntering() {
        // Validate puzzle has some numbers
        const filledCells = Grid.currentGrid.flat().filter(n => n !== 0).length;
        
        if (filledCells < 17) {
            Utils.showMessage('Please enter at least 17 numbers for a valid puzzle', 'warning');
            return;
        }
        
        // Check if puzzle is solvable
        if (!Solver.isSolvable(Grid.currentGrid)) {
            if (!confirm('This puzzle may not be solvable. Continue anyway?')) {
                return;
            }
        }
        
        // Lock the puzzle (set original grid)
        Grid.originalGrid = Utils.copyGrid(Grid.currentGrid);
        
        // Save to IndexedDB
        const hash = Generator.hashGrid(Grid.originalGrid);
        const puzzleData = {
            hash: hash,
            difficulty: null, // Manual entry
            originalGrid: Grid.originalGrid,
            currentGrid: Utils.copyGrid(Grid.currentGrid),
            notes: Grid.cellNotes,
            status: 'in-progress',
            timeSpent: 0
        };
        
        const id = await Storage.savePuzzle(puzzleData);
        puzzleData.id = id;
        
        // Switch to playing mode
        await this.setState('playing', puzzleData);
        Utils.showMessage('Puzzle locked! You can now solve it.', 'success', 3000);
    },

    /**
     * Back to menu with auto-save
     */
    async backToMenu() {
        // Auto-save if there's an active puzzle
        if (Grid.currentPuzzleId) {
            await Grid.autoSave();
        }
        
        await this.showMenu();
    },

    /**
     * Show history modal
     */
    async showHistory() {
        document.getElementById('historyModal').style.display = 'flex';
        await this.loadHistory('all');
    },

    /**
     * Close history modal
     */
    closeHistory() {
        document.getElementById('historyModal').style.display = 'none';
    },

    /**
     * Load history with filter
     */
    async loadHistory(filter) {
        const filters = {};
        if (filter !== 'all') {
            filters.status = filter;
        }
        
        const puzzles = await Storage.getAllPuzzles(filters);
        const historyList = document.getElementById('historyList');
        
        if (puzzles.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No puzzles found</p>';
            return;
        }
        
        historyList.innerHTML = puzzles.map(puzzle => {
            const timeAgo = this.getTimeAgo(puzzle.dateModified);
            const difficulty = puzzle.difficulty || 'Manual Entry';
            const status = puzzle.status === 'completed' ? '✅' : '⏸';
            
            return `
                <div class="history-item" data-id="${puzzle.id}">
                    <div class="history-item-info">
                        <div class="history-item-title">${status} ${difficulty}</div>
                        <div class="history-item-meta">Modified ${timeAgo}</div>
                    </div>
                    <div class="history-item-actions">
                        <button class="history-item-btn load-puzzle" data-id="${puzzle.id}">Load</button>
                        <button class="history-item-btn delete delete-puzzle" data-id="${puzzle.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach event listeners
        document.querySelectorAll('.load-puzzle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(e.target.dataset.id);
                const puzzle = await Storage.getPuzzle(id);
                if (puzzle) {
                    this.closeHistory();
                    const state = puzzle.difficulty ? 'playing' : 'entry';
                    await this.setState(state, puzzle);
                }
            });
        });
        
        document.querySelectorAll('.delete-puzzle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this puzzle?')) {
                    const id = parseInt(e.target.dataset.id);
                    await Storage.deletePuzzle(id);
                    await this.loadHistory(filter);
                }
            });
        });
    },

    /**
     * Filter history
     */
    async filterHistory(filter) {
        await this.loadHistory(filter);
    },

    /**
     * Get relative time string
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Handle before unload if puzzle has content
window.addEventListener('beforeunload', (e) => {
    // Check if there's any user input
    const hasInput = Grid.currentGrid.some(row => row.some(cell => cell !== 0));
    
    if (hasInput) {
        e.preventDefault();
        e.returnValue = '';
    }
});
