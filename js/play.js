/**
 * Play page logic
 */

const Play = {
    currentMode: null, // 'new', 'continue', 'entry'
    currentPuzzleId: null,
    isEntryLocked: false, // Track if entry mode puzzle is locked
    isHintMode: false, // Track if in hint selection mode
    isPuzzleCompleted: false, // Track if current puzzle is completed
    
    // Timer properties
    startTime: null,
    elapsedTime: 0, // in seconds
    timerInterval: null,
    isPaused: false,
    pausedTime: 0,

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
            
            // Setup beforeunload to save timer state
            window.addEventListener('beforeunload', () => {
                this.saveTimerState();
            });
            
            // Setup auto-resume on interaction
            this.setupAutoResume();
            
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
        // Track completion status
        this.isPuzzleCompleted = puzzle.isCompleted || false;
        
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
        
        // Start timer if puzzle is not completed and we're playing
        if (!this.isPuzzleCompleted && puzzle.difficulty) {
            const savedTime = puzzle.timeElapsed || 0;
            console.log('Loading puzzle with timeElapsed:', puzzle.timeElapsed, 'Starting timer with:', savedTime);
            this.startTimer(savedTime);
        }
        
        // Show appropriate message
        if (this.currentMode === 'new') {
            Utils.showMessage(`New ${puzzle.difficulty} puzzle loaded!`, 'success', 3000);
        } else if (!puzzle.isCompleted) {
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
        const doneEnteringBtn = document.getElementById('doneEnteringBtn');
        if (doneEnteringBtn) {
            doneEnteringBtn.addEventListener('click', () => this.showFinalizeModal());
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

        // Solve Puzzle modal buttons
        const cancelSolveBtn = document.getElementById('cancelSolveBtn');
        const confirmSolveBtn = document.getElementById('confirmSolveBtn');
        
        if (cancelSolveBtn) {
            cancelSolveBtn.addEventListener('click', () => this.closeSolveModal());
        }
        
        if (confirmSolveBtn) {
            confirmSolveBtn.addEventListener('click', () => this.confirmSolvePuzzle());
        }

        // Action buttons
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
        
        // Help button and modal
        const helpBtn = document.getElementById('helpBtn');
        const closeHelpBtn = document.getElementById('closeHelpBtn');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelpModal());
        }
        
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.closeHelpModal());
        }
        
        // Global keyboard listener for help modal
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.showHelpModal();
            }
        });
        
        // Pause/Play timer button
        const pauseTimerBtn = document.getElementById('pauseTimerBtn');
        if (pauseTimerBtn) {
            pauseTimerBtn.addEventListener('click', () => this.togglePause());
        }
    },

    /**
     * Update UI controls based on mode and state
     */
    updateControlsDisplay() {
        const inputBtn = document.getElementById('inputModeBtn');
        const notesBtn = document.getElementById('notesModeBtn');
        const doneEnteringBtn = document.getElementById('doneEnteringBtn');
        const clearGridBtn = document.getElementById('clearGridBtn');
        const getHintBtn = document.getElementById('getHintBtn');
        const solvePuzzleBtn = document.getElementById('solvePuzzleBtn');
        const editPuzzleBtn = document.getElementById('editPuzzleBtn');

        // Hide all buttons first
        doneEnteringBtn.style.display = 'none';
        clearGridBtn.style.display = 'none';
        getHintBtn.style.display = 'none';
        solvePuzzleBtn.style.display = 'none';
        editPuzzleBtn.style.display = 'none';

        if (this.currentMode === 'entry' && !this.isEntryLocked) {
            // Entry mode - unlocked
            inputBtn.disabled = true;
            notesBtn.disabled = true;
            doneEnteringBtn.style.display = 'inline-block';
            clearGridBtn.style.display = 'inline-block';
        } else if (this.currentMode === 'entry' && this.isEntryLocked) {
            // Entry mode - locked (now playing)
            inputBtn.disabled = this.isPuzzleCompleted;
            notesBtn.disabled = this.isPuzzleCompleted;
            getHintBtn.style.display = 'inline-block';
            getHintBtn.disabled = this.isPuzzleCompleted;
            solvePuzzleBtn.style.display = 'inline-block';
            solvePuzzleBtn.disabled = this.isPuzzleCompleted;
            editPuzzleBtn.style.display = 'inline-block';
            editPuzzleBtn.disabled = this.isPuzzleCompleted;
            this.updateHintButtonLabel();
        } else {
            // Playing mode (new or continue)
            inputBtn.disabled = this.isPuzzleCompleted;
            notesBtn.disabled = this.isPuzzleCompleted;
            getHintBtn.style.display = 'inline-block';
            getHintBtn.disabled = this.isPuzzleCompleted;
            solvePuzzleBtn.style.display = 'inline-block';
            solvePuzzleBtn.disabled = this.isPuzzleCompleted;
            this.updateHintButtonLabel();
        }
    },

    /**
     * Update hint button label based on Notes mode and hint mode
     */
    updateHintButtonLabel() {
        const getHintBtn = document.getElementById('getHintBtn');
        if (!getHintBtn) return;
        
        if (this.isHintMode) {
            getHintBtn.textContent = 'Cancel Hint';
        } else if (Grid.isNotesMode) {
            getHintBtn.textContent = 'Fill Notes';
        } else {
            getHintBtn.textContent = 'Get Hint';
        }
        
        // Disable if puzzle is solved
        const isSolved = Grid.currentGrid.every(row => row.every(cell => cell !== 0));
        getHintBtn.disabled = isSolved;
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
    },

    /**
     * Place a hint (correct answer) in a cell
     */
    placeHint() {
        if (this.isHintMode) {
            // Exit hint mode
            this.exitHintMode();
        } else {
            // Enter hint mode
            this.enterHintMode();
        }
    },

    /**
     * Enter hint selection mode
     */
    enterHintMode() {
        // Check if there are empty cells
        const hasEmptyCells = Grid.currentGrid.some(row => row.some(cell => cell === 0));
        if (!hasEmptyCells) {
            Utils.showMessage('Puzzle is already complete!', 'info', 2000);
            return;
        }
        
        this.isHintMode = true;
        this.updateHintButtonLabel();
        Grid.draw();
        
        // Add hint-mode class to grid wrapper for cursor
        const gridWrapper = document.getElementById('gridWrapper');
        if (gridWrapper) {
            gridWrapper.classList.add('hint-mode');
        }
        
        Utils.showMessage('Select a cell to reveal its answer', 'info', 2000);
    },

    /**
     * Exit hint selection mode
     */
    exitHintMode() {
        this.isHintMode = false;
        this.updateHintButtonLabel();
        Grid.draw();
        
        // Remove hint-mode class from grid wrapper
        const gridWrapper = document.getElementById('gridWrapper');
        if (gridWrapper) {
            gridWrapper.classList.remove('hint-mode');
        }
        
        Utils.clearMessage();
    },

    /**
     * Place hint in selected cell
     */
    placeHintInCell(row, col) {
        // Get the solution for this cell
        const puzzleGrid = Grid.getOriginalGrid();
        
        // Create a deep copy of the grid for solving
        const gridCopy = puzzleGrid.map(row => [...row]);
        
        // Solve returns boolean, modifies grid in place
        const solved = Solver.solve(gridCopy);
        
        if (!solved) {
            Utils.showMessage('Cannot determine solution for this puzzle', 'error', 2000);
            this.exitHintMode();
            return;
        }
        
        // Get the correct value from the solved grid
        const correctValue = gridCopy[row][col];
        Grid.setCellValue(row, col, correctValue);
        this.exitHintMode();
        
        Utils.showMessage('Hint placed!', 'success', 2000);
        
        // Check if puzzle is now complete
        this.checkPuzzleCompletion();
    },

    /**
     * Show solve puzzle confirmation modal
     */
    solvePuzzle() {
        const modal = document.getElementById('solvePuzzleModal');
        modal.style.display = 'flex';
    },

    /**
     * Close solve puzzle modal
     */
    closeSolveModal() {
        const modal = document.getElementById('solvePuzzleModal');
        modal.style.display = 'none';
    },

    /**
     * Confirm and execute puzzle solve with animation
     */
    async confirmSolvePuzzle() {
        this.closeSolveModal();
        
        // Exit hint mode if active
        if (this.isHintMode) {
            this.exitHintMode();
        }
        
        // Get the original puzzle and solve it
        const puzzleGrid = Grid.getOriginalGrid();
        const gridCopy = puzzleGrid.map(row => [...row]);
        const solved = Solver.solve(gridCopy);
        
        if (!solved) {
            Utils.showMessage('Cannot solve this puzzle', 'error', 2000);
            return;
        }
        
        // Collect all empty cells
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (Grid.currentGrid[row][col] === 0) {
                    emptyCells.push({ row, col, value: gridCopy[row][col] });
                }
            }
        }
        
        if (emptyCells.length === 0) {
            Utils.showMessage('Puzzle is already complete!', 'info', 2000);
            return;
        }
        
        // Randomize the order of cell reveals (Fisher-Yates shuffle)
        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }
        
        // Disable buttons during animation
        this.disableButtons(true);
        
        // Show solving message
        Utils.showMessage(`Solving ${emptyCells.length} cells...`, 'info', 0);
        
        // Animate filling cells one by one
        for (let i = 0; i < emptyCells.length; i++) {
            const cell = emptyCells[i];
            
            // Fill the cell
            Grid.setCellValue(cell.row, cell.col, cell.value);
            
            // Wait 200ms before next cell
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Re-enable buttons
        this.disableButtons(false);
        
        // Stop timer
        this.stopTimer();
        
        // Show completion message
        Utils.showMessage('Puzzle solved!', 'success', 3000);
        
        // Mark puzzle as completed
        if (this.currentPuzzleId) {
            console.log('Marking puzzle as completed:', this.currentPuzzleId);
            await Storage.updatePuzzle(this.currentPuzzleId, {
                isCompleted: true,
                completedDate: new Date().toISOString(),
                solvedBy: 'auto-solve',
                timeElapsed: this.elapsedTime
            });
            console.log('Puzzle marked as completed');
            this.isPuzzleCompleted = true;
            this.updateControlsDisplay();
        } else {
            console.log('No currentPuzzleId to mark as completed');
        }
    },
    
    /**
     * Disable/enable action buttons
     */
    disableButtons(disabled) {
        const buttons = ['getHintBtn', 'solvePuzzleBtn', 'editPuzzleBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = disabled;
        });
    },

    /**
     * Check if puzzle is complete and mark as completed
     */
    async checkPuzzleCompletion() {
        // Check if all cells are filled
        const isFilled = Grid.currentGrid.every(row => row.every(cell => cell !== 0));
        
        if (!isFilled) return;
        
        // Check if solution is valid
        const invalidCells = Validator.validateGrid(Grid.currentGrid);
        
        if (invalidCells.length > 0) return; // Has errors
        
        // Puzzle is complete and valid!
        if (this.currentPuzzleId) {
            const puzzle = await Storage.getPuzzle(this.currentPuzzleId);
            if (puzzle && !puzzle.isCompleted) {
                // Stop timer
                this.stopTimer();
                
                await Storage.updatePuzzle(this.currentPuzzleId, {
                    isCompleted: true,
                    completedDate: new Date().toISOString(),
                    solvedBy: 'manual',
                    timeElapsed: this.elapsedTime
                });
                
                this.isPuzzleCompleted = true;
                this.updateControlsDisplay();
                
                Utils.showMessage('Congratulations! Puzzle completed!', 'success', 3000);
            }
        }
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
    },

    /**
     * Start the timer
     */
    startTimer(savedElapsed = 0) {
        const prefs = this.getPreferences();
        if (!prefs.showTimer) return;
        
        console.log('startTimer called with savedElapsed:', savedElapsed);
        
        this.elapsedTime = savedElapsed;
        this.startTime = Date.now() - (savedElapsed * 1000);
        this.isPaused = false;
        
        console.log('Timer initialized:', { elapsedTime: this.elapsedTime, startTime: this.startTime });
        
        // Show timer element
        const timerEl = document.getElementById('timer');
        if (timerEl) {
            timerEl.style.display = 'inline-block';
            this.updateTimerDisplay();
        }
        
        // Show pause button if preference is enabled
        const pauseBtn = document.getElementById('pauseTimerBtn');
        if (pauseBtn && prefs.showPauseButton) {
            pauseBtn.style.display = 'inline-block';
            pauseBtn.textContent = '\u23f8'; // Pause symbol
            pauseBtn.title = 'Pause Timer';
        }
        
        // Update every second
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
                this.updateTimerDisplay();
                
                // Save timer to database every second
                Grid.autoSave();
            }
        }, 1000);
    },

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        if (!timerEl) return;
        
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = this.elapsedTime % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * Get preferences helper
     */
    getPreferences() {
        const stored = localStorage.getItem('sudoku-preferences');
        const defaults = { showTimer: true, autoCheckErrors: true, highlightRelated: true, showPauseButton: true };
        if (stored) {
            try {
                return { ...defaults, ...JSON.parse(stored) };
            } catch (e) {
                return defaults;
            }
        }
        return defaults;
    },

    /**
     * Toggle timer pause state
     */
    togglePause() {
        const pauseBtn = document.getElementById('pauseTimerBtn');
        if (!pauseBtn) return;
        
        if (this.isPaused) {
            // Resume
            this.isPaused = false;
            // Adjust startTime to account for paused duration
            const pausedDuration = Date.now() - this.pausedTime;
            this.startTime += pausedDuration;
            pauseBtn.textContent = '\u23f8'; // Pause symbol
            pauseBtn.title = 'Pause Timer';
        } else {
            // Pause
            this.isPaused = true;
            this.pausedTime = Date.now();
            pauseBtn.textContent = '\u25b6'; // Play symbol
            pauseBtn.title = 'Resume Timer';
        }
    },

    /**
     * Show help modal
     */
    showHelpModal() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    /**
     * Close help modal
     */
    closeHelpModal() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Setup auto-resume timer on user interaction
     */
    setupAutoResume() {
        const resumeIfPaused = () => {
            if (this.isPaused && !this.isPuzzleCompleted) {
                this.togglePause();
            }
        };
        
        // Resume on keyboard input
        document.addEventListener('keydown', (e) => {
            // Don't resume on ? key (help modal)
            if (e.key === '?') return;
            resumeIfPaused();
        });
        
        // Resume on canvas click (game interaction)
        const canvas = document.getElementById('sudokuCanvas');
        if (canvas) {
            canvas.addEventListener('click', resumeIfPaused);
        }
        
        // Resume on number button clicks
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(btn => {
            btn.addEventListener('click', resumeIfPaused);
        });
        
        // Resume on control button clicks
        const controlButtons = [
            'inputModeBtn', 'notesModeBtn', 'getHintBtn', 
            'undoBtn', 'redoBtn', 'clearCellBtn',
            'zoomInBtn', 'zoomOutBtn', 'zoomResetBtn'
        ];
        
        controlButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', resumeIfPaused);
            }
        });
    },

    /**
     * Save timer state before navigating away
     */
    saveTimerState() {
        if (this.currentPuzzleId && this.elapsedTime > 0) {
            // Use navigator.sendBeacon for reliable save on page unload
            const updates = {
                timeElapsed: this.elapsedTime,
                lastPlayed: new Date().toISOString()
            };
            console.log('saveTimerState - saving:', updates);
            
            // For beforeunload, we need synchronous storage
            // Since IndexedDB is async, we'll trigger autosave immediately
            Grid.autoSave();
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Play.init();
});
