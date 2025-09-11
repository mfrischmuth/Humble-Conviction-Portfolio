/**
 * HCP Portfolio Tracker - File Handler Module v2.1
 * File: file_handler_v2_1.js
 * Based on: IPS v4.1 Extended History Indicators
 * Last Updated: 2025-09-05 19:15:00 UTC
 * 
 * CHANGES IN v2.1:
 * - QQQ/SPY replaces ARKK/SPY for innovation theme
 * - SPY/EFA replaces SPY/VXUS for US leadership theme
 * - Updated ranges for new indicators
 * - All other functionality PRESERVED from v2.0
 * 
 * HANDLES:
 * - Generate test data for 12 indicators per IPS v4.1
 * - Calculate historical percentiles
 * - Create realistic market scenarios
 * - Support theme history generation
 */

const FileHandler = {
    version: '2.1',
    framework: 'IPS v4.1 Extended History Indicators',
    
    // Scenario configurations for testing - UPDATED FOR v2.1
    scenarios: {
        'current_market': {
            name: 'Current Market Conditions',
            description: 'September 2025 market environment',
            values: {
                // USD indicators
                dxy: 104.5,                    // Moderately strong dollar
                real_rate_diff: 1.8,           // US rates attractive
                cofer_usd: 58.5,              // Declining slowly
                // Innovation indicators - UPDATED
                qqq_spy: 1.12,                // Tech moderate outperformance (was arkk_spy: 0.42)
                productivity: 2.1,             // Moderate growth
                rd_revenue: 0.031,            // Average R&D spending
                // P/E indicators
                put_call: 1.15,               // Slightly fearful (inverted)
                forward_pe: 19.5,             // Above average
                eps_delivery: 0.97,          // Slight disappointment
                // US Leadership indicators - UPDATED
                spy_efa_momentum: 0.08,       // US outperforming (was spy_vxus_momentum)
                us_market_cap_pct: 62.5,     // High US dominance
                etf_flow_differential: 15.2   // Flows favoring US
            }
        },
        'tech_boom': {
            name: 'Technology Boom',
            description: 'Innovation surge with high valuations',
            values: {
                dxy: 102.0,
                real_rate_diff: 0.5,
                cofer_usd: 59.0,
                qqq_spy: 1.25,               // Tech outperforming (was arkk_spy: 0.68)
                productivity: 3.8,            // Strong productivity
                rd_revenue: 0.045,           // High R&D
                put_call: 0.65,              // Greed (inverted indicator)
                forward_pe: 24.5,            // Elevated valuations
                eps_delivery: 1.08,          // Beating expectations
                spy_efa_momentum: 0.12,      // US leading (was spy_vxus_momentum)
                us_market_cap_pct: 64.0,
                etf_flow_differential: 28.5
            }
        },
        'risk_off': {
            name: 'Risk-Off Environment',
            description: 'Flight to safety, compressed valuations',
            values: {
                dxy: 108.5,                   // Strong dollar (safety)
                real_rate_diff: 2.5,         // High US real rates
                cofer_usd: 61.0,             // USD demand up
                qqq_spy: 0.95,               // Tech underperforming (was arkk_spy: 0.31)
                productivity: 0.8,           // Productivity decline
                rd_revenue: 0.025,          // R&D cuts
                put_call: 1.85,             // High fear (inverted)
                forward_pe: 15.2,           // Compressed valuations
                eps_delivery: 0.88,         // Missing expectations
                spy_efa_momentum: -0.05,    // International resilient (was spy_vxus_momentum)
                us_market_cap_pct: 58.5,
                etf_flow_differential: -12.3
            }
        },
        'dollar_decline': {
            name: 'Dollar Decline Scenario',
            description: 'Weakening USD with international outperformance',
            values: {
                dxy: 96.5,                    // Weak dollar
                real_rate_diff: -0.3,        // Negative real rate diff
                cofer_usd: 55.2,            // Reserve share declining
                qqq_spy: 1.08,              // Tech neutral (was arkk_spy: 0.45)
                productivity: 2.3,
                rd_revenue: 0.032,
                put_call: 0.95,
                forward_pe: 18.0,
                eps_delivery: 1.02,
                spy_efa_momentum: -0.08,    // International leading (was spy_vxus_momentum)
                us_market_cap_pct: 56.0,    // US share declining
                etf_flow_differential: -22.5 // Flows to international
            }
        }
    },

    /**
     * Generate percentile boundaries for an indicator
     * Using realistic distributions based on historical patterns
     * UPDATED ranges for QQQ/SPY and SPY/EFA
     */
    generatePercentiles: function(indicatorKey, currentValue) {
        // Define realistic ranges for each indicator - UPDATED FOR v2.1
        const ranges = {
            // USD indicators
            dxy: { min: 89, max: 114, median: 100 },
            real_rate_diff: { min: -2.0, max: 3.5, median: 0.8 },
            cofer_usd: { min: 54, max: 72, median: 60 },
            // Innovation indicators - UPDATED
            qqq_spy: { min: 0.85, max: 1.35, median: 1.10 },  // QQQ typically 10% above SPY
            productivity: { min: -1.5, max: 4.5, median: 2.0 },
            rd_revenue: { min: 0.020, max: 0.048, median: 0.032 },
            // P/E indicators
            put_call: { min: 0.55, max: 2.2, median: 1.05 },
            forward_pe: { min: 13.5, max: 26.0, median: 18.0 },
            eps_delivery: { min: 0.85, max: 1.15, median: 1.00 },
            // US Leadership indicators - UPDATED
            spy_efa_momentum: { min: -0.15, max: 0.20, median: 0.03 },  // SPY/EFA momentum
            us_market_cap_pct: { min: 52, max: 65, median: 58 },
            etf_flow_differential: { min: -35, max: 40, median: 5 }
        };

        const range = ranges[indicatorKey];
        if (!range) {
            console.warn(`No range defined for ${indicatorKey}, using defaults`);
            return {
                min: currentValue * 0.7,
                p33: currentValue * 0.9,
                p67: currentValue * 1.1,
                max: currentValue * 1.3
            };
        }

        // Calculate percentiles with some skew based on current value position
        const position = (currentValue - range.min) / (range.max - range.min);
        
        // Adjust percentiles to reflect current market position
        let p33, p67;
        
        if (position < 0.33) {
            // Current value in bottom tercile
            p33 = currentValue + (range.median - currentValue) * 0.3;
            p67 = range.median + (range.max - range.median) * 0.3;
        } else if (position > 0.67) {
            // Current value in top tercile
            p33 = range.min + (range.median - range.min) * 0.7;
            p67 = currentValue - (currentValue - range.median) * 0.3;
        } else {
            // Current value in middle tercile
            p33 = range.min + (range.median - range.min) * 0.6;
            p67 = range.median + (range.max - range.median) * 0.4;
        }

        return {
            min: range.min,
            p33: p33,
            p67: p67,
            max: range.max
        };
    },

    /**
     * Generate historical theme values for trend analysis
     * PRESERVED FROM v2.0
     */
    generateThemeHistory: function(months = 36) {
        const history = {
            usd: [],
            innovation: [],
            pe: [],
            usLeadership: []
        };

        // Generate realistic historical patterns
        for (let i = 0; i < months; i++) {
            const t = i / months;
            
            // USD: Gradual decline trend
            history.usd.push(0.3 * Math.cos(t * Math.PI) - 0.1 * t + 0.1 * Math.sin(t * 8 * Math.PI));
            
            // Innovation: Cyclical with upward trend
            history.innovation.push(-0.2 + 0.4 * t + 0.3 * Math.sin(t * 4 * Math.PI));
            
            // P/E: Mean reverting around zero
            history.pe.push(0.4 * Math.sin(t * 2 * Math.PI) + 0.1 * Math.cos(t * 6 * Math.PI));
            
            // US Leadership: Declining from high
            history.usLeadership.push(0.5 - 0.3 * t + 0.2 * Math.sin(t * 3 * Math.PI));
        }

        // Normalize to [-1, 1] range
        Object.keys(history).forEach(theme => {
            history[theme] = history[theme].map(val => 
                Math.max(-1, Math.min(1, val))
            );
        });

        return history;
    },

    /**
     * Generate complete test data package
     * UPDATED FOR v2.1
     */
    generateTestData: function(scenarioName = 'current_market') {
        const scenario = this.scenarios[scenarioName];
        if (!scenario) {
            console.error(`Unknown scenario: ${scenarioName}`);
            return null;
        }

        const data = {
            metadata: {
                generated: new Date().toISOString(),
                scenario: scenarioName,
                description: scenario.description,
                version: this.version,
                framework: this.framework
            },
            indicators: {},
            themeHistories: this.generateThemeHistory()
        };

        // Generate indicator data with percentiles - UPDATED MAPPING
        const indicatorMapping = {
            dxy: 'dxy',
            real_rate_diff: 'real_rate_diff',
            cofer_usd: 'cofer_usd',
            qqq_spy: 'qqq_spy',  // UPDATED from arkk_spy
            productivity: 'productivity',
            rd_revenue: 'rd_revenue',
            put_call: 'put_call',
            forward_pe: 'forward_pe',
            eps_delivery: 'eps_delivery',
            spy_efa_momentum: 'spy_efa_momentum',  // UPDATED from spy_vxus_momentum
            us_market_cap_pct: 'us_market_cap_pct',
            etf_flow_differential: 'etf_flow_differential'
        };

        Object.entries(indicatorMapping).forEach(([dataKey, scenarioKey]) => {
            const value = scenario.values[scenarioKey];
            data.indicators[dataKey] = {
                value: value,
                percentiles: this.generatePercentiles(dataKey, value),
                lastUpdated: new Date().toISOString(),
                source: 'mock_data'
            };
        });

        return data;
    },

    /**
     * Load data from file (browser environment)
     * PRESERVED FROM v2.0
     */
    loadFromFile: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Validate structure
                    if (!data.indicators) {
                        throw new Error('Invalid data structure: missing indicators');
                    }
                    
                    // Check for new format (with percentiles) vs old format
                    const firstIndicator = Object.values(data.indicators)[0];
                    if (firstIndicator && !firstIndicator.percentiles) {
                        console.warn('Old data format detected, percentiles will need calculation');
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error.message}`));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    },

    /**
     * Save data to file (download)
     * PRESERVED FROM v2.0
     */
    saveToFile: function(data, filename = null) {
        const timestamp = new Date().toISOString().split('T')[0];
        const scenarioName = data.metadata?.scenario || 'custom';
        const defaultFilename = `hcp_data_${scenarioName}_${timestamp}.json`;
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || defaultFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Data saved to ${a.download}`);
    },

    /**
     * Migrate old format data to new format
     * UPDATED FOR v2.1 - handles ARKK→QQQ and VXUS→EFA migration
     */
    migrateOldData: function(oldData) {
        console.log('Migrating old data format to v2.1 structure');
        
        const newData = {
            metadata: {
                migrated: new Date().toISOString(),
                originalVersion: oldData.version || 'unknown',
                version: this.version,
                framework: this.framework
            },
            indicators: {},
            themeHistories: null
        };

        // Map old indicators to new structure - UPDATED FOR v2.1
        const oldToNewMapping = {
            // Old format might have different keys
            'dxy': 'dxy',
            'goldHoldings': null,  // Removed in new framework
            'yuanSwiftShare': null,  // Removed
            'reserveShare': 'cofer_usd',
            'real_rate_diff': 'real_rate_diff',  // May already exist
            'arkk_spy': 'qqq_spy',  // MIGRATE ARKK to QQQ - scale by 0.6
            'qqqSpyRatio': 'qqq_spy',  // Old name compatibility
            'productivity': 'productivity',
            'netMargins': null,  // Replaced with rd_revenue
            'rd_revenue': 'rd_revenue',  // May already exist
            'forwardPE': 'forward_pe',
            'forward_pe': 'forward_pe',  // May already exist
            'cape': null,  // Removed
            'riskPremium': 'put_call',
            'put_call': 'put_call',  // May already exist
            'eps_delivery': 'eps_delivery',  // May already exist
            'spy_vxus_momentum': 'spy_efa_momentum',  // MIGRATE VXUS to EFA
            'spVsWorld': null,  // Old indicator
            'usPercentACWI': 'us_market_cap_pct',
            'us_market_cap_pct': 'us_market_cap_pct',  // May already exist
            'ticFlows': 'etf_flow_differential',
            'etf_flow_differential': 'etf_flow_differential'  // May already exist
        };

        // Migrate available indicators
        Object.entries(oldToNewMapping).forEach(([oldKey, newKey]) => {
            if (newKey && oldData.indicators && oldData.indicators[oldKey]) {
                const oldIndicator = oldData.indicators[oldKey];
                const value = oldIndicator.current || oldIndicator.value || 0;
                
                // Scale adjustments for indicator changes
                let adjustedValue = value;
                if (oldKey === 'arkk_spy' && newKey === 'qqq_spy') {
                    // ARKK/SPY typically ranges 0.25-0.85, QQQ/SPY typically 0.85-1.35
                    adjustedValue = 0.9 + value * 0.6;  // Rough conversion
                }
                
                // Convert to new structure
                newData.indicators[newKey] = {
                    value: adjustedValue,
                    percentiles: this.generatePercentiles(newKey, adjustedValue),
                    lastUpdated: oldIndicator.lastUpdated || new Date().toISOString(),
                    source: 'migrated'
                };
            }
        });

        // Fill in missing indicators with defaults - UPDATED LIST
        const allNewIndicators = [
            'dxy', 'real_rate_diff', 'cofer_usd',
            'qqq_spy', 'productivity', 'rd_revenue',  // QQQ not ARKK
            'put_call', 'forward_pe', 'eps_delivery',
            'spy_efa_momentum', 'us_market_cap_pct', 'etf_flow_differential'  // EFA not VXUS
        ];

        allNewIndicators.forEach(key => {
            if (!newData.indicators[key]) {
                // Use current market scenario defaults for missing
                const defaultValue = this.scenarios.current_market.values[key] || 0;
                newData.indicators[key] = {
                    value: defaultValue,
                    percentiles: this.generatePercentiles(key, defaultValue),
                    lastUpdated: new Date().toISOString(),
                    source: 'default'
                };
            }
        });

        console.log(`Migration complete: ${Object.keys(newData.indicators).length} indicators`);
        console.log('Note: ARKK/SPY migrated to QQQ/SPY with scaling');
        console.log('Note: SPY/VXUS migrated to SPY/EFA');
        
        return newData;
    },

    /**
     * Validate data structure
     * UPDATED FOR v2.1
     */
    validateData: function(data) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Check basic structure
        if (!data) {
            validation.valid = false;
            validation.errors.push('No data provided');
            return validation;
        }

        if (!data.indicators) {
            validation.valid = false;
            validation.errors.push('Missing indicators object');
            return validation;
        }

        // Check for required indicators - UPDATED LIST
        const requiredIndicators = [
            'dxy', 'real_rate_diff', 'cofer_usd',
            'qqq_spy', 'productivity', 'rd_revenue',  // QQQ not ARKK
            'put_call', 'forward_pe', 'eps_delivery',
            'spy_efa_momentum', 'us_market_cap_pct', 'etf_flow_differential'  // EFA not VXUS
        ];

        requiredIndicators.forEach(key => {
            if (!data.indicators[key]) {
                validation.warnings.push(`Missing indicator: ${key}`);
            } else {
                const indicator = data.indicators[key];
                
                if (indicator.value === null || indicator.value === undefined) {
                    validation.warnings.push(`No value for indicator: ${key}`);
                }
                
                if (!indicator.percentiles) {
                    validation.warnings.push(`No percentiles for indicator: ${key}`);
                }
            }
        });

        // Check theme histories if present
        if (data.themeHistories) {
            const themes = ['usd', 'innovation', 'pe', 'usLeadership'];
            themes.forEach(theme => {
                if (!data.themeHistories[theme]) {
                    validation.warnings.push(`Missing history for theme: ${theme}`);
                } else if (data.themeHistories[theme].length < 6) {
                    validation.warnings.push(`Insufficient history for theme: ${theme}`);
                }
            });
        } else {
            validation.warnings.push('No theme histories for trend analysis');
        }

        // Set overall validity
        if (validation.warnings.length > 6) {
            validation.valid = false;
            validation.errors.push('Too many missing indicators for reliable analysis');
        }

        return validation;
    },

    /**
     * Display data summary in UI
     * PRESERVED FROM v2.0 with minor updates
     */
    displayDataSummary: function(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const validation = this.validateData(data);
        
        let html = `
            <div class="data-summary">
                <h3>Data Summary</h3>
                <div class="metadata">
                    <p>Generated: ${data.metadata?.generated || 'Unknown'}</p>
                    <p>Scenario: ${data.metadata?.scenario || 'Unknown'}</p>
                    <p>Version: ${data.metadata?.version || 'Unknown'}</p>
                    <p>Framework: ${data.metadata?.framework || 'IPS v4.1'}</p>
                </div>
                
                <div class="validation ${validation.valid ? 'valid' : 'invalid'}">
                    <p>Status: ${validation.valid ? 'Valid' : 'Invalid'}</p>
                    ${validation.errors.length > 0 ? 
                        `<p class="errors">Errors: ${validation.errors.join(', ')}</p>` : ''}
                    ${validation.warnings.length > 0 ? 
                        `<p class="warnings">Warnings: ${validation.warnings.length} issues</p>` : ''}
                </div>
                
                <div class="indicators">
                    <h4>Indicator Coverage</h4>
                    <table>
                        <tr>
                            <th>Theme</th>
                            <th>Leading</th>
                            <th>Concurrent</th>
                            <th>Lagging</th>
                        </tr>
        `;

        // Check coverage by theme and temporal - UPDATED INDICATORS
        const coverage = {
            usd: { leading: 'dxy', concurrent: 'real_rate_diff', lagging: 'cofer_usd' },
            innovation: { leading: 'qqq_spy', concurrent: 'productivity', lagging: 'rd_revenue' },
            pe: { leading: 'put_call', concurrent: 'forward_pe', lagging: 'eps_delivery' },
            usLeadership: { leading: 'spy_efa_momentum', concurrent: 'us_market_cap_pct', lagging: 'etf_flow_differential' }
        };

        Object.entries(coverage).forEach(([theme, indicators]) => {
            html += '<tr>';
            html += `<td>${theme}</td>`;
            
            Object.entries(indicators).forEach(([temporal, key]) => {
                const hasData = data.indicators[key] && 
                              data.indicators[key].value !== null &&
                              data.indicators[key].percentiles;
                html += `<td class="${hasData ? 'available' : 'missing'}">
                    ${hasData ? '✓' : '✗'}
                </td>`;
            });
            
            html += '</tr>';
        });

        html += `
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}

// Browser global
if (typeof window !== 'undefined') {
    window.FileHandler = FileHandler;
}