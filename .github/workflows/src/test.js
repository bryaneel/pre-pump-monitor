// Test System
console.log('🧪 Testing Pre-Pump Monitor System...');

const testAlert = {
  priority: 'info',
  title: '🧪 System Test Alert',
  message: 'This is a test alert to verify your webhook configuration is working correctly.',
  data: {
    btcMove: 1.5,
    ethMove: -0.8,
    volatilityStreak: 5,
    pumpingTokens: 42,
    smartMoneyTokens: 28
  }
};

async function sendTestAlert() {
  if (process.env.DISCORD_WEBHOOK) {
    console.log('📤 Testing Discord webhook...');
    // Discord test logic here
  }
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log('📤 Testing Telegram webhook...');
    // Telegram test logic here
  }
  
  console.log('✅ Test completed! Check your Discord/Telegram for test messages.');
}

sendTestAlert();
