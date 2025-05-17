# 🚀 0g Auto Swap
An automated bot for Swap ERC20 on 0g labs dex. This bot helps users participate in 0g by automating various interactions and maintaining consistent wallet activity.

## 🔍 Features
- Automatically swap on 0g
- Automatic reporting/logging of transactions

## 🛠️ Prerequisites
- Node.js (v14 or higher)
- Wallets with A0GI token
- Private keys for your wallet(s)

## ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/linndend/0gswap.git
cd 0gswap
```
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the root directory with your wallet private keys:
```
nano .env
```
format :
```
PRIVATE_KEY=0x
```
## 🚀 Usage

Start the bot by running:
```bash
npm run start
```
