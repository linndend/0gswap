import fs from 'fs';
import { ogSwap } from './utils/swap.js';

const privateKeys = fs.readFileSync('./wallets.txt', 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);

const delay = ms => new Promise(res => setTimeout(res, ms));
const DELAY_BETWEEN_WALLETS = 5000;
const CYCLE_INTERVAL = 24 * 60 * 60 * 1000; 

const run = async () => {
  console.log(`[${new Date().toLocaleTimeString()}] Starting BOT 0G`);
  for (let i = 0; i < privateKeys.length; i++) {
    const pk = privateKeys[i];
    const bot = new ogSwap(pk, i + 1, privateKeys.length);

    try {
      await bot.autoSwapBtcUsdt();
      await delay(2000);
      await bot.autoSwapEthUsdt();
    } catch (err) {
      console.log(`[${i + 1}/${privateKeys.length}] ❌ Error:`, err.message);
    }

    if (i < privateKeys.length - 1) {
      await delay(DELAY_BETWEEN_WALLETS);
    }
  }
  console.log(`[${new Date().toLocaleTimeString()}] ⏳ Next cycle in ${CYCLE_INTERVAL / (1000 * 60 * 60)} hours`);
};

run();

setInterval(run, CYCLE_INTERVAL);
