import chalk from "chalk";
import { ethers } from "ethers";
import fs from 'fs';

const abi = JSON.parse(fs.readFileSync('./utils/abi.json', 'utf-8'));

export class ogSwap {
  constructor(privkey, currentNum, total) {
    this.RPC = 'https://evmrpc-testnet.0g.ai';
    this.EXPLORER = 'https://chainscan-galileo.0g.ai/tx/';
    this.CHAIN_ID = 16601;

    this.privkey = privkey;
    this.web3 = new ethers.JsonRpcProvider(this.RPC, this.CHAIN_ID);
    this.wallet = new ethers.Wallet(this.privkey, this.web3);

    this.swapaddress = '0xb95B5953FF8ee5D5d9818CdbEfE363ff2191318c';
    this.usdtaddress = '0x3eC8A8705bE1D5ca90066b37ba62c4183B024ebf';
    this.btcaddress = '0x36f6414FF1df609214dDAbA71c84f18bcf00F67d';
    this.ethaddress = '0x0fE9B43625fA7EdD663aDcEC0728DD635e4AbF7c';

    this.usdtContract = new ethers.Contract(this.usdtaddress, abi.USDT_ABI, this.wallet);
    this.btcContract = new ethers.Contract(this.btcaddress, abi.BTC_ABI, this.wallet);
    this.ethContract = new ethers.Contract(this.ethaddress, abi.ETH_ABI, this.wallet);
    this.swapContract = new ethers.Contract(this.swapaddress, abi.ROUTER_ABI, this.wallet);

    this.currentNum = currentNum;
    this.total = total;
    this.approvedTokens = {};
  }

  log(type, message) {
    const prefix = `[${new Date().toLocaleTimeString()}]`;
    const color = {
      success: chalk.green,
      error: chalk.red,
      info: chalk.blue,
      warn: chalk.yellow,
      process: chalk.cyan
    }[type] || ((msg) => msg);
    console.log(color(`${prefix} ${message}`));
  }

  async approveToken(tokenContract, spenderAddress, amount) {
    const tokenAddress = await tokenContract.getAddress();
    if (this.approvedTokens[tokenAddress]) {
      this.log("info", `Token ${tokenAddress} already approved.`);
      return true;
    }

    this.log("info", `Approving ${tokenAddress}...`);
    try {
      const nonce = await this.web3.getTransactionCount(this.wallet.address, "pending");
      const tx = await tokenContract.approve(spenderAddress, amount, {
        nonce,
        gasLimit: 2_000_000,
        gasPrice: (await this.web3.getFeeData()).gasPrice,
      });

      await tx.wait();
      this.log("success", `Approved. TX: ${tx.hash}`);
      this.log("success", `Explorer: ${this.EXPLORER}${tx.hash}`);
      this.approvedTokens[tokenAddress] = true;
      return tx.hash;
    } catch (err) {
      this.log("error", `Approval failed: ${err.message}`);
      return null;
    }
  }

    delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
    }

  async autoSwap(tokenA, tokenB, isReverse, decimalsA, decimalsB, labelA, labelB) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const randomAmountA = parseFloat((Math.random() * (50 - 30) + 30).toFixed(2));
      const randomAmountB = parseFloat((Math.random() * (0.02 - 0.002) + 0.002).toFixed(6));
      const balanceA = await tokenA.balanceOf(this.wallet.address);
      const balanceB = await tokenB.balanceOf(this.wallet.address);

      this.log("info", `Balance Before Swap:`);
      this.log("info", `${labelA}: ${ethers.formatUnits(balanceA, decimalsA)}`);
      this.log("info", `${labelB}: ${ethers.formatUnits(balanceB, decimalsB)}`);
      console.log(chalk.white("=".repeat(85)));

      const isForward = Math.random() < 0.5;
      const direction = isForward ? `${labelA}->${labelB}` : `${labelB}->${labelA}`;
      const amount = isForward
        ? ethers.parseUnits(randomAmountA.toString(), decimalsA)
        : ethers.parseUnits(randomAmountB.toString(), decimalsB);

      const tokenToApprove = isForward ? tokenA : tokenB;
      const approveTx = await this.approveToken(tokenToApprove, this.swapaddress, amount);
      if (!approveTx) return;

      this.log("success", `Approved ${isForward ? labelA : labelB}`);

      const deadline = Math.floor(Date.now() / 1000) + 300;
      const swapNonce = await this.web3.getTransactionCount(this.wallet.address, "pending");

      this.log("process", `Swapping ${direction} with nonce ${swapNonce}`);

      const tokenIn = isForward ? await tokenA.getAddress() : await tokenB.getAddress();
      const tokenOut = isForward ? await tokenB.getAddress() : await tokenA.getAddress();

      try {
        const swapTx = await this.swapContract.exactInputSingle({
          tokenIn,
          tokenOut,
          fee: 3000,
          recipient: this.wallet.address,
          deadline,
          amountIn: amount,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        }, {
          nonce: swapNonce,
          gasLimit: 1_000_000,
          gasPrice: (await this.web3.getFeeData()).gasPrice,
        });

        await swapTx.wait();
        await this.delay(10000);
        this.log("success", `Swap ${direction} successful`);
        this.log("success", `Amount: ${ethers.formatUnits(amount, isForward ? decimalsA : decimalsB)}`);
        this.log("success", `TX: ${swapTx.hash}`);
        this.log("success", `URL: ${this.EXPLORER}${swapTx.hash}`);
        console.log(chalk.white("~".repeat(85)));
      } catch (err) {
        this.log("error", `Swap failed: ${err.message}`);
      }
    }
  }

   async autoSwapBtcUsdt() {
   const decimalsUSDT = await this.usdtContract.decimals();
   const decimalsBTC = await this.btcContract.decimals(); 
   await this.autoSwap(this.usdtContract, this.btcContract, false, decimalsUSDT, decimalsBTC, 'USDT', 'BTC');
  }

   async autoSwapEthUsdt() {
   const decimalsUSDT = await this.usdtContract.decimals();
   const decimalsETH = await this.ethContract.decimals();  
   await this.autoSwap(this.usdtContract, this.ethContract, false, decimalsUSDT, decimalsETH, 'USDT', 'ETH');
  }
}
