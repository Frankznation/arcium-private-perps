#!/usr/bin/env ts-node
/**
 * Diagnostic script to check agent status
 * Shows: trades, NFTs, AI decisions, etc.
 */

import dotenv from 'dotenv';
import { getAllTrades, getOpenTrades } from '../src/database/queries';
import { getBalance } from '../src/blockchain/wallet';
import { weiToEth } from '../src/utils/helpers';
import { config } from '../src/config/env';

dotenv.config();

async function checkStatus() {
  console.log('🦀 CrabTrader Agent Status Check\n');
  console.log('='.repeat(50));
  
  // Check wallet balance
  try {
    const balance = await getBalance();
    const ethBalance = weiToEth(balance);
    console.log(`💰 Wallet Balance: ${ethBalance.toFixed(4)} ETH`);
    console.log(`   Address: ${config.walletAddress || 'not set'}`);
  } catch (error) {
    console.log(`❌ Failed to get balance: ${error}`);
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Check trades
  try {
    const allTrades = await getAllTrades(100);
    const openTrades = await getOpenTrades();
    const closedTrades = allTrades.filter(t => t.status === 'CLOSED');
    const notableTrades = closedTrades.filter(t => 
      t.pnl_bps && Math.abs(t.pnl_bps) >= config.notableTradeThresholdBps
    );
    const tradesWithNFTs = allTrades.filter(t => t.nft_token_id);
    
    console.log(`📊 Trades:`);
    console.log(`   Total: ${allTrades.length}`);
    console.log(`   Open: ${openTrades.length}`);
    console.log(`   Closed: ${closedTrades.length}`);
    console.log(`   Notable (≥${config.notableTradeThresholdBps}bps): ${notableTrades.length}`);
    console.log(`   With NFTs: ${tradesWithNFTs.length}`);
    
    if (openTrades.length > 0) {
      console.log(`\n   Open Positions:`);
      openTrades.forEach(t => {
        console.log(`     - ${t.market_name} (${t.position}) - ${t.amount_eth?.toFixed(4) || '?'} ETH @ ${t.entry_price}`);
      });
    }
    
    if (closedTrades.length > 0) {
      console.log(`\n   Recent Closed:`);
      closedTrades.slice(0, 5).forEach(t => {
        const pnl = t.pnl_bps ? `${t.pnl_bps > 0 ? '+' : ''}${(t.pnl_bps / 100).toFixed(2)}%` : 'N/A';
        const nft = t.nft_token_id ? `✅ NFT #${t.nft_token_id}` : '❌ No NFT';
        console.log(`     - ${t.market_name} - P&L: ${pnl} - ${nft}`);
      });
    }
  } catch (error) {
    console.log(`❌ Failed to get trades: ${error}`);
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Check configuration
  console.log(`⚙️  Configuration:`);
  console.log(`   Limitless Trading: ${config.limitlessTradingEnabled ? '✅ ENABLED' : '⚠️  DISABLED (mock only)'}`);
  console.log(`   NFT Contract: ${config.nftContractAddress || '❌ Not set'}`);
  console.log(`   Min ETH Balance: ${config.minEthBalance} ETH`);
  console.log(`   Max Position Size: ${config.maxPositionSize * 100}%`);
  console.log(`   Notable Threshold: ${config.notableTradeThresholdBps}bps (${config.notableTradeThresholdBps / 100}%)`);
  
  console.log('\n' + '='.repeat(50));
  
  // Recommendations
  console.log(`💡 Recommendations:`);
  
  if (!config.limitlessTradingEnabled) {
    console.log(`   ⚠️  Limitless trading is disabled - using mock trades`);
    console.log(`      To enable: Set LIMITLESS_TRADING_ENABLED=true in .env`);
  }
  
  if (!config.nftContractAddress) {
    console.log(`   ⚠️  NFT contract address not set`);
    console.log(`      To enable NFTs: Set NFT_CONTRACT_ADDRESS=<deployed_address> in .env`);
  }
  
  if (allTrades.length === 0) {
    console.log(`   ⚠️  No trades found in database`);
    console.log(`      - Check if AI is generating decisions`);
    console.log(`      - Check logs for errors during trade execution`);
    console.log(`      - Verify markets are being fetched correctly`);
  }
  
  const notableWithoutNFTs = closedTrades.filter(t => 
    t.pnl_bps && 
    Math.abs(t.pnl_bps) >= config.notableTradeThresholdBps && 
    !t.nft_token_id
  );
  
  if (notableWithoutNFTs.length > 0) {
    console.log(`   ⚠️  ${notableWithoutNFTs.length} notable trades without NFTs`);
    console.log(`      These should be minted on next iteration`);
  }
  
  console.log('\n' + '='.repeat(50));
}

checkStatus().catch(console.error);
