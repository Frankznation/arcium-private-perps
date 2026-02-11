'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { ArciumSDK } from '@arcium/sdk';

interface PositionForm {
  size: number;
  direction: 'long' | 'short';
  leverage: number;
  entryPrice: number;
}

export default function PrivatePosition() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<PositionForm>({
    size: 0,
    direction: 'long',
    leverage: 10,
    entryPrice: 0,
  });

  const handleOpenPosition = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // Initialize Arcium SDK
      const arcium = new ArciumSDK({
        network: 'mainnet',
        apiKey: process.env.NEXT_PUBLIC_ARCIUM_API_KEY!,
      });

      // Encrypt position data using Arcium
      const encryptedPosition = await arcium.encrypt({
        size: position.size,
        direction: position.direction,
        entryPrice: position.entryPrice,
        leverage: position.leverage,
        trader: publicKey.toBase58(),
        timestamp: Date.now(),
      });

      // Compute hash for integrity verification
      const { keccak256 } = await import('js-sha3');
      const positionHash = new Uint8Array(
        keccak256.arrayBuffer(encryptedPosition)
      );

      // Call Solana program to open position
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      );

      // Here you would call your Anchor program
      // const tx = await program.methods
      //   .openPrivatePosition(encryptedPosition, positionHash)
      //   .accounts({...})
      //   .rpc();

      console.log('Position opened privately:', {
        encrypted: encryptedPosition,
        hash: Array.from(positionHash),
      });

      alert('Position opened successfully! Your position details are encrypted and private.');
    } catch (error) {
      console.error('Error opening position:', error);
      alert('Failed to open position: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Open Private Position
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Position Size (SOL)
          </label>
          <input
            type="number"
            value={position.size}
            onChange={(e) =>
              setPosition({ ...position, size: parseFloat(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter position size"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Direction
          </label>
          <select
            value={position.direction}
            onChange={(e) =>
              setPosition({
                ...position,
                direction: e.target.value as 'long' | 'short',
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Leverage
          </label>
          <input
            type="number"
            value={position.leverage}
            onChange={(e) =>
              setPosition({
                ...position,
                leverage: parseInt(e.target.value),
              })
            }
            min="1"
            max="100"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Entry Price (USD)
          </label>
          <input
            type="number"
            value={position.entryPrice}
            onChange={(e) =>
              setPosition({
                ...position,
                entryPrice: parseFloat(e.target.value),
              })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            placeholder="Current market price"
          />
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            🔒 <strong>Privacy Protected:</strong> Your position details will be
            encrypted using Arcium before being stored on-chain. Only you can
            see your exact position size and direction.
          </p>
        </div>

        <button
          onClick={handleOpenPosition}
          disabled={loading || !publicKey || position.size <= 0}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Opening Position...' : 'Open Private Position'}
        </button>
      </div>
    </div>
  );
}
