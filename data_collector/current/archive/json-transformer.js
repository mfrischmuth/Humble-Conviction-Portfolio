// Master JSON Structure Transformer v1.1
// Last Updated: 2025-09-07 23:50 UTC
// Purpose: Restructure v4.3.1 master JSON for test interface compatibility

function transformMasterJSON(originalData) {
    console.log('Transforming v4.3.1 master JSON structure...');
    
    // Create test interface compatible structure
    const transformedData = {
        metadata: {
            ...originalData.metadata,
            transformer_version: "1.1",
            transformation_date: new Date().toISOString(),
            original_version: originalData.metadata?.version || "4.3.1"
        },
        indicators: {},
        data_quality: originalData.data_quality || {}
    };
    
    // Map v4.3.1 data structure to test interface structure
    // Based on the integrity report, we have these indicators with real data:
    
    const indicatorMappings = {
        // USD Dominance Theme
        'dxy_index': {
            source: 'dxy',
            hasDaily: true,
            hasMonthly: true
        },
        'real_rate_differential': {
            source: 'real_rate_differential',
            hasMonthly: true
        },
        'cofer_usd': {
            source: 'cofer_usd',
            isQuarterly: true
        },
        
        // Innovation Theme
        'qqq_spy_ratio': {
            source: 'qqq_spy',
            hasMonthly: true,
            hasDaily: true
        },
        'productivity_growth': {
            source: 'productivity',
            hasQuarterly: true
        },
        'tech_employment_pct': {
            source: 'tech_employment',
            hasMonthly: true
        },
        
        // Valuation Theme
        'put_call_ratio': {
            source: 'put_call_ratio',
            hasMonthly: true
        },
        'trailing_pe': {
            source: 'trailing_pe',
            hasMonthly: true
        },
        'eps_delivery': {
            source: 'eps_delivery',
            hasQuarterly: true
        },
        
        // US Leadership Theme
        'spy_efa_momentum': {
            source: 'spy_efa_momentum',
            hasMonthly: true
        },
        'us_market_pct': {
            source: 'us_market_pct',
            hasMonthly: true
        },
        'etf_flow_differential': {
            source: 'etf_flow_differential',
            hasMonthly: true
        }
    };
    
    // Process each indicator
    Object.entries(indicatorMappings).forEach(([targetKey, mapping]) => {
        console.log(`Processing ${targetKey}...`);
        
        // Initialize indicator structure
        const indicator = {
            value: null,
            percentiles: {
                min: null,
                p33: null,
                p67: null,
                max: null
            },
            monthly_history: [],
            daily_values: [],
            last_updated: new Date().toISOString(),
            source: "v4.3.1 collector",
            data_quality: "real"
        };
        
        // Look for data in historical_data section
        const sourceData = originalData.historical_data?.[mapping.source];
        
        if (sourceData) {
            // Extract current value
            if (sourceData.current_value !== undefined) {
                indicator.value = sourceData.current_value;
            }
            
            // Extract monthly history
            if (sourceData.monthly_history) {
                indicator.monthly_history = sourceData.monthly_history;
                // If no current value, use last from history
                if (indicator.value === null && sourceData.monthly_history.length > 0) {
                    indicator.value = sourceData.monthly_history[sourceData.monthly_history.length - 1];
                }
            }
            
            // Handle quarterly data (COFER, Productivity, EPS)
            if (mapping.isQuarterly && !sourceData.monthly_history) {
                const monthlyData = [];
                
                // For COFER-style quarterly data
                if (mapping.source === 'cofer_usd') {
                    Object.entries(sourceData).forEach(([key, value]) => {
                        if (key.includes('-Q') && typeof value === 'number') {
                            // Repeat quarterly value for 3 months
                            for (let i = 0; i < 3; i++) {
                                monthlyData.push(value);
                            }
                        }
                    });
                }
                // For other quarterly data
                else if (sourceData.quarterly_history) {
                    sourceData.quarterly_history.forEach(value => {
                        for (let i = 0; i < 3; i++) {
                            monthlyData.push(value);
                        }
                    });
                }
                
                if (monthlyData.length > 0) {
                    indicator.monthly_history = monthlyData;
                    indicator.value = monthlyData[monthlyData.length - 1];
                }
            }
            
            // Extract daily values if available
            if (sourceData.daily_values && mapping.hasDaily) {
                indicator.daily_values = sourceData.daily_values;
                // Update current value from latest daily if needed
                if (indicator.value === null && sourceData.daily_values.length > 0) {
                    indicator.value = sourceData.daily_values[sourceData.daily_values.length - 1];
                }
            }
            
            // Set data source info
            if (sourceData.source) {
                indicator.source = sourceData.source;
            }
            
            // Mark data quality
            if (sourceData.quality_note) {
                indicator.data_quality = sourceData.quality_note.includes('estimate') ? 'partial' : 'real';
            }
        }
        
        // Calculate percentiles from monthly history
        if (indicator.monthly_history && indicator.monthly_history.length > 0) {
            const sorted = [...indicator.monthly_history].filter(v => v !== null).sort((a, b) => a - b);
            if (sorted.length > 0) {
                indicator.percentiles = {
                    min: sorted[0],
                    p33: sorted[Math.floor(sorted.length * 0.33)],
                    p67: sorted[Math.floor(sorted.length * 0.67)],
                    max: sorted[sorted.length - 1]
                };
            }
        }
        
        // Store transformed indicator
        transformedData.indicators[targetKey] = indicator;
    });
    
    // Also check for indicators stored directly under different names
    const alternateNames = {
        'dxy': 'dxy_index',
        'qqq_spy': 'qqq_spy_ratio',
        'productivity': 'productivity_growth',
        'tech_employment': 'tech_employment_pct',
        'pe_ratio': 'trailing_pe',
        'eps': 'eps_delivery',
        'spy_efa': 'spy_efa_momentum',
        'us_pct': 'us_market_pct',
        'flow_diff': 'etf_flow_differential'
    };
    
    // Check for data under alternate names
    Object.entries(alternateNames).forEach(([altName, targetKey]) => {
        if (originalData.historical_data?.[altName] && !transformedData.indicators[targetKey].value) {
            const altData = originalData.historical_data[altName];
            const indicator = transformedData.indicators[targetKey];
            
            if (altData.monthly_history) {
                indicator.monthly_history = altData.monthly_history;
            }
            if (altData.daily_values) {
                indicator.daily_values = altData.daily_values;
            }
            if (altData.current_value !== undefined) {
                indicator.value = altData.current_value;
            } else if (indicator.monthly_history.length > 0) {
                indicator.value = indicator.monthly_history[indicator.monthly_history.length - 1];
            }
            
            // Recalculate percentiles
            if (indicator.monthly_history.length > 0) {
                const sorted = [...indicator.monthly_history].filter(v => v !== null).sort((a, b) => a - b);
                indicator.percentiles = {
                    min: sorted[0],
                    p33: sorted[Math.floor(sorted.length * 0.33)],
                    p67: sorted[Math.floor(sorted.length * 0.67)],
                    max: sorted[sorted.length - 1]
                };
            }
        }
    });
    
    // Update data quality summary
    const indicators = Object.values(transformedData.indicators);
    const withData = indicators.filter(i => i.value !== null).length;
    const withHistory = indicators.filter(i => i.monthly_history.length >= 60).length;
    const withDaily = indicators.filter(i => i.daily_values.length >= 63).length;
    
    transformedData.data_quality = {
        indicators_collected: 12,
        indicators_with_data: withData,
        garch_ready: withHistory,
        daily_ready: withDaily,
        completion_rate: Math.round((withData / 12) * 100),
        overall: withData >= 10 ? "GOOD" : withData >= 6 ? "FAIR" : "POOR",
        garch_ready_indicators: `${withHistory}/12`
    };
    
    // Log summary
    console.log('========================================');
    console.log('Transformation Complete!');
    console.log(`Indicators with data: ${withData}/12`);
    console.log(`GARCH ready (60+ months): ${withHistory}/12`);
    console.log(`Daily data ready: ${withDaily}/12`);
    console.log('========================================');
    
    // List any missing indicators
    const missing = [];
    Object.entries(transformedData.indicators).forEach(([key, ind]) => {
        if (!ind.value || ind.monthly_history.length === 0) {
            missing.push(key);
        }
    });
    
    if (missing.length > 0) {
        console.log('⚠️ Missing or incomplete indicators:');
        missing.forEach(key => console.log(`  - ${key}`));
    }
    
    return transformedData;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { transformMasterJSON };
}

// Usage instructions
console.log('Master JSON Structure Transformer v1.1');
console.log('======================================');
console.log('');
console.log('USAGE:');
console.log('1. Load your hcp_master_data.json in test interface');
console.log('2. Open browser console (F12)');
console.log('3. Paste this entire script');
console.log('4. Run: transformedData = transformMasterJSON(masterData);');
console.log('5. Then: masterData = transformedData;');
console.log('6. Click "Test Data Validation" to verify');
console.log('');
console.log('TO SAVE:');
console.log('copy(JSON.stringify(transformedData, null, 2));');
console.log('Then paste into new file: hcp_master_data_test.json');