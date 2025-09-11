/**
 * HCP Portfolio Tracker Core v1.3 - IPS v4.4 Alignment Update
 * File: tracker_core_v1_3.js
 * Last Updated: 2025-09-11T07:00:00Z
 * 
 * CHANGES IN v1.3:
 * - Fixed theme names to match IPS v4.4: ['usd', 'innovation', 'valuation', 'usLeadership']
 * - Updated FileHandler version references (v5.0+ not v1.5)
 * - Added support for tic_foreign_demand indicator (replaces real_rate_differential)
 * - Enhanced validation for transformed values from Data Collector v6.2.1
 * 
 * PRESERVED FROM v1.2:
 * - All validation logic and momentum health checks
 * - State management and step navigation
 * - Data editor integration patterns
 * - LocalStorage persistence
 */

const TrackerCore = {
    version: '1.3',
    currentStep: 1,
    completedSteps: [],
    
    // State structure aligned with IPS v4.4
    state: {
        philosophyAcknowledged: false,
        initializationData: null,
        monthlyData: null,
        dataQuality: {},
        manualOverrides: {},
        themeProbabilities: {},
        scenarioProbabilities: [],
        
        // Enhanced tracking
        lastDataGeneration: null,
        dataScenario: null,
        calculationResults: null,
        momentumValidation: {},
        transformationMetadata: {} // NEW: Track which indicators have transformations
    },

    // Initialize the tracker
    init: function() {
        this.loadState();
        this.navigateToStep(this.currentStep);
        this.setupEventListeners();
        console.log('TrackerCore v1.3 initialized with IPS v4.4 alignment');
    },

    // Navigation with validation
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
        
        // Trigger step-specific actions
        this.onStepEntered(step);
        
        console.log(`Navigated to step ${step}`);
        return true;
    },

    // Validation with FileHandler v5.0+ structure awareness
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

    // Step completion with FileHandler v5.0+ and ThemeCalculator awareness
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
                       this.state.scenarioProbabilities.length === 81 && // IPS v4.4: 81 scenarios
                       this.validateScenarioDistribution();
            default: 
                return this.completedSteps.includes(step);
        }
    },

    // FileHandler v5.0+ data structure validation - UPDATED FOR IPS v4.4
    validateFileHandlerData: function() {
        if (!this.state.monthlyData || !this.state.monthlyData.indicators) {
            console.warn('No monthly data or indicators found');
            return false;
        }
        
        const indicators = this.state.monthlyData.indicators;
        // FIXED: Use correct IPS v4.4 theme names
        const requiredThemes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        
        // Check for nested structure or flat structure
        let hasNestedStructure = false;
        let hasFlatStructure = false;
        
        // Check nested: indicators.usd.dxy_index, etc.
        hasNestedStructure = requiredThemes.every(theme => {
            return indicators[theme] && typeof indicators[theme] === 'object';
        });
        
        // Check flat: indicators.dxy_index, indicators.tic_foreign_demand, etc.
        const flatIndicators = [
            'dxy_index', 'tic_foreign_demand', 'cofer_usd', // USD theme
            'qqq_spy_ratio', 'productivity_growth', 'software_ip_investment', // Innovation
            'put_call_ratio', 'trailing_pe', 'cape_rate_of_change', // Valuation
            'spy_efa_momentum', 'us_market_pct', 'total_return_differential' // US Leadership
        ];
        
        hasFlatStructure = flatIndicators.some(ind => indicators[ind]);
        
        if (!hasNestedStructure && !hasFlatStructure) {
            console.warn('Neither nested nor flat indicator structure found');
            return false;
        }
        
        // Validate indicators have required properties
        const validateIndicator = (indicator) => {
            if (!indicator) return false;
            
            // Check for transformed values (from Data Collector v6.2.1)
            const hasTransformed = indicator.current_transformed !== undefined;
            const hasRaw = indicator.current_value !== undefined || indicator.value !== undefined;
            
            // Must have either transformed or raw current value
            if (!hasTransformed && !hasRaw) {
                return false;
            }
            
            // Check for history (either transformed or raw)
            const hasTransformedHistory = indicator.transformed_values && 
                                         Array.isArray(indicator.transformed_values) && 
                                         indicator.transformed_values.length >= 6;
            
            const hasRawHistory = (indicator.monthly_history || indicator.quarterly_history || indicator.history) &&
                                 Array.isArray(indicator.monthly_history || indicator.quarterly_history || indicator.history) &&
                                 (indicator.monthly_history || indicator.quarterly_history || indicator.history).length >= 6;
            
            return hasTransformedHistory || hasRawHistory;
        };
        
        // Validate based on structure type
        let validCount = 0;
        let totalCount = 0;
        
        if (hasNestedStructure) {
            requiredThemes.forEach(theme => {
                const themeData = indicators[theme];
                if (themeData) {
                    Object.values(themeData).forEach(indicator => {
                        totalCount++;
                        if (validateIndicator(indicator)) {
                            validCount++;
                            
                            // Track if this indicator has transformations
                            if (indicator.current_transformed !== undefined) {
                                this.state.transformationMetadata[theme] = 
                                    this.state.transformationMetadata[theme] || {};
                                this.state.transformationMetadata[theme].hasTransformed = true;
                            }
                        }
                    });
                }
            });
        } else {
            flatIndicators.forEach(key => {
                if (indicators[key]) {
                    totalCount++;
                    if (validateIndicator(indicators[key])) {
                        validCount++;
                        
                        // Track transformation
                        if (indicators[key].current_transformed !== undefined) {
                            this.state.transformationMetadata[key] = true;
                        }
                    }
                }
            });
        }
        
        const isValid = validCount >= 8; // Need at least 8 valid indicators
        
        if (isValid) {
            console.log(`FileHandler v5.0+ data validation: PASSED (${validCount}/${totalCount} indicators valid)`);
        } else {
            console.warn(`FileHandler v5.0+ data validation: FAILED (only ${validCount}/${totalCount} indicators valid)`);
        }
        
        return isValid;
    },

    // Theme calculation validation - UPDATED FOR IPS v4.4
    validateThemeCalculations: function() {
        if (!this.state.themeProbabilities) return false;
        
        const themes = Object.keys(this.state.themeProbabilities);
        // FIXED: Use correct IPS v4.4 theme names
        const requiredThemes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        
        // Validate all required themes present
        if (!requiredThemes.every(theme => themes.includes(theme))) {
            console.warn('Missing required themes in calculations:', 
                requiredThemes.filter(t => !themes.includes(t)));
            return false;
        }
        
        // Validate probability ranges (should NOT all be 50% - that indicates broken momentum)
        const probabilities = Object.values(this.state.themeProbabilities);
        const allNearFifty = probabilities.every(prob => Math.abs(prob - 0.5) < 0.05);
        
        if (allNearFifty) {
            console.warn('All theme probabilities near 50% - indicates momentum calculation failure');
            return false;
        }
        
        // Validate realistic ranges
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

    // Momentum calculation health check
    validateMomentumHealth: function() {
        if (!this.state.monthlyData || !this.state.monthlyData.indicators) {
            return false;
        }
        
        let healthyMomentumCount = 0;
        let totalIndicators = 0;
        let transformedCount = 0;
        
        const checkIndicator = (indicator, key) => {
            totalIndicators++;
            
            // Prefer transformed values if available
            if (indicator.transformed_values && indicator.transformed_values.length >= 6) {
                transformedCount++;
                const current = indicator.current_transformed;
                const baseline = indicator.transformed_values[indicator.transformed_values.length - 6];
                
                if (current !== baseline && baseline !== 0) {
                    const momentumPercent = Math.abs((current - baseline) / baseline);
                    if (momentumPercent > 0.001) {
                        healthyMomentumCount++;
                    }
                }
            } else {
                // Fall back to raw history
                const history = indicator.monthly_history || indicator.quarterly_history || indicator.history;
                const current = indicator.current_value || indicator.value;
                
                if (history && history.length >= 6 && current !== undefined) {
                    const baseline = history[history.length - 6];
                    
                    if (current !== baseline && baseline !== 0) {
                        const momentumPercent = Math.abs((current - baseline) / baseline);
                        if (momentumPercent > 0.001) {
                            healthyMomentumCount++;
                        }
                    }
                }
            }
        };
        
        // Check all indicators regardless of structure
        const indicators = this.state.monthlyData.indicators;
        
        // Check nested structure
        ['usd', 'innovation', 'valuation', 'usLeadership'].forEach(theme => {
            if (indicators[theme] && typeof indicators[theme] === 'object') {
                Object.entries(indicators[theme]).forEach(([key, indicator]) => {
                    checkIndicator(indicator, key);
                });
            }
        });
        
        // Check flat structure
        Object.entries(indicators).forEach(([key, indicator]) => {
            if (indicator && typeof indicator === 'object' && 
                (indicator.current_value !== undefined || indicator.current_transformed !== undefined)) {
                checkIndicator(indicator, key);
            }
        });
        
        const healthRatio = totalIndicators > 0 ? healthyMomentumCount / totalIndicators : 0;
        const isHealthy = healthRatio > 0.7; // At least 70% of indicators should show momentum
        
        this.state.momentumValidation = {
            healthyCount: healthyMomentumCount,
            totalCount: totalIndicators,
            transformedCount: transformedCount,
            healthRatio: healthRatio,
            isHealthy: isHealthy,
            timestamp: new Date().toISOString()
        };
        
        if (isHealthy) {
            console.log(`Momentum health: ${healthyMomentumCount}/${totalIndicators} indicators healthy (${(healthRatio*100).toFixed(1)}%)`);
            if (transformedCount > 0) {
                console.log(`Using ${transformedCount} transformed indicators`);
            }
        } else {
            console.warn(`Momentum health poor: only ${healthyMomentumCount}/${totalIndicators} indicators healthy (${(healthRatio*100).toFixed(1)}%)`);
        }
        
        return isHealthy;
    },

    // Scenario distribution validation - UPDATED FOR 81 SCENARIOS
    validateScenarioDistribution: function() {
        if (!this.state.scenarioProbabilities || this.state.scenarioProbabilities.length !== 81) {
            console.warn(`Expected 81 scenarios, got ${this.state.scenarioProbabilities ? this.state.scenarioProbabilities.length : 0}`);
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
        
        if (spread < 0.01) { // Less than 1% spread indicates uniform distribution = failure
            console.warn('Scenario probabilities too uniform - indicates calculation failure');
            return false;
        }
        
        console.log(`Scenario distribution (81 scenarios): max=${(maxProb*100).toFixed(1)}%, min=${(minProb*100).toFixed(3)}%, spread=${(spread*100).toFixed(1)}%`);
        return true;
    },

    // Step entry callbacks
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

    // Data import step handler with FileHandler v5.0+ awareness
    onDataImportStep: function() {
        // Auto-validate FileHandler v5.0+ structure if data exists
        if (this.state.monthlyData) {
            const isValid = this.validateFileHandlerData();
            if (isValid) {
                this.displayDataEditor();
            } else {
                console.warn('Monthly data failed FileHandler v5.0+ validation');
            }
        }
    },

    // Theme analysis step handler
    onThemeAnalysisStep: function() {
        // Auto-calculate themes if data is valid but calculations are missing
        if (this.state.monthlyData && this.validateFileHandlerData() && !this.isStepComplete(3)) {
            console.log('Auto-triggering theme calculation...');
            this.triggerThemeCalculation();
        } else if (this.state.themeProbabilities && !this.validateThemeCalculations()) {
            console.warn('Existing theme calculations failed validation - may need recalculation');
        }
    },

    // Data editor display integration
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

    // Theme calculation trigger with validation
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

    // Process FileHandler v5.0+ data
    processFileHandlerData: function(data, scenario) {
        if (!data || !data.indicators) {
            console.error('Invalid FileHandler data structure');
            return false;
        }
        
        // Store with enhanced metadata
        this.state.monthlyData = data;
        this.state.lastDataGeneration = new Date().toISOString();
        this.state.dataScenario = scenario || data.scenario || 'unknown';
        
        // Check for transformation metadata
        if (data.metadata && data.metadata.has_transformations) {
            console.log('Data includes IPS v4.4 signal transformations');
            this.state.transformationMetadata = data.metadata.transformations || {};
        }
        
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
        
        console.log(`FileHandler v5.0+ data processed successfully: scenario=${this.state.dataScenario}`);
        return true;
    },

    // State persistence with validation metadata
    saveState: function() {
        const stateToSave = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            timestamp: new Date().toISOString(),
            
            // Module version tracking
            fileHandlerVersion: this.getModuleVersion('FileHandler'),
            themeCalculatorVersion: this.getModuleVersion('ThemeCalculator'),
            lastCalculation: this.state.calculationResults ? new Date().toISOString() : null,
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : false,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : false,
                momentumHealth: this.state.momentumValidation || null,
                hasTransformations: Object.keys(this.state.transformationMetadata).length > 0
            }
        };
        
        try {
            localStorage.setItem('hcp_tracker_core_v13_state', JSON.stringify(stateToSave));
            console.log(`TrackerCore v${this.version} state saved with validation metadata`);
        } catch (error) {
            console.error('Failed to save state:', error);
            this.handleStorageError(error);
        }
    },

    // State loading with validation
    loadState: function() {
        try {
            // Try v1.3 key first, then fall back to older versions
            let saved = localStorage.getItem('hcp_tracker_core_v13_state') || 
                       localStorage.getItem('hcp_tracker_core_v12_state') ||
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
                
                // Initialize new fields if missing
                if (!this.state.transformationMetadata) {
                    this.state.transformationMetadata = {};
                }
                
                // Validate loaded state
                this.validateLoadedState();
                
                console.log('TrackerCore state loaded and validated successfully');
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    },

    // Validate loaded state for integrity
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

    // Module version detection
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
            
            // Module tracking
            moduleVersions: {
                fileHandler: this.getModuleVersion('FileHandler'),
                adaptiveFileHandler: this.getModuleVersion('AdaptiveFileHandler'),
                themeCalculator: this.getModuleVersion('ThemeCalculator'),
                dataEditor: this.getModuleVersion('DataEditor')
            },
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : null,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : null,
                momentumHealth: this.state.momentumValidation || null,
                hasTransformations: Object.keys(this.state.transformationMetadata).length > 0
            },
            dataScenario: this.state.dataScenario,
            lastDataGeneration: this.state.lastDataGeneration,
            transformationMetadata: this.state.transformationMetadata,
            timestamp: new Date().toISOString()
        };
    },

    // Event listener setup
    setupEventListeners: function() {
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
        console.log('TrackerCore v1.3 event listeners setup complete');
    },

    updateStepDisplay: function() {
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

    // Navigation helpers
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
        if (oldState.version === '1.0' || oldState.version === '1.1' || oldState.version === '1.2') {
            // Add new v1.3 state properties
            if (!oldState.state.transformationMetadata) {
                oldState.state.transformationMetadata = {};
            }
        }
    },

    handleStorageError: function(error) {
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded - clearing old data');
            // Clear old version keys
            localStorage.removeItem('hcp_tracker_core_state');
            localStorage.removeItem('hcp-tracker-v650-state');
        }
    },

    setupModalListeners: function() {
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
        const exportData = {
            version: this.version,
            currentStep: this.currentStep,
            completedSteps: this.completedSteps,
            state: this.state,
            exportDate: new Date().toISOString(),
            
            moduleVersions: {
                fileHandler: this.getModuleVersion('FileHandler'),
                adaptiveFileHandler: this.getModuleVersion('AdaptiveFileHandler'),
                themeCalculator: this.getModuleVersion('ThemeCalculator'),
                dataEditor: this.getModuleVersion('DataEditor')
            },
            validationStatus: {
                fileHandlerData: this.state.monthlyData ? this.validateFileHandlerData() : false,
                themeCalculations: this.state.themeProbabilities ? this.validateThemeCalculations() : false,
                momentumHealth: this.state.momentumValidation || null,
                hasTransformations: Object.keys(this.state.transformationMetadata).length > 0
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
        
        console.log('TrackerCore v1.3 state exported successfully');
    },

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
            scenarioProbabilities: [],
            lastDataGeneration: null,
            dataScenario: null,
            calculationResults: null,
            momentumValidation: {},
            transformationMetadata: {}
        };
        
        // Clear all related localStorage keys
        localStorage.removeItem('hcp_tracker_core_v13_state');
        localStorage.removeItem('hcp_tracker_core_v12_state');
        localStorage.removeItem('hcp_tracker_core_state');
        localStorage.removeItem('hcp-tracker-v650-state');
        
        this.navigateToStep(1);
        console.log('TrackerCore v1.3 reset to initial state');
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