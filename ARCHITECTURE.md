# Architecture Overview

## System Components

### 1. Autonomous Loop (`src/index.ts`)

The main orchestration loop that runs continuously:

```
┌─────────────────────────────────────┐
│     Autonomous Loop (15 min)        │
├─────────────────────────────────────┤
│ 1. Health Check                     │
│ 2. Fetch Market Data                │
│ 3. AI Analysis                      │
│ 4. Execute Trades                   │
│ 5. Mint NFTs (notable trades)       │
│ 6. Process Mentions                 │
│ 7. Daily Summary                    │
└─────────────────────────────────────┘
```

### 2. Blockchain Layer

**Wallet Management** (`src/blockchain/wallet.ts`)
- Private key wallet initialization
- Balance monitoring
- Gas management

**Contract Interactions** (`src/blockchain/contracts.ts`)
- NFT minting via `CrabTradeNFT.sol`
- Trade metadata storage onchain
- Event parsing

**Trade Execution** (`src/blockchain/trades.ts`)
- Position opening/closing
- Price fetching
- Risk checks

### 3. AI Layer

**Market Analysis** (`src/ai/analyzer.ts`)
- Claude API integration
- Structured JSON response parsing
- Risk-aware decision making

**Prompts** (`src/ai/prompts.ts`)
- Trading decision prompts
- Social media reply generation
- Personality injection

### 4. Social Media Layer

**Twitter** (`src/social/twitter.ts`)
- Tweet posting
- Mention fetching
- Reply generation
- Rate limiting

**Farcaster** (`src/social/farcaster.ts`)
- Cast posting
- Mention fetching
- Reply generation
- Rate limiting

**Templates** (`src/social/templates.ts`)
- Trade entry/exit posts
- NFT mint announcements
- Daily summaries
- Community replies

### 5. Market Data

**Fetcher** (`src/markets/fetcher.ts`)
- Prediction market data fetching
- Market filtering and sorting
- Price aggregation

**Types** (`src/markets/types.ts`)
- TypeScript interfaces
- Market data structures

### 6. NFT System

**Minter** (`src/nft/minter.ts`)
- Notable trade detection
- NFT minting orchestration
- Social media integration

**Contract** (`contracts/CrabTradeNFT.sol`)
- ERC-721 implementation
- Trade metadata storage
- Notable trade detection

### 7. Database Layer

**Client** (`src/database/client.ts`)
- Supabase connection
- Connection pooling

**Queries** (`src/database/queries.ts`)
- Trade CRUD operations
- Portfolio snapshots
- Social post tracking
- Mention management

## Data Flow

### Trade Execution Flow

```
Market Data → AI Analysis → Trade Decision → Onchain Execution → Database Record → Social Post
```

### NFT Minting Flow

```
Trade Closed → P&L Calculation → Notable Check → NFT Mint → Database Update → Social Post
```

### Community Engagement Flow

```
Mention Detected → AI Reply Generation → Social Reply → Database Record
```

## Security Considerations

1. **Private Key Management**
   - Never commit private keys
   - Use environment variables
   - Consider hardware wallet integration for production

2. **Rate Limiting**
   - Social media API rate limits
   - Blockchain RPC rate limits
   - AI API rate limits

3. **Error Handling**
   - Retry logic with exponential backoff
   - Graceful degradation
   - Alert system for critical failures

4. **Risk Management**
   - Position sizing limits
   - Stop loss enforcement
   - Gas buffer maintenance

## Scalability

The current architecture supports:
- Single agent instance
- Multiple markets
- Multiple social platforms
- Database-backed state

For scaling:
- Add queue system (Redis/Bull)
- Horizontal scaling with multiple agents
- Load balancing for API calls
- Database connection pooling

## Monitoring

Key metrics to monitor:
- Wallet balance
- Trade success rate
- NFT mint count
- Social engagement
- API error rates
- Loop execution time

## Future Enhancements

1. **Multi-chain support**
   - Support other L2s
   - Cross-chain arbitrage

2. **Advanced trading**
   - Options trading
   - Leverage positions
   - Portfolio optimization

3. **Community features**
   - Leaderboards
   - Copy trading
   - Social voting

4. **Analytics**
   - Performance dashboards
   - Trade analytics
   - Risk metrics
