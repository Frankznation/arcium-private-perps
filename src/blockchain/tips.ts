import { type Address, type Hash, parseEther } from 'viem';
import { base } from 'viem/chains';
import { getWalletClient, getBalance, getAccount } from './wallet';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { weiToEth } from '../utils/helpers';

export async function sendTip(recipient: Address, amountEth: number): Promise<Hash> {
  const balance = await getBalance();
  const minBalance = BigInt(Math.floor(config.tipMinBalanceEth * 1e18));

  if (balance < minBalance) {
    throw new Error(`Balance too low to tip. Balance: ${weiToEth(balance)} ETH`);
  }

  const walletClient = getWalletClient();
  const account = getAccount();
  const hash = await walletClient.sendTransaction({
    chain: base,
    account,
    to: recipient,
    value: parseEther(amountEth.toString()),
  });

  logger.info(`Tip sent to ${recipient} - ${amountEth} ETH (tx: ${hash})`);
  return hash;
}
