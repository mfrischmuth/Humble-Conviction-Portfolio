/**
 * HCP Portfolio Tracker - Data Editor Module v1.0
 * File: data_editor_v1_0.js
 * Extracted from: v6.3.1 (working modal system from v6.0)
 * Last Updated: 2025-08-29 18:10:00 UTC
 * 
 * HANDLES:
 * - Modal-based data editing
 * - Manual override tracking
 * - Data table display with edit buttons
 * - Yellow highlighting for edited values
 */

const DataEditor = {
    version: '1.0',
    editingIndicator: null,
    
    // Display data table with edit buttons - WORKING from v6.3.1
    displayDataTable: function(monthlyData, indicators, manualOverrides = {}) {
        const container = document.getElementById('data-table-container');
        if (!container || !monthlyData) return;
        
        let html = '<table class="data-table"><thead><tr>';
        html += '<th>Theme</th><th>Indicator</th><th>Current Value</th>';
        html += '<th>Freshness</th><th>Source</th><th>Action</th>';
        html += '</tr></thead><tbody>';
        
        Object.entries(indicators).forEach(([theme, themeIndicators]) => {
            Object.entries(themeIndicators).forEach(([key, config]) => {
                const dataKey = this.getDataKey(theme, key);
                const value = this.getIndicatorValue(monthlyData, dataKey);
                const isManual = manualOverrides[dataKey];
                
                html += `<tr class="${isManual ? 'manual-override' : ''}">`;
                html += `<td>${theme.toUpperCase()}</td>`;
                html += `<td>${config.name} <span class="tier-badge tier-${config.tier}">${config.tier}</span></td>`;
                html += `<td>${value !== null ? value.toFixed(2) : 'N/A'}</td>`;
                html += `<td><span class="status-good">✓ Fresh</span></td>`;
                html += `<td>${isManual ? 'Manual' : 'Data Collector'}</td>`;
                html += `<td><button class="edit-btn" onclick="DataEditor.openEditModal('${dataKey}', '${config.name}', ${value})">Edit</button></td>`;
                html += '</tr>';
            });
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },
    
    // Get data key for indicator - UTILITY
    getDataKey: function(theme, key) {
        const keyMappings = {
            'usd': {
                'dxy': 'dxy',
                'gold': 'goldHoldings', 
                'yuanSwift': 'yuanSwiftShare',
                'reserveShare': 'reserveShare'
            },
            'innovation': {
                'qqqSpy': 'qqqSpyRatio',
                'productivity': 'productivity',
                'netMargins': 'netMargins'
            },
            'pe': {
                'forwardPe': 'forwardPE',
                'cape': 'cape',
                'riskPremium': 'riskPremium'
            },
            'international': {
                'spVsWorld': 'spVsWorld',
                'usAcwi': 'usPercentACWI',
                'ticFlows': 'ticFlows'
            }
        };
        
        return keyMappings[theme]?.[key] || `${theme}_${key}`;
    },
    
    // Get indicator value from data - UTILITY
    getIndicatorValue: function(data, key) {
        if (!data || !data.indicators) return null;
        
        const indicator = data.indicators[key];
        if (!indicator) return null;
        
        return indicator.current || null;
    },
    
    // Open edit modal - WORKING from v6.0/v6.3.1
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
    
    // Close edit modal - WORKING from v6.0/v6.3.1
    closeEditModal: function() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingIndicator = null;
    },
    
    // Save indicator edit - WORKING from v6.0/v6.3.1
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
        
        // Update the data
        if (trackerState.monthlyData && trackerState.monthlyData.indicators) {
            const indicator = trackerState.monthlyData.indicators[this.editingIndicator];
            if (indicator) {
                indicator.current = newValue;
                indicator.manual_override = true;
                indicator.override_reason = reason;
                indicator.override_notes = notes;
                indicator.override_timestamp = new Date().toISOString();
            }
        }
        
        // Track manual override
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
    
    // Check if indicator has manual override - UTILITY
    hasManualOverride: function(dataKey, manualOverrides) {
        return manualOverrides && manualOverrides[dataKey] !== undefined;
    },
    
    // Get override info - UTILITY  
    getOverrideInfo: function(dataKey, manualOverrides) {
        if (!this.hasManualOverride(dataKey, manualOverrides)) {
            return null;
        }
        
        return manualOverrides[dataKey];
    },
    
    // Remove manual override - UTILITY
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
    
    // Setup modal event listeners - SETUP
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
        
        console.log('Data Editor modal listeners setup');
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