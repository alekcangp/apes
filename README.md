# Trading Bots for Any Tokens (Multi-Token, Multi-Chain)

This repository contains automated trading bots for multiple tokens across multiple blockchains, including Ethereum, Solana, and compatible EVM chains. The bots monitor new pools, buy tokens, and sell based on stop-loss, take-profit, or timeout conditions.

## Features
- Monitors new token pools on multiple supported networks (multi-chain)
- Automatically buys and sells multiple tokens (multi-token)
- Sells tokens based on:
  - Stop-loss
  - Take-profit
  - Timeout
- Robust error handling and retry logic
- Color-coded console output for key events (PnL, balances, etc.)
- Easily configurable for different chains and tokens

## Requirements
- Node.js (v18+ recommended)
- Access to the Recall Network API (API key required)


2. **Configure API keys**
   - Edit the `apiKey` variable in each bot file with your Recall Network API key.

3. **Run a bot**
   ```sh
   node apes_agent.js
   ```

## Customization
- Adjust trading parameters (USDC address, slippage, monitoring interval, etc.) at the top of each bot file.
- Easily extend to support additional tokens and chains by modifying configuration variables.

## Notes
- The bots are for educational and experimental purposes. Use at your own risk.
- Make sure your API key and wallet are secure.

## License
MIT 