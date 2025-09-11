/**
 * HCP Portfolio Tracker Core v1.0
 * File: tracker_core.js
 * Extracted from: v6.3.1 (working navigation and state management)
 * Last Updated: 2025-08-29 18:00:00 UTC
 * 
 * CORE FUNCTIONALITY THAT NEVER CHANGES:
 * - State management (save/load/export)
 * - Step navigation and validation
 * - Basic UI updates
 * - LocalStorage persistence
 */

const TrackerCore = {
    version: '1.0',
    currentStep: 1,
    completedSteps: [],
    
    // Core state structure - NEVER modify this
    state: {
        philosophyAcknowledged: false,
        initializationData: null,
        monthlyData: null,
        dataQuality: {},
        manualOverrides: {},
        themeProbabilities: {},
        scenarioProbabilities: []
    },

    // Initialize the tracker - STABLE
    init: function() {
        this.loadState();
        this.navigateToStep(this.currentStep);
        this.setupEventListeners();
        console.log('Tracker Core v1.0 initialized');
    },

    // Navigate to specific step - WORKING from v6.3.1
    navigateToStep: function(step) {
        if (step < 1 || step > 10) return false;
        
        if (!this.canNavigateToStep(step)) {
            console.warn(`Cannot navigate to step ${step} - validation failed`);
            return false;
        }

        this.currentStep = step;
        this.updateStepDisplay();
        this.updateStepIndicators();
        this.updateNavigation();
        this.saveState();
        
        console.log(`Navigated to step ${step}`);
        return true;
    },

    // Check if can navigate to step - WORKING from v6.3.1
    canNavigateToStep: function(step) {
        if (step === 1) return true;
        
        // Must complete previous steps in order
        for (let i = 1; i < step; i++) {
            if (!this.isStepComplete(i)) {
                return false;
            }
        }
        return true;
    },

    // Check if step is complete - WORKING from v6.3.1
    isStepComplete: function(step) {
        switch(step) {
            case 1: 
                return this.state.philosophyAcknowledged;
            case 2: 
                return this.state.monthlyData !== null;
            case 3: 
                return Object.keys(this.state.themeProbabilities).length > 0;
            default: 
                return this.completedSteps.includes(step);
        }
    },

    // Update step display - WORKING from v6.3.1
    updateStepDisplay: function() {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show current step
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        // Update title
        const titles = [
            'Investment Philosophy',
            'Data Import & Edit', 
            'Theme Analysis',
            'Scenario Analysis',
            'Portfolio Optimization',
            'Current Positions',
            'Rebalancing Trades',
            'History',
            'Report',
            'Export'
        ];
        
        const titleEl = document.getElementById('step-title');
        if (titleEl) {
            titleEl.textContent = `Step ${this.currentStep}: ${titles[this.currentStep - 1]}`;
        }
    },

    // Update step indicators - WORKING from v6.3.1  
    updateStepIndicators: function() {
        document.querySelectorAll('.step-indicator').forEach((el, index) => {
            const step = index + 1;
            el.classList.remove('active', 'completed', 'locked');
            
            if (step === this.currentStep) {
                el.classList.add('active');
            } else if (this.isStepComplete(step)) {
                el.classList.add('completed');
            } else if (!this.canNavigateToStep(step)) {
                el.classList.add('locked');
            }
        });
    },

    // Update navigation buttons - WORKING from v6.3.1
    updateNavigation: function() {
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn) prevBtn.disabled = (this.currentStep === 1);
        if (nextBtn) nextBtn.disabled = (this.currentStep === 10 || !this.canNavigateToStep(this.currentStep + 1));
    },

    // Navigation helpers - WORKING from v6.3.1
    prevStep: function() {
        if (this.currentStep > 1) {
            this.navigateToStep(this.currentStep - 1);
        }
    },

    nextStep: function() {
        if (this.currentStep < 10 && this.canNavigateToStep(this.currentStep + 1)) {
            this.navigateToStep(this.currentStep + 1);
        }
    },

    // State persistence - STABLE
    saveState: function() {
        const stateToSave = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('hcp_tracker_state', JSON.stringify(stateToSave));
            console.log('State saved to localStorage');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    },

    // Load state - STABLE
    loadState: function() {
        try {
            const saved = localStorage.getItem('hcp_tracker_state');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentStep = data.currentStep || 1;
                this.completedSteps = data.completedSteps || [];
                this.state = { ...this.state, ...data.state };
                console.log('State loaded from localStorage');
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    },

    // Export state - STABLE  
    exportState: function() {
        const exportData = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hcp_tracker_state_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('State exported');
    },

    // Setup event listeners - STABLE
    setupEventListeners: function() {
        // Navigation buttons
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        
        // Step indicators (clickable navigation)
        document.querySelectorAll('.step-indicator').forEach((el, index) => {
            el.addEventListener('click', () => {
                const step = index + 1;
                if (this.canNavigateToStep(step)) {
                    this.navigateToStep(step);
                }
            });
        });
        
        console.log('Event listeners setup complete');
    },

    // Clear all data - UTILITY
    reset: function() {
        this.currentStep = 1;
        this.completedSteps = [];
        this.state = {
            philosophyAcknowledged: false,
            initializationData: null,
            monthlyData: null,
            dataQuality: {},
            manualOverrides: {},
            themeProbabilities: {},
            scenarioProbabilities: []
        };
        localStorage.removeItem('hcp_tracker_state');
        this.navigateToStep(1);
        console.log('Tracker reset to initial state');
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TrackerCore.init());
    } else {
        TrackerCore.init();
    }
}