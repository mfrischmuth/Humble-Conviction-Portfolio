/**
 * HCP Portfolio Tracker - Data Editor Module v2.0
 * File: data_editor_v2_0.js
 * Based on: v1.0 with IPS v4.2 field alignment
 * Last Updated: 2025-09-07 23:15:00 UTC
 * 
 * CHANGES IN v2.0:
 * - Aligned with IPS v4.2 field names
 * - Updated getDataKey mappings for new indicators
 * - Works with File Handler v3.1 data structure
 * - All modal functionality PRESERVED from v1.0
 * 
 * HANDLES:
 * - Modal-based data editing
 * - Manual override tracking
 * - Data table display with edit buttons
 * - Yellow highlighting for edited values
 */

const DataEditor = {
    version: '2.0',
    editingIndicator: null,
    
    // Display data table with edit buttons - ENHANCED for IPS v4.2
    displayDataTable: function(monthlyData, indicators, manualOverrides = {}) {
        const container = document.getElementById('data-table-container');
        if (!container || !monthlyData) return;
        
        let html = '<table class="data-table"><thead><tr>';
        html += '<th>Theme</th><th>Indicator</th><th>Temporal</th><th>Current Value</th>';
        html += '<th>Freshness</th><th>Source</th><th>Action</th>';
        html += '</tr></thead><tbody>';
        
        // Get indicator definitions from Indicators module if available
        const indicatorDefs = (typeof Indicators !== 'undefined' && Indicators.definitions) 
            ? Indicators.definitions 
            : this.getDefaultIndicatorDefinitions();
        
        Object.entries(indicatorDefs).forEach(([theme, themeIndicators]) => {
            Object.entries(themeIndicators).forEach(([key, config]) => {
                const dataKey = config.dataKey; // Use IPS v4.2 field names directly
                const value = this.getIndicatorValue(monthlyData, dataKey);
                const isManual = manualOverrides[dataKey];
                
                html += `<tr class="${isManual ? 'manual-override' : ''}">`;
                html += `<td>${theme.toUpperCase()}</td>`;
                html += `<td>${config.name}</td>`;
                html += `<td><span class="temporal-badge temporal-${config.temporal}">${config.temporal}</span></td>`;
                html += `<td>${value !== null ? this.formatValue(value, dataKey) : 'N/A'}</td>`;
                html += `<td><span class="status-good">✓ Fresh</span></td>`;
                html += `<td>${isManual ? 'Manual' : 'Automated'}</td>`;
                html += `<td><button class="edit-btn" onclick="DataEditor.openEditModal('${dataKey}', '${config.name}', ${value})">Edit</button></td>`;
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },
    
    // Get default indicator definitions for IPS v4.2 - NEW
    getDefaultIndicatorDefinitions: function() {
        return {
            usd: {
                dxy: { 
                    name: 'DXY Index', 
                    temporal: 'leading',
                    dataKey: 'dxy_index'
                },
                realRate: { 
                    name: 'Real Rate Differential', 
                    temporal: 'concurrent',
                    dataKey: 'real_rate_differential'
                },
                cofer: { 
                    name: 'IMF COFER Reserve Share', 
                    temporal: 'lagging',
                    dataKey: 'cofer_usd'
                }
            },
            innovation: {
                qqqSpy: {
                    name: 'QQQ/SPY Ratio',
                    temporal: 'leading',
                    dataKey: 'qqq_spy_ratio'
                },
                productivity: { 
                    name: 'US Productivity Growth', 
                    temporal: 'concurrent',
                    dataKey: 'productivity_growth'
                },
                techEmployment: {
                    name: 'Tech Employment % of Total',
                    temporal: 'lagging',
                    dataKey: 'tech_employment_pct'
                }
            },
            pe: {
                putCall: { 
                    name: 'Equity Put/Call Ratio', 
                    temporal: 'leading',
                    dataKey: 'put_call_ratio'
                },
                trailingPe: {
                    name: 'S&P 500 Trailing P/E',
                    temporal: 'concurrent',
                    dataKey: 'trailing_pe'
                },
                epsDelivery: { 
                    name: '12M EPS Delivery Rate', 
                    temporal: 'lagging',
                    dataKey: 'eps_delivery'
                }
            },
            usLeadership: {
                spyEfa: {
                    name: 'SPY/EFA Momentum',
                    temporal: 'leading',
                    dataKey: 'spy_efa_momentum'
                },
                marketCapShare: { 
                    name: 'US Market Cap % Global', 
                    temporal: 'concurrent',
                    dataKey: 'us_market_pct'
                },
                etfFlows: { 
                    name: 'Cumulative ETF Flows', 
                    temporal: 'lagging',
                    dataKey: 'etf_flow_differential'
                }
            }
        };
    },
    
    // Format value based on indicator type - NEW
    formatValue: function(value, dataKey) {
        // Percentage indicators
        if (dataKey.includes('pct') || dataKey.includes('rate') || 
            dataKey === 'cofer_usd' || dataKey === 'productivity_growth') {
            return `${value.toFixed(2)}%`;
        }
        // Ratio indicators
        if (dataKey.includes('ratio') || dataKey === 'trailing_pe' || 
            dataKey === 'eps_delivery') {
            return value.toFixed(3);
        }
        // Index/momentum indicators
        if (dataKey === 'dxy_index' || dataKey.includes('momentum')) {
            return value.toFixed(2);
        }
        // Flow indicators (in billions)
        if (dataKey.includes('flow')) {
            return `$${value.toFixed(1)}B`;
        }
        // Default
        return value.toFixed(2);
    },
    
    // Get indicator value from data - UPDATED for File Handler v3.1 structure
    getIndicatorValue: function(data, key) {
        if (!data || !data.indicators) return null;
        
        // File Handler v3.1 stores data in flat indicators object
        const indicator = data.indicators[key];
        if (!indicator) return null;
        
        // Check for value or current property (supports both structures)
        return indicator.value !== undefined ? indicator.value : 
               indicator.current !== undefined ? indicator.current : null;
    },
    
    // Open edit modal - PRESERVED from v1.0
    openEditModal: function(dataKey, displayName, currentValue) {
        this.editingIndicator = dataKey;
        
        const modal = document.getElementById('edit-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        
        if (!modal || !title || !body) {
            console.error('Modal elements not found');
            return;
        }
        
        title.textContent = `Edit: ${displayName}`;
        
        body.innerHTML = `
            <div class="form-group">
                <label for="indicator-value">Current Value:</label>
                <input type="number" id="indicator-value" step="0.01" value="${currentValue || ''}" 
                       placeholder="Enter new value">
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
    
    // Close edit modal - PRESERVED from v1.0
    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingIndicator = null;
    },
    
    // Save indicator edit - UPDATED for IPS v4.2 structure
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
        
        // Update the data - supports both File Handler v3.1 structures
        if (trackerState.monthlyData && trackerState.monthlyData.indicators) {
            const indicator = trackerState.monthlyData.indicators[this.editingIndicator];
            if (indicator) {
                // Update value (support both 'value' and 'current' properties)
                if (indicator.value !== undefined) {
                    indicator.value = newValue;
                } else {
                    indicator.current = newValue;
                }
                
                // Add manual override metadata
                indicator.manual_override = true;
                indicator.override_reason = reason;
                indicator.override_notes = notes;
                indicator.override_timestamp = new Date().toISOString();
                
                // Update history if present
                if (indicator.history && Array.isArray(indicator.history)) {
                    // Add to history as most recent value
                    indicator.history.push(newValue);
                    if (indicator.dates && Array.isArray(indicator.dates)) {
                        indicator.dates.push(new Date().toISOString());
                    }
                }
            }
        }
        
        // Track manual override
        if (!trackerState.manualOverrides) {
            trackerState.manualOverrides = {};
        }
        
        trackerState.manualOverrides[this.editingIndicator] = {
            value: newValue,
            reason: reason,
            notes: notes,
            timestamp: new Date().toISOString()
        };
        
        this.closeEditModal();
        
        // Call callback to refresh display
        if (callback) callback();
        
        console.log(`Manual override saved for ${this.editingIndicator}: ${newValue}`);
        return true;
    },
    
    // Check if indicator has manual override - PRESERVED from v1.0
    hasManualOverride: function(dataKey, manualOverrides) {
        return manualOverrides && manualOverrides[dataKey] !== undefined;
    },
    
    // Get override info - PRESERVED from v1.0
    getOverrideInfo: function(dataKey, manualOverrides) {
        if (!this.hasManualOverride(dataKey, manualOverrides)) {
            return null;
        }
        
        return manualOverrides[dataKey];
    },
    
    // Remove manual override - UPDATED for IPS v4.2 structure
    removeOverride: function(dataKey, trackerState, callback) {
        if (trackerState.manualOverrides) {
            delete trackerState.manualOverrides[dataKey];
        }
        
        // Also remove from monthly data if present
        if (trackerState.monthlyData && trackerState.monthlyData.indicators) {
            const indicator = trackerState.monthlyData.indicators[dataKey];
            if (indicator) {
                indicator.manual_override = false;
                delete indicator.override_reason;
                delete indicator.override_notes;
                delete indicator.override_timestamp;
            }
        }
        
        if (callback) callback();
        console.log(`Manual override removed for ${dataKey}`);
    },
    
    // Setup modal event listeners - PRESERVED from v1.0
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
        
        console.log('Data Editor v2.0 modal listeners setup (IPS v4.2 aligned)');
    },
    
    // Validate IPS v4.2 compliance - NEW
    validateIPSCompliance: function(data) {
        const requiredFields = [
            'dxy_index', 'real_rate_differential', 'cofer_usd',
            'qqq_spy_ratio', 'productivity_growth', 'tech_employment_pct',
            'put_call_ratio', 'trailing_pe', 'eps_delivery',
            'spy_efa_momentum', 'us_market_pct', 'etf_flow_differential'
        ];
        
        const validation = {
            isValid: true,
            missingFields: [],
            presentFields: []
        };
        
        if (!data || !data.indicators) {
            validation.isValid = false;
            validation.error = 'No indicators data found';
            return validation;
        }
        
        requiredFields.forEach(field => {
            if (data.indicators[field]) {
                validation.presentFields.push(field);
            } else {
                validation.missingFields.push(field);
                validation.isValid = false;
            }
        });
        
        console.log(`IPS v4.2 Compliance: ${validation.presentFields.length}/12 indicators present`);
        return validation;
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