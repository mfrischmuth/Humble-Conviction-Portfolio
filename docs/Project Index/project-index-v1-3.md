# PROJECT INDEX - Humble Conviction Portfolio
Last Updated: 2025-09-05 19:30:00 UTC  
Index Version: 1.3  
Purpose: Master index for navigating flat Claude Project file system

## 🎯 CURRENT VERSIONS (Production Ready)

| Component | Version | Status | File Name |
|-----------|---------|--------|-----------|
| **IPS** | **v4.1** | **CURRENT** | **Investment Policy Statement (IPS) v4.1.md** |
| Tracker | v6.5.5 | PRODUCTION | hcp_tracker_v6_5_5.html |
| Tracker Core | v1.2 | STABLE/PROTECTED | tracker_core_v1_2.js |
| **File Handler** | **v2.1** | **CURRENT** | **file_handler_v2_1.js** |
| **Theme Calculator** | **v3.2** | **CURRENT** | **theme_calculator_v3_2.js** |
| **Indicators** | **v2.1** | **CURRENT** | **indicators_v2_1.js** |
| Data Editor | v1.0+ | PRODUCTION | data_editor_v1_0.js |
| Portfolio Optimizer | v2.1 | PRODUCTION | portfolio_optimizer_v2_1.js |
| Rebalancing Module | v1.0+ | PRODUCTION | rebalancing_module_v1_0.js |
| Implementation Guide | v1.4 | CURRENT | implementation_guide_v1_4.md |
| Technical Spec | v1.3 | CURRENT | technical_spec_v1_3.pdf |
| Tracker PRD | v4.1+ | NEEDS UPDATE | prd_v4_1.md |

## 🔄 MAJOR UPDATE: IPS v4.1 (September 5, 2025)

### Key Changes:
- **QQQ/SPY replaces ARKK/SPY** - Extended history from 11 to 26 years
- **SPY/EFA replaces SPY/VXUS** - Extended history from 14 to 24 years
- **Volatility floors removed** - Pure GARCH estimates with 15-year lookback
- **Minimum data now 19 years** (Put/Call constraint) vs 11 years previously

### Updated Modules:
- **IPS v4.1**: Extended history indicators, no volatility floors
- **ThemeCalculator v3.2**: Pure GARCH estimates, diagnostic warnings
- **Indicators v2.1**: QQQ/SPY and SPY/EFA definitions
- **FileHandler v2.1**: Updated test data ranges and migration logic

## 📝 FILE NAMING CONVENTION (Updated)

**Components:**
- IPS - Investment Policy Statement
- TRACKER - Portfolio Tracker Application (Single-File Deployment)
- TRACKER_CORE - Protected Core Module
- TRACKER_MODULE - Feature Modules (Embedded in main tracker)
- FILE_HANDLER - Data Generation and File Processing
- THEME_CALCULATOR - Analysis Engine
- INDICATORS - Indicator Definitions and Calculations
- DATA_EDITOR - User Interface Components
- PORTFOLIO_OPTIMIZER - Regret Minimization Framework
- REBALANCING_MODULE - Trade Generation Engine
- PRD - Product Requirements Documents
- DOC - Documentation Files
- IMPL_GUIDE - Implementation Guides
- TECH_SPEC - Technical Specifications

**Pattern:** `[COMPONENT]_[version]_[STATUS].[extension]`

**Status Tags:**
- PRODUCTION - Live production version
- CURRENT - Active version in use
- archived - Previous version for reference
- DO_NOT_MODIFY - Protected/Core files
- DRAFT - Work in progress
- TEST - Test files
- NEEDS_UPDATE - Requires version bump

## 📄 ACTIVE FILES LIST (Updated September 5, 2025)

### Core System Files
- **Investment Policy Statement (IPS) v4.1.md** - Extended history indicators framework
- **hcp_tracker_v6_5_5.html** - Main tracker - Production Ready with Steps 1-4 + current scenario display fixes
- **tracker_core_v1_2.js** - Core module - Regression-protected foundation
- **file_handler_v2_1.js** - QQQ/SPY and SPY/EFA test data generation
- **theme_calculator_v3_2.js** - IPS v4.1 compliant with pure GARCH estimates
- **indicators_v2_1.js** - Updated indicator definitions for v4.1
- **data_editor_v1_0.js** - Modal-based editing system
- **portfolio_optimizer_v2_1.js** - Regret minimization with position constraints under consideration
- **rebalancing_module_v1_0.js** - Trade generation with PIMIX/PYLD constraint enforcement

### Production Documentation
- **implementation_guide_v1_4.md** - Enhanced deployment procedures with Steps 6-7 rebalancing implementation
- **technical_spec_v1_3.pdf** - Technical specifications with rebalancing display specifications
- **prd_v4_1.md** - Product requirements (NEEDS UPDATE to reflect v6.5.5+ and IPS v4.1)

### Archive (Reference Only)
- **Investment Policy Statement (IPS) v3.11.pdf** - Previous IPS version
- **file_handler_v2_0.js** - Previous with ARKK/SPY
- **theme_calculator_v3_0.js** - Previous with volatility floors
- **indicators_v2_0.js** - Previous indicator definitions
- **hcp_tracker_v6_5_2_archived.html** - Previous production version

## 📄 WORKFLOW GUIDE (Updated for IPS v4.1)

### To Work with Production Tracker:
1. `"Show me hcp_tracker_v6_5_5.html"`
2. `"Test with IPS v4.1 indicators (QQQ/SPY, SPY/EFA)"`
3. `"Verify 15-year GARCH calculations work"`
4. `"Check volatility diagnostics (no floors)"`

### To Update Data Collection:
1. **Add QQQ/SPY ratio collection** (Yahoo Finance)
2. **Add SPY/EFA momentum calculation** (3-month returns)
3. **Calculate 15-year percentiles** for all indicators
4. **Remove ARKK and VXUS** from collection scripts

### To Make Safe Updates (Critical):
1. Follow implementation_guide_v1_4.md regression prevention procedures
2. Document all working features before changes
3. Use surgical approach - add only, never remove existing functionality
4. Test complete workflow before deployment
5. Update version number and changelog

### To Check System Health:
1. `"Compare current versions with IPS v4.1"`
2. `"Verify all modules updated for extended history"`
3. `"Check GARCH calculations use 15-year lookback"`
4. `"Confirm no volatility floors in calculations"`

## 📊 COMPONENT RELATIONSHIPS (Updated Architecture)

```
IPS_v4.1 (Extended History Framework)
    ↓ defines
Indicators_v2.1 (QQQ/SPY, SPY/EFA definitions)
    ↓ used by
ThemeCalculator_v3.2 (Pure GARCH, 15yr lookback)
    ↓ calculates
FileHandler_v2.1 (Test data generation)
    ↓ provides to
hcp_tracker_v6.5.5 (Production - Steps 1-5)
    → uses (embedded modules)
tracker_core_v1.2 + data_editor_v1.0 + 
portfolio_optimizer_v2.1 + rebalancing_module_v1.0
```

## 🏷 VERSION HISTORY SUMMARY (Updated)

### IPS Evolution:
- v3.6-v3.8: Framework development
- v3.9: MA comparison framework  
- v3.10: Enhanced Theme Strength Probability Framework
- v3.11: Position constraints marked "under consideration"
- **v4.0**: Three-state framework (81 scenarios)
- **v4.1**: **CURRENT** - Extended history indicators, no volatility floors

### ThemeCalculator Evolution:
- v2.x: Binary framework
- v3.0: Three-state framework for IPS v4.0
- v3.1: Diagnostic fixes
- **v3.2**: **CURRENT** - IPS v4.1 compatible, pure GARCH

### Indicators Evolution:
- v2.0: IPS v4.0 indicators (ARKK/SPY, SPY/VXUS)
- **v2.1**: **CURRENT** - IPS v4.1 indicators (QQQ/SPY, SPY/EFA)

### FileHandler Evolution:
- v1.x: Binary framework test data
- v2.0: Three-state framework test data
- **v2.1**: **CURRENT** - Updated ranges for QQQ/SPY, SPY/EFA

## ✅ CURRENT STATUS CHECK (September 5, 2025)

### System Health:
- ✅ IPS v4.1 documented with extended history indicators
- ✅ ThemeCalculator v3.2 updated for pure GARCH estimates
- ✅ Indicators v2.1 with QQQ/SPY and SPY/EFA definitions
- ✅ FileHandler v2.1 with updated test data ranges
- ✅ Tracker v6.5.5 production ready (Steps 1-5)
- ✅ Core architecture v1.2 regression-protected
- ✅ Portfolio optimization v2.1 with constraint evaluation
- ✅ Implementation guides v1.4 with rebalancing procedures
- ⚠️ Tracker PRD needs update to match IPS v4.1 changes
- ⚠️ Data collector needs update for new indicators
- 🔄 Tracker needs integration with v4.1 modules

### Immediate Action Items:
1. **HIGH PRIORITY**: Update data collector for QQQ/SPY and SPY/EFA
2. **HIGH PRIORITY**: Create hcp_tracker_v6.6.0.html with IPS v4.1 modules
3. **NEXT**: Update Tracker PRD to reflect IPS v4.1 and module updates
4. **TESTING**: Validate 15-year GARCH calculations with real data

## 🔧 MAINTENANCE NOTES (Enhanced)

### Data Collection Updates Required:
1. **Remove**: ARKK data collection
2. **Remove**: VXUS data collection  
3. **Add**: QQQ daily prices from Yahoo Finance
4. **Add**: EFA daily prices from Yahoo Finance
5. **Calculate**: QQQ/SPY ratio (daily)
6. **Calculate**: SPY/EFA 3-month momentum
7. **Store**: 15-year percentiles for all indicators

### Module Integration for v6.6.0:
1. Replace Indicators v2.0 with v2.1
2. Replace FileHandler v2.0 with v2.1
3. Replace ThemeCalculator v3.0 with v3.2
4. Test complete workflow with new indicators
5. Verify GARCH calculations with extended history

## 💡 USEFUL COMMANDS FOR CLAUDE (Updated)

### Status Commands:
- `"What indicators changed in IPS v4.1?"` → QQQ/SPY and SPY/EFA
- `"Show volatility diagnostic ranges from ThemeCalculator v3.2"`  
- `"What's the minimum data history now?"` → 19 years (Put/Call)
- `"Check GARCH lookback period"` → 180 months (15 years)

### Development Commands (IPS v4.1):
- `"Create v6.6.0 with IPS v4.1 modules integrated"`
- `"Generate test data with FileHandler v2.1"`
- `"Test transition probabilities with 15-year GARCH"`
- `"Verify no volatility floors in calculations"`

### Data Collection Commands:
- `"Show QQQ/SPY typical ranges"` → 0.85-1.35
- `"Show SPY/EFA momentum ranges"` → -0.15 to 0.20
- `"List all v4.1 indicators with data sources"`
- `"Create data collection script for new indicators"`

## 📝 CRITICAL NOTES

### IPS v4.1 Key Points:
- **Extended History**: 19+ years minimum (was 11)
- **No Volatility Floors**: Pure GARCH estimates only
- **Better Indicators**: QQQ/SPY and SPY/EFA have longer, cleaner data
- **Improved Confidence**: 15-year GARCH captures multiple market regimes

### Data Requirements:
- **Must Update**: Data collector for new indicators
- **Yahoo Finance**: QQQ, SPY, EFA daily prices
- **Calculations**: Ratios and 3-month momentum
- **Storage**: 15-year rolling percentiles

### Next Development Phase:
- **Target**: hcp_tracker_v6.6.0.html with IPS v4.1 integration
- **Modules**: Integrate v2.1 indicators, v2.1 file handler, v3.2 calculator
- **Testing**: Validate with real QQQ/SPY and SPY/EFA data
- **Documentation**: Update PRD to reflect all changes

## 🚨 IMMEDIATE PRIORITIES (September 5, 2025)

### High Priority:
1. **Update data collector** - Add QQQ/SPY and SPY/EFA collection
2. **Create hcp_tracker_v6.6.0.html** - Integrate IPS v4.1 modules
3. **Test GARCH calculations** - Verify 15-year lookback works correctly
4. **Validate transition probabilities** - Check for realistic persistence

### Medium Priority:
1. Update Tracker PRD for IPS v4.1 changes
2. Document data collection requirements
3. Create migration guide from v3.11 to v4.1
4. Performance test with extended history calculations

---

*This index reflects the IPS v4.1 update as of September 5, 2025. The extended history indicators (QQQ/SPY, SPY/EFA) provide 19+ years of data, enabling robust GARCH estimation without artificial volatility floors.*