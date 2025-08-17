// Pre-Pump Framework Monitor
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

class PrePumpMonitor {
  constructor() {
    this.supabase = process.env.SUPABASE_URL ? 
      createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) : null;
    
    this.thresholds = {
      volatilityLimit: 3,
      pumpTokenLimit: 15,
      smartMoneyMinTokens: 20,
      streakRequired: 10
    };
  }

  async checkMarketConditions() {
    console.log('🔍 Checking market conditions...');
    
    // Simulate market data (replace with real APIs)
    const btcMove = this.simulatePriceMove();
    const ethMove = this.simulatePriceMove();
    const pumpingTokens = Math.floor(Math.random() * 50) + 60;
    const smartMoneyTokens = Math.floor(Math.random() * 20) + 40;
    
    // Get previous streak
    const lastData = await this.getLastCheck();
    let volatilityStreak = 0;
    
    const lowVolatility = Math.abs(btcMove) < this.thresholds.volatilityLimit && 
                         Math.abs(ethMove) < this.thresholds.volatilityLimit;
    
    if (lowVolatility) {
      volatilityStreak = (lastData?.volatilityStreak || 0) + 1;
    }
    
    const results = {
      timestamp: new Date().toISOString(),
      btcMove: parseFloat(btcMove.toFixed(2)),
      ethMove: parseFloat(ethMove.toFixed(2)),
      pumpingTokens,
      smartMoneyTokens,
      volatilityStreak,
      conditions: {
        volatility: volatilityStreak >= this.thresholds.streakRequired,
        maturity: pumpingTokens <= this.thresholds.pumpTokenLimit,
        smartMoney: smartMoneyTokens >= this.thresholds.smartMoneyMinTokens
      }
    };
    
    results.frameworkReady = results.conditions.volatility && 
                            results.conditions.maturity && 
                            results.conditions.smartMoney;
    
    // Save results
    await this.saveResults(results);
    
    // Send alerts
    await this.processAlerts(results, lastData);
    
    console.log('📊 Results:', JSON.stringify(results, null, 2));
    return results;
  }

  simulatePriceMove() {
    // 70% chance of low volatility, 30% chance of high
    return Math.random() < 0.7 ? 
      (Math.random() - 0.5) * 4 : // ±2%
      (Math.random() - 0.5) * 12; // ±6%
  }

  async getLastCheck() {
    if (!this.supabase) return null;
    
    try {
      const { data } = await this.supabase
        .from('market_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      return data?.[0] || null;
    } catch (error) {
      console.warn('⚠️ Database read failed:', error.message);
      return null;
    }
  }

  async saveResults(results) {
    if (!this.supabase) {
      console.log('💾 No database configured, skipping save');
      return;
    }
    
    try {
      await this.supabase
        .from('market_checks')
        .insert([results]);
      console.log('✅ Results saved to database');
    } catch (error) {
      console.warn('⚠️ Database save failed:', error.message);
    }
  }

  async processAlerts(current, previous) {
    const alerts = [];
    
    // Framework ready alert
    if (current.frameworkReady) {
      alerts.push({
        priority: 'critical',
        title: '🚨 FRAMEWORK CONDITIONS MET!',
        message: `All conditions satisfied! Volatility streak: ${current.volatilityStreak} days, Pumping tokens: ${current.pumpingTokens}, Smart money: ${current.smartMoneyTokens} tokens. Execute Phase 2 immediately!`,
        data: current
      });
    }
    
    // Volatility streak building
    if (current.volatilityStreak >= 7 && current.volatilityStreak < 10) {
      alerts.push({
        priority: 'medium',
        title: '📈 Low Volatility Streak Building',
        message: `Volatility streak: ${current.volatilityStreak}/10 days. Need ${10 - current.volatilityStreak} more days for framework activation.`,
        data: current
      });
    }
    
    // Market cooling
    if (previous && current.pumpingTokens < previous.pumpingTokens - 10) {
      alerts.push({
        priority: 'medium',
        title: '❄️ Market Cooling Detected',
        message: `Pumping tokens decreased from ${previous.pumpingTokens} to ${current.pumpingTokens}. Market is cooling down!`,
        data: current
      });
    }
    
    // Send all alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  async sendAlert(alert) {
    console.log(`🔔 ${alert.priority.toUpperCase()}: ${alert.title}`);
    
    const promises = [];
    
    if (process.env.DISCORD_WEBHOOK) {
      promises.push(this.sendDiscordAlert(alert));
    }
    
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      promises.push(this.sendTelegramAlert(alert));
    }
    
    await Promise.allSettled(promises);
  }

  async sendDiscordAlert(alert) {
    const colors = { critical: 0xFF0000, high: 0xFF6600, medium: 0xFFFF00, low: 0x00FF00 };
    
    const embed = {
      title: alert.title,
      description: alert.message,
      color: colors[alert.priority] || colors.medium,
      timestamp: new Date().toISOString(),
      fields: [
        { name: 'BTC Move', value: `${alert.data.btcMove >= 0 ? '+' : ''}${alert.data.btcMove}%`, inline: true },
        { name: 'ETH Move', value: `${alert.data.ethMove >= 0 ? '+' : ''}${alert.data.ethMove}%`, inline: true },
        { name: 'Volatility Streak', value: `${alert.data.volatilityStreak} days`, inline: true },
        { name: 'Pumping Tokens', value: `${alert.data.pumpingTokens}`, inline: true },
        { name: 'Smart Money Tokens', value: `${alert.data.smartMoneyTokens}`, inline: true }
      ],
      footer: { text: 'Pre-Pump Framework Monitor' }
    };

    try {
      await fetch(process.env.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Pre-Pump Bot',
          embeds: [embed]
        })
      });
      console.log('✅ Discord alert sent');
    } catch (error) {
      console.error('❌ Discord alert failed:', error.message);
    }
  }

  async sendTelegramAlert(alert) {
    const priorityEmojis = { critical: '🚨', high: '⚠️', medium: '🟡', low: '🟢' };
    
    const message = `${priorityEmojis[alert.priority]} *${alert.title}*

${alert.message}

📊 *Market Data:*
- BTC: ${alert.data.btcMove >= 0 ? '+' : ''}${alert.data.btcMove}%
- ETH: ${alert.data.ethMove >= 0 ? '+' : ''}${alert.data.ethMove}%
- Volatility Streak: ${alert.data.volatilityStreak} days
- Pumping Tokens: ${alert.data.pumpingTokens}
- Smart Money Tokens: ${alert.data.smartMoneyTokens}

⏰ ${new Date().toLocaleString()}`;

    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      console.log('✅ Telegram alert sent');
    } catch (error) {
      console.error('❌ Telegram alert failed:', error.message);
    }
  }
}

// Run monitor
async function main() {
  const monitor = new PrePumpMonitor();
  try {
    await monitor.checkMarketConditions();
    console.log('✅ Monitor check completed');
  } catch (error) {
    console.error('💥 Monitor failed:', error);
    process.exit(1);
  }
}

main();
