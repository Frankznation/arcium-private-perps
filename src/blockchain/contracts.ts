import { createPublicClient, http, parseEventLogs, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import { getAccount, getWalletClient as getWallet } from './wallet';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// NFT Contract ABI (minimal interface)
const NFT_ABI = [
  {
    inputs: [
      { name: 'market', type: 'string' },
      { name: 'position', type: 'string' },
      { name: 'entryPrice', type: 'uint256' },
      { name: 'exitPrice', type: 'uint256' },
      { name: 'pnlBps', type: 'int256' },
      { name: 'commentary', type: 'string' },
    ],
    name: 'mintTrade',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'market', type: 'string' },
      { indexed: false, name: 'pnlBps', type: 'int256' },
      { indexed: true, name: 'minter', type: 'address' },
    ],
    name: 'TradeMinted',
    type: 'event',
  },
  {
    inputs: [{ name: 'pnlBps', type: 'int256' }],
    name: 'isNotableTrade',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTrade',
    outputs: [
      {
        components: [
          { name: 'market', type: 'string' },
          { name: 'position', type: 'string' },
          { name: 'entryPrice', type: 'uint256' },
          { name: 'exitPrice', type: 'uint256' },
          { name: 'pnlBps', type: 'int256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'commentary', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

let publicClient: any = null;
let walletClientInstance: any = null;

function getPublicClient(): any {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });
  }
  return publicClient;
}

function getWalletClientInstance(): any {
  if (!walletClientInstance) {
    walletClientInstance = getWallet();
  }
  return walletClientInstance;
}

/**
 * Get NFT contract address
 */
export function getNftContractAddress(): Address {
  if (!config.nftContractAddress) {
    throw new Error('NFT_CONTRACT_ADDRESS not set');
  }
  return config.nftContractAddress as Address;
}

/**
 * Mint a trade NFT
 */
export async function mintTradeNft(params: {
  market: string;
  position: string;
  entryPrice: number;
  exitPrice: number;
  pnlBps: number;
  commentary: string;
}): Promise<{ tokenId: bigint; txHash: Hash }> {
  const contractAddress = getNftContractAddress();
  const account = getAccount();

  logger.info(`Minting NFT for trade: ${params.market} (P&L: ${params.pnlBps} bps)`);

  try {
    const hash = await getWalletClientInstance().writeContract({
      address: contractAddress,
      abi: NFT_ABI,
      functionName: 'mintTrade',
      chain: base,
      args: [
        params.market,
        params.position,
        BigInt(Math.floor(params.entryPrice)),
        BigInt(Math.floor(params.exitPrice)),
        BigInt(params.pnlBps),
        params.commentary,
      ],
      account,
    });

    // Wait for transaction receipt
    const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      // Parse token ID from logs (simplified - in production, parse event logs)
      // For now, we'll need to call a view function or parse events
      logger.info(`NFT minted successfully. TX: ${hash}`);
      
      const eventLogs = parseEventLogs({
        abi: NFT_ABI,
        logs: receipt.logs,
        eventName: 'TradeMinted',
      });

      if (eventLogs.length > 0) {
        const tokenId = eventLogs[0].args.tokenId as bigint;
        return { tokenId, txHash: hash };
      }

      try {
        const totalSupply = await getPublicClient().readContract({
          address: contractAddress,
          abi: NFT_ABI,
          functionName: 'totalSupply',
          args: [],
        });

        return {
          tokenId: totalSupply as bigint,
          txHash: hash,
        };
      } catch (readError) {
        throw new Error(
          `Failed to resolve tokenId: TradeMinted event not found and totalSupply reverted. ` +
          `Check NFT_CONTRACT_ADDRESS and BASE_RPC_URL. Root error: ${readError}`
        );
      }
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    logger.error(`Failed to mint NFT: ${error}`);
    throw error;
  }
}

/**
 * Check if a trade is notable
 */
export async function checkNotableTrade(pnlBps: number): Promise<boolean> {
  const contractAddress = getNftContractAddress();

  try {
    const result = await getPublicClient().readContract({
      address: contractAddress,
      abi: NFT_ABI,
      functionName: 'isNotableTrade',
      args: [BigInt(pnlBps)],
    });

    return result as boolean;
  } catch (error) {
    logger.error(`Failed to check notable trade: ${error}`);
    return false;
  }
}
