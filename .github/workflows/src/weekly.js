// Weekly Report Generator
console.log('📊 Generating weekly report...');

const { createClient } = require('@supabase/supabase-js');

async function generateWeeklyReport() {
  const supabase = process.env.SUPABASE_URL ? 
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) : null;
  
  if (!supabase) {
    console.log('📊 No database configured for weekly report');
    return;
  }
  
  try {
    // Get last 7 days of data
    const { data } = await supabase
      .from('market_checks')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
      console.log('📊 No data available for weekly report');
      return;
    }
    
    const latest = data[0];
    const frameworkReadyDays = data.filter(d => d.frameworkReady).length;
    const avgVolatilityStreak = data.reduce((sum, d) => sum + d.volatilityStreak, 0) / data.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '7 days',
      frameworkReady: latest.frameworkReady,
      frameworkReadyDays,
      avgVolatilityStreak: avgVolatilityStreak.toFixed(1),
      currentStreak: latest.volatilityStreak,
      pumpingTokens: latest.pumpingTokens,
      recommendation: latest.frameworkReady ? 'EXECUTE FRAMEWORK' : 'CONTINUE MONITORING'
    };
    
    console.log('📊 Weekly Report:', JSON.stringify(report, null, 2));
    
    // Send report via webhooks (implement similar to alerts)
    
  } catch (error) {
    console.error('💥 Weekly report failed:', error);
  }
}

generateWeeklyReport();
