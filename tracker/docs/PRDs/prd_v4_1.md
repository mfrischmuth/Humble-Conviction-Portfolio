# HCP Portfolio Tracker Product Requirements Document
**Version:** 4.1  
**File:** hcp_tracker_prd_v4.1.md  
**Last Updated:** 2025-09-02 23:50:00 UTC  
**Status:** Production Ready - Steps 5-7 Implementation Complete  

**NEW IN v4.1:** Surgical updates to reflect completed implementation of Steps 5-7 (Portfolio Optimization, Current Positions, Rebalancing Trades). All existing requirements preserved with status updates only.

## Version Compatibility Matrix
 
| Component | Current Version | Compatibility | Notes |
|-----------|----------------|---------------|-------|
| Tracker Release | **6.6.x series** | **Production** | **Steps 1-7 Complete** |
| Core Architecture | 1.x series | Stable | TrackerCore foundation |
| **Portfolio Optimizer** | **v2.0+ series** | **Production** | **Regret minimization framework** |
| **Rebalancing Module** | **v1.0+ series** | **Production** | **Steps 6-7 implementation** |
| Data Collector | 3.8+ | Independent | External data source |
| IPS Framework | **v3.11** | **Current** | **Position limits under consideration** |

## 1. Executive Summary

### 1.1 Product Vision

The HCP Portfolio Tracker is a browser-based portfolio optimization tool that implements systematic, probability-weighted investment allocation based on macro regime analysis. It guides users through a structured 10-step workflow from investment philosophy acknowledgment through portfolio rebalancing.

### 1.2 Key Value Propositions

**Systematic Decision Making:** Removes emotional bias through probability-based allocation  
**Macro Regime Analysis:** 16-scenario framework covering major economic themes  
**Transparent Methodology:** All calculations based on documented IPS v3.11 framework  
**Single-File Deployment:** No external dependencies or server requirements  
**Data Sovereignty:** All processing occurs locally in the user's browser  
**📋 Simplified Rebalancing:** PIMIX/PYLD constraint enforcement with tax optimization out of scope

### 1.3 Success Criteria

**Usability:** Non-technical users can complete full workflow in under 30 minutes *(EXPANDED: Now covers Steps 1-7)*  
**Accuracy:** Theme probabilities show meaningful differentiation across market scenarios  
**Reliability:** Consistent results across browser sessions and platforms  
**Maintainability:** Modular architecture supports independent component updates

## 2. User Workflow Requirements

### 2.1 10-Step Process Overview

The tracker guides users through a sequential workflow with validation gates preventing forward progress until requirements are met.

**Current Implementation Status:** Steps 1-7 Complete, Steps 8-10 Future Release

### 2.2 Step Definitions

#### Step 1: Investment Philosophy
**Purpose:** Acknowledge HCP investment framework and methodology  
**Requirements:** User must check acknowledgment box  
**Validation:** state.philosophyAcknowledged = true  
**Success Criteria:** User demonstrates understanding of probability-based approach  
**Status:** ✅ Production Complete

#### Step 2: Data Import & Edit
**Purpose:** Import macro indicator data and allow manual overrides  
**Requirements:** Upload monthly data file OR generate sample data  
**Features:**
- File upload for Data Collector output
- Sample data generation (5+ market scenarios)
- Manual override system with change tracking
- Data quality indicators and validation

**Success Criteria:** Valid indicator data available for 13+ indicators  
**Status:** ✅ Production Complete

#### Step 3: Theme Analysis
**Purpose:** Calculate theme probabilities using IPS v3.11 methodology  
**Requirements:** Valid data from Step 2  
**Features:**
- Real indicator-based calculations (not random)
- 4 investment themes with probability scores
- Momentum-aware calculations using 6-period baselines
- Enhanced probability framework showing realistic differentiation

**Success Criteria:** Theme probabilities show meaningful variation (not uniform)  
**Status:** ✅ Production Complete

#### Step 4: Scenario Analysis
**Purpose:** Generate 16-scenario probability matrix  
**Requirements:** Theme probabilities from Step 3  
**Features:**
- Binary scenario representation (0000-1111)
- Probability ranking with color coding
- Scenario descriptions and implications

**Success Criteria:** All 16 scenarios generated with probabilities summing to 100%  
**Status:** ✅ Production Complete

#### Step 5: Portfolio Optimization
**Purpose:** Regret minimization optimization across scenarios  
**Requirements:** Scenario probabilities from Step 4  
**Features:**
- **✅ IMPLEMENTED:** Sophisticated regret minimization framework
- **✅ IMPLEMENTED:** Dual optimization (α × Max_Regret + (1-α) × Weighted_Regret)
- **✅ IMPLEMENTED:** Smart hedging protocols
- **✅ IMPLEMENTED:** 6-step optimization process per IPS v3.11
- **🔄 UNDER CONSIDERATION:** Position limits (preserved but not enforced)
- Asset allocation recommendations with 12-security universe

**Success Criteria:** Generates optimal allocation with regret minimization  
**Status:** ✅ **Production Complete** - PortfolioOptimizer v2.0

#### Step 6: Current Positions
**Purpose:** Input current portfolio holdings and calculate drift  
**Requirements:** User manual input and optimal allocation from Step 5  
**Features:**
- **✅ IMPLEMENTED:** Portfolio position entry interface with validation
- **✅ IMPLEMENTED:** Current vs target allocation analysis
- **✅ IMPLEMENTED:** Drift calculation with color-coded visualization
- **✅ IMPLEMENTED:** Overweight/underweight identification
- Real-time percentage calculations and portfolio total validation

**Success Criteria:** Accurate drift analysis between current and optimal allocations  
**Status:** ✅ **Production Complete** - RebalancingModule v1.0

#### Step 7: Rebalancing Trades
**Purpose:** Generate specific trades to reach optimal allocation  
**Requirements:** Current positions and drift analysis from Step 6  
**Features:**
- **✅ IMPLEMENTED:** Trade list generation with BUY/SELL instructions
- **✅ IMPLEMENTED:** PIMIX hold-only constraint enforcement (CRITICAL)
- **✅ IMPLEMENTED:** PYLD primary income routing (CRITICAL)
- **✅ IMPLEMENTED:** Priority-based execution ranking (HIGH/MEDIUM/LOW)
- **✅ IMPLEMENTED:** Trade reasoning and constraint explanations
- **✅ IMPLEMENTED:** CSV export functionality
- **📋 OUT OF SCOPE:** Tax optimization considerations (intentionally excluded)
- **📋 OUT OF SCOPE:** Complex order types and execution timing

**Success Criteria:** Generates executable trades respecting all critical constraints  
**Status:** ✅ **Production Complete** - RebalancingModule v1.0

#### Step 8: History
**Purpose:** Historical tracking and audit trail  
**Requirements:** Previous tracker usage  
**Features:**
- Change log and decision history
- Performance attribution
- Scenario accuracy tracking

**Status:** 🚧 **Planned for Future Release**

#### Step 9: Report
**Purpose:** Generate comprehensive analysis report  
**Requirements:** Completed analysis  
**Features:**
- PDF report generation
- Executive summary
- Detailed methodology appendix

**Status:** 🚧 **Planned for Future Release**

#### Step 10: Export
**Purpose:** Export data and results  
**Requirements:** Completed tracker workflow  
**Features:**
- CSV exports for trades, indicators, scenarios
- JSON backup of complete state
- Integration with external portfolio systems

**Status:** 🚧 **Planned for Future Release**

## 3. Theme Analysis Requirements

### 3.1 Four Investment Themes

1. **USD Dominance Decline:** Weakening USD enables international rotation
2. **AI Productivity Boom:** Technology-driven productivity acceleration
3. **P/E Mean Reversion:** Valuation normalization pressure
4. **International Outperformance:** Non-US markets outperform US

### 3.2 Indicator Framework

- 13 macro indicators across 4 themes
- Three-tier signal classification: Canary (35%), Primary (40%), Structural (25%)
- Momentum-aware calculations: 6-period baseline methodology
- Enhanced probability framework: Realistic probability ranges (5%-95%)

### 3.3 Calculation Requirements

- **No random or simulated values:** All calculations based on real indicator data
- **Consistent methodology:** IPS v3.11 mathematical specifications
- **Validation bounds:** Theme probabilities must show meaningful differentiation
- **Error handling:** Graceful degradation when indicators are missing

## 4. Data Integration Requirements

### 4.1 Data Collector Integration

- **File format:** JSON output from HCP Data Collector v3.8+
- **Dual-mode support:** Initialization files (extended history) and monthly files
- **Backward compatibility:** Support for existing monthly file formats
- **Quality indicators:** Data freshness and completeness scoring

### 4.2 Sample Data Generation

- **Market scenarios:** Tech Boom, USD Strength, P/E Reversion, International, Mixed
- **Realistic patterns:** Momentum-aware data generation with meaningful differentiation
- **Testing support:** Consistent sample data for validation and demonstrations

### 4.3 Manual Override System

- **Edit capability:** All indicator values can be manually overridden
- **Change tracking:** Manual overrides highlighted and tracked
- **Audit trail:** Reason codes and timestamps for all manual changes
- **Validation:** Reasonable bounds checking on manual inputs

## 5. User Experience Requirements

### 5.1 Navigation

- **Sequential workflow:** Users progress through steps in order
- **Validation gates:** Cannot advance until current step requirements met
- **Progress indicators:** Clear visual feedback on completion status
- **Flexible movement:** Can return to previous steps to make changes

### 5.2 Data Display

- **Theme probabilities:** Large, bold percentage displays with color coding
- **Scenario matrix:** All 16 scenarios in consistent binary order (0000-1111)
- **Data tables:** Sortable, editable tables with quality indicators
- **Error handling:** Clear messaging when data is missing or invalid
- **NEW v4.1 - Position drift:** Color-coded overweight/underweight visualization
- **NEW v4.1 - Trade recommendations:** Priority-based trade list with constraint indicators

### 5.3 Browser Compatibility

- **Modern browsers:** Chrome, Firefox, Safari, Edge with ES6 support
- **No external dependencies:** Single-file deployment with embedded modules
- **Offline capability:** Full functionality without internet connection
- **Local storage:** Persistent state across browser sessions

## 6. Integration Requirements

### 6.1 Data Collector Integration

- **Input format:** JSON files from HCP Data Collector
- **Independence:** Tracker operates independently from Data Collector
- **Version tolerance:** Graceful handling of different Data Collector versions

### 6.2 Future Integrations

- **Portfolio systems:** CSV export format for external systems
- **Reporting tools:** Structured data export for analysis
- **API readiness:** Modular design supports future API development

## 7. Quality Requirements

### 7.1 Accuracy

- **Calculation validation:** Theme probabilities show realistic market differentiation
- **Data integrity:** Manual overrides properly tracked and applied
- **Consistency:** Identical inputs produce identical outputs
- **NEW v4.1 - Constraint enforcement:** PIMIX/PYLD rules consistently applied

### 7.2 Reliability

- **Error recovery:** Graceful handling of missing or invalid data
- **State persistence:** Progress saved automatically and restored on return
- **Browser tolerance:** Consistent behavior across supported browsers

### 7.3 Usability

- **Learning curve:** New users complete workflow within 30 minutes *(EXPANDED to Steps 1-7)*
- **Error messaging:** Clear, actionable error messages and warnings
- **Documentation:** Built-in help and methodology explanations

## 8. Success Metrics

### 8.1 Functional Metrics - UPDATED v4.1

- **Steps 1-7:** ✅ **Fully functional with high reliability**
- **Theme differentiation:** Probabilities show >30% spread in realistic scenarios
- **Data quality:** >90% of indicators successfully processed
- **User completion:** >80% of users complete Steps 1-7 without assistance *(EXPANDED)*
- **NEW - Portfolio optimization:** >95% of optimizations complete without errors
- **NEW - Trade generation:** 100% compliance with PIMIX/PYLD constraints
- **NEW - Drift calculation:** Accurate drift detection within 0.1% precision

### 8.2 Technical Metrics - UPDATED v4.1

- **Load time:** Initial page load under 3 seconds
- **File size:** Single-file deployment under **300KB** *(increased for Steps 5-7)*
- **Memory usage:** Stable memory usage during typical sessions
- **Error rate:** <1% of sessions encounter unrecoverable errors

## 9. Future Development Priorities - UPDATED v4.1

### 9.1 Immediate (Next Release)

- **Steps 8-10:** ✅ **Historical tracking through export functionality**
- **Enhanced validation:** Improved error checking and user guidance for Steps 1-7
- **Mobile optimization:** Responsive design improvements for rebalancing interface
- **Position limits evaluation:** Review effectiveness of regret minimization without limits

### 9.2 Medium-term

- **Advanced features:** Historical tracking and performance attribution
- **API development:** Programmatic access to calculations
- **Tax optimization:** Comprehensive tax-aware rebalancing (marked as future scope)
- **Account type optimization:** Multi-account rebalancing strategies

### 9.3 Long-term

- **Cloud integration:** Optional cloud sync and sharing
- **Multi-portfolio:** Support for multiple investment strategies
- **Real-time data:** Integration with live data feeds

## 10. Risk Mitigation

### 10.1 Data Quality Risks

- **Mitigation:** Comprehensive validation and fallback procedures
- **Monitoring:** Data quality indicators and user feedback

### 10.2 Calculation Accuracy Risks

- **Mitigation:** Extensive testing with known scenarios
- **Validation:** Cross-checking against manual calculations

### 10.3 User Experience Risks

- **Mitigation:** Progressive disclosure and clear error messaging
- **Testing:** Regular user testing and feedback incorporation

### 10.4 NEW v4.1 - Trading Constraint Risks

- **PIMIX violation risk:** Automated constraint checking prevents BUY order generation
- **PYLD routing risk:** Income allocation increases automatically routed correctly
- **Position limit risk:** Under evaluation to assess regret minimization effectiveness
- **Mitigation:** Comprehensive constraint violation detection and reporting

## Version History

### Version 4.1 (September 02, 2025, 23:50:00)
**SURGICAL UPDATES - Steps 5-7 Implementation Status:**
- **STATUS UPDATES ONLY:** Updated Steps 5-7 from "Planned for future release" to "Production Complete"
- **IMPLEMENTATION DETAILS:** Added specific feature lists for completed Steps 5-7
- **SUCCESS METRICS:** Expanded to cover complete Steps 1-7 workflow
- **TECHNICAL METRICS:** Updated file size threshold for expanded functionality
- **CONSTRAINT DOCUMENTATION:** Added PIMIX/PYLD enforcement and position limits under consideration
- **SCOPE CLARIFICATION:** Tax optimization clearly marked as out of scope for current implementation
- **COMPLETE PRESERVATION:** All existing requirements and specifications maintained
- **ZERO REGRESSION:** No content removed or reduced, only additive status updates

### Version 4.0 (September 01, 2025, 12:00:00)
- Production Ready - Clean Architecture
- Complete requirements specification for Steps 1-4
- Enhanced validation and quality requirements

---
**End of Product Requirements Document v4.1** - Steps 5-7 Implementation Complete