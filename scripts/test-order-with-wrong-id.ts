#!/usr/bin/env ts-node
/**
 * Test script to make a test order with a placeholder ownerId
 * The error message might reveal the correct ID format or give us clues
 * 
 * Usage:
 *   ts-node scripts/test-order-with-wrong-id.ts
 */

import dotenv from 'dotenv';
import { config } from '../src/config/env';
import { getAccount } from '../src/blockchain/wallet';

dotenv.config();

async function testOrderWithPlaceholderId() {
  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  const account = getAccount();
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (config.limitlessApiKey) {
    const headerName = config.limitlessApiKeyHeader || 'X-API-Key';
    const headerValue = config.limitlessApiKeyPrefix
      ? `${config.limitlessApiKeyPrefix} ${config.limitlessApiKey}`
      : config.limitlessApiKey;
    headers[headerName] = headerValue;
  }
  
  // Try with a placeholder ownerId to see what error we get
  const testOwnerIds = [0, 1, 999999, 12345];
  
  console.log(`Testing order submission with placeholder ownerIds...`);
  console.log(`Wallet: ${account.address}\n`);
  
  // First, we need a valid market slug. Let's try to get one from markets
  let testMarketSlug = '';
  try {
    const marketsRes = await fetch(`${baseUrl}/markets/active?limit=1`, { headers });
    const marketsText = await marketsRes.text();
    if (marketsRes.ok && marketsText.startsWith('{')) {
      const marketsData = JSON.parse(marketsText);
      if (marketsData.data && marketsData.data.length > 0) {
        testMarketSlug = marketsData.data[0].slug || '';
        console.log(`Using test market: ${testMarketSlug}\n`);
      }
    }
  } catch (e) {
    console.log(`Could not fetch markets, using placeholder slug\n`);
    testMarketSlug = 'test-market-slug';
  }
  
  if (!testMarketSlug) {
    console.log(`❌ Could not get a market slug to test with.`);
    console.log(`   You'll need to manually test by making a real order attempt.`);
    return;
  }
  
  // Try with different placeholder IDs
  for (const ownerId of testOwnerIds) {
    const orderPayload = {
      order: {
        salt: Date.now(),
        maker: account.address,
        signer: account.address,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: '1',
        makerAmount: 1000000,
        takerAmount: 1000000,
        expiration: '0',
        nonce: 0,
        feeRateBps: 0,
        side: 0,
        signatureType: 0,
        price: 0.5,
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
      ownerId: ownerId,
      orderType: 'GTC',
      marketSlug: testMarketSlug,
    };
    
    console.log(`Testing with ownerId: ${ownerId}`);
    try {
      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      });
      
      const text = await res.text();
      console.log(`   Status: ${res.status}`);
      console.log(`   Response: ${text.slice(0, 300)}`);
      
      // If we get a different error than "Profile ID does not match", that's progress
      if (res.status === 400 && !text.includes('Profile ID does not match')) {
        console.log(`   ⚠️  Different error - might be progress!`);
      }
    } catch (error) {
      console.log(`   Error: ${error}`);
    }
    console.log('');
  }
  
  console.log(`💡 If you see different error messages, they might reveal the correct ID format.`);
  console.log(`💡 Or try making a real order attempt - the error might include your actual ID.`);
}

testOrderWithPlaceholderId().catch(console.error);
