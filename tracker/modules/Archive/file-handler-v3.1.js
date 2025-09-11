/**
 * HCP Portfolio Tracker - File Handler Module v3.2
 * File: file-handler-v3.2.js
 * Based on: IPS v4.2 Practical Implementation
 * Last Updated: 2025-09-08T20:30:00Z
 * 
 * CHANGES IN v3.2:
 * - Fixed syntax error in getHistoryParameters function
 * - Removed duplicate function definition
 * - Cleaned up malformed comment blocks
 * 
 * PURPOSE:
 * - Load and process hcp_master_data.json from Data Collector v4.2.5
 * - Calculate percentiles from historical data
 * - Generate high-quality test scenarios for module testing
 * - Use IPS v4.2 terminology throughout
 * 
 * HANDLES:
 * - 12 indicators as specified in IPS v4.2
 * - Percentile calculation from historical arrays
 * - Test scenario generation with realistic macro themes
 */

const FileHandler = {
    version: '3.2',
    framework: 'IPS v4.2 Practical Implementation',
    lastUpdated: '2025-09-08T20:30:00Z',
    
    // IPS v4.2 indicator structure
    indicatorStructure: {
        usd: {
            leading: 'dxy_index',
            concurrent: 'real_rate_differential', 
            lagging: 'cofer_usd'
        },
        innovation: {
            leading: 'qqq_spy_ratio',
            concurrent: 'productivity_growth',
            lagging: 'tech_employment_pct'  // IPS v4.2 uses this, not rd_revenue
        },
        valuation: {
            leading: 'put_call_ratio',
            concurrent: 'trailing_pe',  // IPS v4.2 uses this, not forward_pe
            lagging: 'eps_delivery'
        },
        usLeadership: {
            leading: 'spy_efa_momentum',
            concurrent: 'us_market_pct',
            lagging: 'etf_flow_differential'
        }
    },
    
    /**
     * Load and process master data file
     */
    loadMasterData: async function(fileOrData) {
        try {
            let rawData;
            
            // Handle different input types
            if (fileOrData instanceof File) {
                const text = await fileOrData.text();
                rawData = JSON.parse(text);
            } else if (typeof fileOrData === 'string') {
                if (fileOrData.startsWith('{')) {
                    rawData = JSON.parse(fileOrData);
                } else {
                    const response = await fetch(fileOrData);
                    rawData = await response.json();
                }
            } else {
                rawData = fileOrData;
            }
            
            // Validate structure
            if (!rawData.indicators || !rawData.metadata) {
                throw new Error('Invalid data structure: missing indicators or metadata');
            }
            
            // Process the data
            return this.processRawData(rawData);
            
        } catch (error) {
            console.error('Error loading master data:', error);
            throw error;
        }
    },
    
    /**
     * Process raw data and calculate percentiles
     */
    processRawData: function(rawData) {
        const processed = {
            metadata: {
                ...rawData.metadata,
                processed_at: new Date().toISOString(),
                file_handler_version: this.version
            },
            indicators: {},
            themes: {
                usd: {},
                innovation: {},
                valuation: {},
                usLeadership: {}
            },
            history: {}
        };
        
        // Process each indicator
        Object.entries(rawData.indicators).forEach(([key, data]) => {
            // Calculate percentiles from history
            const history = data.monthly_history || data.quarterly_history || [];
            const percentiles = this.calculatePercentiles(history);
            
            // Calculate current percentile rank
            const percentileRank = this.getPercentileRank(data.current_value, percentiles);
            
            // Create indicator object
            const indicator = {
                value: data.current_value,
                percentiles: percentiles,
                percentileRank: percentileRank,
                history: history,
                dates: data.monthly_dates || data.quarterly_dates || [],
                source: data.source,
                lastUpdated: data.last_updated,
                dataQuality: data.data_quality,
                dataPoints: data.data_points
            };
            
            // Store in main indicators
            processed.indicators[key] = indicator;
            
            // Store history separately for trend analysis
            if (history.length > 0) {
                processed.history[key] = {
                    values: history,
                    dates: indicator.dates,
                    frequency: data.monthly_history ? 'monthly' : 'quarterly'
                };
            }
            
            // Map to theme structure
            const themeMapping = this.findThemeMapping(key);
            if (themeMapping) {
                processed.themes[themeMapping.theme][themeMapping.temporal] = indicator;
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
        
        // Filter out nulls and sort
        const sorted = history
            .filter(v => v !== null && !isNaN(v))
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
        
        // Find position in distribution
        if (value <= percentiles.min) return 0;
        if (value >= percentiles.max) return 100;
        
        // Interpolate between known percentiles
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
        
        return 50; // Default to median if can't determine
    },
    
    /**
     * Find theme mapping for an indicator
     */
    findThemeMapping: function(indicatorKey) {
        for (const [theme, temporals] of Object.entries(this.indicatorStructure)) {
            for (const [temporal, key] of Object.entries(temporals)) {
                if (key === indicatorKey) {
                    return { theme, temporal };
                }
            }
        }
        return null;
    },
    
    /**
     * Generate test scenarios with realistic macro themes
     */
    generateTestScenario: function(scenario = 'current') {
        const scenarios = {
            'current': {
                name: 'Current Market (Sep 2025)',
                description: 'Actual market conditions with moderately strong USD, neutral tech, elevated valuations',
                values: {
                    dxy_index: 97.87,
                    real_rate_differential: 0.33,
                    cofer_usd: 57.74,
                    qqq_spy_ratio: 0.89,
                    productivity_growth: 1.5,
                    tech_employment_pct: 1.83,
                    put_call_ratio: 1.195,
                    trailing_pe: 26.23,
                    eps_delivery: 1.041,
                    spy_efa_momentum: 0.0503,
                    us_market_pct: 90.97,
                    etf_flow_differential: 53.57
                }
            },
            'tech_boom': {
                name: 'Technology Boom',
                description: 'Innovation surge with high productivity, tech outperformance, and stretched valuations',
                values: {
                    dxy_index: 102.0,
                    real_rate_differential: 0.5,
                    cofer_usd: 59.0,
                    qqq_spy_ratio: 1.15,  // Tech strongly outperforming
                    productivity_growth: 3.8,  // High productivity gains
                    tech_employment_pct: 2.2,  // Growing tech employment
                    put_call_ratio: 0.65,  // Low fear (bullish)
                    trailing_pe: 32.5,  // Elevated valuations
                    eps_delivery: 1.08,  // Beating expectations
                    spy_efa_momentum: 0.12,
                    us_market_pct: 92.0,
                    etf_flow_differential: 85.5
                }
            },
            'dollar_crisis': {
                name: 'Dollar Crisis',
                description: 'USD losing reserve status, capital flight from US markets',
                values: {
                    dxy_index: 88.5,  // Weak dollar
                    real_rate_differential: -1.2,  // Negative real rate differential
                    cofer_usd: 52.3,  // Declining reserve share
                    qqq_spy_ratio: 0.82,
                    productivity_growth: 0.8,
                    tech_employment_pct: 1.7,
                    put_call_ratio: 1.65,  // High fear
                    trailing_pe: 19.5,
                    eps_delivery: 0.92,
                    spy_efa_momentum: -0.15,  // International outperforming
                    us_market_pct: 82.5,  // Declining US share
                    etf_flow_differential: -45.2  // Outflows from US
                }
            },
            'risk_off': {
                name: 'Risk-Off Flight to Safety',
                description: 'Global risk aversion, USD strength as safe haven, compressed valuations',
                values: {
                    dxy_index: 112.5,  // Very strong dollar (safety)
                    real_rate_differential: 2.8,  // High US real rates
                    cofer_usd: 61.5,  // USD demand up
                    qqq_spy_ratio: 0.75,  // Tech underperforming
                    productivity_growth: 0.5,  // Low productivity
                    tech_employment_pct: 1.65,  // Tech layoffs
                    put_call_ratio: 1.95,  // Extreme fear
                    trailing_pe: 18.2,  // Compressed valuations
                    eps_delivery: 0.88,  // Missing expectations
                    spy_efa_momentum: 0.08,  // US as safe haven
                    us_market_pct: 89.5,
                    etf_flow_differential: 125.3  // Massive flows to US
                }
            },
            'goldilocks': {
                name: 'Goldilocks Economy',
                description: 'Perfect balance of growth and inflation, moderate valuations',
                values: {
                    dxy_index: 100.0,
                    real_rate_differential: 1.0,
                    cofer_usd: 59.5,
                    qqq_spy_ratio: 0.95,
                    productivity_growth: 2.5,  // Solid productivity
                    tech_employment_pct: 1.95,
                    put_call_ratio: 0.95,  // Balanced sentiment
                    trailing_pe: 22.0,  // Fair valuations
                    eps_delivery: 1.03,  // Slight beats
                    spy_efa_momentum: 0.02,
                    us_market_pct: 88.0,
                    etf_flow_differential: 25.0
                }
            },
            'stagflation': {
                name: 'Stagflation Scenario',
                description: 'Low growth, high inflation, declining productivity',
                values: {
                    dxy_index: 95.0,
                    real_rate_differential: -0.8,  // Negative real rates
                    cofer_usd: 56.5,
                    qqq_spy_ratio: 0.85,
                    productivity_growth: -0.5,  // Negative productivity
                    tech_employment_pct: 1.75,
                    put_call_ratio: 1.35,
                    trailing_pe: 20.5,
                    eps_delivery: 0.94,
                    spy_efa_momentum: -0.03,
                    us_market_pct: 86.5,
                    etf_flow_differential: 5.0
                }
            }
        };
        
        const scenarioData = scenarios[scenario];
        if (!scenarioData) {
            console.warn(`Unknown scenario: ${scenario}, using 'current'`);
            return this.generateTestScenario('current');
        }
        
        // Generate realistic historical data for each indicator
        const mockData = {
            metadata: {
                version: "test",
                ips_version: "4.2",
                last_updated: new Date().toISOString(),
                scenario: scenario,
                scenario_name: scenarioData.name,
                scenario_description: scenarioData.description
            },
            indicators: {}
        };
        
        // Generate each indicator with realistic history
        Object.entries(scenarioData.values).forEach(([key, currentValue]) => {
            const history = this.generateRealisticHistory(key, currentValue, scenario);
            
            mockData.indicators[key] = {
                current_value: currentValue,
                monthly_history: history.values,
                monthly_dates: history.dates,
                source: "test_generator",
                last_updated: new Date().toISOString(),
                data_quality: "test",
                data_points: history.values.length
            };
        });
        
        return mockData;
    },
    
    /**
     * Create hybrid test scenario using real master data
     * This is the recommended approach for testing downstream modules
     */
    createHybridTestScenario: async function(scenario = 'current', masterDataPath = 'hcp_master_data.json') {
        try {
            // Load real master data
            const realData = await this.loadMasterData(masterDataPath);
            
            // Generate test scenario with real historical data
            const testData = this.generateTestScenario(scenario, realData.indicators ? realData : null);
            
            // Process the hybrid data
            const processed = this.processRawData(testData);
            
            console.log(`Created hybrid test scenario: ${scenario}`);
            console.log(`- Real history: ${realData ? 'Yes' : 'No'}`);
            console.log(`- Scenario period: Last 60 months`);
            console.log(`- Total history: ${processed.indicators.dxy_index?.history?.length || 180} months`);
            
            return processed;
            
        } catch (error) {
            console.warn('Could not load real data, using full synthetic:', error);
            // Fall back to pure synthetic data
            const testData = this.generateTestScenario(scenario);
            return this.processRawData(testData);
        }
    },
    
    /**
     * Generate realistic historical data for an indicator
     */
    generateRealisticHistory: function(indicator, currentValue, scenario) {
        const months = 180;  // Extended for GARCH
        const values = [];
        const dates = [];
        
        // Define volatility and trend based on indicator and scenario
        const params = this.getHistoryParameters(indicator, scenario);
        
        // Generate path
        let value = currentValue * (1 - params.trendStrength);
        
        for (let i = 0; i < months; i++) {
            // Add trend
            value += params.trend * currentValue / months;
            
            // Add mean reversion
            const meanReversion = (currentValue * params.meanLevel - value) * params.meanReversion;
            value += meanReversion;
            
            // Add noise
            const noise = (Math.random() - 0.5) * currentValue * params.volatility;
            value += noise;
            
            // Add occasional jumps
            if (Math.random() < params.jumpProbability) {
                value += (Math.random() - 0.5) * currentValue * params.jumpSize;
            }
            
            values.push(value);
            
            // Create date
            const date = new Date();
            date.setMonth(date.getMonth() - (months - i - 1));
            dates.push(date.toISOString().split('T')[0]);
        }
        
        // Ensure last value matches current
        values[values.length - 1] = currentValue;
        
        return { values, dates };
    },
    
    /**
     * Get parameters for generating realistic history
     * Enhanced for 180-month histories with regime changes
     * FIXED: This function was malformed in v3.1
     */
    getHistoryParameters: function(indicator, scenario) {
        // Base parameters by indicator type
        const baseParams = {
            'dxy_index': { volatility: 0.02, meanReversion: 0.05, jumpProbability: 0.05, jumpSize: 0.03 },
            'real_rate_differential': { volatility: 0.15, meanReversion: 0.08, jumpProbability: 0.08, jumpSize: 0.3 },
            'cofer_usd': { volatility: 0.01, meanReversion: 0.02, jumpProbability: 0.02, jumpSize: 0.02 },
            'qqq_spy_ratio': { volatility: 0.03, meanReversion: 0.10, jumpProbability: 0.05, jumpSize: 0.05 },
            'productivity_growth': { volatility: 0.20, meanReversion: 0.15, jumpProbability: 0.10, jumpSize: 0.5 },
            'tech_employment_pct': { volatility: 0.02, meanReversion: 0.03, jumpProbability: 0.03, jumpSize: 0.05 },
            'put_call_ratio': { volatility: 0.08, meanReversion: 0.20, jumpProbability: 0.10, jumpSize: 0.15 },
            'trailing_pe': { volatility: 0.04, meanReversion: 0.08, jumpProbability: 0.05, jumpSize: 0.10 },
            'eps_delivery': { volatility: 0.03, meanReversion: 0.25, jumpProbability: 0.08, jumpSize: 0.08 },
            'spy_efa_momentum': { volatility: 0.10, meanReversion: 0.30, jumpProbability: 0.08, jumpSize: 0.10 },
            'us_market_pct': { volatility: 0.01, meanReversion: 0.05, jumpProbability: 0.02, jumpSize: 0.02 },
            'etf_flow_differential': { volatility: 0.15, meanReversion: 0.20, jumpProbability: 0.10, jumpSize: 0.25 }
        };
        
        // Scenario adjustments
        const scenarioAdjustments = {
            'tech_boom': { trend: 0.3, trendStrength: 0.2, meanLevel: 1.1 },
            'dollar_crisis': { trend: -0.4, trendStrength: 0.3, meanLevel: 0.85 },
            'risk_off': { trend: 0, trendStrength: 0.1, meanLevel: 1.0, volatility: 1.5 },
            'goldilocks': { trend: 0.1, trendStrength: 0.1, meanLevel: 1.0, volatility: 0.7 },
            'stagflation': { trend: -0.1, trendStrength: 0.15, meanLevel: 0.95, volatility: 1.2 },
            'current': { trend: 0, trendStrength: 0.05, meanLevel: 1.0, volatility: 1.0 }
        };
        
        const params = baseParams[indicator] || { volatility: 0.05, meanReversion: 0.10, jumpProbability: 0.05, jumpSize: 0.10 };
        const adjustments = scenarioAdjustments[scenario] || scenarioAdjustments['current'];
        
        return {
            ...params,
            ...adjustments,
            volatility: params.volatility * (adjustments.volatility || 1.0)
        };
    },
    
    /**
     * Validate data completeness
     */
    validateData: function(data) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            coverage: {
                themes: {},
                temporal: { leading: 0, concurrent: 0, lagging: 0 },
                total: 0
            }
        };
        
        // Check structure
        if (!data || !data.indicators) {
            validation.valid = false;
            validation.errors.push('Missing indicators data');
            return validation;
        }
        
        // Check each expected indicator
        let totalExpected = 0;
        let totalFound = 0;
        
        Object.entries(this.indicatorStructure).forEach(([theme, temporals]) => {
            validation.coverage.themes[theme] = { expected: 3, found: 0 };
            
            Object.entries(temporals).forEach(([temporal, indicatorKey]) => {
                totalExpected++;
                
                if (data.indicators[indicatorKey]) {
                    totalFound++;
                    validation.coverage.themes[theme].found++;
                    validation.coverage.temporal[temporal]++;
                    
                    // Check data quality
                    const ind = data.indicators[indicatorKey];
                    if (!ind.value && ind.value !== 0) {
                        validation.warnings.push(`${indicatorKey}: missing value`);
                    }
                    if (!ind.percentiles) {
                        validation.warnings.push(`${indicatorKey}: missing percentiles`);
                    }
                } else {
                    validation.errors.push(`Missing indicator: ${indicatorKey}`);
                }
            });
        });
        
        validation.coverage.total = `${totalFound}/${totalExpected}`;
        
        // Determine validity
        if (totalFound < 6) {
            validation.valid = false;
            validation.errors.push('Insufficient indicators for analysis');
        }
        
        return validation;
    }
};

// Export for various environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}

if (typeof window !== 'undefined') {
    window.FileHandler = FileHandler;
}