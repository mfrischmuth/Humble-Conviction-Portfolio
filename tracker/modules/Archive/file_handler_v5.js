/**
 * HCP Portfolio Tracker - Adaptive File Handler v5.0
 * File: file-handler-v5.0.js
 * Last Updated: 2025-09-09T22:15:00Z
 * 
 * MAJOR CHANGES IN v5.0:
 * - Updated indicator mappings (software_ip_investment, cape_rate_of_change, total_return_differential)
 * - Support for quarterly data with "YYYYQX" format
 * - Preserve trend_analysis, garch_suitable, and other enhanced metadata
 * - Maintain calculation/methodology notes
 * - Handle mixed monthly/quarterly frequencies
 * 
 * SUPPORTED STRUCTURES:
 * 1. Nested: indicators.usd.dxy_index (primary)
 * 2. Flat: indicators.dxy_index
 * 3. Hybrid: Mixed nested and flat
 * 4. Custom: Any structure with recognizable indicator names
 */

const AdaptiveFileHandler = {
    version: '5.0',
    framework: 'IPS v4.3.2 Adaptive Implementation',
    lastUpdated: '2025-09-09T22:15:00Z',
    
    // Updated indicator mappings for v5.0
    indicatorMap: {
        // USD Theme
        'dxy_index': { 
            theme: 'usd', 
            temporal: 'leading', 
            aliases: ['dxy', 'dollar_index', 'usd_index'],
            frequency: 'monthly'
        },
        'real_rate_differential': { 
            theme: 'usd', 
            temporal: 'concurrent', 
            aliases: ['real_rate_diff', 'rate_differential'],
            frequency: 'monthly'
        },
        'cofer_usd': { 
            theme: 'usd', 
            temporal: 'lagging', 
            aliases: ['cofer', 'reserve_share'],
            frequency: 'quarterly',
            supportsTrend: true
        },
        
        // Innovation Theme
        'qqq_spy_ratio': { 
            theme: 'innovation', 
            temporal: 'leading', 
            aliases: ['qqq_spy', 'tech_ratio'],
            frequency: 'monthly'
        },
        'productivity_growth': { 
            theme: 'innovation', 
            temporal: 'concurrent', 
            aliases: ['productivity', 'prod_growth'],
            frequency: 'quarterly'
        },
        'software_ip_investment': { 
            theme: 'innovation', 
            temporal: 'lagging', 
            aliases: ['software_investment', 'ip_investment', 'tech_employment_pct'], // Include old name as alias
            frequency: 'quarterly'
        },
        
        // Valuation Theme
        'put_call_ratio': { 
            theme: 'valuation', 
            temporal: 'leading', 
            aliases: ['put_call', 'pc_ratio'],
            frequency: 'monthly'
        },
        'trailing_pe': { 
            theme: 'valuation', 
            temporal: 'concurrent', 
            aliases: ['pe_ratio', 'pe_trailing'],
            frequency: 'monthly'
        },
        'cape_rate_of_change': { 
            theme: 'valuation', 
            temporal: 'lagging', 
            aliases: ['cape_roc', 'cape_change', 'eps_delivery'], // Include old name as alias
            frequency: 'monthly',
            garchSuitable: true
        },
        
        // US Leadership Theme
        'spy_efa_momentum': { 
            theme: 'usLeadership', 
            temporal: 'leading', 
            aliases: ['spy_efa', 'us_momentum'],
            frequency: 'monthly'
        },
        'us_market_pct': { 
            theme: 'usLeadership', 
            temporal: 'concurrent', 
            aliases: ['us_share', 'market_share'],
            frequency: 'monthly'
        },
        'total_return_differential': { 
            theme: 'usLeadership', 
            temporal: 'lagging', 
            aliases: ['return_diff', 'total_return_diff', 'etf_flow_differential'], // Include old name as alias
            frequency: 'monthly',
            garchSuitable: true
        }
    },
    
    /**
     * Main entry point - intelligently load and process any data structure
     */
    async loadMasterData: async function(fileOrData) {
        console.log('AdaptiveFileHandler v5.0: Starting intelligent data load...');
        
        try {
            // Step 1: Get raw data
            const rawData = await this.parseInput(fileOrData);
            
            // Step 2: Detect structure
            const structure = this.detectStructure(rawData);
            console.log(`Detected structure: ${structure.type}`, structure);
            
            // Step 3: Extract indicators using detected structure
            const extractedIndicators = this.extractIndicators(rawData, structure);
            console.log(`Extracted ${Object.keys(extractedIndicators).length} indicators`);
            
            // Step 4: Process into standard format
            const processed = this.processExtractedData(extractedIndicators, rawData.metadata);
            
            // Step 5: Validate completeness
            const validation = this.validateProcessedData(processed);
            if (!validation.valid) {
                console.warn('Validation warnings:', validation);
            }
            
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
            hasIndicators: !!data.indicators
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
                        if (this.isIndicatorKey(key)) {
                            structure.indicatorPaths[key] = ['indicators', theme, key];
                        }
                    });
                }
            });
            
            // Check for flat structure
            Object.keys(data.indicators).forEach(key => {
                if (this.isIndicatorKey(key)) {
                    isFlat = true;
                    structure.indicatorPaths[key] = ['indicators', key];
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
     * Extract indicators from any structure
     */
    extractIndicators: function(data, structure) {
        const indicators = {};
        
        // Use detected paths
        Object.entries(structure.indicatorPaths).forEach(([key, path]) => {
            const value = this.getNestedValue(data, path);
            if (value) {
                // Normalize the key to standard name
                const standardKey = this.normalizeIndicatorKey(key);
                indicators[standardKey] = value;
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
                if (value.current_value !== undefined || value.value !== undefined) {
                    const standardKey = this.normalizeIndicatorKey(key);
                    indicators[standardKey] = value;
                    console.log(`Found indicator via deep search: ${standardKey} at path: ${path.concat(key).join('.')}`);
                }
            }
            
            // Recurse into objects
            if (value && typeof value === 'object' && !value.current_value && !value.value) {
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
        
        // Check aliases
        for (const [indicator, config] of Object.entries(this.indicatorMap)) {
            if (config.aliases && config.aliases.includes(key)) {
                return indicator;
            }
        }
        
        return key;
    },
    
    /**
     * Process extracted indicators into standard format
     */
    processExtractedData: function(extractedIndicators, metadata) {
        const processed = {
            metadata: {
                ...metadata,
                processed_at: new Date().toISOString(),
                file_handler_version: this.version,
                adapter_mode: 'flexible'
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
            // Get current value (handle different field names)
            const currentValue = data.current_value ?? data.value ?? data.currentValue ?? null;
            
            // Determine frequency and get appropriate history/dates
            const hasMonthly = !!data.monthly_history;
            const hasQuarterly = !!data.quarterly_history;
            
            // Get history and dates based on frequency
            const history = data.monthly_history || data.quarterly_history || 
                          data.history || data.values || [];
            const dates = data.monthly_dates || data.quarterly_dates || 
                        data.dates || data.timestamps || [];
            const frequency = hasMonthly ? 'monthly' : hasQuarterly ? 'quarterly' : 'unknown';
            
            // Calculate percentiles
            const percentiles = this.calculatePercentiles(history);
            const percentileRank = this.getPercentileRank(currentValue, percentiles);
            
            // Create standard indicator object
            const indicator = {
                value: currentValue,
                percentiles: percentiles,
                percentileRank: percentileRank,
                history: history,
                dates: dates,
                frequency: frequency,
                source: data.source || 'imported',
                lastUpdated: data.last_updated || data.lastUpdated || new Date().toISOString(),
                dataQuality: data.data_quality || data.dataQuality || 'unknown',
                dataPoints: data.data_points || data.dataPoints || history.length
            };
            
            // Preserve additional metadata fields if present
            if (data.trend_analysis) {
                indicator.trendAnalysis = data.trend_analysis;
            }
            if (data.garch_suitable !== undefined) {
                indicator.garchSuitable = data.garch_suitable;
            }
            if (data.indicator_type) {
                indicator.indicatorType = data.indicator_type;
            }
            if (data.calculation) {
                indicator.calculation = data.calculation;
            }
            if (data.methodology) {
                indicator.methodology = data.methodology;
            }
            if (data.proxy_note) {
                indicator.proxyNote = data.proxy_note;
            }
            if (data.original_cape_range) {
                indicator.originalCapeRange = data.original_cape_range;
            }
            if (data.current_cape !== undefined) {
                indicator.currentCape = data.current_cape;
            }
            
            // Store in flat structure
            processed.indicators[key] = indicator;
            
            // Map to theme structure if known
            const mapping = this.indicatorMap[key];
            if (mapping) {
                processed.themes[mapping.theme][mapping.temporal] = indicator;
            }
            
            // Store history with appropriate frequency marker
            if (history.length > 0) {
                processed.history[key] = {
                    values: history,
                    dates: dates,
                    frequency: frequency
                };
            }
        });
        
        return processed;
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
     * Validate processed data completeness
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
                themes: {}
            }
        };
        
        // Check each expected indicator
        Object.entries(this.indicatorMap).forEach(([key, config]) => {
            validation.coverage.total++;
            
            if (processed.indicators[key]) {
                validation.coverage.found++;
                
                // Check data quality
                const ind = processed.indicators[key];
                if (ind.value === null || ind.value === undefined) {
                    validation.warnings.push(`${key}: missing current value`);
                }
                if (!ind.percentiles) {
                    validation.warnings.push(`${key}: no percentiles calculated`);
                }
                if (ind.history.length === 0) {
                    validation.warnings.push(`${key}: no historical data`);
                }
                
                // Check for expected frequency
                if (config.frequency && ind.frequency !== config.frequency) {
                    validation.warnings.push(`${key}: expected ${config.frequency} data, got ${ind.frequency}`);
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
        
        // Determine overall validity
        if (validation.coverage.found < 6) {
            validation.valid = false;
            validation.errors.push('Insufficient indicators for analysis (need at least 6)');
        }
        
        return validation;
    },
    
    /**
     * Generate test scenario with flexible structure
     */
    generateTestScenario: function(scenario = 'current', structureType = 'nested') {
        const scenarios = {
            'current': {
                dxy_index: 97.55,
                real_rate_differential: 0.3,
                cofer_usd: 57.74,
                qqq_spy_ratio: 0.8928,
                productivity_growth: 1.5,
                software_ip_investment: 1.83,
                put_call_ratio: 0.93,
                trailing_pe: 26.65,
                cape_rate_of_change: 9.14,
                spy_efa_momentum: 0.0391,
                us_market_pct: 90.95,
                total_return_differential: 2.65
            }
        };
        
        const values = scenarios[scenario] || scenarios['current'];
        const testData = {
            metadata: {
                version: "test_5.0",
                ips_version: "4.3.2",
                last_updated: new Date().toISOString(),
                scenario: scenario,
                structure: structureType
            }
        };
        
        // Generate based on requested structure
        if (structureType === 'nested') {
            testData.indicators = {
                usd: {
                    dxy_index: this.createIndicatorObject(values.dxy_index, 'monthly'),
                    real_rate_differential: this.createIndicatorObject(values.real_rate_differential, 'monthly'),
                    cofer_usd: this.createIndicatorObject(values.cofer_usd, 'quarterly', true)
                },
                innovation: {
                    qqq_spy_ratio: this.createIndicatorObject(values.qqq_spy_ratio, 'monthly'),
                    productivity_growth: this.createIndicatorObject(values.productivity_growth, 'quarterly'),
                    software_ip_investment: this.createIndicatorObject(values.software_ip_investment, 'quarterly')
                },
                valuation: {
                    put_call_ratio: this.createIndicatorObject(values.put_call_ratio, 'monthly'),
                    trailing_pe: this.createIndicatorObject(values.trailing_pe, 'monthly'),
                    cape_rate_of_change: this.createIndicatorObject(values.cape_rate_of_change, 'monthly', false, true)
                },
                usLeadership: {
                    spy_efa_momentum: this.createIndicatorObject(values.spy_efa_momentum, 'monthly'),
                    us_market_pct: this.createIndicatorObject(values.us_market_pct, 'monthly'),
                    total_return_differential: this.createIndicatorObject(values.total_return_differential, 'monthly', false, true)
                }
            };
        } else if (structureType === 'flat') {
            testData.indicators = {};
            Object.entries(values).forEach(([key, value]) => {
                const config = this.indicatorMap[key];
                const freq = config ? config.frequency : 'monthly';
                const hasTrend = config ? config.supportsTrend : false;
                const isGarch = config ? config.garchSuitable : false;
                testData.indicators[key] = this.createIndicatorObject(value, freq, hasTrend, isGarch);
            });
        } else if (structureType === 'hybrid') {
            // Mix of nested and flat
            testData.indicators = {
                usd: {
                    dxy_index: this.createIndicatorObject(values.dxy_index, 'monthly')
                },
                real_rate_differential: this.createIndicatorObject(values.real_rate_differential, 'monthly'),
                innovation: {
                    qqq_spy_ratio: this.createIndicatorObject(values.qqq_spy_ratio, 'monthly')
                },
                productivity_growth: this.createIndicatorObject(values.productivity_growth, 'quarterly')
            };
        }
        
        return testData;
    },
    
    /**
     * Create indicator object with history
     */
    createIndicatorObject: function(currentValue, frequency = 'monthly', includeTrend = false, garchSuitable = false) {
        const isQuarterly = frequency === 'quarterly';
        const historyLength = isQuarterly ? 20 : 60;
        const history = [];
        const dates = [];
        let value = currentValue * 0.9;
        
        for (let i = 0; i < historyLength; i++) {
            value += (Math.random() - 0.5) * currentValue * 0.02;
            value += (currentValue - value) * 0.05;
            history.push(value);
            
            const date = new Date();
            if (isQuarterly) {
                date.setMonth(date.getMonth() - (historyLength - i) * 3);
                const quarter = Math.ceil((date.getMonth() + 1) / 3);
                const year = date.getFullYear();
                dates.push(`${year}Q${quarter}`);
            } else {
                date.setMonth(date.getMonth() - (historyLength - i));
                dates.push(date.toISOString().split('T')[0]);
            }
        }
        
        history[history.length - 1] = currentValue;
        
        const obj = {
            current_value: currentValue,
            source: "test",
            data_quality: "test",
            data_points: history.length,
            last_updated: new Date().toISOString()
        };
        
        // Add appropriate history type
        if (isQuarterly) {
            obj.quarterly_history = history;
            obj.quarterly_dates = dates;
        } else {
            obj.monthly_history = history;
            obj.monthly_dates = dates;
        }
        
        // Add optional fields
        if (includeTrend) {
            obj.indicator_type = "trending";
            obj.trend_analysis = {
                trend_acceleration: -0.0234,
                short_term_slope: -0.1567,
                long_term_slope: -0.1333,
                short_window: 6,
                long_window: 60
            };
        }
        
        if (garchSuitable) {
            obj.garch_suitable = true;
            obj.calculation = "test calculation method";
        }
        
        return obj;
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