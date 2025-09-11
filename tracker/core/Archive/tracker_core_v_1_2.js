/**
 * HCP Portfolio Tracker Core v1.2 - LESSONS LEARNED FROM v6.5.1 INTEGRATION
 * File: tracker_core_v1_2.js
 * Based on: v1.1 foundation + v6.5.1 surgical fixes learnings
 * Last Updated: 2025-09-01 03:00:00 UTC
 * 
 * NEW IN v1.2:
 * - FileHandler v1.5 data structure awareness (nested indicators)
 * - ThemeCalculator v2.9 integration patterns proven in v6.5.1
 * - Enhanced data editor integration helpers
 * - Improved step completion logic for momentum-aware workflow
 * - Better validation for 6-periods-back momentum calculations
 * - Scenario-aware state management
 * 
 * CORE FUNCTIONALITY THAT NEVER CHANGES:
 * - State management (save/load/export)
 * - Step navigation and validation  
 * - Basic UI updates
 * - LocalStorage persistence
 */

const TrackerCore = {
    version: '1.2',
    currentStep: 1,
    completedSteps: [],
    
    // ENHANCED state structure based on v6.5.1 integration learnings
    state: {
        philosophyAcknowledged: false,
        initializationData: null,
        monthlyData: null,
        dataQuality: {},
        manualOverrides: {},
        themeProbabilities: {},
        scenarioProbabilities: [],
        
        // Enhanced from v6.5.1 learnings
        lastDataGeneration: null,
        dataScenario: null,
        calculationResults: null,
        momentumValidation: {} // NEW: Track momentum calculation health
    },

    // Initialize the tracker - ENHANCED for proven integration patterns
    init: function() {
        this.loadState();
        this.navigateToStep(this.currentStep);
        this.setupEventListeners();
        console.log('TrackerCore v1.2 initialized with v6.5.1 integration patterns');
    },

    // ENHANCED navigation with v6.5.1 integration learnings
    navigateToStep: function(step) {
        if (step < 1 || step > 10) return false;
        
        if (!this.canNavigateToStep(step)) {
            console.warn(`Cannot navigate to step ${step} - validation failed`);
            this.showValidationError(step);
            return false;
        }

        this.currentStep = step;
        this.updateStepDisplay();
        this.updateStepIndicators();
        this.updateNavigation();
        this.saveState();
        
        // ENHANCED: Trigger step-specific actions based on v6.5.1 patterns
        this.onStepEntered(step);
        
        console.log(`Navigated to step ${step}`);
        return true;
    },

    // ENHANCED validation with FileHandler v1.5 structure awareness
    canNavigateToStep: function(step) {
        if (step === 1) return true;
        
        switch(step) {
            case 2:
                return this.state.philosophyAcknowledged;
            case 3:
                return this.state.monthlyData !== null && this.validateFileHandlerData();
            case 4:
                return this.state.themeProbabilities && 
                       this.validateThemeCalculations() &&
                       Object.keys(this.state.themeProbabilities).length === 4;
            default:
                // Must complete previous steps in order
                for (let i = 1; i < step; i++) {
                    if (!this.isStepComplete(i)) {
                        return false;
                    }
                }
                return true;
        }
    },

    // ENHANCED step completion with FileHandler v1.5 and ThemeCalculator v2.9 awareness
    isStepComplete: function(step) {
        switch(step) {
            case 1: 
                return this.state.philosophyAcknowledged;
            case 2: 
                return this.state.monthlyData !== null && this.validateFileHandlerData();
            case 3: 
                return this.state.themeProbabilities && 
                       this.validateThemeCalculations() &&
                       this.validateMomentumHealth();
            case 4:
                return this.state.scenarioProbabilities && 
                       this.state.scenarioProbabilities.length === 16 &&
                       this.validateScenarioDistribution();
            default: 
                return this.completedSteps.includes(step);
        }
    },

    // NEW: FileHandler v1.5 data structure validation based on v6.5.1 success
    validateFileHandlerData: function() {
        if (!this.state.monthlyData || !this.state.monthlyData.indicators) {
            console.warn('No monthly data or indicators found');
            return false;
        }
        
        const indicators = this.state.monthlyData.indicators;
        const requiredThemes = ['usd', 'innovation', 'pe', 'intl'];
        
        // Validate nested structure: indicators.usd.dxy, indicators.innovation.qqq_spy, etc.
        const valid = requiredThemes.every(theme => {
            const themeData = indicators[theme];
            if (!themeData || typeof themeData !== 'object') {
                console.warn(`Missing or invalid theme data for ${theme}`);
                return false;
            }
            
            // Check if theme has indicators with required properties
            const hasValidIndicators = Object.values(themeData).some(indicator => 
                indicator && 
                indicator.current !== null && 
                indicator.current !== undefined &&
                indicator.history && 
                Array.isArray(indicator.history) && 
                indicator.history.length >= 6
            );
            
            if (!hasValidIndicators) {
                console.warn(`Theme ${theme} has no valid indicators with sufficient history`);
                return false;
            }
            
            return true;
        });
        
        if (valid) {
            console.log('FileHandler v1.5 data structure validation: PASSED');
        }
        
        return valid;
    },

    // NEW: Theme calculation validation based on ThemeCalculator v2.9 success patterns
    validateThemeCalculations: function() {
        if (!this.state.themeProbabilities) return false;
        
        const themes = Object.keys(this.state.themeProbabilities);
        const requiredThemes = ['usd', 'ai', 'pe', 'intl'];
        
        // Validate all required themes present
        if (!requiredThemes.every(theme => themes.includes(theme))) {
            console.warn('Missing required themes in calculations');
            return false;
        }
        
        // Validate probability ranges (should NOT all be 50% - that indicates broken momentum)
        const probabilities = Object.values(this.state.themeProbabilities);
        const allNearFifty = probabilities.every(prob => Math.abs(prob - 0.5) < 0.05);
        
        if (allNearFifty) {
            console.warn('All theme probabilities near 50% - indicates momentum calculation failure');
            return false;
        }
        
        // Validate realistic ranges based on v6.5.1 success patterns
        const validRanges = probabilities.every(prob => 
            typeof prob === 'number' && prob >= 0.05 && prob <= 0.95
        );
        
        if (!validRanges) {
            console.warn('Theme probabilities outside valid ranges [5%, 95%]');
            return false;
        }
        
        console.log('Theme calculation validation: PASSED');
        return true;
    },

    // NEW: Momentum calculation health check based on v6.5.1 debugging patterns
    validateMomentumHealth: function() {
        if (!this.state.monthlyData || !this.state.monthlyData.indicators) {
            return false;
        }
        
        let healthyMomentumCount = 0;
        let totalIndicators = 0;
        
        // Check momentum health across all themes
        Object.entries(this.state.monthlyData.indicators).forEach(([theme, themeData]) => {
            Object.entries(themeData).forEach(([key, indicator]) => {
                totalIndicators++;
                
                if (indicator.history && indicator.history.length >= 6) {
                    const current = indicator.current;
                    const baseline = indicator.history[indicator.history.length - 6];
                    
                    // Healthy momentum: current != baseline (shows actual trend)
                    if (current !== baseline && baseline !== 0) {
                        const momentumPercent = Math.abs((current - baseline) / baseline);
                        
                        // Flag as healthy if momentum > 0.1% (shows real movement)
                        if (momentumPercent > 0.001) {
                            healthyMomentumCount++;
                        }
                    }
                }
            });
        });
        
        const healthRatio = healthyMomentumCount / totalIndicators;
        const isHealthy = healthRatio > 0.7; // At least 70% of indicators should show momentum
        
        this.state.momentumValidation = {
            healthyCount: healthyMomentumCount,
            totalCount: totalIndicators,
            healthRatio: healthRatio,
            isHealthy: isHealthy,
            timestamp: new Date().toISOString()
        };
        
        if (isHealthy) {
            console.log(`Momentum health: ${healthyMomentumCount}/${totalIndicators} indicators healthy (${(healthRatio*100).toFixed(1)}%)`);
        } else {
            console.warn(`Momentum health poor: only ${healthyMomentumCount}/${totalIndicators} indicators healthy (${(healthRatio*100).toFixed(1)}%)`);
        }
        
        return isHealthy;
    },

    // NEW: Scenario distribution validation
    validateScenarioDistribution: function() {
        if (!this.state.scenarioProbabilities || this.state.scenarioProbabilities.length !== 16) {
            return false;
        }
        
        // Validate probabilities sum to approximately 1.0
        const totalProb = this.state.scenarioProbabilities.reduce((sum, scenario) => sum + scenario.probability, 0);
        if (Math.abs(totalProb - 1.0) > 0.01) {
            console.warn(`Scenario probabilities sum to ${(totalProb*100).toFixed(1)}% instead of 100%`);
            return false;
        }
        
        // Validate realistic distribution (not all equal - that indicates calculation failure)
        const probabilities = this.state.scenarioProbabilities.map(s => s.probability);
        const maxProb = Math.max(...probabilities);
        const minProb = Math.min(...probabilities);
        const spread = maxProb - minProb;
        
        if (spread < 0.05) { // Less than 5% spread indicates uniform distribution = failure
            console.warn('Scenario probabilities too uniform - indicates calculation failure');
            return false;
        }
        
        console.log(`Scenario distribution: max=${(maxProb*100).toFixed(1)}%, min=${(minProb*100).toFixed(1)}%, spread=${(spread*100).toFixed(1)}%`);
        return true;
    },

    // ENHANCED step entry callbacks with v6.5.1 integration patterns
    onStepEntered: function(step) {
        switch(step) {
            case 2:
                this.onDataImportStep();
                break;
            case 3:
                this.onThemeAnalysisStep();
                break;
        }
    },

    // ENHANCED data import step handler with FileHandler v1.5 awareness
    onDataImportStep: function() {
        // Auto-validate FileHandler v1.5 structure if data exists
        if (this.state.monthlyData) {
            const isValid = this.validateFileHandlerData();
            if (isValid) {
                this.displayDataEditor();
            } else {
                console.warn('Monthly data failed FileHandler v1.5 validation');
            }
        }
    },

    // ENHANCED theme analysis step handler with ThemeCalculator v2.9 patterns
    onThemeAnalysisStep: function() {
        // Auto-calculate themes if data is valid but calculations are missing
        if (this.state.monthlyData && this.validateFileHandlerData() && !this.isStepComplete(3)) {
            console.log('Auto-triggering theme calculation...');
            this.triggerThemeCalculation();
        } else if (this.state.themeProbabilities && !this.validateThemeCalculations()) {
            console.warn('Existing theme calculations failed validation - may need recalculation');
        }
    },

    // ENHANCED data editor display integration with proper error handling
    displayDataEditor: function() {
        if (typeof DataEditor !== 'undefined' && this.state.monthlyData) {
            const container = document.getElementById('data-editor-section');
            if (container) {
                try {
                    container.style.display = 'block';
                    
                    // Mock indicators object for compatibility with DataEditor
                    const mockIndicators = { definitions: {} };
                    
                    DataEditor.displayDataTable(
                        this.state.monthlyData, 
                        mockIndicators, 
                        this.state.manualOverrides
                    );
                    
                    console.log('Data editor displayed successfully');
                } catch (error) {
                    console.error('Error displaying data editor:', error);
                }
            } else {
                console.warn('Data editor container not found - check HTML structure');
            }
        } else {
            console.warn('DataEditor module not loaded or no monthly data available');
        }
    },

    // ENHANCED theme calculation trigger with validation
    triggerThemeCalculation: function() {
        if (typeof ThemeCalculator !== 'undefined') {
            try {
                const analysis = ThemeCalculator.calculateThemeAnalysis(this.state.monthlyData);
                
                if (analysis && !analysis.error) {
                    this.state.themeProbabilities = analysis.themes;
                    this.state.calculationResults = analysis;
                    
                    // Validate the calculations
                    if (this.validateThemeCalculations() && this.validateMomentumHealth()) {
                        if (!this.completedSteps.includes(3)) {
                            this.completedSteps.push(3);
                        }
                        
                        this.updateStepIndicators();
                        this.saveState();
                        
                        console.log('Theme calculations completed and validated successfully');
                    } else {
                        console.error('Theme calculations failed validation - check momentum data');
                    }
                } else {
                    console.error('Theme calculation failed:', analysis.error);
                }
            } catch (error) {
                console.error('Error in theme calculation:', error);
            }
        } else {
            console.warn('ThemeCalculator module not loaded');
        }
    },

    // NEW: Enhanced data processing for FileHandler v1.5 integration
    processFileHandlerData: function(data, scenario) {
        if (!data || !data.indicators) {
            console.error('Invalid FileHandler data structure');
            return false;
        }
        
        // Store with enhanced metadata
        this.state.monthlyData = data;
        this.state.lastDataGeneration = new Date().toISOString();
        this.state.dataScenario = scenario || data.scenario || 'unknown';
        
        // Validate structure
        if (!this.validateFileHandlerData()) {
            console.error('FileHandler data failed validation');
            return false;
        }
        
        // Mark step 2 complete
        if (!this.completedSteps.includes(2)) {
            this.completedSteps.push(2);
        }
        
        // Auto-display data editor
        this.displayDataEditor();
        
        // Auto-trigger theme calculation
        this.triggerThemeCalculation();
        
        // Update UI
        this.updateStepIndicators();
        this.updateNavigation();
        this.saveState();
        
        console.log(`FileHandler v1.5 data processed successfully: scenario=${this.state.dataScenario}`);
        return true;
    },

    // ENHANCED state persistence with validation metadata
    saveState: function() {
        const stateToSave = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            timestamp: new Date().toISOString(),
            
            // Enhanced metadata from v6.5.1 learnings
            fileHandlerVersion: this.getModuleVersion('FileHandler'),
            themeCalculatorVersion: this.getModuleVersion('ThemeCalculator'),
            lastCalculation: this.state.calculationResults ? new Date().toISOString() : null,
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : false,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : false,
                momentumHealth: this.state.momentumValidation || null
            }
        };
        
        try {
            localStorage.setItem('hcp_tracker_core_v12_state', JSON.stringify(stateToSave));
            console.log(`TrackerCore v${this.version} state saved with validation metadata`);
        } catch (error) {
            console.error('Failed to save state:', error);
            this.handleStorageError(error);
        }
    },

    // ENHANCED state loading with validation
    loadState: function() {
        try {
            // Try new v1.2 key first, then fall back to v1.1
            let saved = localStorage.getItem('hcp_tracker_core_v12_state') || 
                       localStorage.getItem('hcp_tracker_core_state');
            
            if (saved) {
                const data = JSON.parse(saved);
                
                // Version migration if needed
                if (data.version !== this.version) {
                    console.log(`Migrating state from v${data.version} to v${this.version}`);
                    this.migrateState(data);
                }
                
                this.currentStep = data.currentStep || 1;
                this.completedSteps = data.completedSteps || [];
                this.state = { ...this.state, ...data.state };
                
                // Validate loaded state
                this.validateLoadedState();
                
                console.log('TrackerCore state loaded and validated successfully');
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    },

    // NEW: Validate loaded state for integrity
    validateLoadedState: function() {
        // Re-validate data if present
        if (this.state.monthlyData) {
            const fileHandlerValid = this.validateFileHandlerData();
            if (!fileHandlerValid) {
                console.warn('Loaded FileHandler data failed validation - may need regeneration');
            }
        }
        
        if (this.state.themeProbabilities) {
            const themeValid = this.validateThemeCalculations();
            if (!themeValid) {
                console.warn('Loaded theme calculations failed validation - may need recalculation');
            }
        }
    },

    // ENHANCED module version detection
    getModuleVersion: function(moduleName) {
        if (typeof window !== 'undefined' && window[moduleName]) {
            return window[moduleName].version || 'unknown';
        }
        return 'not_loaded';
    },

    // Enhanced debugging info
    getDebugInfo: function() {
        return {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            stateKeys: Object.keys(this.state),
            canNavigateNext: this.canNavigateToStep(this.currentStep + 1),
            
            // Enhanced debugging from v6.5.1 learnings
            moduleVersions: {
                fileHandler: this.getModuleVersion('FileHandler'),
                themeCalculator: this.getModuleVersion('ThemeCalculator'),
                dataEditor: this.getModuleVersion('DataEditor')
            },
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : null,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : null,
                momentumHealth: this.state.momentumValidation || null
            },
            dataScenario: this.state.dataScenario,
            lastDataGeneration: this.state.lastDataGeneration,
            timestamp: new Date().toISOString()
        };
    },

    // Rest of the methods remain the same as v1.1 (setupEventListeners, navigation helpers, etc.)
    // [Keeping the same implementation from v1.1 for brevity - the core functionality is stable]
    
    setupEventListeners: function() {
        // Same implementation as v1.1
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        
        const philosophyCheckbox = document.getElementById('philosophy-checkbox');
        if (philosophyCheckbox) {
            philosophyCheckbox.checked = this.state.philosophyAcknowledged;
            philosophyCheckbox.addEventListener('change', (e) => {
                this.state.philosophyAcknowledged = e.target.checked;
                if (e.target.checked && !this.completedSteps.includes(1)) {
                    this.completedSteps.push(1);
                }
                this.updateStepIndicators();
                this.updateNavigation();
                this.saveState();
            });
        }
        
        this.setupModalListeners();
        console.log('TrackerCore v1.2 event listeners setup complete');
    },

    updateStepDisplay: function() {
        // Same as v1.1 - core display logic is stable
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        const titles = [
            'Investment Philosophy', 'Data Import & Edit', 'Theme Analysis',
            'Scenario Analysis', 'Portfolio Optimization', 'Current Positions',
            'Rebalancing Trades', 'History', 'Report', 'Export'
        ];
        
        const titleEl = document.getElementById('step-title');
        if (titleEl) {
            titleEl.textContent = `Step ${this.currentStep}: ${titles[this.currentStep - 1]}`;
        }
    },

    updateStepIndicators: function() {
        // Same as v1.1 - UI logic is stable
        const progressContainer = document.getElementById('progress-bar') || document.querySelector('.progress-bar');
        if (!progressContainer) return;
        
        let html = '';
        const stepLabels = ['Philosophy', 'Data', 'Analysis', 'Scenarios', 'Optimize', 'Positions', 'Trades', 'History', 'Report', 'Export'];
        
        for (let i = 1; i <= 10; i++) {
            const isActive = i === this.currentStep;
            const isCompleted = this.isStepComplete(i);
            const canNavigate = this.canNavigateToStep(i);
            
            let classes = ['step-indicator'];
            if (isActive) classes.push('active');
            if (isCompleted) classes.push('completed');
            if (!canNavigate) classes.push('locked');
            
            html += `
                <div class="${classes.join(' ')}" onclick="TrackerCore.navigateToStep(${i})" data-step="${i}">
                    <div>Step ${i}</div>
                    <small>${stepLabels[i-1]}</small>
                </div>
            `;
        }
        
        progressContainer.innerHTML = html;
    },

    updateNavigation: function() {
        // Same as v1.1 - navigation logic is stable
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn) {
            prevBtn.disabled = (this.currentStep === 1);
        }
        
        if (nextBtn) {
            const canGoNext = this.canNavigateToStep(this.currentStep + 1);
            nextBtn.disabled = (this.currentStep === 10 || !canGoNext);
            
            if (this.currentStep === 10) {
                nextBtn.textContent = 'Complete';
            } else if (!canGoNext) {
                nextBtn.textContent = 'Complete Current Step';
            } else {
                nextBtn.textContent = 'Next →';
            }
        }
    },

    // Navigation helpers - same as v1.1
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

    // Other stable methods from v1.1...
    showValidationError: function(step) {
        const messages = {
            2: 'Please acknowledge the investment philosophy first',
            3: 'Please import or generate valid monthly data first',
            4: 'Please complete theme analysis calculations first'
        };
        
        const message = messages[step] || `Step ${step-1} must be completed first`;
        
        const errorContainer = document.getElementById('validation-error');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="alert alert-warning">${message}</div>`;
            setTimeout(() => errorContainer.innerHTML = '', 3000);
        } else {
            alert(message);
        }
    },

    migrateState: function(oldState) {
        // Handle migration from previous versions
        if (oldState.version === '1.0' || oldState.version === '1.1') {
            // Add new v1.2 state properties
            if (!oldState.state.momentumValidation) {
                oldState.state.momentumValidation = {};
            }
        }
    },

    handleStorageError: function(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded - clearing old data');
        }
    },

    setupModalListeners: function() {
        // Same as v1.1
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('edit-modal');
            if (event.target === modal && typeof DataEditor !== 'undefined') {
                DataEditor.closeEditModal();
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && typeof DataEditor !== 'undefined') {
                DataEditor.closeEditModal();
            }
        });
    },

    exportState: function() {
        // Enhanced export with v1.2 metadata
        const exportData = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            exportDate: new Date().toISOString(),
            
            moduleVersions: {
                fileHandler: this.getModuleVersion('FileHandler'),
                themeCalculator: this.getModuleVersion('ThemeCalculator'),
                dataEditor: this.getModuleVersion('DataEditor')
            },
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : false,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : false,
                momentumHealth: this.state.momentumValidation || null
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hcp_tracker_core_v${this.version}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('TrackerCore v1.2 state exported successfully');
    },

    reset: function() {
        // Enhanced reset
        this.currentStep = 1;
        this.completedSteps = [];
        this.state = {
            philosophyAcknowledged: false,
            initializationData: null,
            monthlyData: null,
            dataQuality: {},
            manualOverrides: {},
            themeProbabilities: {},
            scenarioProbabilities: [],
            lastDataGeneration: null,
            dataScenario: null,
            calculationResults: null,
            momentumValidation: {}
        };
        
        // Clear all related localStorage keys
        localStorage.removeItem('hcp_tracker_core_v12_state');
        localStorage.removeItem('hcp_tracker_core_state');
        localStorage.removeItem('hcp-tracker-v650-state');
        
        this.navigateToStep(1);
        console.log('TrackerCore v1.2 reset to initial state');
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TrackerCore.init();
        });
    } else {
        TrackerCore.init();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackerCore;
}

// Global assignment for browser use
if (typeof window !== 'undefined') {
    window.TrackerCore = TrackerCore;
}