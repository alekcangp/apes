# Apes Trading Bot (Multi-Token, Multi-Chain)

Automated trading bot for any token on Ethereum, Solana, and compatible EVM chains. The bot monitors new pools, buys tokens, and sells based on stop-loss, take-profit, or timeout conditions. Includes robust error handling, retry logic, and color-coded console output.

## Features
- Monitors new token pools on multiple supported networks (multi-chain)
- Automatically buys and sells multiple tokens (multi-token)
- Sells tokens based on:
  - Stop-loss
  - Take-profit
  - Timeout (auto-close)
- Robust error handling and retry logic
- Color-coded console output for key events (PnL, balances, etc.)
- File-based logging to prevent duplicate buys across multiple terminals
- Easily configurable for different chains and tokens

## Requirements
- Node.js (v18+ recommended)
- Access to the Recall Network API (API key required)

## Setup & Run
1. **Clone the repository and install dependencies**
   ```sh
   git clone https://github.com/alekcangp/apes.git
   cd apes
   npm install
   ```
2. **Configure your API key and trading parameters**
   - Create a `.env` file in the project root with your Recall Network API key:
     ```
     API_KEY=your_actual_api_key_here
     ```
   - Open `apes_agent.js` and adjust other configuration variables at the top of the file (slippage, intervals, etc.) as needed.
3. **Run the bot**
   ```sh
   node apes_agent.js
   ```

**Troubleshooting:**
- If you see `API_KEY` is undefined, make sure your `.env` file is in the same directory where you run the script.
- The variable name in `.env` must be exactly `API_KEY` (all caps, no spaces).

## Customization
- Adjust trading parameters (slippage, monitoring interval, etc.) at the top of `apes_agent.js`.
- Extend to support additional tokens and chains by modifying configuration variables.

## Notes
- The bots are for educational and experimental purposes. Use at your own risk.
- Make sure your API key and wallet are secure. Never commit sensitive information to public repositories.
- **Ensure your wallet has enough balance for trading.**

## License
MIT 