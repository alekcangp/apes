require('dotenv').config({ quiet: true });
const apiKey = process.env.API_KEY;
const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
//const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

async function getBalances() {
  const url = 'https://api.competitions.recall.network/api/agent/balances';
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const data = await response.json();
  return data.balances;
}

async function sellToken(tokenAddress, amount) {
  const url = 'https://api.competitions.recall.network/api/trade/execute';
  const body = {
    fromToken: tokenAddress.toLowerCase(),
    toToken: usdcAddress,
    amount: amount,
    reason: "Sell all tokens for USDC.",
    slippageTolerance: "0.5",
    fromChain: "evm",
    fromSpecificChain: "eth",
    toChain: "evm",
    toSpecificChain: "eth"
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
  console.log(`Sell ${amount} of ${tokenAddress}:`, result);
  return result;
}

async function sellAllTokens() {
 
    const balances = await getBalances();
    for (const token of balances) {
       try {
      if (
        token.tokenAddress.toLowerCase() !== usdcAddress.toLowerCase() && /*token.tokenAddress.toLowerCase() !== wethAddress.toLowerCase() &&*/
        token.specificChain === 'eth' &&
        Number(token.amount) > 0.000001 //&&  Number(token.amount) < 100
      ) {
        
        console.log(token.tokenAddress, ' ', token.amount)

        await sellToken(token.tokenAddress.toLowerCase(), token.amount);
      }
      } catch (err) {
    console.error('Error selling tokens:', err.message);
    continue
  }
    }
    console.log('All tokens (except USDC) have been sold for USDC.');
    const balancess = await getBalances();
    for (const token of balancess) {
      if (token.tokenAddress.toLowerCase() == usdcAddress.toLowerCase() ) {console.log(token.amount); return}

    }
    
   // setTimeout(sellAllTokens, 60000); 
  
}

sellAllTokens(); 