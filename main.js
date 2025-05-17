import { config } from 'dotenv';
import { ogSwap } from './utils/swap.js';

config();

const delay = ms => new Promise(res => setTimeout(res, ms));
const DELAY_BETWEEN_WALLETS = 5000;
const CYCLE_INTERVAL = 24 * 60 * 60 * 1000;

const run = async () => {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not found in .env");
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Starting BOT 0G`);

  const bot = new ogSwap(privateKey, 1, 1);

  try {
    await bot.autoSwapBtcUsdt();
    await delay(2000);
    await bot.autoSwapEthUsdt();
  } catch (err) {
    console.log(`❌ Error:`, err.message);
  }

  console.log(`[${new Date().toLocaleTimeString()}] ⏳ Next cycle in ${CYCLE_INTERVAL / (1000 * 60 * 60)} hours`);
};

run();
setInterval(run, CYCLE_INTERVAL);
