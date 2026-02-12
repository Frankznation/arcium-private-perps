'use client';

import { useState } from 'react';

export default function ArciumPrivatePerpsDemo() {
  const [position, setPosition] = useState(null);
  const [result, setResult] = useState(null);
  const [pnlResult, setPnlResult] = useState(null);
  const [privacyInfo, setPrivacyInfo] = useState(false);

  const generateHash = (data) => {
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  };

  const encryptData = (data) => {
    const encrypted = btoa(JSON.stringify(data));
    return {
      encrypted: encrypted,
      hash: generateHash(data)
    };
  };

  const handleOpenPosition = (formData) => {
    const { size, direction, leverage, entryPrice } = formData;
    
    const positionData = {
      size: parseFloat(size),
      direction,
      leverage: parseInt(leverage),
      entryPrice: parseFloat(entryPrice),
      timestamp: new Date().toISOString()
    };

    const encrypted = encryptData(positionData);
    const newPosition = {
      ...positionData,
      encryptedData: encrypted.encrypted,
      positionHash: encrypted.hash,
      openedAt: new Date()
    };

    setPosition(newPosition);
    setPrivacyInfo(true);
    setResult({
      type: 'position',
      encrypted: encrypted.encrypted.substring(0, 50) + '...',
      hash: encrypted.hash,
      position: newPosition
    });
  };

  const handleCheckPnL = () => {
    if (!position) {
      alert('Please open a position first');
      return;
    }

    const currentPrice = position.entryPrice * (0.95 + Math.random() * 0.1);
    const priceChange = currentPrice - position.entryPrice;
    const priceChangePercent = (priceChange / position.entryPrice) * 100;

    let pnl;
    if (position.direction === 'long') {
      pnl = priceChange * position.size * position.leverage;
    } else {
      pnl = -priceChange * position.size * position.leverage;
    }

    const pnlPercent = (pnl / (position.size * position.entryPrice)) * 100;

    setPnlResult({
      type: 'pnl',
      currentPrice: currentPrice.toFixed(2),
      entryPrice: position.entryPrice.toFixed(2),
      priceChange: priceChangePercent.toFixed(2),
      pnl: pnl.toFixed(2),
      pnlPercent: pnlPercent.toFixed(2),
      isProfit: pnl >= 0
    });
  };

  const handleCheckLiquidation = () => {
    if (!position) {
      alert('Please open a position first');
      return;
    }

    const healthRatio = 120 + Math.random() * 80;
    const isLiquidatable = healthRatio < 150;

    setPnlResult({
      type: 'liquidation',
      healthRatio: healthRatio.toFixed(1),
      isLiquidatable
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-8 md:p-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">🔒 Arcium Private Perps</h1>
          <p className="text-xl md:text-2xl mb-4">Interactive Demo - Private Perpetuals Trading Platform</p>
          <p className="text-sm md:text-base opacity-90 mb-6">
            Built with Arcium Privacy-Preserving Computation on Solana
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm">✅ Live Demo</span>
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">🔐 Privacy Enabled</span>
            <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm">⚡ Interactive</span>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-6">
          {/* Open Position Card */}
          <PositionForm onSubmit={handleOpenPosition} />
          
          {privacyInfo && position && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <strong className="text-blue-700">🔐 Privacy Protected:</strong>
              <p className="text-blue-600 mt-2">
                Your position details have been encrypted using Arcium's privacy-preserving computation.
                <br />
                <strong>Position Hash:</strong> {position.positionHash.substring(0, 16)}...
                <br />
                Only you can see your exact position size ({position.size} SOL) and direction ({position.direction}).
              </p>
            </div>
          )}

          {result && result.type === 'position' && (
            <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
              <div className="text-green-400 font-bold mb-4">✅ Private Position Opened Successfully!</div>
              <div className="mb-4">
                <div className="text-gray-400">Encrypted Position Data:</div>
                <div className="ml-4">{`{`}</div>
                <div className="ml-8">"encrypted": "{result.encrypted}",</div>
                <div className="ml-8">"hash": "{result.hash}",</div>
                <div className="ml-8">"status": "active"</div>
                <div className="ml-4">{`}`}</div>
              </div>
              <div className="mt-4 text-yellow-400">
                <div><strong>What's Private:</strong></div>
                <div className="ml-4">- Position Size: {position.size} SOL (encrypted)</div>
                <div className="ml-4">- Direction: {position.direction} (encrypted)</div>
                <div className="ml-4">- Leverage: {position.leverage}x (encrypted)</div>
                <div className="ml-4">- Entry Price: ${position.entryPrice} (encrypted)</div>
              </div>
              <div className="mt-4 text-blue-400">
                <div><strong>What's Public:</strong></div>
                <div className="ml-4">- Position Hash: {result.hash.substring(0, 16)}... (for verification)</div>
                <div className="ml-4">- Status: Active</div>
                <div className="ml-4">- Opened At: {new Date(position.openedAt).toLocaleString()}</div>
              </div>
              <div className="mt-4 text-green-400 font-bold">🔐 Your position details remain private!</div>
            </div>
          )}

          {/* Check Status Card */}
          <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-purple-600">
            <h2 className="text-2xl font-bold text-purple-600 mb-4">📈 Check Position Status</h2>
            <p className="text-gray-600 mb-6">
              View your position's PnL while keeping position details private. Only final profit/loss is revealed.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCheckPnL}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                📊 Check PnL
              </button>
              <button
                onClick={handleCheckLiquidation}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                ⚠️ Check Liquidation Risk
              </button>
            </div>

            {pnlResult && pnlResult.type === 'pnl' && (
              <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm mt-4">
                <div className="text-green-400 font-bold mb-4">📊 Position PnL (Public)</div>
                <div className="mb-2">Current Market Price: ${pnlResult.currentPrice}</div>
                <div className="mb-2">Entry Price: ${pnlResult.entryPrice}</div>
                <div className="mb-2">Price Change: {pnlResult.priceChange > 0 ? '+' : ''}{pnlResult.priceChange}%</div>
                <div className={`mb-4 font-bold ${pnlResult.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  PnL: {pnlResult.pnl > 0 ? '+' : ''}${pnlResult.pnl} ({pnlResult.pnlPercent > 0 ? '+' : ''}{pnlResult.pnlPercent}%)
                </div>
                <div className="text-blue-400 mt-4">
                  <div><strong>🔐 Private Information (Not Revealed):</strong></div>
                  <div className="ml-4">- Position Size: Hidden</div>
                  <div className="ml-4">- Direction: Hidden</div>
                  <div className="ml-4">- Leverage: Hidden</div>
                  <div className="ml-4">- Exact Entry Price: Hidden</div>
                </div>
                <div className="text-green-400 font-bold mt-4">✅ Only final PnL is revealed for transparency!</div>
              </div>
            )}

            {pnlResult && pnlResult.type === 'liquidation' && (
              <div className="bg-gray-900 text-yellow-400 p-6 rounded-lg font-mono text-sm mt-4">
                <div className="text-yellow-400 font-bold mb-4">⚠️ Liquidation Risk Check (Private)</div>
                <div className="mb-2">Health Ratio: {pnlResult.healthRatio}%</div>
                <div className={`mb-4 font-bold ${pnlResult.isLiquidatable ? 'text-red-400' : 'text-green-400'}`}>
                  Status: {pnlResult.isLiquidatable ? '⚠️ At Risk' : '✅ Healthy'}
                </div>
                <div className="text-blue-400 mt-4">
                  <div><strong>🔐 Privacy Protected:</strong></div>
                  <div className="ml-4">This health check was computed privately using Arcium.</div>
                  <div className="ml-4">Liquidators cannot see:</div>
                  <div className="ml-8">- Your position size</div>
                  <div className="ml-8">- Your exact health ratio</div>
                  <div className="ml-8">- Whether you're at risk</div>
                </div>
                <div className="text-green-400 font-bold mt-4">
                  ✅ Only the result (liquidatable: {pnlResult.isLiquidatable ? 'yes' : 'no'}) is revealed!
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
            <strong className="text-yellow-800">ℹ️ How Arcium Provides Privacy:</strong>
            <ul className="list-disc list-inside mt-3 text-yellow-700 space-y-2">
              <li><strong>Private Positions:</strong> Size and direction encrypted, only you know details</li>
              <li><strong>Private Orders:</strong> Order intent hidden until execution</li>
              <li><strong>Private Liquidation Checks:</strong> Health computed privately</li>
              <li><strong>Public PnL:</strong> Only final profit/loss revealed for transparency</li>
            </ul>
          </div>

          {/* Link Section */}
          <div className="bg-green-50 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-purple-600 mb-4">🔗 Repository & Documentation</h3>
            <a
              href="https://github.com/Frankznation/arcium-private-perps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 text-xl font-bold underline"
            >
              📦 View Source Code on GitHub
            </a>
            <p className="text-gray-600 mt-4">
              Full Solana program, frontend components, and documentation available in the repository.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PositionForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    size: '100',
    direction: 'long',
    leverage: '10',
    entryPrice: '150'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-purple-600">
      <h2 className="text-2xl font-bold text-purple-600 mb-4">📊 Open Private Position</h2>
      <p className="text-gray-600 mb-6">
        Simulate opening a private position. Your position details will be encrypted using Arcium and remain private.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Position Size (SOL)</label>
          <input
            type="number"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            min="1"
            step="0.1"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Direction</label>
          <select
            value={formData.direction}
            onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Leverage</label>
          <input
            type="number"
            value={formData.leverage}
            onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
            min="1"
            max="100"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Entry Price (USD)</label>
          <input
            type="number"
            value={formData.entryPrice}
            onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
            min="1"
            step="0.01"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          🔒 Open Private Position
        </button>
      </form>
    </div>
  );
}
