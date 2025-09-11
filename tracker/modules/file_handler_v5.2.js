/**
 * HCP Portfolio Tracker - Adaptive File Handler v5.2
 * File: file-handler-v5.2.js
 * Last Updated: 2025-09-11T08:00:00Z
 * 
 * CHANGES IN v5.2:
 * - Added explicit analysis method specifications for each indicator
 * - Clearer value differentiation (currentValue vs currentRaw vs currentTransformed)
 * - Fixed percentile calculations to use correct data series
 * - Added GARCH suitability flags (only 2-3 indicators suitable)
 * - Enhanced metadata for downstream clarity
 * - Removed ambiguous 'value' field in favor of explicit naming
 * 
 * ANALYSIS METHODS:
 * - Only 2-3 indicators suitable for GARCH (oscillating differentials)
 * - COFER uses trend acceleration (NOT GARCH - has secular trend)
 * - Most indicators use percentile thresholds
 * - Some use zero-crossing or deviation thresholds
 */

const AdaptiveFileHandler = {
    version: '5.2',
    framework: 'IPS v4.4 with Explicit Analysis Specifications',
    lastUpdated: '2025-09-11T08:00:00Z',
    
    // Indicator definitions with analysis specifications
    indicatorMap: {
        // USD Theme
        'dxy_index': { 
            theme: 'usd', 
            temporal: 'leading', 
            aliases: ['dxy', 'dollar_index', 'usd_index'],
            frequency: 'monthly',
            transformation: '3-month rate of change',
            analysisMethod: {
                primary: 'momentum',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false, // Already transformed
                useForCalculations: 'transformed',
                description: 'Currency momentum via 3-month RoC'
            }
        },
        'tic_foreign_demand': {
            theme: 'usd', 
            temporal: 'concurrent', 
            aliases: ['tic_demand', 'treasury_foreign_demand', 'real_rate_differential'],
            frequency: 'monthly',
            transformation: '3-month MA of net purchases, MoM change',
            analysisMethod: {
                primary: 'flow',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false, // Already transformed
                useForCalculations: 'transformed',
                description: 'Capital flow momentum'
            }
        },
        'cofer_usd': { 
            theme: 'usd', 
            temporal: 'lagging', 
            aliases: ['cofer', 'reserve_share'],
            frequency: 'quarterly',
            analysisMethod: {
                primary: 'trend',
                technique: 'ma_comparison', // NOT GARCH - has secular trend
                stateLogic: 'trend_acceleration',
                garchSuitable: false, // Strong secular trend violates GARCH assumptions
                useForCalculations: 'raw',
                description: 'USD reserve share trend acceleration'
            }
        },
        
        // Innovation Theme
        'qqq_spy_ratio': { 
            theme: 'innovation', 
            temporal: 'leading', 
            aliases: ['qqq_spy', 'tech_ratio'],
            frequency: 'monthly',
            analysisMethod: {
                primary: 'ratio',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false,
                useForCalculations: 'raw',
                description: 'Tech vs broad market relative strength'
            }
        },
        'productivity_growth': { 
            theme: 'innovation', 
            temporal: 'concurrent', 
            aliases: ['productivity', 'prod_growth'],
            frequency: 'quarterly',
            transformation: '2-quarter moving average',
            analysisMethod: {
                primary: 'smoothed_trend',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false,
                useForCalculations: 'transformed',
                description: 'Smoothed productivity growth trend'
            }
        },
        'software_ip_investment': { 
            theme: 'innovation', 
            temporal: 'lagging', 
            aliases: ['software_investment', 'ip_investment', 'tech_employment_pct'],
            frequency: 'quarterly',
            analysisMethod: {
                primary: 'level',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false,
                useForCalculations: 'raw',
                description: 'Software/IP investment as % of total'
            }
        },
        
        // Valuation Theme
        'put_call_ratio': { 
            theme: 'valuation', 
            temporal: 'leading', 
            aliases: ['put_call', 'pc_ratio'],
            frequency: 'monthly',
            analysisMethod: {
                primary: 'sentiment',
                technique: 'percentile',
                stateLogic: 'percentile_inverted', // High P/C = bearish = low state
                garchSuitable: false,
                useForCalculations: 'raw',
                description: 'Options sentiment (inverted)'
            }
        },
        'trailing_pe': { 
            theme: 'valuation', 
            temporal: 'concurrent', 
            aliases: ['pe_ratio', 'pe_trailing'],
            frequency: 'monthly',
            transformation: '% deviation from 3-month average',
            analysisMethod: {
                primary: 'mean_reversion',
                technique: 'deviation',
                stateLogic: 'threshold_based',
                garchSuitable: false, // Already measuring deviation
                useForCalculations: 'transformed',
                description: 'Valuation momentum via deviation from MA'
            }
        },
        'cape_rate_of_change': { 
            theme: 'valuation', 
            temporal: 'lagging', 
            aliases: ['cape_roc', 'cape_change', 'eps_delivery'],
            frequency: 'monthly',
            analysisMethod: {
                primary: 'momentum',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false, // Already transformed to RoC
                useForCalculations: 'raw',
                description: 'Long-term valuation momentum'
            }
        },
        
        // US Leadership Theme
        'spy_efa_momentum': { 
            theme: 'usLeadership', 
            temporal: 'leading', 
            aliases: ['spy_efa', 'us_momentum'],
            frequency: 'monthly',
            transformation: 'monthly mean of daily momentum differential',
            analysisMethod: {
                primary: 'momentum_differential',
                technique: 'garch', // SUITABLE FOR GARCH - oscillating differential
                stateLogic: 'zero_crossing',
                garchSuitable: true,
                garchTarget: 'transformed',
                useForCalculations: 'transformed',
                description: 'US vs International momentum differential'
            }
        },
        'us_market_pct': { 
            theme: 'usLeadership', 
            temporal: 'concurrent', 
            aliases: ['us_share', 'market_share'],
            frequency: 'monthly',
            analysisMethod: {
                primary: 'level',
                technique: 'percentile',
                stateLogic: 'percentile_based',
                garchSuitable: false,
                useForCalculations: 'raw',
                description: 'US market share of global equity'
            }
        },
        'total_return_differential': { 
            theme: 'usLeadership', 
            temporal: 'lagging', 
            aliases: ['return_diff', 'total_return_diff', 'etf_flow_differential'],
            frequency: 'monthly',
            analysisMethod: {
                primary: 'momentum_differential',
                technique: 'garch', // SUITABLE FOR GARCH - oscillating spread
                stateLogic: 'percentile_based',
                garchSuitable: true,
                garchTarget: 'raw',
                useForCalculations: 'raw',
                description: '1-year rolling return differential'
            }
        }
    },
    
    /**
     * Main entry point - intelligently load and process any data structure
     */
    async loadMasterData: async function(fileOrData) {
        console.log('AdaptiveFileHandler v5.2: Starting analysis-aware data load...');
        
        try {
            // Step 1: Get raw data
            const rawData = await this.parseInput(fileOrData);
            
            // Step 2: Detect structure
            const structure = this.detectStructure(rawData);
            console.log(`Detected structure: ${structure.type}`, structure);
            
            // Step 3: Extract indicators using detected structure
            const extractedIndicators = this.extractIndicators(rawData, structure);
            console.log(`Extracted ${Object.keys(extractedIndicators).length} indicators`);
            
            // Step 4: Check for transformations
            const transformationSummary = this.analyzeTransformations(extractedIndicators);
            console.log('Transformation summary:', transformationSummary);
            
            // Step 5: Process into standard format with analysis specifications
            const processed = this.processExtractedData(extractedIndicators, rawData.metadata);
            
            // Step 6: Validate completeness and analysis methods
            const validation = this.validateProcessedData(processed);
            if (!validation.valid) {
                console.warn('Validation warnings:', validation);
            }
            
            // Step 7: Log analysis method summary
            this.logAnalysisSummary(processed);
            
            return processed;
            
        } catch (error) {
            console.error('AdaptiveFileHandler error:', error);
            throw new Error(`Failed to load data: ${error.message}`);
        }
    },
    
    /**
     * Parse various input types into raw JSON
     */
    parseInput: async function(input) {
        if (input instanceof File) {
            const text = await input.text();
            return JSON.parse(text);
        } else if (typeof input === 'string') {
            if (input.trim().startsWith('{')) {
                return JSON.parse(input);
            } else {
                const response = await fetch(input);
                return await response.json();
            }
        } else if (typeof input === 'object') {
            return input;
        } else {
            throw new Error('Unsupported input type');
        }
    },
    
    /**
     * Intelligently detect the data structure
     */
    detectStructure: function(data) {
        const structure = {
            type: 'unknown',
            indicatorPaths: {},
            hasMetadata: !!data.metadata,
            hasIndicators: !!data.indicators,
            hasTransformations: false
        };
        
        if (!data.indicators) {
            // Look for indicators at root level
            structure.type = 'root';
            Object.keys(data).forEach(key => {
                if (this.isIndicatorKey(key)) {
                    structure.indicatorPaths[key] = [key];
                }
            });
        } else {
            // Check if indicators are nested by theme
            const themes = ['usd', 'innovation', 'valuation', 'usLeadership'];
            let isNested = false;
            let isFlat = false;
            
            // Check for nested structure
            themes.forEach(theme => {
                if (data.indicators[theme] && typeof data.indicators[theme] === 'object') {
                    isNested = true;
                    Object.keys(data.indicators[theme]).forEach(key => {
                        const normalizedKey = this.normalizeIndicatorKey(key);
                        structure.indicatorPaths[normalizedKey] = ['indicators', theme, key];
                    });
                }
            });
            
            // Check for flat structure
            Object.keys(data.indicators).forEach(key => {
                if (this.isIndicatorKey(key)) {
                    isFlat = true;
                    const normalizedKey = this.normalizeIndicatorKey(key);
                    structure.indicatorPaths[normalizedKey] = ['indicators', key];
                }
            });
            
            if (isNested && isFlat) {
                structure.type = 'hybrid';
            } else if (isNested) {
                structure.type = 'nested';
            } else if (isFlat) {
                structure.type = 'flat';
            }
        }
        
        return structure;
    },
    
    /**
     * Check if a key matches any known indicator
     */
    isIndicatorKey: function(key) {
        // Direct match
        if (this.indicatorMap[key]) return true;
        
        // Check aliases
        for (const [indicator, config] of Object.entries(this.indicatorMap)) {
            if (config.aliases && config.aliases.includes(key)) {
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Analyze transformations in the data
     */
    analyzeTransformations: function(indicators) {
        const summary = {
            total: Object.keys(indicators).length,
            transformed: 0,
            raw: 0,
            transformationTypes: []
        };
        
        Object.entries(indicators).forEach(([key, data]) => {
            if (data.current_transformed !== undefined || 
                data.transformed_values !== undefined ||
                data.transformation !== undefined) {
                summary.transformed++;
                if (data.transformation && !summary.transformationTypes.includes(data.transformation)) {
                    summary.transformationTypes.push(data.transformation);
                }
            } else {
                summary.raw++;
            }
        });
        
        return summary;
    },
    
    /**
     * Extract indicators from any structure
     */
    extractIndicators: function(data, structure) {
        const indicators = {};
        
        // Use detected paths
        Object.entries(structure.indicatorPaths).forEach(([key, path]) => {
            const value = this.getNestedValue(data, path);
            if (value) {
                indicators[key] = value;
            }
        });
        
        // If no indicators found via structure detection, do deep search
        if (Object.keys(indicators).length === 0) {
            console.log('No indicators found via structure detection, performing deep search...');
            this.deepSearchIndicators(data, indicators);
        }
        
        return indicators;
    },
    
    /**
     * Get value from nested path
     */
    getNestedValue: function(obj, path) {
        return path.reduce((current, key) => current?.[key], obj);
    },
    
    /**
     * Deep search for indicators in any structure
     */
    deepSearchIndicators: function(obj, indicators, path = []) {
        if (!obj || typeof obj !== 'object') return;
        
        Object.entries(obj).forEach(([key, value]) => {
            // Check if this key is an indicator
            if (this.isIndicatorKey(key) && value && typeof value === 'object') {
                // Check for either raw or transformed values
                if (value.current_value !== undefined || 
                    value.value !== undefined ||
                    value.current_transformed !== undefined) {
                    const standardKey = this.normalizeIndicatorKey(key);
                    indicators[standardKey] = value;
                    console.log(`Found indicator via deep search: ${standardKey} at path: ${path.concat(key).join('.')}`);
                }
            }
            
            // Recurse into objects
            if (value && typeof value === 'object' && 
                !value.current_value && !value.value && !value.current_transformed) {
                this.deepSearchIndicators(value, indicators, path.concat(key));
            }
        });
    },
    
    /**
     * Normalize indicator key to standard name
     */
    normalizeIndicatorKey: function(key) {
        // Direct match
        if (this.indicatorMap[key]) return key;
        
        // Special handling for the renamed indicator
        if (key === 'real_rate_differential') {
            return 'tic_foreign_demand';
        }
        
        // Check aliases
        for (const [indicator, config] of Object.entries(this.indicatorMap)) {
            if (config.aliases && config.aliases.includes(key)) {
                return indicator;
            }
        }
        
        return key;
    },
    
    /**
     * Process extracted indicators into standard format - WITH CLEAR DIFFERENTIATION
     */
    processExtractedData: function(extractedIndicators, metadata) {
        const processed = {
            metadata: {
                ...metadata,
                processed_at: new Date().toISOString(),
                file_handler_version: this.version,
                adapter_mode: 'analysis_aware',
                has_transformations: false,
                transformations: {},
                garch_suitable_indicators: [],
                analysis_methods: {}
            },
            indicators: {},
            themes: {
                usd: {},
                innovation: {},
                valuation: {},
                usLeadership: {}
            },
            history: {},
            raw: extractedIndicators // Keep raw for debugging
        };
        
        // Process each indicator
        Object.entries(extractedIndicators).forEach(([key, data]) => {
            const indicatorConfig = this.indicatorMap[key] || {};
            const analysisMethod = indicatorConfig.analysisMethod || {};
            
            // Determine which values to use
            const hasTransformation = data.current_transformed !== undefined;
            const rawValue = data.current_value ?? data.value ?? data.currentValue ?? null;
            const transformedValue = data.current_transformed ?? null;
            
            // Determine primary value based on analysis method
            const useTransformed = hasTransformation && 
                                 analysisMethod.useForCalculations === 'transformed';
            const currentValue = useTransformed ? transformedValue : rawValue;
            
            // Get appropriate history for calculations
            let history, dates, frequency;
            
            if (useTransformed && data.transformed_values) {
                history = data.transformed_values;
                dates = data.transformed_dates || data.dates || [];
                frequency = data.frequency || indicatorConfig.frequency || 'monthly';
                processed.metadata.has_transformations = true;
                processed.metadata.transformations[key] = data.transformation || 'unknown';
            } else {
                history = data.monthly_history || data.quarterly_history || 
                         data.history || data.values || [];
                dates = data.monthly_dates || data.quarterly_dates || 
                       data.dates || data.timestamps || [];
                frequency = data.frequency || indicatorConfig.frequency || 'unknown';
            }
            
            // Calculate percentiles on the CORRECT data series
            let percentiles, percentileRank;
            
            if (data.percentile_rank !== undefined && useTransformed) {
                // Use pre-calculated percentile from Data Collector (calculated on transformed)
                percentileRank = data.percentile_rank;
                percentiles = data.percentiles || this.calculatePercentiles(history);
            } else {
                // Calculate percentiles on the appropriate series
                percentiles = this.calculatePercentiles(history);
                percentileRank = this.getPercentileRank(currentValue, percentiles);
            }
            
            // Determine state based on analysis method
            const state = this.determineState(percentileRank, analysisMethod);
            
            // Create standard indicator object with CLEAR differentiation
            const indicator = {
                // Clear value differentiation
                currentValue: currentValue,        // Best value for calculations
                currentRaw: rawValue,              // Always raw
                currentTransformed: transformedValue, // Transformed or null
                useForCalculations: useTransformed ? 'transformed' : 'raw',
                
                // Percentile information
                percentiles: percentiles,
                percentileRank: percentileRank,
                percentileSource: useTransformed ? 'transformed' : 'raw',
                
                // State information
                currentState: state,
                stateLogic: analysisMethod.stateLogic || 'percentile_based',
                
                // History data
                history: history,
                dates: dates,
                frequency: frequency,
                
                // If we have both histories, keep them separate
                rawHistory: !useTransformed ? history : (data.monthly_history || data.quarterly_history || null),
                rawDates: !useTransformed ? dates : (data.monthly_dates || data.quarterly_dates || null),
                transformedHistory: useTransformed ? history : null,
                transformedDates: useTransformed ? dates : null,
                
                // Analysis specifications
                analysisMethod: analysisMethod,
                garchSuitable: analysisMethod.garchSuitable || false,
                garchTarget: analysisMethod.garchTarget || null,
                
                // Metadata
                source: data.source || 'imported',
                lastUpdated: data.last_updated || data.lastUpdated || new Date().toISOString(),
                dataQuality: data.data_quality || data.dataQuality || 'unknown',
                dataPoints: data.data_points || data.dataPoints || history.length,
                transformation: data.transformation || null,
                hasTransformation: hasTransformation
            };
            
            // Track GARCH suitable indicators
            if (indicator.garchSuitable) {
                processed.metadata.garch_suitable_indicators.push(key);
            }
            
            // Track analysis methods
            processed.metadata.analysis_methods[key] = analysisMethod.primary || 'unknown';
            
            // Preserve additional metadata fields if present
            const preserveFields = [
                'trend_analysis', 'indicator_type', 'calculation', 
                'methodology', 'proxy_note', 'original_cape_range', 
                'current_cape', 'publication_lag', 'data_staleness_warning'
            ];
            
            preserveFields.forEach(field => {
                if (data[field] !== undefined) {
                    indicator[field] = data[field];
                }
            });
            
            // Store in flat structure
            processed.indicators[key] = indicator;
            
            // Map to theme structure if known
            const mapping = this.indicatorMap[key];
            if (mapping) {
                processed.themes[mapping.theme][mapping.temporal] = indicator;
            }
            
            // Store history with metadata
            if (history.length > 0) {
                processed.history[key] = {
                    values: history,
                    dates: dates,
                    frequency: frequency,
                    dataType: useTransformed ? 'transformed' : 'raw',
                    analysisMethod: analysisMethod.technique || 'percentile'
                };
            }
        });
        
        return processed;
    },
    
    /**
     * Determine state based on percentile and analysis method
     */
    determineState: function(percentileRank, analysisMethod) {
        if (percentileRank === null || percentileRank === undefined) {
            return 0; // Neutral if no data
        }
        
        const stateLogic = analysisMethod.stateLogic || 'percentile_based';
        
        switch (stateLogic) {
            case 'percentile_based':
                if (percentileRank >= 67) return 1;
                if (percentileRank <= 33) return -1;
                return 0;
                
            case 'percentile_inverted': // For Put/Call ratio
                if (percentileRank >= 67) return -1; // High P/C = bearish
                if (percentileRank <= 33) return 1;  // Low P/C = bullish
                return 0;
                
            case 'zero_crossing':
                // Would need actual value, not percentile
                // This is a placeholder - actual implementation would check sign
                return 0;
                
            case 'threshold_based':
                // For P/E deviation - would check actual deviation thresholds
                return 0;
                
            case 'trend_acceleration':
                // For COFER - would check MA comparison
                return 0;
                
            default:
                // Default to standard percentile
                if (percentileRank >= 67) return 1;
                if (percentileRank <= 33) return -1;
                return 0;
        }
    },
    
    /**
     * Calculate percentiles from historical data
     */
    calculatePercentiles: function(history) {
        if (!history || history.length < 5) {
            return null;
        }
        
        const sorted = history
            .filter(v => v !== null && v !== undefined && !isNaN(v))
            .sort((a, b) => a - b);
        
        if (sorted.length === 0) {
            return null;
        }
        
        const getPercentile = (p) => {
            const index = (sorted.length - 1) * p;
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;
            
            if (lower === upper) {
                return sorted[lower];
            }
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        };
        
        return {
            min: sorted[0],
            p10: getPercentile(0.10),
            p25: getPercentile(0.25),
            p33: getPercentile(0.33),
            p50: getPercentile(0.50),
            p67: getPercentile(0.67),
            p75: getPercentile(0.75),
            p90: getPercentile(0.90),
            max: sorted[sorted.length - 1],
            count: sorted.length
        };
    },
    
    /**
     * Get percentile rank of current value
     */
    getPercentileRank: function(value, percentiles) {
        if (!percentiles || value === null || value === undefined) {
            return null;
        }
        
        if (value <= percentiles.min) return 0;
        if (value >= percentiles.max) return 100;
        
        const points = [
            { p: 0, v: percentiles.min },
            { p: 10, v: percentiles.p10 },
            { p: 25, v: percentiles.p25 },
            { p: 33, v: percentiles.p33 },
            { p: 50, v: percentiles.p50 },
            { p: 67, v: percentiles.p67 },
            { p: 75, v: percentiles.p75 },
            { p: 90, v: percentiles.p90 },
            { p: 100, v: percentiles.max }
        ];
        
        for (let i = 0; i < points.length - 1; i++) {
            if (value >= points[i].v && value <= points[i + 1].v) {
                const range = points[i + 1].v - points[i].v;
                const position = value - points[i].v;
                const pRange = points[i + 1].p - points[i].p;
                return points[i].p + (position / range) * pRange;
            }
        }
        
        return 50;
    },
    
    /**
     * Log analysis method summary
     */
    logAnalysisSummary: function(processed) {
        console.log('\n=== Analysis Method Summary ===');
        console.log(`GARCH Suitable (${processed.metadata.garch_suitable_indicators.length}):`);
        processed.metadata.garch_suitable_indicators.forEach(ind => {
            const config = processed.indicators[ind];
            console.log(`  - ${ind}: ${config.analysisMethod.description}`);
        });
        
        console.log('\nPercentile-Based:');
        Object.entries(processed.indicators).forEach(([key, ind]) => {
            if (ind.analysisMethod.technique === 'percentile' && !ind.garchSuitable) {
                console.log(`  - ${key}: ${ind.analysisMethod.description}`);
            }
        });
        
        console.log('\nOther Methods:');
        Object.entries(processed.indicators).forEach(([key, ind]) => {
            if (ind.analysisMethod.technique !== 'percentile' && 
                ind.analysisMethod.technique !== 'garch') {
                console.log(`  - ${key}: ${ind.analysisMethod.technique} - ${ind.analysisMethod.description}`);
            }
        });
        
        console.log('================================\n');
    },
    
    /**
     * Validate processed data completeness - ENHANCED VALIDATION
     */
    validateProcessedData: function(processed) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            coverage: {
                total: 0,
                found: 0,
                missing: [],
                transformed: 0,
                garchSuitable: 0,
                themes: {}
            }
        };
        
        // Check each expected indicator
        Object.entries(this.indicatorMap).forEach(([key, config]) => {
            validation.coverage.total++;
            
            if (processed.indicators[key]) {
                validation.coverage.found++;
                
                const ind = processed.indicators[key];
                
                // Check if transformed
                if (ind.hasTransformation) {
                    validation.coverage.transformed++;
                }
                
                // Check if GARCH suitable
                if (ind.garchSuitable) {
                    validation.coverage.garchSuitable++;
                }
                
                // Validate data integrity
                if (ind.currentValue === null || ind.currentValue === undefined) {
                    validation.warnings.push(`${key}: missing current value`);
                }
                
                // Check percentile calculation consistency
                if (ind.percentileSource !== ind.useForCalculations) {
                    validation.warnings.push(`${key}: percentile source mismatch`);
                }
                
                // Check for sufficient history
                if (ind.history.length < 6) {
                    validation.warnings.push(`${key}: insufficient history for momentum (${ind.history.length} points)`);
                }
                
                // Validate analysis method
                if (!ind.analysisMethod || !ind.analysisMethod.technique) {
                    validation.warnings.push(`${key}: missing analysis method specification`);
                }
                
            } else {
                validation.coverage.missing.push(key);
                validation.errors.push(`Missing indicator: ${key}`);
            }
        });
        
        // Check theme coverage
        ['usd', 'innovation', 'valuation', 'usLeadership'].forEach(theme => {
            const found = Object.keys(processed.themes[theme]).length;
            validation.coverage.themes[theme] = `${found}/3`;
            if (found < 3) {
                validation.warnings.push(`Theme ${theme}: only ${found}/3 indicators`);
            }
        });
        
        // Report summary
        console.log(`\nValidation Summary:`);
        console.log(`  Found: ${validation.coverage.found}/${validation.coverage.total} indicators`);
        console.log(`  Transformed: ${validation.coverage.transformed} indicators`);
        console.log(`  GARCH Suitable: ${validation.coverage.garchSuitable} indicators`);
        
        // Determine overall validity
        if (validation.coverage.found < 6) {
            validation.valid = false;
            validation.errors.push('Insufficient indicators for analysis (need at least 6)');
        }
        
        return validation;
    }
};

// Export for various environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveFileHandler;
}

if (typeof window !== 'undefined') {
    window.AdaptiveFileHandler = AdaptiveFileHandler;
    // Also expose as FileHandler for compatibility
    window.FileHandler = AdaptiveFileHandler;
}