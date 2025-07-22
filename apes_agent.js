// === CONFIGURATION ===
// Your Recall Network API key
require('dotenv').config({ quiet: true });
const apiKey = process.env.API_KEY;

// USDC token address for the chain you are trading on
let quoteToken = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';//weth 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';//usdc '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
// Time (ms) between each trading cycle (how often to check for new pools)
const int = 60000;
// Time (ms) between each price check while holding a token
const monPrice = 15000;
// Maximum pool age (minutes) to consider for trading (skip older pools)
const age = 5; // min
// === END CONFIGURATION ===

const fs = require('fs');
const path = require('path');
const BOUGHT_TOKENS_FILE = path.join(__dirname, 'bought_tokens.log');
//console.log('[DEBUG] Log file path for bought tokens:', BOUGHT_TOKENS_FILE);

// Load bought tokens from file into a Set
function loadBoughtTokens() {
  try {
    //console.log('[DEBUG] Reading bought tokens from:', BOUGHT_TOKENS_FILE);
    const data = fs.readFileSync(BOUGHT_TOKENS_FILE, 'utf8');
    return new Set(data.split('\n').filter(Boolean));
  } catch (err) {
    return new Set();
  }
}

// Save bought tokens Set to file
function saveBoughtTokens(set) {
 // console.log('[DEBUG] Writing bought tokens to:', BOUGHT_TOKENS_FILE);
  fs.writeFileSync(BOUGHT_TOKENS_FILE, Array.from(set).join('\n'));
}

let isActive = false;
let actualAmount = 0;
// Chain/network configuration:
// chainId: EVM chain identifier (e.g. 'evm' for Ethereum, 'base' for Base, etc.)
let chainId = 'evm';
// specChain: Specific chain name (e.g. 'eth' for Ethereum mainnet, 'base' for Base, etc.)
let specChain = 'eth';
// chain: Used in API URLs for pool discovery (e.g. 'eth', 'base', etc.)
let chain = 'eth';
// substr: Number of characters to strip from token address prefix in API response (4 for eth_0x...)
let substr = 4;
// Variables for PnL calculation
let befor = 0;
let after = 0;
// Track bought tokens to prevent duplicate buys in case of API delay or multi-terminal
const boughtTokens = loadBoughtTokens();

// === SPINNER UTILITY ===
let spinnerInterval = null;
let spinnerIndex = 0;
const spinnerChars = ['|', '/', '-', '\\'];
function startSpinner() {
  if (spinnerInterval) return;
  spinnerIndex = 0;
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${spinnerChars[spinnerIndex++ % spinnerChars.length]} Trading cycle active...`);
  }, 100);
}
function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\r\x1b[2K'); // Clear the line
  }
}

async function getLastToken(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const url = `https://api.geckoterminal.com/api/v2/networks/${chain}/new_pools?page=1`;
      const response = await fetch(url);
      const data = await response.json();
      return data.data[0];
    } catch (err) {
      const shortMsg = err.code ? err.code : err.name;
      console.error(`Attempt ${i+1} failed:`, '\x1b[37m' + shortMsg + '\x1b[0m');
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 20000));
    }
  }
}

async function buyToken(tokenAddress, amount, retries = 6) {

  for (let i = 0; i < retries; i++) {
    try {
      const url = 'https://api.sandbox.competitions.recall.network/api/trade/execute';
      const body = {
        fromToken: quoteToken,
        toToken: tokenAddress,
        amount: amount,
        reason: "Apes Autonomous",
        slippageTolerance: "0.5",
        fromChain: chainId,
        fromSpecificChain: specChain,
        toChain: chainId,
        toSpecificChain: specChain
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
     //console.log(result)
      befor = Number(result.transaction.fromAmount)
      console.log('\x1b[1m[BUY] \x1b[0mFrom: ', result.transaction.fromToken, ' To: ', result.transaction.toToken, ' with ', '\x1b[32m' + result.transaction.fromAmount + '\x1b[0m');
      

      //const balances = await getBalances();
      //const tokenBalance = balances.find(t => t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
      actualAmount = /*tokenBalance ? tokenBalance.amount : */result.transaction.toAmount

//console.log('toToken: ',result.transaction.toToken)
//console.log('toAmount: ',actualAmount)
//console.log('fromAmount (USDC): ', '\x1b[32m' + result.transaction.fromAmount + '\x1b[0m')

      //if (!actualAmount || isNaN(actualAmount)) {
      //  console.log('No balance.');
     //   return { success: false, error: 'No balance.' };
     // }


      return result;
    } catch (err) {
      //console.error(`Attempt ${i+1} to buy token failed:`, '\x1b[37m' + err.message + '\x1b[0m');
      if (i === retries - 1) {
        console.log('All buy attempts failed, removing token from log and starting new cycle.');
        // Remove from set and file if all attempts fail
        const freshTokens = loadBoughtTokens();
        freshTokens.delete(tokenAddress);
        saveBoughtTokens(freshTokens);
        setTimeout(tradeBot, int);
        return { success: false, error: err, cycleRestarted: true };
      }
      await new Promise(res => setTimeout(res, 20000));
    }
  }
}

async function monitorPrice(tokenAddress, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const url = `https://api.sandbox.competitions.recall.network/api/price?token=${tokenAddress}&chain=${chainId}&specificChain=${specChain}`;
      const response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const priceData = await response.json();
      return priceData.price;
    } catch (err) {
      console.log(`Error: \x1b[37m${err.name}\x1b[0m`);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 20000));
    }
  }
}

async function sellToken(tokenAddress, reason = "", retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
     
      const url = 'https://api.sandbox.competitions.recall.network/api/trade/execute';
      const body = {
        fromToken: tokenAddress,
        toToken: quoteToken,
        amount: actualAmount.toString(),
        reason: reason || "Stop-loss or take-profit triggered.",
        slippageTolerance: "0.5",
        fromChain: chainId,
        fromSpecificChain: specChain,
        toChain: chainId,
        toSpecificChain: specChain
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      
      if (result.transaction) {
        after = Number(result.transaction.toAmount);
        console.log(`\x1b[1m[SELL]\x1b[0m (${reason}) From: `, result.transaction.fromToken, ' To: ', result.transaction.toToken, ' for ', '\x1b[31m' + result.transaction.toAmount + '\x1b[0m');
      //  console.log('Received:', '\x1b[32m' + result.transaction.toAmount + '\x1b[0m', 'USDC');
        const pnl = after - befor;
        if (pnl > 10000) {console.log('\x1b[44m\x1b[1m\x1b[36mPnL: ', pnl, '\x1b[0m');}
        else if (pnl >= 0) {console.log('\x1b[1m\x1b[36mPnL: ', pnl, '\x1b[0m');}
        else {
        console.log('\x1b[1m\x1b[35mPnL: ', pnl, '\x1b[0m');
        }
       // console.log('toAmount (USDC): ', '\x1b[36m' + result.transaction.toAmount + '\x1b[0m');
      } else {
        console.error('Sell failed or no transaction returned:', result);
      }
      return result;
    } catch (err) {
      console.error(`Attempt ${i+1} to sell token failed:`, '\x1b[37m' + err.name + '\x1b[0m');
      if (i === retries - 1) {
        console.log('All sell attempts failed, starting new cycle.');
        setTimeout(tradeBot, int);
        return { success: false, error: err, cycleRestarted: true };
      }
      await new Promise(res => setTimeout(res, 20000));
    }
  }
}

async function getBalances(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const url = 'https://api.sandbox.competitions.recall.network/api/agent/balances';
      const response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await response.json();
      return data.balances;
    } catch (err) {
      console.error(`Attempt ${i+1} to fetch balances failed:`, '\x1b[37m' + err.name + '\x1b[0m');
      if (i === retries - 1) {
        console.log('All getBalances attempts failed, starting new cycle.');
        setTimeout(tradeBot, int);
        return { balances: [], cycleRestarted: true };
      }
      await new Promise(res => setTimeout(res, 20000));
    }
  }
}

async function getEntryPrice(tokenAddress, retries = 5, delay = 10000) {
  for (let i = 0; i < retries; i++) {
    try {
      const price = await monitorPrice(tokenAddress);
      if (price) return price;
    } catch (err) {}
    if (i < retries - 1) {
      console.log(`Entry price not found, retrying in ${delay / 1000} seconds... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.log('All getEntryPrice attempts failed, starting new cycle.');
  setTimeout(tradeBot, int);
  return { price: null, cycleRestarted: true };
}

async function tradeBot() {
  stopSpinner(); // Stop any previous spinner
  startSpinner();
  befor = 0; after = 0;
  actualAmount = 0
  if (isActive) {
    console.log('tradeBot already running, skipping new launch.');
    return;
  }
  isActive = true;
  
  try {
    const lastToken = await getLastToken();
    //console.log(lastToken)
    const now = Date.now() / 1000;
    const poolCreatedAt = Date.parse(lastToken.attributes.pool_created_at) / 1000;
    //console.log(now - poolCreatedAt);
    if ((now - poolCreatedAt) > age * 60) { setTimeout(tradeBot, int); return; }
    //const reserve = Number(lastToken.attributes.reserve_in_usd);
    const tokenAddress = lastToken.relationships.base_token.data.id.substring(substr);
    //quoteToken = lastToken.relationships.quote_token.data.id.substring(substr);
    //console.log('Last token:', tokenAddress);
   // console.log('Reserve :', reserve);
   
    const price = Number(lastToken.attributes.base_token_price_usd);
    if (price > 1e3 || price < 1e-13) {
      console.log(`Token price ${price}, skipping.`);
      setTimeout(tradeBot, int);
      return;
    }

    // Always reload bought tokens from file before checking
    const freshTokens = loadBoughtTokens();
    if (freshTokens.has(tokenAddress)) {
      setTimeout(tradeBot, int);
      return;
    } else {
      freshTokens.add(tokenAddress);
      saveBoughtTokens(freshTokens);
    }
    
    const balancesResult = await getBalances();
    if (balancesResult && balancesResult.cycleRestarted) return;
    const balances = balancesResult.balances || balancesResult;
    let buyData = null;
    let buyTries = 0;
    const maxBuyTries = 3;
    for (const addr of balances) {
      if (addr.tokenAddress == quoteToken) {
        const amount = addr.amount * 0.1;
        stopSpinner(); 
        console.log('Balance: ', '\x1b[1m' + addr.amount + '\x1b[0m');
        // No need to write to file here, already handled above
        while (buyTries < maxBuyTries) {
          buyData = await buyToken(tokenAddress, amount);
          if (buyData && buyData.cycleRestarted) return;
          if (buyData && buyData.success !== false) {
            break;
          } else if (buyData && buyData.cycleRestarted) {
            // If a new cycle was started, break out of the buy loop immediately
            break;
          } else {
            buyTries++;
            if (buyTries < maxBuyTries) {
              console.log(`Buy failed, retrying in 20 seconds... (${buyTries}/${maxBuyTries})`);
              await new Promise(res => setTimeout(res, 20000));
            } else {
              // Remove from set and file if all attempts fail
              freshTokens.delete(tokenAddress);
              saveBoughtTokens(freshTokens);
              console.log('Removed token from boughtTokens due to repeated buy failure:', tokenAddress);
            }
          }
        }
        break;
      }
    }
    if (!buyData || buyData.success === false) {
      if (buyData && buyData.cycleRestarted) return;
      console.log('No balance.');
      setTimeout(tradeBot, int);
      return;
    }
    let entryPrice;
    let entryPriceResult;
    try {
      entryPriceResult = await getEntryPrice(tokenAddress, 3, 10000);
      if (entryPriceResult && entryPriceResult.cycleRestarted) return;
      entryPrice = entryPriceResult.price !== undefined ? entryPriceResult.price : entryPriceResult;
    } catch (err) {
      console.log(`Error: \x1b[37m${err.name}\x1b[0m`);
      const sellResult = await sellToken(tokenAddress, "entry-price-error");
      if (sellResult && sellResult.cycleRestarted) return;
      return tradeBot();
    }
    if (!entryPrice) {
      console.log('Entry price not found after retries, selling token.');
      const sellResult = await sellToken(tokenAddress, "entry-price-missing");
      if (sellResult && sellResult.cycleRestarted) return;
      return tradeBot();
    }
    const stopLoss = entryPrice * 0.9;
    const takeProfit = entryPrice * 1.2;
    console.log(`Entry: ${entryPrice}`);//, Stop-loss: ${stopLoss}, Take-profit: ${takeProfit}`);
    if (entryPrice <= stopLoss) {
      console.log('Stop-loss triggered immediately after buy! Selling...');
      const sellResult = await sellToken(tokenAddress, "stop-loss");
      if (sellResult && sellResult.cycleRestarted) return;
      return tradeBot();
    } else if (entryPrice >= takeProfit) {
      console.log('Take-profit triggered immediately after buy! Selling...');
      const sellResult = await sellToken(tokenAddress, "take-profit");
      if (sellResult && sellResult.cycleRestarted) return;
      return tradeBot();
    }
    let positionClosed = false;
    const interval = setInterval(async () => {
      if (positionClosed) return;
      try {
        const price = await monitorPrice(tokenAddress);
        if (!price) return;
        if (price <= stopLoss) {
          positionClosed = true;
          console.log('Stop-loss triggered! Selling...');
          const sellResult = await sellToken(tokenAddress, "stop-loss");
          if (sellResult && sellResult.cycleRestarted) return;
          clearInterval(interval);
          clearTimeout(closeTimeout);
          tradeBot();
        } else if (price >= takeProfit) {
          positionClosed = true;
          console.log('Take-profit triggered! Selling...');
          const sellResult = await sellToken(tokenAddress, "take-profit");
          if (sellResult && sellResult.cycleRestarted) return;
          clearInterval(interval);
          clearTimeout(closeTimeout);
          tradeBot();
        } else {
          //console.log('No action. Price:', price);
        }
      } catch (err) {
        console.log(`Error: \x1b[37m${err.name}\x1b[0m`);
      }
    }, monPrice);
   const closeTimeout = setTimeout(async () => {
      if (positionClosed) return;
      positionClosed = true;
      console.log('Timeout passed, closing position...');
      const sellResult = await sellToken(tokenAddress, "timeout");
      if (sellResult && sellResult.cycleRestarted) return;
      clearInterval(interval);
      tradeBot();
    }, (Math.floor(Math.random() * 6) + 5) * 60 * 1000);
  } catch (err) {
    console.log(`Error: \x1b[37m${err.name}\x1b[0m`);
  } finally {
    isActive = false;
  }
}
tradeBot(); 