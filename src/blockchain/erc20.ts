import { createPublicClient, http, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import { config } from '../config/env';
import { getAccount, getWalletClient } from './wallet';
import { logger } from '../utils/logger';

const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const MAX_UINT256 = (1n << 256n) - 1n;

function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(config.baseRpcUrl),
  });
}

export async function ensureErc20Allowance(params: {
  tokenAddress: Address;
  spender: Address;
  minAllowance: bigint;
}): Promise<Hash | null> {
  const { tokenAddress, spender, minAllowance } = params;
  const account = getAccount();
  const publicClient = getPublicClient();

  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, spender],
  });

  if (allowance >= minAllowance) {
    return null;
  }

  logger.info(`Approving ERC20 allowance for ${tokenAddress} -> ${spender}`);
  const walletClient = getWalletClient();
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, MAX_UINT256],
    account,
    chain: base,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash as Hash;
}
