/**
 * Statistics page logic
 */

const Stats = {
    /**
     * Initialize the statistics page
     */
    async init() {
        try {
            // Initialize IndexedDB
            await Storage.init();
            
            // Load and display statistics
            await this.loadStatistics();
            
            console.log('Statistics page initialized');
        } catch (error) {
            console.error('Failed to initialize statistics page:', error);
            Utils.showMessage('Failed to load statistics', 'error');
        }
    },

    /**
     * Load and calculate statistics
     */
    async loadStatistics() {
        const puzzles = await Storage.getAllPuzzles();
        
        // Overall stats
        const total = puzzles.length;
        const completed = puzzles.filter(p => p.isCompleted).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Average solve time (only completed puzzles with time data)
        const completedWithTime = puzzles.filter(p => p.isCompleted && p.timeElapsed);
        const avgTime = completedWithTime.length > 0
            ? Math.round(completedWithTime.reduce((sum, p) => sum + p.timeElapsed, 0) / completedWithTime.length)
            : 0;
        
        // Display overall stats
        document.getElementById('totalPuzzles').textContent = total;
        document.getElementById('completedPuzzles').textContent = completed;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        document.getElementById('averageTime').textContent = this.formatTime(avgTime);
        
        // By difficulty
        const difficulties = ['beginner', 'easy', 'medium', 'hard', 'expert', 'master'];
        const difficultyContainer = document.getElementById('difficultyStats');
        difficultyContainer.innerHTML = '';
        
        difficulties.forEach(diff => {
            const diffPuzzles = puzzles.filter(p => p.difficulty === diff);
            const diffCompleted = diffPuzzles.filter(p => p.isCompleted).length;
            const diffRate = diffPuzzles.length > 0 
                ? Math.round((diffCompleted / diffPuzzles.length) * 100)
                : 0;
            
            const diffStats = `
                <div class="difficulty-stat-row">
                    <div class="difficulty-stat-name">
                        <span class="difficulty-badge ${diff}">${diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                    </div>
                    <div class="difficulty-stat-values">
                        <span>${diffCompleted}/${diffPuzzles.length}</span>
                        <span class="stat-rate">${diffRate}%</span>
                    </div>
                </div>
            `;
            difficultyContainer.innerHTML += diffStats;
        });
        
        // Solve method
        const manualSolves = puzzles.filter(p => p.isCompleted && p.solvedBy === 'manual').length;
        const autoSolves = puzzles.filter(p => p.isCompleted && p.solvedBy === 'auto-solve').length;
        
        document.getElementById('manualSolves').textContent = manualSolves;
        document.getElementById('autoSolves').textContent = autoSolves;
    },

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        if (!seconds || seconds === 0) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Stats.init();
});
