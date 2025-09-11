/**
 * HCP Portfolio Tracker - Theme Visualization Module v1.0
 * Purpose: Dedicated module for theme analysis visual scales
 * Last Updated: 2025-09-08 23:30:00 UTC
 * 
 * FEATURES:
 * - 16 visual scales (4 themes + 12 indicators)
 * - Past→Current→Future trajectory visualization
 * - Transition probability display
 * - Null-safe rendering
 * - Modular and reusable design
 */

const ThemeVisualization = {
    version: '1.0',
    framework: 'HCP Tracker Visual Scales',
    lastUpdated: '2025-09-08T23:30:00Z',
    
    /**
     * Main entry point - renders complete theme analysis
     * @param {Object} themeTransitions - Theme transition data from ThemeCalculator
     * @param {Object} processedData - Processed data from FileHandler
     * @param {String} containerId - DOM element ID to render into
     */
    render: function(themeTransitions, processedData, containerId = 'theme-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Theme container not found');
            return;
        }
        
        let html = '<div class="theme-analysis">';
        
        // Process each theme
        Object.entries(themeTransitions).forEach(([themeName, themeData]) => {
            html += this.renderThemeGroup(themeName, themeData, processedData);
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    /**
     * Render a complete theme group with aggregate and indicators
     */
    renderThemeGroup: function(themeName, themeData, processedData) {
        let html = '<div class="scale-group">';
        
        // Theme header
        html += `<div class="scale-theme-header">${themeName.toUpperCase()} Theme</div>`;
        
        // Theme aggregate scale
        const currentValue = themeData.currentValue || 0;
        const pastValue = currentValue - ((themeData.trend && themeData.trend.monthlyChange) ? 
                                          themeData.trend.monthlyChange * 6 : 0.1);
        const futureValue = themeData.projectedValue || 
                           (currentValue + ((themeData.trend && themeData.trend.monthlyChange) ? 
                                          themeData.trend.monthlyChange * 6 : 0));
        
        html += this.createScaleVisualization(
            `${themeName.toUpperCase()} (Aggregate)`,
            currentValue,
            pastValue,
            futureValue,
            themeData.currentState || 0,
            themeData.transitions,
            null,
            null,
            true  // isAggregate
        );
        
        // Individual indicator scales
        const themeObj = processedData?.themes[themeName];
        if (themeObj) {
            ['leading', 'concurrent', 'lagging'].forEach(temporal => {
                if (themeObj[temporal]) {
                    html += this.renderIndicatorScale(
                        themeObj[temporal], 
                        themeName, 
                        temporal
                    );
                }
            });
        }
        
        html += '</div>';
        return html;
    },
    
    /**
     * Render individual indicator scale
     */
    renderIndicatorScale: function(indicator, themeName, temporal) {
        const indicatorName = this.getIndicatorDisplayName(themeName, temporal);
        
        // Calculate normalized values with null checks
        const currentNorm = this.normalizeIndicatorValue(indicator.value, indicator.percentiles);
        const pastNorm = this.calculatePastValue(indicator, 6);
        const futureNorm = this.calculateFutureValue(indicator, currentNorm, 6);
        
        return this.createScaleVisualization(
            `${indicatorName} (${temporal})`,
            currentNorm,
            pastNorm,
            futureNorm,
            this.getStateFromValue(currentNorm),
            null,
            indicator.value,
            indicator.percentileRank,
            false  // not aggregate
        );
    },
    
    /**
     * Create SVG scale visualization
     */
    createScaleVisualization: function(label, current, past, future, currentState, 
                                      transitions, rawValue, percentileRank, isAggregate = false) {
        // Validate and bound values
        current = this.validateValue(current);
        past = this.validateValue(past, current);
        future = this.validateValue(future, current);
        
        // SVG dimensions
        const scaleWidth = 800;
        const scaleHeight = 60;
        const margin = 60;
        
        // Value to X coordinate converter
        const valueToX = (value) => margin + ((value + 1) / 2) * (scaleWidth - 2 * margin);
        
        const currentX = valueToX(current);
        const pastX = valueToX(past);
        const futureX = valueToX(future);
        
        // State colors
        const stateColors = {
            '-1': '#dc3545',
            '0': '#ffc107',
            '1': '#28a745'
        };
        const currentColor = stateColors[currentState] || '#666';
        
        // Build HTML
        let html = `<div class="scale-container ${isAggregate ? 'theme-aggregate' : ''}">`;
        
        // Label and values
        html += `<div class="scale-label">
            ${label}
            <span class="scale-value">
                Current: ${current.toFixed(3)}
                ${rawValue !== undefined && rawValue !== null ? 
                  ` (Raw: ${this.formatRawValue(rawValue)})` : ''}
                ${percentileRank !== undefined && percentileRank !== null ? 
                  ` [${percentileRank.toFixed(0)}%ile]` : ''}
            </span>
        </div>`;
        
        // SVG Scale
        html += `<svg class="scale-svg" viewBox="0 0 ${scaleWidth} ${scaleHeight}">`;
        html += this.renderScaleBackground(scaleWidth, scaleHeight, margin, valueToX);
        html += this.renderScaleMarkers(scaleWidth, margin, valueToX);
        html += this.renderTrajectory(pastX, currentX, futureX, currentColor, 
                                     label.replace(/[^a-zA-Z]/g, ''));
        html += '</svg>';
        
        // Transition probabilities
        if (transitions) {
            html += this.renderTransitionProbabilities(transitions, currentState);
        }
        
        html += '</div>';
        return html;
    },
    
    /**
     * Render scale background regions
     */
    renderScaleBackground: function(scaleWidth, scaleHeight, margin, valueToX) {
        const regionHeight = 30;
        const regionY = 15;
        
        let html = '';
        
        // Weak region (-1 to -0.33)
        html += `<rect x="${margin}" y="${regionY}" 
                 width="${(scaleWidth - 2 * margin) * 0.333}" 
                 height="${regionHeight}" fill="#ffebee" 
                 stroke="#dc3545" stroke-width="0.5" opacity="0.5"/>`;
        
        // Neutral region (-0.33 to 0.33)
        html += `<rect x="${valueToX(-0.33)}" y="${regionY}" 
                 width="${(scaleWidth - 2 * margin) * 0.334}" 
                 height="${regionHeight}" fill="#fff9e6" 
                 stroke="#ffc107" stroke-width="0.5" opacity="0.5"/>`;
        
        // Strong region (0.33 to 1)
        html += `<rect x="${valueToX(0.33)}" y="${regionY}" 
                 width="${(scaleWidth - 2 * margin) * 0.333}" 
                 height="${regionHeight}" fill="#e8f5e9" 
                 stroke="#28a745" stroke-width="0.5" opacity="0.5"/>`;
        
        // Scale line
        html += `<line x1="${margin}" y1="${regionY + regionHeight/2}" 
                 x2="${scaleWidth - margin}" y2="${regionY + regionHeight/2}" 
                 stroke="#333" stroke-width="1"/>`;
        
        return html;
    },
    
    /**
     * Render scale markers and labels
     */
    renderScaleMarkers: function(scaleWidth, margin, valueToX) {
        const regionHeight = 30;
        const regionY = 15;
        
        let html = '';
        
        // Boundary markers
        html += `<line x1="${valueToX(-0.33)}" y1="${regionY}" 
                 x2="${valueToX(-0.33)}" y2="${regionY + regionHeight}" 
                 stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>`;
        html += `<line x1="${valueToX(0.33)}" y1="${regionY}" 
                 x2="${valueToX(0.33)}" y2="${regionY + regionHeight}" 
                 stroke="#666" stroke-width="1" stroke-dasharray="2,2"/>`;
        
        // Labels
        const labels = [
            {x: margin, text: '-1'},
            {x: valueToX(-0.33), text: '-0.33'},
            {x: valueToX(0), text: '0'},
            {x: valueToX(0.33), text: '0.33'},
            {x: scaleWidth - margin, text: '1'}
        ];
        
        labels.forEach(label => {
            html += `<text x="${label.x}" y="${regionY + regionHeight + 15}" 
                     text-anchor="middle" font-size="11" fill="#666">${label.text}</text>`;
        });
        
        return html;
    },
    
    /**
     * Render past→current→future trajectory
     */
    renderTrajectory: function(pastX, currentX, futureX, currentColor, uniqueId) {
        const regionHeight = 30;
        const regionY = 15;
        const centerY = regionY + regionHeight/2;
        
        let html = '';
        
        // Past position (circle)
        html += `<circle cx="${pastX}" cy="${centerY}" r="5" 
                 fill="none" stroke="#999" stroke-width="2"/>`;
        html += `<text x="${pastX}" y="${regionY - 3}" 
                 text-anchor="middle" font-size="9" fill="#999">-6m</text>`;
        
        // Arrow from past to current (if meaningful movement)
        if (Math.abs(currentX - pastX) > 5) {
            const midX = (pastX + currentX) / 2;
            const midY = centerY - 5;
            html += `<path d="M ${pastX} ${centerY} Q ${midX} ${midY} ${currentX} ${centerY}" 
                     fill="none" stroke="#333" stroke-width="2" 
                     marker-end="url(#arrowhead-${uniqueId})"/>`;
        }
        
        // Current position (vertical line)
        html += `<line x1="${currentX}" y1="${regionY - 5}" 
                 x2="${currentX}" y2="${regionY + regionHeight + 5}" 
                 stroke="${currentColor}" stroke-width="3"/>`;
        html += `<text x="${currentX}" y="${regionY - 3}" 
                 text-anchor="middle" font-size="10" 
                 fill="${currentColor}" font-weight="bold">NOW</text>`;
        
        // Dashed projection to future (if meaningful)
        if (Math.abs(futureX - currentX) > 5) {
            html += `<path d="M ${currentX} ${centerY} L ${futureX} ${centerY}" 
                     fill="none" stroke="#666" stroke-width="1.5" 
                     stroke-dasharray="5,3" opacity="0.7"
                     marker-end="url(#arrowhead-dashed-${uniqueId})"/>`;
        }
        
        // Future position marker
        html += `<rect x="${futureX - 2}" y="${regionY - 5}" 
                 width="4" height="${regionHeight + 10}" 
                 fill="${currentColor}" opacity="0.3"/>`;
        html += `<text x="${futureX}" y="${regionY + regionHeight + 25}" 
                 text-anchor="middle" font-size="9" fill="#666" opacity="0.7">+6m</text>`;
        
        // Arrow markers definition
        html += `
            <defs>
                <marker id="arrowhead-${uniqueId}" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#333"/>
                </marker>
                <marker id="arrowhead-dashed-${uniqueId}" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#666" opacity="0.7"/>
                </marker>
            </defs>
        `;
        
        return html;
    },
    
    /**
     * Render transition probability display
     */
    renderTransitionProbabilities: function(transitions, currentState) {
        let html = '<div class="transition-probabilities">';
        
        const states = [
            {key: '-1', label: 'Weak/Low'},
            {key: '0', label: 'Neutral'},
            {key: '1', label: 'Strong/High'}
        ];
        
        states.forEach(state => {
            const isCurrent = currentState == state.key;
            html += `
                <div class="prob-item">
                    <div>${state.label}</div>
                    <div class="prob-value ${isCurrent ? 'current-state-prob' : ''}">
                        ${(transitions[state.key] * 100).toFixed(1)}%
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    },
    
    // ===== HELPER FUNCTIONS =====
    
    /**
     * Validate and bound a value
     */
    validateValue: function(value, fallback = 0) {
        if (value === null || value === undefined || isNaN(value)) {
            return fallback;
        }
        return Math.max(-1, Math.min(1, value));
    },
    
    /**
     * Normalize indicator value based on percentiles
     */
    normalizeIndicatorValue: function(value, percentiles) {
        if (value === null || value === undefined || isNaN(value) || !percentiles) {
            return 0;
        }
        
        // Validate percentile structure
        if (!percentiles.min || !percentiles.max || 
            !percentiles.p33 || !percentiles.p67) {
            console.warn('Invalid percentiles structure');
            return 0;
        }
        
        // Map to -1 to 1 scale
        if (value <= percentiles.p33) {
            const range = percentiles.p33 - percentiles.min;
            if (range === 0) return -0.67;
            return -1 + 0.67 * ((value - percentiles.min) / range);
        } else if (value >= percentiles.p67) {
            const range = percentiles.max - percentiles.p67;
            if (range === 0) return 0.67;
            return 0.33 + 0.67 * ((value - percentiles.p67) / range);
        } else {
            const range = percentiles.p67 - percentiles.p33;
            if (range === 0) return 0;
            return -0.33 + 0.66 * ((value - percentiles.p33) / range);
        }
    },
    
    /**
     * Calculate past normalized value
     */
    calculatePastValue: function(indicator, monthsBack) {
        if (!indicator || indicator.value === null || indicator.value === undefined) {
            return 0;
        }
        
        if (!indicator.history || indicator.history.length < monthsBack) {
            const currentNorm = this.normalizeIndicatorValue(indicator.value, indicator.percentiles);
            return currentNorm - 0.1; // Default small movement
        }
        
        const pastIndex = indicator.history.length - monthsBack - 1;
        if (pastIndex >= 0 && indicator.history[pastIndex] !== null && 
            indicator.history[pastIndex] !== undefined) {
            return this.normalizeIndicatorValue(indicator.history[pastIndex], indicator.percentiles);
        }
        
        const currentNorm = this.normalizeIndicatorValue(indicator.value, indicator.percentiles);
        return currentNorm - 0.1;
    },
    
    /**
     * Calculate future projected value
     */
    calculateFutureValue: function(indicator, currentNorm, monthsForward) {
        if (!indicator || currentNorm === null || 
            currentNorm === undefined || isNaN(currentNorm)) {
            return 0;
        }
        
        if (!indicator.history || indicator.history.length < 12) {
            return currentNorm; // No projection if insufficient history
        }
        
        // Calculate recent trend
        const recentHistory = indicator.history.slice(-12);
        const validHistory = recentHistory.filter(v => 
            v !== null && v !== undefined && !isNaN(v));
        
        if (validHistory.length < 2) {
            return currentNorm;
        }
        
        const trend = (validHistory[validHistory.length - 1] - validHistory[0]) / validHistory.length;
        const normalizedTrend = trend / 
            (indicator.percentiles && indicator.percentiles.max && indicator.percentiles.min ? 
             (indicator.percentiles.max - indicator.percentiles.min) : 1);
        
        return Math.max(-1, Math.min(1, currentNorm + normalizedTrend * monthsForward * 2));
    },
    
    /**
     * Get state from value
     */
    getStateFromValue: function(value) {
        if (value === null || value === undefined || isNaN(value)) return 0;
        if (value < -0.33) return -1;
        if (value > 0.33) return 1;
        return 0;
    },
    
    /**
     * Format raw value for display
     */
    formatRawValue: function(value) {
        if (typeof value !== 'number') return 'N/A';
        
        if (Math.abs(value) >= 100) {
            return value.toFixed(1);
        } else if (Math.abs(value) >= 10) {
            return value.toFixed(2);
        } else if (Math.abs(value) >= 1) {
            return value.toFixed(3);
        } else {
            return value.toFixed(4);
        }
    },
    
    /**
     * Get indicator display name
     */
    getIndicatorDisplayName: function(theme, temporal) {
        const names = {
            usd: {
                leading: 'DXY Index',
                concurrent: 'Real Rate Differential',
                lagging: 'COFER Reserve Share'
            },
            innovation: {
                leading: 'QQQ/SPY Ratio',
                concurrent: 'Productivity Growth',
                lagging: 'Tech Employment %'
            },
            valuation: {
                leading: 'Put/Call Ratio',
                concurrent: 'Trailing P/E',
                lagging: 'EPS Delivery'
            },
            usLeadership: {
                leading: 'SPY/EFA Momentum',
                concurrent: 'US Market Cap %',
                lagging: 'ETF Flow Differential'
            }
        };
        
        return names[theme]?.[temporal] || `${theme}-${temporal}`;
    },
    
    /**
     * Initialize module and verify dependencies
     */
    init: function() {
        console.log('ThemeVisualization v1.0 initialized');
        console.log('Ready to render theme analysis scales');
        
        // Verify CSS is loaded
        if (!document.querySelector('.theme-analysis')) {
            console.warn('Theme analysis CSS may not be loaded');
        }
        
        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeVisualization;
}

// Browser global
if (typeof window !== 'undefined') {
    window.ThemeVisualization = ThemeVisualization;
}