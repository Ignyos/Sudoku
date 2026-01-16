/**
 * Sudoku puzzle generation
 */

const Generator = {
    /**
     * Generate a new Sudoku puzzle
     * @param {string} difficulty - "easy", "medium", "hard", or "expert"
     * @returns {Array} 9x9 grid with puzzle
     */
    generate(difficulty = 'medium') {
        const maxAttempts = 10;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate a complete solved grid
            const solvedGrid = this.generateSolvedGrid();
            
            // Remove numbers based on difficulty
            const puzzle = this.removeNumbers(solvedGrid, difficulty);
            
            // Verify it has a unique solution
            if (Solver.hasUniqueSolution(puzzle)) {
                return puzzle;
            }
        }
        
        // Fallback: return a puzzle even if we couldn't verify uniqueness
        console.warn('Could not generate puzzle with verified unique solution');
        const solvedGrid = this.generateSolvedGrid();
        return this.removeNumbers(solvedGrid, difficulty);
    },

    /**
     * Generate a complete solved Sudoku grid
     * @returns {Array} 9x9 solved grid
     */
    generateSolvedGrid() {
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        
        // Fill diagonal 3x3 boxes first (they don't depend on each other)
        this.fillDiagonalBoxes(grid);
        
        // Fill remaining cells
        Solver.solve(grid);
        
        return grid;
    },

    /**
     * Fill the three diagonal 3x3 boxes
     * @param {Array} grid - 9x9 grid to fill
     */
    fillDiagonalBoxes(grid) {
        for (let box = 0; box < 3; box++) {
            this.fillBox(grid, box * 3, box * 3);
        }
    },

    /**
     * Fill a 3x3 box with random numbers
     * @param {Array} grid - 9x9 grid
     * @param {number} startRow - Starting row of the box
     * @param {number} startCol - Starting column of the box
     */
    fillBox(grid, startRow, startCol) {
        const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let idx = 0;
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                grid[startRow + row][startCol + col] = numbers[idx++];
            }
        }
    },

    /**
     * Remove numbers from solved grid to create puzzle
     * @param {Array} solvedGrid - Complete solved grid
     * @param {string} difficulty - Difficulty level
     * @returns {Array} Puzzle grid with removed numbers
     */
    removeNumbers(solvedGrid, difficulty) {
        const puzzle = Utils.copyGrid(solvedGrid);
        
        // Determine how many cells to remove based on difficulty
        const cluesCount = this.getCluesCount(difficulty);
        const cellsToRemove = 81 - cluesCount;
        
        // Create array of all cell positions
        const positions = [];
        for (let i = 0; i < 81; i++) {
            positions.push(i);
        }
        this.shuffle(positions);
        
        // Remove numbers
        let removed = 0;
        for (const pos of positions) {
            if (removed >= cellsToRemove) break;
            
            const { row, col } = Utils.getRowCol(pos);
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;
            
            // For harder difficulties, verify uniqueness more strictly
            if (difficulty === 'hard' || difficulty === 'expert') {
                const testGrid = Utils.copyGrid(puzzle);
                if (!this.hasUniqueSolutionFast(testGrid)) {
                    // Restore the number if removing it creates multiple solutions
                    puzzle[row][col] = backup;
                    continue;
                }
            }
            
            removed++;
        }
        
        return puzzle;
    },

    /**
     * Fast check for unique solution (limited depth)
     * @param {Array} grid - Puzzle grid
     * @returns {boolean} True if appears to have unique solution
     */
    hasUniqueSolutionFast(grid) {
        let solutionCount = 0;
        
        const countSolutions = (g) => {
            if (solutionCount > 1) return;
            
            const emptyCell = Solver.findEmptyCell(g);
            if (!emptyCell) {
                solutionCount++;
                return;
            }
            
            const [row, col] = emptyCell;
            
            // Randomize order to find different solutions faster
            const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            
            for (const num of numbers) {
                if (Validator.isValidPlacement(g, row, col, num)) {
                    g[row][col] = num;
                    countSolutions(g);
                    g[row][col] = 0;
                    
                    if (solutionCount > 1) return;
                }
            }
        };
        
        const gridCopy = Utils.copyGrid(grid);
        countSolutions(gridCopy);
        return solutionCount === 1;
    },

    /**
     * Get number of clues based on difficulty
     * @param {string} difficulty - Difficulty level
     * @returns {number} Number of clues to leave
     */
    getCluesCount(difficulty) {
        switch (difficulty) {
            case 'beginner':
                return 46 + Math.floor(Math.random() * 5); // 46-50
            case 'easy':
                return 40 + Math.floor(Math.random() * 5); // 40-44
            case 'medium':
                return 32 + Math.floor(Math.random() * 6); // 32-37
            case 'hard':
                return 28 + Math.floor(Math.random() * 4); // 28-31
            case 'expert':
                return 22 + Math.floor(Math.random() * 5); // 22-26
            case 'master':
                return 18 + Math.floor(Math.random() * 4); // 18-21
            default:
                return 35;
        }
    },

    /**
     * Shuffle array in place (Fisher-Yates)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    /**
     * Generate hash for a puzzle grid
     * @param {Array} grid - 9x9 grid
     * @returns {string} Hash string
     */
    hashGrid(grid) {
        // Simple hash: just concatenate all numbers
        return grid.flat().join('');
    }
};
