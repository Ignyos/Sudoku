/**
 * Validation logic for Sudoku puzzles
 */

const Validator = {
    /**
     * Check if placing a number at position is valid
     * @param {Array} grid - 9x9 grid array
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @param {number} num - Number to place (1-9)
     * @returns {boolean} True if valid placement
     */
    isValidPlacement(grid, row, col, num) {
        // Check row
        for (let c = 0; c < 9; c++) {
            if (c !== col && grid[row][c] === num) {
                return false;
            }
        }

        // Check column
        for (let r = 0; r < 9; r++) {
            if (r !== row && grid[r][col] === num) {
                return false;
            }
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (r !== row && c !== col && grid[r][c] === num) {
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * Validate the entire grid for conflicts
     * @param {Array} grid - 9x9 grid array
     * @returns {Array} Array of invalid cell indices
     */
    validateGrid(grid) {
        const invalidCells = [];

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const num = grid[row][col];
                if (num !== 0) {
                    // Temporarily remove the number to check validity
                    grid[row][col] = 0;
                    const isValid = this.isValidPlacement(grid, row, col, num);
                    grid[row][col] = num;

                    if (!isValid) {
                        invalidCells.push(Utils.getIndex(row, col));
                    }
                }
            }
        }

        return invalidCells;
    },

    /**
     * Check if the grid has any empty cells
     * @param {Array} grid - 9x9 grid array
     * @returns {boolean} True if grid is complete
     */
    isComplete(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    },

    /**
     * Check if the grid is valid and complete
     * @param {Array} grid - 9x9 grid array
     * @returns {boolean} True if solved correctly
     */
    isSolved(grid) {
        if (!this.isComplete(grid)) {
            return false;
        }
        return this.validateGrid(grid).length === 0;
    },

    /**
     * Get all possible candidates for a cell
     * @param {Array} grid - 9x9 grid array
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @returns {Array} Array of valid numbers (1-9)
     */
    getCandidates(grid, row, col) {
        if (grid[row][col] !== 0) {
            return [];
        }

        const candidates = [];
        for (let num = 1; num <= 9; num++) {
            if (this.isValidPlacement(grid, row, col, num)) {
                candidates.push(num);
            }
        }
        return candidates;
    }
};
