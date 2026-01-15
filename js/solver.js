/**
 * Sudoku solving algorithms
 */

const Solver = {
    /**
     * Solve the Sudoku puzzle using backtracking algorithm
     * @param {Array} grid - 9x9 grid array (will be modified)
     * @returns {boolean} True if solved successfully
     */
    solve(grid) {
        const emptyCell = this.findEmptyCell(grid);
        
        if (!emptyCell) {
            // No empty cells, puzzle is solved
            return true;
        }

        const [row, col] = emptyCell;

        // Try numbers 1-9
        for (let num = 1; num <= 9; num++) {
            if (Validator.isValidPlacement(grid, row, col, num)) {
                grid[row][col] = num;

                if (this.solve(grid)) {
                    return true;
                }

                // Backtrack
                grid[row][col] = 0;
            }
        }

        return false;
    },

    /**
     * Find the next empty cell in the grid
     * @param {Array} grid - 9x9 grid array
     * @returns {Array|null} [row, col] of empty cell or null if none
     */
    findEmptyCell(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
    },

    /**
     * Check if the puzzle has a unique solution
     * @param {Array} grid - 9x9 grid array
     * @returns {boolean} True if puzzle has exactly one solution
     */
    hasUniqueSolution(grid) {
        return this.countSolutions(grid, 2) === 1;
    },

    /**
     * Count the number of solutions (up to a maximum)
     * @param {Array} grid - 9x9 grid array
     * @param {number} maxCount - Maximum number of solutions to find (for early exit)
     * @returns {number} Number of solutions found (up to maxCount)
     */
    countSolutions(grid, maxCount = 2) {
        const gridCopy = Utils.copyGrid(grid);
        let solutionCount = 0;

        const count = (g) => {
            if (solutionCount >= maxCount) return; // Early exit

            const emptyCell = this.findEmptyCell(g);
            if (!emptyCell) {
                solutionCount++;
                return;
            }

            const [row, col] = emptyCell;

            for (let num = 1; num <= 9; num++) {
                if (Validator.isValidPlacement(g, row, col, num)) {
                    g[row][col] = num;
                    count(g);
                    g[row][col] = 0;

                    if (solutionCount >= maxCount) return;
                }
            }
        };

        count(gridCopy);
        return solutionCount;
    },

    /**
     * Check if the puzzle is solvable
     * @param {Array} grid - 9x9 grid array
     * @returns {boolean} True if solvable
     */
    isSolvable(grid) {
        // First check if current state is valid
        if (Validator.validateGrid(grid).length > 0) {
            return false;
        }

        // Try to solve a copy
        const gridCopy = Utils.copyGrid(grid);
        return this.solve(gridCopy);
    }
};
