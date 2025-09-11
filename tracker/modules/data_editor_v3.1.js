/**
 * HCP Portfolio Tracker - Data Editor Module v3.1
 * File: data_editor_v3_1.js
 * Based on: v3.0 with IPS v4.4 transformation support
 * Last Updated: 2025-09-11T10:00:00Z
 * 
 * CHANGES IN v3.1:
 * - IPS v4.4 COMPLIANCE: tic_foreign_demand replaces real_rate_differential
 * - TRANSFORMATION AWARENESS: Shows both raw and transformed values
 * - Enhanced display with transformation indicators
 * - Added transformation status badges
 * - Improved value selection logic for editing
 * - Added support for Data Collector v6.2.1 structure
 * 
 * PRESERVED FROM v3.0:
 * - Theme name 'valuation' (not 'pe')
 * - All modal functionality
 * - Manual override tracking
 * - Yellow highlighting for edited values
 */

const DataEditor = {
    version: '3.1',
    editingIndicator: null,
    
    // Display data table with edit buttons - ENHANCED for IPS v4.4 transformations
    displayDataTable: function(monthlyData, indicators, manualOverrides = {}) {
        const container = document.getElementById('data-table-container');
        if (!container || !monthlyData) return;
        
        let html = '<table class="data-table"><thead><tr>';
        html += '<th>Theme</th><th>Indicator</th><th>Temporal</th>';
        html += '<th>Raw Value</th><th>Transformed</th><th>Status</th>';
        html += '<th>Source</th><th>Action</th>';
        html += '</tr></thead><tbody>';
        
        // Get indicator definitions from Indicators module if available
        const indicatorDefs = (typeof Indicators !== 'undefined' && Indicators.definitions) 
            ? Indicators.definitions 
            : this.getDefaultIndicatorDefinitions();
        
        Object.entries(indicatorDefs).forEach(([theme, themeIndicators]) => {
            Object.entries(themeIndicators).forEach(([key, config]) => {
                const dataKey = config.dataKey;
                const indicator = this.getIndicatorData(monthlyData, dataKey, config.oldDataKey);
                const isManual = manualOverrides[dataKey] || (config.oldDataKey && manualOverrides[config.oldDataKey]);
                
                // Get both raw and transformed values
                const rawValue = this.getRawValue(indicator);
                const transformedValue = this.getTransformedValue(indicator);
                const hasTransformation = config.hasTransformation || (transformedValue !== null);
                
                // Determine which value to use for editing
                const editValue = hasTransformation ? transformedValue : rawValue;
                
                html += `<tr class="${isManual ? 'manual-override' : ''}">`;
                html += `<td>${theme.toUpperCase()}</td>`;
                html += `<td>${config.name}</td>`;
                html += `<td><span class="temporal-badge temporal-${config.temporal}">${config.temporal}</span></td>`;
                
                // Raw value column
                html += `<td>${rawValue !== null ? this.formatValue(rawValue, dataKey, false) : 'N/A'}</td>`;
                
                // Transformed value column (show transformation type if available)
                if (hasTransformation && transformedValue !== null) {
                    html += `<td>`;
                    html += `${this.formatValue(transformedValue, dataKey, true)}`;
                    if (config.transformation) {
                        html += `<br><small style="color: #666;">${config.transformation}</small>`;
                    }
                    html += `</td>`;
                } else {
                    html += `<td style="color: #999;">-</td>`;
                }
                
                // Status column
                html += `<td>`;
                if (isManual) {
                    html += '<span class="status-manual">✏️ Manual</span>';
                } else if (hasTransformation) {
                    html += '<span class="status-transformed">🔄 Transformed</span>';
                } else {
                    html += '<span class="status-good">✓ Raw</span>';
                }
                html += '</td>';
                
                // Source column
                html += `<td style="font-size: 0.9em;">${config.source || 'Automated'}</td>`;
                
                // Action column
                html += `<td><button class="edit-btn" onclick="DataEditor.openEditModal('${dataKey}', '${config.name}', ${editValue}, ${hasTransformation})">Edit</button></td>`;
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        // Add transformation legend
        this.addTransformationLegend(container);
    },
    
    // Add legend for transformation status
    addTransformationLegend: function(container) {
        const legend = document.createElement('div');
        legend.className = 'transformation-legend';
        legend.style.cssText = 'margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;';
        legend.innerHTML = `
            <strong>Status Legend:</strong>
            <span style="margin-left: 15px;">✓ Raw Data</span>
            <span style="margin-left: 15px;">🔄 Transformed Signal</span>
            <span style="margin-left: 15px;">✏️ Manual Override</span>
            <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                Note: Transformed values are used for calculations when available
            </div>
        `;
        container.appendChild(legend);
    },
    
    // Get default indicator definitions for IPS v4.4 - UPDATED
    getDefaultIndicatorDefinitions: function() {
        return {
            usd: {
                dxy: { 
                    name: 'DXY Index', 
                    temporal: 'leading',
                    dataKey: 'dxy_index',
                    hasTransformation: true,
                    transformation: '3-month rate of change',
                    source: 'Yahoo Finance'
                },
                ticDemand: { // UPDATED from realRate
                    name: 'TIC Foreign Demand', 
                    temporal: 'concurrent',
                    dataKey: 'tic_foreign_demand',
                    oldDataKey: 'real_rate_differential', // Backward compatibility
                    hasTransformation: true,
                    transformation: '3-month MA MoM change',
                    source: 'US Treasury TIC'
                },
                cofer: { 
                    name: 'IMF COFER Reserve Share', 
                    temporal: 'lagging',
                    dataKey: 'cofer_usd',
                    hasTransformation: false,
                    source: 'IMF Statistics'
                }
            },
            innovation: {
                qqqSpy: {
                    name: 'QQQ/SPY Ratio',
                    temporal: 'leading',
                    dataKey: 'qqq_spy_ratio',
                    hasTransformation: false,
                    source: 'Yahoo Finance'
                },
                productivity: { 
                    name: 'US Productivity Growth', 
                    temporal: 'concurrent',
                    dataKey: 'productivity_growth',
                    hasTransformation: true,
                    transformation: '2-quarter MA',
                    source: 'FRED'
                },
                softwareInvestment: {
                    name: 'Software IP Investment',
                    temporal: 'lagging',
                    dataKey: 'software_ip_investment',
                    oldDataKey: 'tech_employment_pct',
                    hasTransformation: false,
                    source: 'FRED'
                }
            },
            valuation: {
                putCall: { 
                    name: 'Equity Put/Call Ratio', 
                    temporal: 'leading',
                    dataKey: 'put_call_ratio',
                    hasTransformation: false,
                    source: 'CBOE'
                },
                trailingPe: {
                    name: 'S&P 500 Trailing P/E',
                    temporal: 'concurrent',
                    dataKey: 'trailing_pe',
                    hasTransformation: true,
                    transformation: '% deviation from 3m avg',
                    source: 'Yahoo Finance'
                },
                capeChange: {
                    name: 'CAPE Rate of Change', 
                    temporal: 'lagging',
                    dataKey: 'cape_rate_of_change',
                    oldDataKey: 'eps_delivery',
                    hasTransformation: false,
                    source: 'Shiller Data'
                }
            },
            usLeadership: {
                spyEfa: {
                    name: 'SPY/EFA Momentum',
                    temporal: 'leading',
                    dataKey: 'spy_efa_momentum',
                    hasTransformation: true,
                    transformation: 'Monthly mean',
                    source: 'Yahoo Finance'
                },
                marketCapShare: { 
                    name: 'US Market Cap % Global', 
                    temporal: 'concurrent',
                    dataKey: 'us_market_pct',
                    hasTransformation: false,
                    source: 'Yahoo Finance'
                },
                returnDifferential: {
                    name: 'Total Return Differential', 
                    temporal: 'lagging',
                    dataKey: 'total_return_differential',
                    oldDataKey: 'etf_flow_differential',
                    hasTransformation: false,
                    source: 'Yahoo Finance'
                }
            }
        };
    },
    
    // Get indicator data supporting multiple structures
    getIndicatorData: function(data, key, oldKey = null) {
        if (!data || !data.indicators) return null;
        
        // Check for nested structure (by theme)
        const themes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        for (const theme of themes) {
            if (data.indicators[theme]) {
                const themeData = data.indicators[theme];
                for (const [indicatorKey, indicatorData] of Object.entries(themeData)) {
                    // Match by various possible fields
                    if (indicatorData.current_value !== undefined || 
                        indicatorData.currentValue !== undefined ||
                        indicatorData.value !== undefined) {
                        // This might be our indicator
                        if (this.matchesIndicator(indicatorData, key, oldKey)) {
                            return indicatorData;
                        }
                    }
                }
            }
        }
        
        // Check flat structure
        let indicator = data.indicators[key];
        if (!indicator && oldKey) {
            indicator = data.indicators[oldKey];
        }
        
        return indicator;
    },
    
    // Check if indicator data matches the key we're looking for
    matchesIndicator: function(indicatorData, key, oldKey) {
        // Check various possible field names in the data
        const possibleFields = [
            'dataKey', 'data_key', 'key', 'name', 'indicator'
        ];
        
        for (const field of possibleFields) {
            if (indicatorData[field] === key || 
                (oldKey && indicatorData[field] === oldKey)) {
                return true;
            }
        }
        
        return false;
    },
    
    // Get raw value from indicator data
    getRawValue: function(indicator) {
        if (!indicator) return null;
        
        // Priority: currentValue > current_value > current > value
        return indicator.currentValue !== undefined ? indicator.currentValue :
               indicator.current_value !== undefined ? indicator.current_value :
               indicator.current !== undefined ? indicator.current :
               indicator.value !== undefined ? indicator.value : null;
    },
    
    // Get transformed value from indicator data
    getTransformedValue: function(indicator) {
        if (!indicator) return null;
        
        // Priority: currentTransformed > current_transformed > transformed
        return indicator.currentTransformed !== undefined ? indicator.currentTransformed :
               indicator.current_transformed !== undefined ? indicator.current_transformed :
               indicator.transformed !== undefined ? indicator.transformed : null;
    },
    
    // Format value based on indicator type - ENHANCED for transformations
    formatValue: function(value, dataKey, isTransformed = false) {
        if (value === null || value === undefined) return 'N/A';
        
        // Special formatting for transformed values
        if (isTransformed) {
            // Rate of change / momentum indicators (show as percentage)
            if (dataKey === 'dxy_index' || dataKey === 'tic_foreign_demand') {
                return `${(value * 100).toFixed(2)}%`;
            }
            // Deviation indicators
            if (dataKey === 'trailing_pe') {
                return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
            }
            // Momentum differentials
            if (dataKey === 'spy_efa_momentum') {
                return `${value > 0 ? '+' : ''}${value.toFixed(4)}`;
            }
        }
        
        // Standard formatting
        if (dataKey.includes('pct') || dataKey.includes('rate') || 
            dataKey === 'cofer_usd' || dataKey === 'productivity_growth' ||
            dataKey === 'software_ip_investment') {
            return `${value.toFixed(2)}%`;
        }
        
        if (dataKey.includes('ratio') || dataKey === 'trailing_pe' || 
            dataKey === 'cape_rate_of_change') {
            return value.toFixed(3);
        }
        
        if (dataKey === 'dxy_index' || dataKey.includes('momentum')) {
            return value.toFixed(2);
        }
        
        if (dataKey === 'tic_foreign_demand') {
            return `${value > 0 ? '+' : ''}${value.toFixed(1)}B`;
        }
        
        if (dataKey === 'total_return_differential') {
            return `${value.toFixed(2)}%`;
        }
        
        return value.toFixed(2);
    },
    
    // Open edit modal - ENHANCED for transformation awareness
    openEditModal: function(dataKey, displayName, currentValue, hasTransformation = false) {
        this.editingIndicator = dataKey;
        this.hasTransformation = hasTransformation;
        
        const modal = document.getElementById('edit-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        if (!modal || !title || !body) {
            console.error('Modal elements not found');
            return;
        }
        
        title.textContent = `Edit: ${displayName}`;
        
        let transformationNote = '';
        if (hasTransformation) {
            transformationNote = `
                <div class="alert alert-info" style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">
                    ⚠️ This indicator uses a transformed value for calculations. 
                    Editing will override the transformation.
                </div>
            `;
        }
        
        body.innerHTML = `
            ${transformationNote}
            <div class="form-group">
                <label for="indicator-value">
                    ${hasTransformation ? 'Override Value:' : 'Current Value:'}
                </label>
                <input type="number" id="indicator-value" step="0.01" value="${currentValue || ''}" 
                       placeholder="Enter new value">
                ${hasTransformation ? '<small style="color: #666;">This will replace the transformed value</small>' : ''}
            </div>
            <div class="form-group">
                <label for="edit-reason">Reason for Manual Override:</label>
                <select id="edit-reason">
                    <option value="">Select reason...</option>
                    <option value="data_error">Data Collection Error</option>
                    <option value="timing_issue">Timing Issue</option>
                    <option value="source_problem">Source Unavailable</option>
                    <option value="manual_calculation">Manual Calculation</option>
                    <option value="cofer_update">COFER Quarterly Update</option>
                    <option value="tic_lag">TIC Data Publication Lag</option>
                    <option value="transformation_error">Transformation Error</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-notes">Notes (optional):</label>
                <textarea id="edit-notes" rows="3" placeholder="Additional details..."></textarea>
            </div>
        `;
        
        modal.style.display = 'block';
        document.getElementById('indicator-value').focus();
    },
    
    // Close edit modal - PRESERVED
    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingIndicator = null;
        this.hasTransformation = false;
    },
    
    // Save indicator edit - ENHANCED for transformations
    saveIndicatorEdit: function(trackerState, callback) {
        if (!this.editingIndicator) {
            alert('No indicator selected for editing');
            return false;
        }
        
        const valueInput = document.getElementById('indicator-value');
        const reasonSelect = document.getElementById('edit-reason');
        const notesInput = document.getElementById('edit-notes');
        
        if (!valueInput || !reasonSelect) {
            alert('Required form elements not found');
            return false;
        }
        
        const newValue = parseFloat(valueInput.value);
        const reason = reasonSelect.value;
        const notes = notesInput ? notesInput.value : '';
        
        // Validation
        if (isNaN(newValue)) {
            alert('Please enter a valid number');
            valueInput.focus();
            return false;
        }
        
        if (!reason) {
            alert('Please select a reason for the manual override');
            reasonSelect.focus();
            return false;
        }
        
        // Get the correct data key (handle migrations)
        const dataKey = this.getMigratedDataKey(this.editingIndicator);
        
        // Update the data - supports multiple structures
        if (trackerState.monthlyData && trackerState.monthlyData.indicators) {
            const indicator = this.findAndUpdateIndicator(
                trackerState.monthlyData.indicators, 
                dataKey, 
                newValue,
                reason,
                notes
            );
            
            if (indicator) {
                // If this indicator had a transformation, mark that it's been overridden
                if (this.hasTransformation) {
                    indicator.transformation_overridden = true;
                    indicator.original_transformed = indicator.currentTransformed || indicator.current_transformed;
                }
            }
        }
        
        // Track manual override
        if (!trackerState.manualOverrides) {
            trackerState.manualOverrides = {};
        }
        
        trackerState.manualOverrides[dataKey] = {
            value: newValue,
            reason: reason,
            notes: notes,
            wasTransformed: this.hasTransformation,
            timestamp: new Date().toISOString()
        };
        
        this.closeEditModal();
        
        // Call callback to refresh display
        if (callback) callback();
        
        console.log(`Manual override saved for ${dataKey}: ${newValue} (was transformed: ${this.hasTransformation})`);
        return true;
    },
    
    // Find and update indicator in nested or flat structure
    findAndUpdateIndicator: function(indicators, dataKey, newValue, reason, notes) {
        // Try flat structure first
        if (indicators[dataKey]) {
            return this.updateIndicatorValues(indicators[dataKey], newValue, reason, notes);
        }
        
        // Try nested structure
        const themes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        for (const theme of themes) {
            if (indicators[theme]) {
                for (const [key, indicator] of Object.entries(indicators[theme])) {
                    if (this.matchesIndicator(indicator, dataKey)) {
                        return this.updateIndicatorValues(indicator, newValue, reason, notes);
                    }
                }
            }
        }
        
        return null;
    },
    
    // Update indicator values
    updateIndicatorValues: function(indicator, newValue, reason, notes) {
        // Update all possible value fields
        if (indicator.currentValue !== undefined) {
            indicator.currentValue = newValue;
        }
        if (indicator.current_value !== undefined) {
            indicator.current_value = newValue;
        }
        if (indicator.current !== undefined) {
            indicator.current = newValue;
        }
        if (indicator.value !== undefined) {
            indicator.value = newValue;
        }
        
        // If transformed value exists, update it too (manual override)
        if (indicator.currentTransformed !== undefined) {
            indicator.currentTransformed = newValue;
        }
        if (indicator.current_transformed !== undefined) {
            indicator.current_transformed = newValue;
        }
        
        // Add manual override metadata
        indicator.manual_override = true;
        indicator.override_reason = reason;
        indicator.override_notes = notes;
        indicator.override_timestamp = new Date().toISOString();
        
        // Update history if present
        if (indicator.monthly_history && Array.isArray(indicator.monthly_history)) {
            indicator.monthly_history[0] = newValue; // Update most recent
        }
        
        return indicator;
    },
    
    // Get migrated data key for new indicators
    getMigratedDataKey: function(key) {
        const migrations = {
            'real_rate_differential': 'tic_foreign_demand', // IPS v4.4
            'tech_employment_pct': 'software_ip_investment',
            'eps_delivery': 'cape_rate_of_change',
            'etf_flow_differential': 'total_return_differential'
        };
        
        return migrations[key] || key;
    },
    
    // Check if indicator has manual override
    hasManualOverride: function(dataKey, manualOverrides) {
        if (!manualOverrides) return false;
        
        // Check new key
        if (manualOverrides[dataKey] !== undefined) return true;
        
        // Check old keys for backward compatibility
        const oldKeyMap = {
            'tic_foreign_demand': 'real_rate_differential',
            'software_ip_investment': 'tech_employment_pct',
            'cape_rate_of_change': 'eps_delivery',
            'total_return_differential': 'etf_flow_differential'
        };
        
        const oldKey = oldKeyMap[dataKey];
        return oldKey && manualOverrides[oldKey] !== undefined;
    },
    
    // Setup modal event listeners
    setupModalListeners: function() {
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('edit-modal');
            if (event.target === modal) {
                this.closeEditModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeEditModal();
            }
        });
        
        console.log('Data Editor v3.1 modal listeners setup (IPS v4.4 transformation-aware)');
    },
    
    // Validate IPS v4.4 compliance - UPDATED
    validateIPSCompliance: function(data) {
        const requiredFields = [
            'dxy_index', 'tic_foreign_demand', 'cofer_usd', // USD theme (tic_foreign_demand NEW)
            'qqq_spy_ratio', 'productivity_growth', 'software_ip_investment',
            'put_call_ratio', 'trailing_pe', 'cape_rate_of_change',
            'spy_efa_momentum', 'us_market_pct', 'total_return_differential'
        ];
        
        // Track transformations
        const transformedFields = [
            'dxy_index', 'tic_foreign_demand', 'productivity_growth',
            'trailing_pe', 'spy_efa_momentum'
        ];
        
        const validation = {
            isValid: true,
            missingFields: [],
            presentFields: [],
            transformedFields: [],
            usingOldFields: []
        };
        
        if (!data || !data.indicators) {
            validation.isValid = false;
            validation.error = 'No indicators data found';
            return validation;
        }
        
        // Check both flat and nested structures
        requiredFields.forEach(field => {
            const indicator = this.getIndicatorData(data, field);
            
            if (indicator) {
                validation.presentFields.push(field);
                
                // Check if transformation exists
                if (transformedFields.includes(field)) {
                    const transformed = this.getTransformedValue(indicator);
                    if (transformed !== null) {
                        validation.transformedFields.push(field);
                    }
                }
            } else {
                // Check old field names
                const oldFieldMap = {
                    'tic_foreign_demand': 'real_rate_differential',
                    'software_ip_investment': 'tech_employment_pct',
                    'cape_rate_of_change': 'eps_delivery',
                    'total_return_differential': 'etf_flow_differential'
                };
                
                const oldField = oldFieldMap[field];
                if (oldField && this.getIndicatorData(data, oldField)) {
                    validation.presentFields.push(`${field} (as ${oldField})`);
                    validation.usingOldFields.push(oldField);
                } else {
                    validation.missingFields.push(field);
                    validation.isValid = false;
                }
            }
        });
        
        console.log(`IPS v4.4 Compliance: ${validation.presentFields.length}/12 indicators present`);
        console.log(`Transformations: ${validation.transformedFields.length}/5 transformed indicators found`);
        
        if (validation.usingOldFields.length > 0) {
            console.warn(`Using old field names: ${validation.usingOldFields.join(', ')}`);
        }
        
        return validation;
    },
    
    // Get display summary for current data
    getDataSummary: function(data) {
        const validation = this.validateIPSCompliance(data);
        
        return {
            totalIndicators: 12,
            presentIndicators: validation.presentFields.length,
            transformedIndicators: validation.transformedFields.length,
            missingIndicators: validation.missingFields.length,
            compliance: validation.isValid ? 'COMPLIANT' : 'NON-COMPLIANT',
            framework: 'IPS v4.4',
            dataCollectorVersion: data?.metadata?.version || 'Unknown'
        };
    }
};

// Auto-setup when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DataEditor.setupModalListeners());
    } else {
        DataEditor.setupModalListeners();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataEditor;
}

// Browser global
if (typeof window !== 'undefined') {
    window.DataEditor = DataEditor;
}