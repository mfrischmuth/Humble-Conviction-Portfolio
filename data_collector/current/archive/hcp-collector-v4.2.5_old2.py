    def _assess_data_quality(self) -> Dict:
        """Assess overall data quality with proper GARCH counting"""
        total_expected = 12
        collected = len(self.calculated_indicators)
        
        # Count indicators with sufficient history for GARCH
        garch_ready_count = 0
        
        # Check each indicator for history
        indicators_with_history = {
            'dxy': self.raw_data.get('dxy', {}).get('monthly_history', []),
            'real_rates': self.raw_data.get('tips_10y', {}).get('values', []),
            'cofer': self.raw_data.get('cofer_usd', {}).get('history', []),
            'qqq_spy': self.calculated_indicators.get('qqq_spy', {}).get('monthly_history', []),
            'productivity': self.raw_data.get('productivity', {}).get('values', []),
            'tech_employment_pct': self.calculated_indicators.get('tech_employment_pct', {}).get('history', []),
            'put_call': self.master_data['historical_data'].get('put_call', {}),
            'trailing_pe': self.master_data['historical_data'].get('trailing_pe', {}),
            'eps_delivery': [],  # Calculated, limited history
            'spy_efa_momentum': [],  # Can be calculated from history
            'us_market_pct': self.calculated_indicators.get('us_market_pct', {}).get('monthly_history', []),
            'etf_flow_differential': []  # Proxy, limited history
        }
        
        for indicator, history in indicators_with_history.items():
            if len(history) >= 60:  # 5 years minimum for GARCH
                garch_ready_count += 1
                logger.debug(f"  {indicator}: {len(history)} months (GARCH ready)")
            else:
                logger.debug(f"  {indicator}: {len(history)} months (insufficient)")
        
        quality = {
            'indicators_collected': collected,
            'indicators_expected': total_expected,
            'completion_rate': round(collected / total_expected * 100, 1),
            'garch_ready': garch_ready_count,
            'failures_count': len(self.failures),
            'overall': 'GOOD' if collected >= 10 else 'PARTIAL' if collected >= 6 else 'POOR'
        }
        
        return quality