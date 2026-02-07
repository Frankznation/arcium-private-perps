-- Database schema for CrabTrader agent
-- Run this in your Supabase SQL editor or PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id VARCHAR(255) NOT NULL,
    market_name VARCHAR(500) NOT NULL,
    position VARCHAR(10) NOT NULL CHECK (position IN ('YES', 'NO')),
    amount_eth DECIMAL(18, 8),
    amount_usd DECIMAL(18, 2),
    entry_price INTEGER NOT NULL, -- Price in basis points
    entry_tx_hash VARCHAR(66) NOT NULL,
    entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    exit_price INTEGER, -- Price in basis points
    exit_tx_hash VARCHAR(66),
    exit_timestamp TIMESTAMP WITH TIME ZONE,
    pnl_bps INTEGER, -- Profit/Loss in basis points (can be negative)
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    nft_token_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio snapshots table
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_value_eth DECIMAL(18, 8) NOT NULL,
    open_positions_count INTEGER NOT NULL DEFAULT 0,
    daily_pnl_bps INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('TWITTER', 'FARCASTER')),
    post_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('TRADE_ENTRY', 'TRADE_EXIT', 'NFT_MINT', 'DAILY_SUMMARY', 'REPLY', 'LAUNCH')),
    related_trade_id UUID REFERENCES trades(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, post_id)
);

-- Mentions table
CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('TWITTER', 'FARCASTER')),
    mention_id VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    replied BOOLEAN NOT NULL DEFAULT FALSE,
    reply_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, mention_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_timestamp ON trades(entry_timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_nft_token_id ON trades(nft_token_id) WHERE nft_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_timestamp ON portfolio_snapshots(timestamp);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_timestamp ON social_posts(timestamp);
CREATE INDEX IF NOT EXISTS idx_social_posts_related_trade ON social_posts(related_trade_id) WHERE related_trade_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentions_platform ON mentions(platform);
CREATE INDEX IF NOT EXISTS idx_mentions_replied ON mentions(replied);
CREATE INDEX IF NOT EXISTS idx_mentions_timestamp ON mentions(timestamp);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE trades IS 'Stores all trade entries and exits';
COMMENT ON TABLE portfolio_snapshots IS 'Daily portfolio value snapshots';
COMMENT ON TABLE social_posts IS 'Records of all social media posts';
COMMENT ON TABLE mentions IS 'Community mentions and replies';
