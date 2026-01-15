/**
 * Play page logic
 */

const Play = {
    currentMode: null, // 'new', 'continue', 'entry'
    currentPuzzleId: null,
    isEntryLocked: false, // Track if entry mode puzzle is locked

    /**
     * Initialize the play page
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Parse URL parameters first
            const params = new URLSearchParams(window.location.search);
            const mode = params.get('mode');
            const puzzleId = params.get('puzzleId');
            
            if (!mode) {
                throw new Error('No mode specified in URL');
            }
            
            this.currentMode = mode;
            this.currentPuzzleId = puzzleId ? parseInt(puzzleId) : null;
            
            // Initialize grid
            Grid.init();
            
            // Setup UI controls
            this.setupControls();
            
            // Load puzzle based on mode
            await this.loadPuzzle();
            
            console.log('Play page initialized -', mode, puzzleId);
        } catch (error) {
            console.error('Failed to initialize play page:', error);
            Utils.showMessage('Failed to load puzzle. Redirecting to menu...', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
        }
    },

    /**
     * Load puzzle based on current mode
     */
    async loadPuzzle() {
        if (!this.currentMode) {
            throw new Error('No mode specified');
        }

        if (this.currentMode === 'entry') {
            // Entry mode - start with empty grid
            await this.startEntry();
        } else if (this.currentPuzzleId) {
            // Load existing puzzle
            const puzzle = await Storage.getPuzzle(this.currentPuzzleId);
            if (!puzzle) {
                throw new Error('Puzzle not found');
            }
            
            if (this.currentMode === 'new' || this.currentMode === 'continue') {
                await this.loadExistingPuzzle(puzzle);
            }
        } else {
            throw new Error('Invalid mode or missing puzzle ID');
        }
    },

    /**
     * Start entry mode
     */
    async startEntry() {
        try {
            console.log('Starting entry mode...');
            
            // Set game mode display
            document.getElementById('gameMode').textContent = 'Entry Mode';
            document.getElementById('difficultyBadge').style.display = 'none';
            
            console.log('Loading empty grid...');
            
            // Create empty 9x9 grids
            const emptyGrid = Array(9).fill(0).map(() => Array(9).fill(0));
            const emptyNotes = Array(81).fill(null).map(() => Array(9).fill(false));
            const emptyLocked = Array(81).fill(false);
            
            // Load empty grid in entry mode
            Grid.loadPuzzleData({
                id: null,
                originalGrid: emptyGrid,
                currentGrid: emptyGrid,
                notes: emptyNotes,
                locked: emptyLocked,
                isEntry: true
            });
            
            console.log('Entry mode started successfully');
                        // Update controls display
            this.updateControlsDisplay();
                        Utils.showMessage('Enter your puzzle. Click "Done Entering" when finished.', 'info', 5000);
        } catch (error) {
            console.error('Error in startEntry:', error);
            throw error;
        }
    },

    /**
     * Load existing puzzle
     */
    async loadExistingPuzzle(puzzle) {
        // Set game mode display
        const mode = puzzle.difficulty ? 'Playing' : 'Entry Mode';
        document.getElementById('gameMode').textContent = mode;
        
        // Show difficulty badge if it's a generated puzzle
        if (puzzle.difficulty) {
            const badge = document.getElementById('difficultyBadge');
            badge.textContent = puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1);
            badge.className = 'difficulty-badge ' + puzzle.difficulty;
            badge.style.display = 'inline-block';
        } else {
            document.getElementById('difficultyBadge').style.display = 'none';
        }
        
        // Load puzzle into grid
        Grid.loadPuzzleData({
            id: puzzle.id,
            originalGrid: puzzle.originalGrid,
            currentGrid: puzzle.currentGrid,
            notes: puzzle.notes,
            locked: puzzle.locked,
            isEntry: !puzzle.difficulty
        });
        
        // Show appropriate message
        if (this.currentMode === 'new') {
            Utils.showMessage(`New ${puzzle.difficulty} puzzle loaded!`, 'success', 3000);
        } else {
            Utils.showMessage('Puzzle resumed', 'success', 2000);
        }
        
        // Update controls display
        this.updateControlsDisplay();
    },

    /**
     * Setup UI controls and event listeners
     */
    setupControls() {
        // Done Editing button
        const doneEditingBtn = document.getElementById('doneEditingBtn');
        if (doneEditingBtn) {
            doneEditingBtn.addEventListener('click', () => this.showFinalizeModal());
        }

        // Clear Grid button
        const clearGridBtn = document.getElementById('clearGridBtn');
        if (clearGridBtn) {
            clearGridBtn.addEventListener('click', () => this.clearGrid());
        }

        // Modal buttons
        const cancelBtn = document.getElementById('cancelFinalizeBtn');
        const confirmBtn = document.getElementById('confirmFinalizeBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeFinalizeModal());
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.finalizePuzzle());
        }

        // Edit Puzzle modal buttons
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const confirmEditBtn = document.getElementById('confirmEditBtn');
        
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.closeEditModal());
        }
        
        if (confirmEditBtn) {
            confirmEditBtn.addEventListener('click', () => this.confirmUnlockPuzzle());
        }

        // Action buttons (will be implemented next)
        const getHintBtn = document.getElementById('getHintBtn');
        const solvePuzzleBtn = document.getElementById('solvePuzzleBtn');
        const editPuzzleBtn = document.getElementById('editPuzzleBtn');

        if (getHintBtn) {
            getHintBtn.addEventListener('click', () => this.getHint());
        }
        
        if (solvePuzzleBtn) {
            solvePuzzleBtn.addEventListener('click', () => this.solvePuzzle());
        }
        
        if (editPuzzleBtn) {
            editPuzzleBtn.addEventListener('click', () => this.unlockPuzzle());
        }
    },

    /**
     * Update UI controls based on mode and state
     */
    updateControlsDisplay() {
        const inputBtn = document.getElementById('inputModeBtn');
        const notesBtn = document.getElementById('notesModeBtn');
        const doneEditingBtn = document.getElementById('doneEditingBtn');
        const clearGridBtn = document.getElementById('clearGridBtn');
        const getHintBtn = document.getElementById('getHintBtn');
        const solvePuzzleBtn = document.getElementById('solvePuzzleBtn');
        const editPuzzleBtn = document.getElementById('editPuzzleBtn');

        // Hide all buttons first
        doneEditingBtn.style.display = 'none';
        clearGridBtn.style.display = 'none';
        getHintBtn.style.display = 'none';
        solvePuzzleBtn.style.display = 'none';
        editPuzzleBtn.style.display = 'none';

        if (this.currentMode === 'entry' && !this.isEntryLocked) {
            // Entry mode - unlocked
            inputBtn.disabled = true;
            notesBtn.disabled = true;
            doneEditingBtn.style.display = 'inline-block';
            clearGridBtn.style.display = 'inline-block';
        } else if (this.currentMode === 'entry' && this.isEntryLocked) {
            // Entry mode - locked (now playing)
            inputBtn.disabled = false;
            notesBtn.disabled = false;
            getHintBtn.style.display = 'inline-block';
            solvePuzzleBtn.style.display = 'inline-block';
            editPuzzleBtn.style.display = 'inline-block';
            this.updateHintButtonLabel();
        } else {
            // Playing mode (new or continue)
            inputBtn.disabled = false;
            notesBtn.disabled = false;
            getHintBtn.style.display = 'inline-block';
            solvePuzzleBtn.style.display = 'inline-block';
            this.updateHintButtonLabel();
        }
    },

    /**
     * Update hint button label based on Notes mode
     */
    updateHintButtonLabel() {
        const getHintBtn = document.getElementById('getHintBtn');
        if (getHintBtn && Grid.isNotesMode) {
            getHintBtn.textContent = 'Fill Notes';
        } else if (getHintBtn) {
            getHintBtn.textContent = 'Get Hint';
        }
    },

    /**
     * Show finalize puzzle modal
     */
    showFinalizeModal() {
        const modal = document.getElementById('finalizePuzzleModal');
        const validationStatus = document.getElementById('validationStatus');
        const confirmBtn = document.getElementById('confirmFinalizeBtn');
        
        modal.style.display = 'flex';
        confirmBtn.disabled = true;
        
        // Start validation
        validationStatus.className = 'validation-status validating';
        validationStatus.innerHTML = '<p>Validating puzzle...</p>';
        
        // Run validation after a brief delay to show the UI
        setTimeout(() => this.validatePuzzle(), 100);
    },

    /**
     * Close finalize puzzle modal
     */
    closeFinalizeModal() {
        const modal = document.getElementById('finalizePuzzleModal');
        modal.style.display = 'none';
    },

    /**
     * Validate the entered puzzle
     */
    validatePuzzle() {
        const validationStatus = document.getElementById('validationStatus');
        const confirmBtn = document.getElementById('confirmFinalizeBtn');
        
        try {
            // Get current grid from Grid module
            const currentGrid = Grid.getCurrentGrid();
            
            // Check if puzzle has any numbers
            const hasNumbers = currentGrid.some(row => row.some(cell => cell !== 0));
            if (!hasNumbers) {
                validationStatus.className = 'validation-status error';
                validationStatus.innerHTML = '<p>Puzzle is empty. Please enter some numbers.</p>';
                confirmBtn.disabled = true;
                return;
            }
            
            // Check if puzzle is valid and has unique solution
            // TODO: Add setting for relaxed mode (allows multiple solutions)
            const solutionCount = Solver.countSolutions(currentGrid, 2); // Check for at most 2 solutions
            
            if (solutionCount === 0) {
                validationStatus.className = 'validation-status error';
                validationStatus.innerHTML = '<p>Puzzle has no solution.</p>';
                confirmBtn.disabled = true;
            } else if (solutionCount > 1) {
                validationStatus.className = 'validation-status error';
                validationStatus.innerHTML = '<p>Puzzle has multiple solutions. Classic Sudoku requires a unique solution.</p>';
                confirmBtn.disabled = true;
            } else {
                validationStatus.className = 'validation-status success';
                validationStatus.innerHTML = '<p>Puzzle has a unique solution!</p>';
                confirmBtn.disabled = false;
            }
        } catch (error) {
            console.error('Validation error:', error);
            validationStatus.className = 'validation-status error';
            validationStatus.innerHTML = '<p>Error validating puzzle. Please try again.</p>';
            confirmBtn.disabled = true;
        }
    },

    /**
     * Finalize (lock) the puzzle
     */
    async finalizePuzzle() {
        try {
            const currentGrid = Grid.getCurrentGrid();
            
            // Create locked array - lock all filled cells
            const locked = [];
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const index = row * 9 + col;
                    locked[index] = currentGrid[row][col] !== 0;
                }
            }
            
            // Save puzzle to storage
            const puzzleData = {
                originalGrid: currentGrid.map(row => [...row]),
                currentGrid: currentGrid.map(row => [...row]),
                notes: Array(81).fill(null).map(() => Array(9).fill(false)),
                locked: locked,
                difficulty: null, // No difficulty for custom puzzles
                dateStarted: new Date().toISOString(),
                lastPlayed: new Date().toISOString(),
                isCompleted: false
            };
            
            const puzzleId = await Storage.savePuzzle(puzzleData);
            
            // Update current state
            this.currentPuzzleId = puzzleId;
            this.isEntryLocked = true;
            
            // Reload grid with locked cells
            Grid.loadPuzzleData({
                id: puzzleId,
                originalGrid: puzzleData.originalGrid,
                currentGrid: puzzleData.currentGrid,
                notes: puzzleData.notes,
                locked: puzzleData.locked,
                isEntry: false // Now in playing mode
            });
            
            // Update UI
            document.getElementById('gameMode').textContent = 'Solving Custom Puzzle';
            this.updateControlsDisplay();
            this.closeFinalizeModal();
            
            Utils.showMessage('Puzzle locked! Start solving.', 'success', 3000);
        } catch (error) {
            console.error('Error finalizing puzzle:', error);
            Utils.showMessage('Failed to finalize puzzle. Please try again.', 'error');
        }
    },

    /**
     * Get a hint - behavior depends on mode
     */
    getHint() {
        if (Grid.isNotesMode) {
            // In Notes mode - fill notes for selected cell
            this.fillCellNotes();
        } else {
            // In Input mode - place correct answer
            this.placeHint();
        }
    },

    /**
     * Fill notes for selected cell with valid candidates
     */
    fillCellNotes() {
        if (Grid.selectedCell === null) {
            Utils.showMessage('Select a cell to fill notes', 'info', 2000);
            return;
        }

        const { row, col } = Utils.getRowCol(Grid.selectedCell);
        
        // Check if cell is already filled
        if (Grid.currentGrid[row][col] !== 0) {
            Utils.showMessage('Cell already has a number', 'info', 2000);
            return;
        }

        // Find all valid numbers for this cell
        const validNumbers = [];
        for (let num = 1; num <= 9; num++) {
            if (Validator.isValidPlacement(Grid.currentGrid, row, col, num)) {
                validNumbers.push(num);
            }
        }

        if (validNumbers.length === 0) {
            Utils.showMessage('No valid candidates found for this cell', 'warning', 2000);
            return;
        }

        // Set all valid numbers as notes
        validNumbers.forEach(num => {
            Grid.cellNotes[Grid.selectedCell][num] = true;
        });
        
        Grid.scheduleAutoSave();
        Grid.draw();
        
        Utils.showMessage(`Notes filled: ${validNumbers.join(', ')}`, 'success', 3000);
    },

    /**
     * Place a hint (correct answer) in a cell
     */
    placeHint() {
        Utils.showMessage('Place Hint feature coming soon!', 'info', 2000);
        // TODO: Implement placing correct answer
    },

    /**
     * Solve the entire puzzle
     */
    solvePuzzle() {
        Utils.showMessage('Solve Puzzle feature coming soon!', 'info', 2000);
        // TODO: Implement solve logic
    },

    /**
     * Clear the grid in entry mode
     */
    clearGrid() {
        if (confirm('Clear the entire grid? This cannot be undone.')) {
            // Create empty 9x9 grids
            const emptyGrid = Array(9).fill(0).map(() => Array(9).fill(0));
            const emptyNotes = Array(81).fill(null).map(() => Array(9).fill(false));
            const emptyLocked = Array(81).fill(false);
            
            // Reload empty grid
            Grid.loadPuzzleData({
                id: null,
                originalGrid: emptyGrid,
                currentGrid: emptyGrid,
                notes: emptyNotes,
                locked: emptyLocked,
                isEntry: true
            });
            
            Utils.showMessage('Grid cleared', 'info', 2000);
        }
    },

    /**
     * Show edit puzzle confirmation modal
     */
    unlockPuzzle() {
        const modal = document.getElementById('editPuzzleModal');
        modal.style.display = 'flex';
    },

    /**
     * Close edit puzzle modal
     */
    closeEditModal() {
        const modal = document.getElementById('editPuzzleModal');
        modal.style.display = 'none';
    },

    /**
     * Confirm and execute puzzle unlock
     */
    confirmUnlockPuzzle() {
        this.isEntryLocked = false;
        
        // Reload in entry mode
        const currentGrid = Grid.getOriginalGrid();
        Grid.loadPuzzleData({
            id: null,
            originalGrid: currentGrid,
            currentGrid: currentGrid,
            notes: Array(81).fill(null).map(() => Array(9).fill(false)),
            locked: Array(81).fill(false),
            isEntry: true
        });
        
        document.getElementById('gameMode').textContent = 'Entry Mode';
        this.updateControlsDisplay();
        this.closeEditModal();
        Utils.showMessage('Puzzle unlocked for editing', 'info', 2000);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Play.init();
});
