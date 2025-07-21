require('dotenv').config({ quiet: true });
const apiKey = process.env.API_KEY;
const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

async function getBalances() {
  const url = 'https://api.sandbox.competitions.recall.network/api/agent/balances';
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
  const url = 'https://api.sandbox.competitions.recall.network/api/trade/execute';
  const body = {
    fromToken: tokenAddress,
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
  console.log(`Sell ${amount} of ${tokenAddress}:`, result.success);
  return result;
}

async function sellAllTokens() {
  try {
    const balances = await getBalances();
    for (const token of balances) {
      if (
        token.tokenAddress.toLowerCase() !== usdcAddress.toLowerCase() && token.tokenAddress.toLowerCase() !== wethAddress.toLowerCase() &&
        token.specificChain === 'eth' &&
        Number(token.amount) > 2
      ) {
        await sellToken(token.tokenAddress, token.amount);
      }
    }
    console.log('All tokens (except USDC) have been sold for USDC.');
  } catch (err) {
    console.error('Error selling tokens:', err);
  }
}

sellAllTokens(); 