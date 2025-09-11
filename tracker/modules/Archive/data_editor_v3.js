/**
 * HCP Portfolio Tracker - Data Editor Module v3.0
 * File: data_editor_v3_0.js
 * Based on: v2.0 with IPS v4.3.2 field alignment
 * Last Updated: 2025-09-09T22:30:00Z
 * 
 * CHANGES IN v3.0:
 * - THEME RENAMED: 'pe' → 'valuation' for consistency
 * - Aligned with IPS v4.3.2 field names:
 *   - software_ip_investment replaces tech_employment_pct
 *   - cape_rate_of_change replaces eps_delivery
 *   - total_return_differential replaces etf_flow_differential
 * - Works with File Handler v5.0 data structure
 * - Backward compatibility for old indicator names
 * - All modal functionality PRESERVED from v2.0
 * 
 * HANDLES:
 * - Modal-based data editing
 * - Manual override tracking
 * - Data table display with edit buttons
 * - Yellow highlighting for edited values
 */

const DataEditor = {
    version: '3.0',
    editingIndicator: null,
    
    // Display data table with edit buttons - ENHANCED for IPS v4.3.2
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
                const dataKey = config.dataKey; // Use IPS v4.3.2 field names directly
                const value = this.getIndicatorValue(monthlyData, dataKey, config.oldDataKey);
                const isManual = manualOverrides[dataKey] || (config.oldDataKey && manualOverrides[config.oldDataKey]);
                
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
    
    // Get default indicator definitions for IPS v4.3.2 - UPDATED v3.0
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
                softwareInvestment: {  // UPDATED from techEmployment
                    name: 'Software IP Investment % GDP',
                    temporal: 'lagging',
                    dataKey: 'software_ip_investment',
                    oldDataKey: 'tech_employment_pct'  // For backward compatibility
                }
            },
            valuation: {  // RENAMED from 'pe' to 'valuation'
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
                capeChange: {  // UPDATED from epsDelivery
                    name: 'CAPE Rate of Change', 
                    temporal: 'lagging',
                    dataKey: 'cape_rate_of_change',
                    oldDataKey: 'eps_delivery'  // For backward compatibility
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
                returnDifferential: {  // UPDATED from etfFlows
                    name: 'Total Return Differential', 
                    temporal: 'lagging',
                    dataKey: 'total_return_differential',
                    oldDataKey: 'etf_flow_differential'  // For backward compatibility
                }
            }
        };
    },
    
    // Format value based on indicator type - ENHANCED v3.0
    formatValue: function(value, dataKey) {
        // Percentage indicators
        if (dataKey.includes('pct') || dataKey.includes('rate') || 
            dataKey === 'cofer_usd' || dataKey === 'productivity_growth' ||
            dataKey === 'software_ip_investment') {  // Added new indicator
            return `${value.toFixed(2)}%`;
        }
        // Ratio indicators
        if (dataKey.includes('ratio') || dataKey === 'trailing_pe' || 
            dataKey === 'cape_rate_of_change') {  // Updated indicator
            return value.toFixed(3);
        }
        // Index/momentum indicators
        if (dataKey === 'dxy_index' || dataKey.includes('momentum')) {
            return value.toFixed(2);
        }
        // Flow/differential indicators (in billions or percentage)
        if (dataKey.includes('flow') || dataKey.includes('differential')) {
            // Total return differential is a percentage
            if (dataKey === 'total_return_differential') {
                return `${value.toFixed(2)}%`;
            }
            // ETF flows in billions (legacy)
            return `$${value.toFixed(1)}B`;
        }
        // Default
        return value.toFixed(2);
    },
    
    // Get indicator value from data - ENHANCED for backward compatibility
    getIndicatorValue: function(data, key, oldKey = null) {
        if (!data || !data.indicators) return null;
        
        // Try new key first
        let indicator = data.indicators[key];
        
        // If not found and oldKey provided, try old key
        if (!indicator && oldKey) {
            indicator = data.indicators[oldKey];
            if (indicator) {
                console.log(`Using old dataKey "${oldKey}" for backward compatibility`);
            }
        }
        
        if (!indicator) return null;
        
        // Check for value or current property (supports both structures)
        return indicator.value !== undefined ? indicator.value : 
               indicator.current !== undefined ? indicator.current : null;
    },
    
    // Open edit modal - PRESERVED from v2.0
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
    
    // Close edit modal - PRESERVED from v2.0
    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingIndicator = null;
    },
    
    // Save indicator edit - ENHANCED for new indicators
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
        
        // Check if we need to migrate the dataKey
        const dataKey = this.getMigratedDataKey(this.editingIndicator);
        
        // Update the data - supports both File Handler v5.0 structures
        if (trackerState.monthlyData && trackerState.monthlyData.indicators) {
            // Try new key first, then old key for backward compatibility
            let indicator = trackerState.monthlyData.indicators[dataKey];
            if (!indicator) {
                indicator = trackerState.monthlyData.indicators[this.editingIndicator];
            }
            
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
        
        trackerState.manualOverrides[dataKey] = {
            value: newValue,
            reason: reason,
            notes: notes,
            timestamp: new Date().toISOString()
        };
        
        this.closeEditModal();
        
        // Call callback to refresh display
        if (callback) callback();
        
        console.log(`Manual override saved for ${dataKey}: ${newValue}`);
        return true;
    },
    
    // NEW v3.0 - Get migrated data key for new indicators
    getMigratedDataKey: function(key) {
        const migrations = {
            'tech_employment_pct': 'software_ip_investment',
            'eps_delivery': 'cape_rate_of_change',
            'etf_flow_differential': 'total_return_differential'
        };
        
        return migrations[key] || key;
    },
    
    // Check if indicator has manual override - ENHANCED for migration
    hasManualOverride: function(dataKey, manualOverrides) {
        if (!manualOverrides) return false;
        
        // Check new key
        if (manualOverrides[dataKey] !== undefined) return true;
        
        // Check old keys for backward compatibility
        const oldKeyMap = {
            'software_ip_investment': 'tech_employment_pct',
            'cape_rate_of_change': 'eps_delivery',
            'total_return_differential': 'etf_flow_differential'
        };
        
        const oldKey = oldKeyMap[dataKey];
        return oldKey && manualOverrides[oldKey] !== undefined;
    },
    
    // Get override info - ENHANCED for migration
    getOverrideInfo: function(dataKey, manualOverrides) {
        if (!manualOverrides) return null;
        
        // Try new key first
        if (manualOverrides[dataKey]) {
            return manualOverrides[dataKey];
        }
        
        // Check old key for backward compatibility
        const oldKeyMap = {
            'software_ip_investment': 'tech_employment_pct',
            'cape_rate_of_change': 'eps_delivery',
            'total_return_differential': 'etf_flow_differential'
        };
        
        const oldKey = oldKeyMap[dataKey];
        if (oldKey && manualOverrides[oldKey]) {
            console.log(`Found override under old key "${oldKey}"`);
            return manualOverrides[oldKey];
        }
        
        return null;
    },
    
    // Remove manual override - ENHANCED for migration
    removeOverride: function(dataKey, trackerState, callback) {
        if (trackerState.manualOverrides) {
            // Remove new key
            delete trackerState.manualOverrides[dataKey];
            
            // Also remove old key if present
            const oldKeyMap = {
                'software_ip_investment': 'tech_employment_pct',
                'cape_rate_of_change': 'eps_delivery',
                'total_return_differential': 'etf_flow_differential'
            };
            
            const oldKey = oldKeyMap[dataKey];
            if (oldKey) {
                delete trackerState.manualOverrides[oldKey];
            }
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
    
    // Setup modal event listeners - PRESERVED from v2.0
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
        
        console.log('Data Editor v3.0 modal listeners setup (IPS v4.3.2 aligned)');
    },
    
    // Validate IPS v4.3.2 compliance - UPDATED v3.0
    validateIPSCompliance: function(data) {
        const requiredFields = [
            'dxy_index', 'real_rate_differential', 'cofer_usd',
            'qqq_spy_ratio', 'productivity_growth', 'software_ip_investment',  // Updated
            'put_call_ratio', 'trailing_pe', 'cape_rate_of_change',  // Updated
            'spy_efa_momentum', 'us_market_pct', 'total_return_differential'  // Updated
        ];
        
        // Old field names for backward compatibility check
        const oldFields = [
            'tech_employment_pct', 'eps_delivery', 'etf_flow_differential'
        ];
        
        const validation = {
            isValid: true,
            missingFields: [],
            presentFields: [],
            usingOldFields: []
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
                // Check if old field name is present
                const oldFieldMap = {
                    'software_ip_investment': 'tech_employment_pct',
                    'cape_rate_of_change': 'eps_delivery',
                    'total_return_differential': 'etf_flow_differential'
                };
                
                const oldField = oldFieldMap[field];
                if (oldField && data.indicators[oldField]) {
                    validation.presentFields.push(`${field} (as ${oldField})`);
                    validation.usingOldFields.push(oldField);
                } else {
                    validation.missingFields.push(field);
                    validation.isValid = false;
                }
            }
        });
        
        console.log(`IPS v4.3.2 Compliance: ${validation.presentFields.length}/12 indicators present`);
        if (validation.usingOldFields.length > 0) {
            console.warn(`Using old field names: ${validation.usingOldFields.join(', ')}`);
        }
        
        return validation;
    },
    
    // NEW v3.0 - Migrate theme keys in display
    getThemeDisplayName: function(theme) {
        const themeMap = {
            'pe': 'VALUATION',  // Map old to new
            'valuation': 'VALUATION',
            'usd': 'USD',
            'innovation': 'INNOVATION',
            'usLeadership': 'US LEADERSHIP'
        };
        
        return themeMap[theme] || theme.toUpperCase();
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