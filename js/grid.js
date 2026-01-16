/**
 * Canvas-based grid management and UI interaction
 */

const Grid = {
    currentGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
    originalGrid: Array(9).fill(0).map(() => Array(9).fill(0)),
    selectedCell: null,
    isNotesMode: false,
    cellNotes: Array(81).fill(0).map(() => Array(10).fill(false)),
    currentPuzzleId: null,
    autoSaveTimer: null,
    
    // Undo/Redo history
    undoStack: [],
    redoStack: [],
    maxHistorySize: 100,
    
    // Canvas properties
    canvas: null,
    ctx: null,
    baseSize: 600,
    cellSize: 0,
    
    // Zoom and pan
    zoom: 1.0,
    minZoom: 0.5,
    maxZoom: 2.5,
    zoomStep: 0.1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    
    // Colors from CSS variables
    colors: {
        cellBg: '#ffffff',
        cellHover: '#fef9e7',
        cellSelected: '#dbeafe',
        cellLocked: '#f8fafc',
        cellSolved: '#d1fae5',
        cellInvalid: '#fee2e2',
        borderLight: '#e2e8f0',
        borderMedium: '#cbd5e1',
        borderDark: '#1e293b',
        textPrimary: '#0f172a',
        textMuted: '#94a3b8',
        primaryColor: '#2563eb',
        successColor: '#10b981',
        errorColor: '#ef4444'
    },

    /**
     * Initialize the canvas-based grid
     */
    init() {
        this.canvas = document.getElementById('sudokuCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up high DPI canvas
        this.setupCanvas();
        
        // Initial draw
        this.draw();
        
        // Attach event listeners
        this.attachEventListeners();
        this.updateZoomDisplay();
    },

    /**
     * Set up canvas with proper DPI scaling
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const size = this.baseSize * this.zoom;
        
        // Set display size
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        
        // Set actual size in memory (scaled for DPI)
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        
        // Scale context to match DPI
        this.ctx.scale(dpr, dpr);
        
        this.cellSize = size / 9;
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Canvas click
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Canvas mouse move for hover
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Keyboard input
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Mode toggle
        document.getElementById('inputModeBtn').addEventListener('click', () => this.setMode(false));
        document.getElementById('notesModeBtn').addEventListener('click', () => this.setMode(true));
        
        // Undo/Redo buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // Clear cell button
        document.getElementById('clearCellBtn').addEventListener('click', () => this.clearSelectedCell());
        
        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.resetZoom());
        
        // Mouse wheel zoom
        const wrapper = document.getElementById('gridWrapper');
        wrapper.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Pan with mouse drag
        wrapper.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    },

    /**
     * Handle canvas click
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (row >= 0 && row < 9 && col >= 0 && col < 9) {
            const index = Utils.getIndex(row, col);
            
            // Check if in hint mode (Play module)
            if (typeof Play !== 'undefined' && Play.isHintMode) {
                // Only allow clicking empty cells in hint mode
                if (this.currentGrid[row][col] === 0) {
                    Play.placeHintInCell(row, col);
                }
                return;
            }
            
            // If clicking on already selected cell in Notes mode
            if (this.isNotesMode && this.selectedCell === index && this.currentGrid[row][col] === 0) {
                // Calculate which note position was clicked (1-9)
                const cellX = col * this.cellSize;
                const cellY = row * this.cellSize;
                const offsetX = x - cellX;
                const offsetY = y - cellY;
                const miniSize = this.cellSize / 3;
                
                const noteCol = Math.floor(offsetX / miniSize);
                const noteRow = Math.floor(offsetY / miniSize);
                const noteNum = noteRow * 3 + noteCol + 1;
                
                // Toggle the note
                this.toggleNote(index, noteNum);
            } else {
                // Select the cell
                this.selectCell(index);
            }
        }
    },

    /**
     * Handle mouse move for hover effects
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        // Could implement hover highlighting here if needed
        this.canvas.style.cursor = (row >= 0 && row < 9 && col >= 0 && col < 9) ? 'pointer' : 'default';
    },

    /**
     * Select a cell
     */
    selectCell(index) {
        this.selectedCell = index;
        this.draw();
    },

    /**
     * Handle keyboard input
     */
    handleKeyPress(e) {
        // Handle undo/redo globally (even without cell selected)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
            return;
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            this.redo();
            return;
        }
        
        if (this.selectedCell === null) return;
        
        const { row, col } = Utils.getRowCol(this.selectedCell);
        
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const num = parseInt(e.key);
            
            if (this.isNotesMode) {
                this.toggleNote(this.selectedCell, num);
            } else {
                this.setCellValue(row, col, num);
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (this.isNotesMode) {
                // In Notes mode, only clear notes
                this.clearCellNotes(this.selectedCell);
                this.scheduleAutoSave();
                this.draw();
            } else {
                // In Input mode, clear value and notes
                this.setCellValue(row, col, 0);
                this.clearCellNotes(this.selectedCell);
            }
        } else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            this.navigateCell(e.key);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.navigateCell(e.shiftKey ? 'ArrowLeft' : 'ArrowRight');
        }
    },

    /**
     * Navigate to adjacent cell
     */
    navigateCell(direction) {
        if (this.selectedCell === null) return;
        
        let { row, col } = Utils.getRowCol(this.selectedCell);
        
        switch (direction) {
            case 'ArrowUp': row = (row - 1 + 9) % 9; break;
            case 'ArrowDown': row = (row + 1) % 9; break;
            case 'ArrowLeft': col = (col - 1 + 9) % 9; break;
            case 'ArrowRight': col = (col + 1) % 9; break;
        this.scheduleAutoSave();
        }
        
        this.selectCell(Utils.getIndex(row, col));
    },

    /**
     * Set cell value
     */
    setCellValue(row, col, value, skipHistory = false) {
        if (this.originalGrid[row][col] !== 0) return;
        
        const oldValue = this.currentGrid[row][col];
        const index = Utils.getIndex(row, col);
        const oldNotes = [...this.cellNotes[index]];
        
        // Save to history if this is a user action
        if (!skipHistory && oldValue !== value) {
            this.saveToHistory({
                type: 'cell',
                row,
                col,
                oldValue,
                newValue: value,
                oldNotes: oldNotes
            });
        }
        
        this.currentGrid[row][col] = value;
        this.scheduleAutoSave();
        if (value !== 0) {
            this.clearCellNotes(index);
        }
        this.draw();
        
        // Notify Play module to check completion if it exists
        if (typeof Play !== 'undefined' && Play.checkPuzzleCompletion) {
            Play.checkPuzzleCompletion();
        }
        
        // Update undo/redo button states
        this.updateUndoRedoButtons();
    },

    /**
     * Toggle note in cell
     */
    toggleNote(index, number, skipHistory = false) {
        const { row, col } = Utils.getRowCol(index);
        
        if (this.currentGrid[row][col] !== 0) return;
        if (this.originalGrid[row][col] !== 0) return;
        
        const oldNotes = [...this.cellNotes[index]];
        
        // Save to history if this is a user action
        if (!skipHistory) {
            this.saveToHistory({
                type: 'notes',
                index,
                oldNotes: oldNotes,
                newNotes: [...this.cellNotes[index]],
                toggledNumber: number
            });
        }
        
        this.cellNotes[index][number] = !this.cellNotes[index][number];
        this.scheduleAutoSave();
        this.draw();
        
        // Update undo/redo button states
        this.updateUndoRedoButtons();
    },

    /**
     * Clear all notes from a cell
     */
    clearCellNotes(index) {
        this.cellNotes[index].fill(false);
    },

    /**
     * Set mode
     */
    setMode(notesMode) {
        // Exit hint mode if active
        if (typeof Play !== 'undefined' && Play.isHintMode) {
            Play.exitHintMode();
        }
        
        this.isNotesMode = notesMode;
        
        const inputBtn = document.getElementById('inputModeBtn');
        const notesBtn = document.getElementById('notesModeBtn');
        
        if (notesMode) {
            inputBtn.classList.remove('active');
            notesBtn.classList.add('active');
        } else {
            inputBtn.classList.add('active');
            notesBtn.classList.remove('active');
        }
        
        // Update hint button label if Play module exists
        if (typeof Play !== 'undefined' && Play.updateHintButtonLabel) {
            Play.updateHintButtonLabel();
        }
        
        // Redraw to show/hide note grid
        this.draw();
    },

    /**
     * Check if a cell is related to the selected cell
     * (same row, column, or 3x3 box)
     */
    isCellRelated(row, col) {
        // Check if highlighting is enabled in preferences
        const prefs = this.getPreferences();
        if (!prefs.highlightRelated) return false;
        
        // No cell selected
        if (this.selectedCell === null) return false;
        
        const { row: selectedRow, col: selectedCol } = Utils.getRowCol(this.selectedCell);
        
        // Don't highlight the selected cell itself
        if (row === selectedRow && col === selectedCol) return false;
        
        // Check if in same row or column
        if (row === selectedRow || col === selectedCol) return true;
        
        // Check if in same 3x3 box
        const boxRow = Math.floor(selectedRow / 3);
        const boxCol = Math.floor(selectedCol / 3);
        const cellBoxRow = Math.floor(row / 3);
        const cellBoxCol = Math.floor(col / 3);
        
        return boxRow === cellBoxRow && boxCol === cellBoxCol;
    },

    /**
     * Get preferences helper
     */
    getPreferences() {
        const stored = localStorage.getItem('sudoku-preferences');
        const defaults = { showTimer: true, autoCheckErrors: true, highlightRelated: true };
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
     * Main draw function
     */
    draw() {
        const ctx = this.ctx;
        const size = this.baseSize * this.zoom;
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Get invalid cells
        const invalidCells = Validator.validateGrid(this.currentGrid);
        
        // Draw cells
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.drawCell(row, col, invalidCells);
            }
        }
        
        // Draw grid lines
        this.drawGrid();
    },

    /**
     * Draw a single cell
     */
    drawCell(row, col, invalidCells) {
        const ctx = this.ctx;
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const index = Utils.getIndex(row, col);
        const value = this.currentGrid[row][col];
        const isLocked = this.originalGrid[row][col] !== 0;
        const isSelected = this.selectedCell === index;
        const isInvalid = invalidCells.includes(index);
        const isEmpty = value === 0;
        
        // Check if in hint mode
        const isHintMode = typeof Play !== 'undefined' && Play.isHintMode;
        
        // Check if cell is related to selected cell (same row, col, or box)
        const isRelated = this.isCellRelated(row, col);
        
        // Determine cell background
        let bgColor = this.colors.cellBg;
        if (isHintMode && isEmpty) {
            // Yellow highlight for empty cells in hint mode
            bgColor = '#ffd700';
        } else if (isInvalid) {
            bgColor = this.colors.cellInvalid;
        } else if (isSelected) {
            bgColor = this.colors.cellSelected;
        } else if (isRelated) {
            // Highlight related cells if preference is enabled
            bgColor = this.colors.cellHover;
        } else if (isLocked) {
            bgColor = this.colors.cellLocked;
        } else if (value !== 0) {
            bgColor = this.colors.cellSolved;
        }
        
        // Draw background
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);
        
        // Draw cell content
        if (value !== 0) {
            // Draw number
            ctx.fillStyle = isInvalid ? this.colors.errorColor : 
                           (isLocked ? this.colors.textPrimary : this.colors.successColor);
            ctx.font = `bold ${this.cellSize * 0.5}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value.toString(), x + this.cellSize / 2, y + this.cellSize / 2);
        } else if (this.cellNotes[index].slice(1).some(n => n)) {
            // Draw notes
            this.drawNotes(x, y, index);
        }
        
        // Draw selection highlight
        if (isSelected) {
            ctx.strokeStyle = this.colors.primaryColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, this.cellSize - 3, this.cellSize - 3);
            
            // Draw 3x3 grid overlay in Notes mode
            if (this.isNotesMode && value === 0) {
                this.drawNoteGrid(x, y);
            }
        }
    },

    /**
     * Draw 3x3 grid overlay for notes mode
     */
    drawNoteGrid(x, y) {
        const ctx = this.ctx;
        const miniSize = this.cellSize / 3;
        const inset = 2; // Inset to avoid drawing over selection border
        
        ctx.strokeStyle = this.colors.borderMedium;
        ctx.lineWidth = 1;
        
        // Draw dividing lines with inset to avoid selection border
        for (let i = 1; i < 3; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(x + i * miniSize, y + inset);
            ctx.lineTo(x + i * miniSize, y + this.cellSize - inset);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(x + inset, y + i * miniSize);
            ctx.lineTo(x + this.cellSize - inset, y + i * miniSize);
            ctx.stroke();
        }
    },

    /**
     * Draw notes in a cell
     */
    drawNotes(x, y, index) {
        const ctx = this.ctx;
        const noteSize = this.cellSize / 3;
        const fontSize = this.cellSize * 0.15;
        const { row, col } = Utils.getRowCol(index);
        
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let num = 1; num <= 9; num++) {
            if (this.cellNotes[index][num]) {
                const noteRow = Math.floor((num - 1) / 3);
                const noteCol = (num - 1) % 3;
                const noteX = x + noteCol * noteSize + noteSize / 2;
                const noteY = y + noteRow * noteSize + noteSize / 2;
                
                // Check if this note is valid for this cell
                const isValid = Validator.isValidPlacement(this.currentGrid, row, col, num);
                ctx.fillStyle = isValid ? this.colors.primaryColor : this.colors.errorColor;
                ctx.fillText(num.toString(), noteX, noteY);
            }
        }
    },

    /**
     * Draw grid lines
     */
    drawGrid() {
        const ctx = this.ctx;
        const size = this.baseSize * this.zoom;
        
        // Draw thin lines
        ctx.strokeStyle = this.colors.borderLight;
        ctx.lineWidth = 1;
        
        for (let i = 1; i < 9; i++) {
            if (i % 3 !== 0) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(i * this.cellSize, 0);
                ctx.lineTo(i * this.cellSize, size);
                ctx.stroke();
                
                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(0, i * this.cellSize);
                ctx.lineTo(size, i * this.cellSize);
                ctx.stroke();
            }
        }
        
        // Draw thick lines (3x3 boxes)
        ctx.strokeStyle = this.colors.borderDark;
        ctx.lineWidth = 3;
        
        for (let i = 0; i <= 9; i += 3) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, size);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(size, i * this.cellSize);
            ctx.stroke();
        }
    },

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom + this.zoomStep, this.maxZoom);
        this.applyZoom();
    },

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.zoom - this.zoomStep, this.minZoom);
        this.applyZoom();
    },

    /**
     * Reset zoom
     */
    resetZoom() {
        this.zoom = 1.0;
        this.applyZoom();
        
        // Reset scroll position
        const wrapper = document.getElementById('gridWrapper');
        wrapper.scrollLeft = 0;
        wrapper.scrollTop = 0;
    },

    /**
     * Apply zoom
     */
    applyZoom() {
        this.setupCanvas();
        this.draw();
        this.updateZoomDisplay();
        
        const wrapper = document.getElementById('gridWrapper');
        if (this.zoom > 1.0) {
            wrapper.classList.add('zoomed');
        } else {
            wrapper.classList.remove('zoomed');
        }
    },

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    },

    /**
     * Handle mouse wheel zoom
     */
    handleWheel(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        }
    },

    /**
     * Start dragging for pan
     */
    startDrag(e) {
        const wrapper = document.getElementById('gridWrapper');
        if (this.zoom > 1.0 && e.target === this.canvas) {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            wrapper.classList.add('dragging');
        }
    },

    /**
     * Drag to pan
     */
    drag(e) {
        if (this.isDragging) {
            const wrapper = document.getElementById('gridWrapper');
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            wrapper.scrollLeft -= deltaX;
            wrapper.scrollTop -= deltaY;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    },

    /**
     * End dragging
     */
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            const wrapper = document.getElementById('gridWrapper');
            wrapper.classList.remove('dragging');
        }
    },

    /**
     * Handle window resize
     */
    handleResize() {
        this.setupCanvas();
        this.draw();
    },

    /**
     * Solve puzzle
     */
    solvePuzzle() {
        const invalidCells = Validator.validateGrid(this.currentGrid);
        if (invalidCells.length > 0) {
            Utils.showMessage('Please fix validation errors before solving', 'error');
            return;
        }
        
        if (Validator.isSolved(this.currentGrid)) {
            Utils.showMessage('Puzzle is already solved!', 'success');
            return;
        }
        
        const gridCopy = Utils.copyGrid(this.currentGrid);
        const startTime = performance.now();
        const solved = Solver.solve(gridCopy);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        if (solved) {
            this.currentGrid = gridCopy;
            this.draw();
            Utils.showMessage(`Puzzle solved in ${duration} seconds!`, 'success', 5000);
        } else {
            Utils.showMessage('No solution exists for this puzzle', 'error');
        }
    },

    /**
     * Reset to original
     */
    resetToOriginal() {
        if (confirm('Reset to original puzzle? This will clear all your inputs.')) {
            this.currentGrid = Utils.copyGrid(this.originalGrid);
            this.cellNotes = Array(81).fill(0).map(() => Array(10).fill(false));
            this.draw();
            this.scheduleAutoSave();
            Utils.showMessage('Puzzle reset to original state', 'info');
        }
    },

    /**
     * Clear progress (reset current to original state)
     */
    clearProgress() {
        if (confirm('Clear your progress? Original puzzle will remain.')) {
            this.currentGrid = Utils.copyGrid(this.originalGrid);
            this.cellNotes = Array(81).fill(0).map(() => Array(10).fill(false));
            this.draw();
            this.scheduleAutoSave();
            Utils.showMessage('Progress cleared', 'info');
        }
    },

    /**
     * Clear all
     */
    clearAll() {
        if (confirm('Clear entire puzzle? This cannot be undone.')) {
            this.currentGrid = Array(9).fill(0).map(() => Array(9).fill(0));
            this.originalGrid = Array(9).fill(0).map(() => Array(9).fill(0));
            this.cellNotes = Array(81).fill(0).map(() => Array(10).fill(false));
            this.currentPuzzleId = null;
            this.selectedCell = null;
            this.draw();
            Utils.showMessage('Puzzle cleared', 'info');
        }
    },

    /**
     * Load puzzle data into the grid
     */
    loadPuzzleData(puzzleData) {
        this.currentPuzzleId = puzzleData.id;
        this.originalGrid = puzzleData.originalGrid;
        this.currentGrid = Utils.copyGrid(puzzleData.currentGrid);
        this.cellNotes = puzzleData.notes;
        this.selectedCell = null;
        this.clearHistory(); // Clear undo/redo history when loading puzzle
        this.draw();
    },

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.autoSave();
        }, 2000);
    },

    /**
     * Auto-save current puzzle state
     */
    async autoSave() {
        if (!this.currentPuzzleId) return;

        try {
            const status = Validator.isSolved(this.currentGrid) ? 'completed' : 'in-progress';
            
            const updates = {
                currentGrid: this.currentGrid,
                notes: this.cellNotes,
                status: status,
                lastPlayed: new Date().toISOString()
            };
            
            // Include timer elapsed time if Play module has it
            if (typeof Play !== 'undefined' && Play.elapsedTime !== undefined) {
                updates.timeElapsed = Play.elapsedTime;
                console.log('Autosaving with timeElapsed:', Play.elapsedTime);
            } else {
                console.log('Play.elapsedTime not available during autosave');
            }
            
            await Storage.updatePuzzle(this.currentPuzzleId, updates);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    },

    /**
     * Get current grid state
     */
    getCurrentGrid() {
        return this.currentGrid.map(row => [...row]);
    },

    /**
     * Get original grid state
     */
    getOriginalGrid() {
        return this.originalGrid.map(row => [...row]);
    },

    /**
     * Save current state to undo history
     */
    saveToHistory(action) {
        this.undoStack.push(action);
        
        // Limit history size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    },

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) return;
        
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        
        if (action.type === 'cell') {
            // Restore cell value
            this.currentGrid[action.row][action.col] = action.oldValue;
            // Restore notes
            const index = Utils.getIndex(action.row, action.col);
            this.cellNotes[index] = action.oldNotes;
        } else if (action.type === 'notes') {
            // Restore notes
            this.cellNotes[action.index] = action.oldNotes;
        }
        
        this.scheduleAutoSave();
        this.draw();
        this.updateUndoRedoButtons();
    },

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) return;
        
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        
        if (action.type === 'cell') {
            // Restore cell value
            this.currentGrid[action.row][action.col] = action.newValue;
            // Clear notes if value was placed
            const index = Utils.getIndex(action.row, action.col);
            if (action.newValue !== 0) {
                this.cellNotes[index] = Array(10).fill(false);
            }
        } else if (action.type === 'notes') {
            // Toggle the note again
            this.cellNotes[action.index][action.toggledNumber] = !this.cellNotes[action.index][action.toggledNumber];
        }
        
        this.scheduleAutoSave();
        this.draw();
        this.updateUndoRedoButtons();
    },

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    },

    /**
     * Clear history (called when loading a new puzzle)
     */
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoButtons();
    },

    /**
     * Clear selected cell value and notes
     */
    clearSelectedCell() {
        if (this.selectedCell === null) {
            Utils.showMessage('Select a cell to clear', 'info', 2000);
            return;
        }
        
        const { row, col } = Utils.getRowCol(this.selectedCell);
        
        // Can't clear locked cells
        if (this.originalGrid[row][col] !== 0) {
            Utils.showMessage('Cannot clear a locked cell', 'info', 2000);
            return;
        }
        
        // Clear value and notes
        this.setCellValue(row, col, 0);
        this.clearCellNotes(this.selectedCell);
    }
};
