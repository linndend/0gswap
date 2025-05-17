import chalk from "chalk";
import { ethers } from "ethers";
import fs from 'fs';
const abi = JSON.parse(fs.readFileSync('./abi.json', 'utf-8'));

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
  }

  log(type, message) {
    const prefix = `[${new Date().toLocaleTimeString()}]`;
    switch (type) {
      case "success": console.log(chalk.green(prefix, message)); break;
      case "error": console.log(chalk.red(prefix, message)); break;
      case "info": console.log(chalk.blue(prefix, message)); break;
      case "warn": console.log(chalk.yellow(prefix, message)); break;
      default: console.log(prefix, message); break;
    }
  }

  async approveToken(tokenContract, spenderAddress, amount) {
    this.log("info", `Trying approval...`);
    try {
      const nonce = await this.web3.getTransactionCount(this.wallet.address, "pending");
      this.log("info", `Using nonce ${nonce} for approval`);

      const tx = await tokenContract.approve(spenderAddress, amount, {
        nonce,
        gasLimit: 100_000,
        gasPrice: (await this.web3.getFeeData()).gasPrice,
      });

      await tx.wait();
      this.log("success", `Approval TX Hash: ${tx.hash}`);
      this.log("success", `Explorer URL: ${this.EXPLORER}${tx.hash}`);
      return tx.hash;
    } catch (err) {
      this.log("error", `Approval failed: ${err.message}`);
      return null;
    }
  }

  async autoSwap(pair) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const random = Math.random() < 0.5;
      const direction = random ? `${pair[0]}->${pair[1]}` : `${pair[1]}->${pair[0]}`;

      const amountUSDT = parseFloat((Math.random() * (100 - 50) + 50).toFixed(2));
      const amountToken = parseFloat((Math.random() * (0.0005 - 0.0002) + 0.0002).toFixed(6));

      const tokenIn = direction.includes("USDT") ? this.usdtContract : this[`${pair[1].toLowerCase()}Contract`];
      const tokenOut = direction.includes("USDT") ? this[`${pair[1].toLowerCase()}Contract`] : this.usdtContract;

      const decimalsIn = await tokenIn.decimals();
      const decimalsOut = await tokenOut.decimals();

      const balanceIn = await tokenIn.balanceOf(this.wallet.address);
      const balanceOut = await tokenOut.balanceOf(this.wallet.address);

      this.log("info", `Balance Before Swap:`);
      this.log("info", `${pair[0]}: ${ethers.formatUnits(balanceIn, decimalsIn)}`);
      this.log("info", `${pair[1]}: ${ethers.formatUnits(balanceOut, decimalsOut)}`);
      console.log(chalk.white("=".repeat(80)));

      const amountIn = direction.includes("USDT")
        ? ethers.parseUnits(amountUSDT.toString(), 18)
        : ethers.parseUnits(amountToken.toString(), 120);

      const approveTx = await this.approveToken(tokenIn, this.swapaddress, amountIn);
      if (!approveTx) return;

      this.log("success", `Approved ${direction.split("->")[0]}`);

      const deadline = Math.floor(Date.now() / 1000) + 300;
      const nonce = await this.web3.getTransactionCount(this.wallet.address, "pending");

      try {
        const swapTx = await this.swapContract.exactInputSingle({
          tokenIn: direction.includes("USDT") ? this.usdtaddress : this[pair[1].toLowerCase() + 'address'],
          tokenOut: direction.includes("USDT") ? this[pair[1].toLowerCase() + 'address'] : this.usdtaddress,
          fee: 3000,
          recipient: this.wallet.address,
          deadline,
          amountIn,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        }, {
          nonce,
          gasLimit: 1_000_000,
          gasPrice: (await this.web3.getFeeData()).gasPrice,
        });

        await swapTx.wait();
        this.log("success", `Swap ${direction} successful`);
        this.log("success", `Amount: ${ethers.formatUnits(amountIn, decimalsIn)} USDT`);
        this.log("success", `TX: ${swapTx.hash}`);
        this.log("success", `Explorer: ${this.EXPLORER}${swapTx.hash}`);
        console.log(chalk.white("=".repeat(80)));

      } catch (err) {
        this.log("error", `Swap failed: ${err.message}`);
      }
    }
  }

  async autoSwapBtcUsdt() {
    return this.autoSwap(['USDT', 'BTC']);
  }

  async autoSwapEthUsdt() {
    return this.autoSwap(['USDT', 'ETH']);
  }
}
