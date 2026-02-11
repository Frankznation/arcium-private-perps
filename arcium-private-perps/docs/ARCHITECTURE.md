# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React UI   │  │  Wallet Adapter│  │ Arcium SDK  │     │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘     │
│         │                 │                   │              │
└─────────┼─────────────────┼───────────────────┼──────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Private Perps Program (Anchor)                │  │
│  │  • Position Management                                │  │
│  │  • Order Management                                   │  │
│  │  • PnL Settlement                                     │  │
│  │  • Collateral Management                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Arcium Network                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Private Computation Layer                      │  │
│  │  • Encrypted Position Storage                         │  │
│  │  • Private Order Matching                             │  │
│  │  • Private Liquidation Checks                         │  │
│  │  • Selective Result Disclosure                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Opening a Private Position

```
User Input → Frontend Encryption (Arcium SDK) → Solana Program → Arcium Network
                                                      ↓
                                              Encrypted Storage
```

**Steps**:
1. User enters position details (size, direction, leverage)
2. Frontend encrypts data using Arcium SDK
3. Computes hash for integrity verification
4. Submits transaction to Solana program
5. Program stores encrypted data on-chain
6. Position details remain private

### 2. Placing a Private Order

```
User Order → Encryption → Solana Program → Arcium Matching Engine → Execution Result
                                                      ↓
                                              Private Matching
```

**Steps**:
1. User places order (size, direction, limit price)
2. Order encrypted via Arcium SDK
3. Stored on-chain as encrypted data
4. Arcium network performs private matching
5. Only execution result revealed (price, timestamp)
6. Order details remain private

### 3. Liquidation Check

```
Position Data → Arcium Private Compute → Health Check Result → Liquidation Decision
```

**Steps**:
1. Position data retrieved (encrypted)
2. Market data provided (public)
3. Arcium computes health ratio privately
4. Only result revealed (liquidatable: yes/no)
5. Position details remain private

### 4. PnL Settlement

```
Position Close → Arcium Compute PnL → Public Settlement → Update Account
```

**Steps**:
1. Position closed
2. Arcium computes final PnL privately
3. PnL amount revealed (public)
4. Account balance updated
5. Position details remain private

## Component Details

### Solana Program (`private-perps`)

**Accounts**:
- `TraderAccount`: User's trading account (public balance)
- `Position`: Encrypted position data (private)
- `Order`: Encrypted order data (private)

**Instructions**:
- `initialize_trader`: Create trading account
- `deposit_collateral`: Deposit SOL (public)
- `open_private_position`: Open encrypted position
- `place_private_order`: Place encrypted order
- `execute_order_match`: Execute order matching
- `check_liquidation_risk`: Private liquidation check
- `settle_pnl`: Settle profit/loss (public)
- `withdraw_collateral`: Withdraw SOL (public)

### Frontend Application

**Components**:
- `PrivatePosition`: Open/manage positions
- `PrivateOrder`: Place/manage orders
- `Dashboard`: View portfolio (PnL only)
- `LiquidationCheck`: Check position health

**Libraries**:
- `@solana/wallet-adapter-react`: Wallet integration
- `@arcium/sdk`: Arcium encryption/computation
- `@project-serum/anchor`: Solana program interaction

### Arcium Integration

**Encryption**:
- Client-side encryption before submission
- Homomorphic encryption for private computation
- Hash-based integrity verification

**Computation**:
- Private order matching
- Private liquidation checks
- Private PnL calculation

**Disclosure**:
- Selective result disclosure
- Only necessary data revealed
- Position details remain private

## Security Model

### Privacy Guarantees

1. **Position Privacy**: Size, direction, entry price encrypted
2. **Order Privacy**: Order details encrypted until execution
3. **Health Privacy**: Liquidation risk computed privately
4. **Selective Disclosure**: Only PnL and execution prices revealed

### Integrity Guarantees

1. **Hash Verification**: All encrypted data includes integrity hash
2. **On-Chain Validation**: Program verifies hash before accepting
3. **Tamper Detection**: Modified data invalidates hash

### Security Considerations

1. **Key Management**: Users control encryption keys
2. **Arcium Network**: Trusted private computation network
3. **Solana Security**: Leverages Solana's security model
4. **Audit Trail**: Public settlement for transparency

## Scalability

### Performance Optimizations

1. **Batch Operations**: Process multiple positions/orders together
2. **Caching**: Cache encrypted data for faster access
3. **Parallel Computation**: Arcium network handles parallel ops
4. **Efficient Storage**: Compressed encrypted data storage

### Limitations

1. **Encryption Overhead**: ~50-100ms per operation
2. **Computation Cost**: Arcium network fees
3. **Storage Cost**: Encrypted data on-chain
4. **Network Latency**: Arcium network latency

## Future Enhancements

1. **Cross-Margin**: Private cross-margin calculations
2. **Liquidation Auctions**: Private liquidation auctions
3. **Order Book Privacy**: Fully private order book
4. **Multi-Asset**: Support multiple trading pairs
5. **Advanced Orders**: Stop-loss, take-profit with privacy

---

This architecture enables a truly private perpetuals trading platform while maintaining transparency for settlement and fairness.
