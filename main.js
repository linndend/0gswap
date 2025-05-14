import fs from 'fs';
import { ogSwap } from './utils/swap.js';

const privkeys = fs.readFileSync('./wallets.txt', 'utf-8').trim().split('\n');

(async () => {
  for (let i = 0; i < privkeys.length; i++) {
    const pk = privkeys[i].trim();
    const bot = new ogSwap(pk, i + 1, privkeys.length);
    await bot.autoSwapBtcUsdt();
    await bot.autoSwapEthUsdt();
  }
})();
