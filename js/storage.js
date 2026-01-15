/**
 * IndexedDB storage for puzzles
 */

const Storage = {
    dbName: 'ignyos.sudoku',
    dbVersion: 1,
    storeName: 'puzzles',
    db: null,

    /**
     * Initialize IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create puzzles store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Create indexes
                    objectStore.createIndex('hash', 'hash', { unique: true });
                    objectStore.createIndex('difficulty', 'difficulty', { unique: false });
                    objectStore.createIndex('status', 'status', { unique: false });
                    objectStore.createIndex('dateCreated', 'dateCreated', { unique: false });
                    objectStore.createIndex('dateModified', 'dateModified', { unique: false });
                }
            };
        });
    },

    /**
     * Save a puzzle to IndexedDB
     * @param {Object} puzzleData - Puzzle data object
     * @returns {Promise<number>} Puzzle ID
     */
    async savePuzzle(puzzleData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);

            // Add timestamps
            const now = Date.now();
            puzzleData.dateModified = now;
            if (!puzzleData.dateCreated) {
                puzzleData.dateCreated = now;
            }

            const request = puzzleData.id
                ? objectStore.put(puzzleData)
                : objectStore.add(puzzleData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Check if a puzzle hash already exists
     * @param {string} hash - Puzzle hash
     * @returns {Promise<boolean>}
     */
    async hashExists(hash) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('hash');
            const request = index.get(hash);

            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get puzzle by ID
     * @param {number} id - Puzzle ID
     * @returns {Promise<Object|null>}
     */
    async getPuzzle(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get puzzle by hash
     * @param {string} hash - Puzzle hash
     * @returns {Promise<Object|null>}
     */
    async getPuzzleByHash(hash) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('hash');
            const request = index.get(hash);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all puzzles with optional filters
     * @param {Object} filters - Optional filters (status, difficulty)
     * @returns {Promise<Array>}
     */
    async getAllPuzzles(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                let results = request.result;

                // Apply filters
                if (filters.status) {
                    results = results.filter(p => p.status === filters.status);
                }
                if (filters.difficulty) {
                    results = results.filter(p => p.difficulty === filters.difficulty);
                }

                // Sort by date modified (newest first)
                results.sort((a, b) => b.dateModified - a.dateModified);

                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get the most recent in-progress puzzle
     * @returns {Promise<Object|null>}
     */
    async getMostRecentPuzzle() {
        const puzzles = await this.getAllPuzzles({ status: 'in-progress' });
        return puzzles.length > 0 ? puzzles[0] : null;
    },

    /**
     * Delete a puzzle
     * @param {number} id - Puzzle ID
     * @returns {Promise<void>}
     */
    async deletePuzzle(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Generate and save a new puzzle with duplicate checking
     * @param {string} difficulty - Difficulty level
     * @returns {Promise<Object>} Saved puzzle data
     */
    async generateAndSavePuzzle(difficulty) {
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate puzzle
            const originalGrid = Generator.generate(difficulty);
            const hash = Generator.hashGrid(originalGrid);

            // Check if this puzzle already exists
            const exists = await this.hashExists(hash);

            if (!exists) {
                // Save the new puzzle
                const puzzleData = {
                    hash: hash,
                    difficulty: difficulty,
                    originalGrid: originalGrid,
                    currentGrid: Utils.copyGrid(originalGrid),
                    notes: Array(81).fill(0).map(() => Array(10).fill(false)),
                    status: 'in-progress',
                    timeSpent: 0
                };

                const id = await this.savePuzzle(puzzleData);
                puzzleData.id = id;

                return puzzleData;
            }

            console.log(`Duplicate puzzle detected (attempt ${attempt + 1}), regenerating...`);
        }

        throw new Error('Failed to generate unique puzzle after maximum attempts');
    },

    /**
     * Update current puzzle state (for auto-save)
     * @param {number} id - Puzzle ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<void>}
     */
    async updatePuzzle(id, updates) {
        const puzzle = await this.getPuzzle(id);
        if (!puzzle) {
            throw new Error('Puzzle not found');
        }

        // Merge updates
        Object.assign(puzzle, updates);

        await this.savePuzzle(puzzle);
    }
};
