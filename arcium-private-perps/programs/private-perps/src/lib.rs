use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

declare_id!("PrivatePerps111111111111111111111111111");

#[program]
pub mod private_perps {
    use super::*;

    /// Initialize a new trading account for a user
    pub fn initialize_trader(ctx: Context<InitializeTrader>) -> Result<()> {
        let trader_account = &mut ctx.accounts.trader_account;
        trader_account.authority = ctx.accounts.authority.key();
        trader_account.bump = ctx.bumps.trader_account;
        trader_account.total_deposits = 0;
        trader_account.total_withdrawals = 0;
        
        msg!("Trader account initialized: {}", trader_account.authority);
        Ok(())
    }

    /// Deposit collateral (public operation)
    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        amount: u64,
    ) -> Result<()> {
        let trader_account = &mut ctx.accounts.trader_account;
        
        // Transfer SOL from user to program
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.authority.key(),
                &ctx.accounts.trader_account.key(),
                amount,
            ),
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.trader_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        trader_account.total_deposits += amount;
        
        msg!("Deposited {} lamports", amount);
        Ok(())
    }

    /// Open a private position using Arcium encryption
    /// Position details are encrypted and stored privately
    pub fn open_private_position(
        ctx: Context<OpenPosition>,
        encrypted_position_data: Vec<u8>, // Encrypted via Arcium
        position_hash: [u8; 32], // Keccak hash for verification
    ) -> Result<()> {
        let position = &mut ctx.accounts.position;
        
        // Verify encrypted data integrity using hash
        let computed_hash = keccak::hash(&encrypted_position_data);
        require!(
            computed_hash.to_bytes() == position_hash,
            PerpsError::InvalidPositionHash
        );

        position.trader = ctx.accounts.trader.key();
        position.encrypted_data = encrypted_position_data;
        position.position_hash = position_hash;
        position.opened_at = Clock::get()?.unix_timestamp;
        position.is_active = true;
        
        msg!("Private position opened with hash: {:?}", position_hash);
        Ok(())
    }

    /// Place a private order (encrypted order intent)
    pub fn place_private_order(
        ctx: Context<PlaceOrder>,
        encrypted_order_data: Vec<u8>,
        order_hash: [u8; 32],
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        
        // Verify order integrity
        let computed_hash = keccak::hash(&encrypted_order_data);
        require!(
            computed_hash.to_bytes() == order_hash,
            PerpsError::InvalidOrderHash
        );

        order.trader = ctx.accounts.trader.key();
        order.encrypted_data = encrypted_order_data;
        order.order_hash = order_hash;
        order.placed_at = Clock::get()?.unix_timestamp;
        order.status = OrderStatus::Pending;
        
        msg!("Private order placed with hash: {:?}", order_hash);
        Ok(())
    }

    /// Execute order matching privately using Arcium
    /// This would typically call Arcium's private computation network
    pub fn execute_order_match(
        ctx: Context<ExecuteOrderMatch>,
        match_result: MatchResult,
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        
        require!(
            order.status == OrderStatus::Pending,
            PerpsError::OrderAlreadyExecuted
        );

        // Update order status
        order.status = OrderStatus::Matched;
        order.executed_at = Clock::get()?.unix_timestamp;
        
        // Match result contains only necessary public information
        // (e.g., execution price, but not position details)
        msg!("Order matched at price: {}", match_result.execution_price);
        
        Ok(())
    }

    /// Check liquidation risk privately using Arcium
    /// Health check computes privately, only result is revealed
    pub fn check_liquidation_risk(
        ctx: Context<CheckLiquidation>,
        health_check_result: HealthCheckResult,
    ) -> Result<()> {
        // Health check is computed privately via Arcium
        // Only the result (liquidatable or not) is revealed
        
        if health_check_result.is_liquidatable {
            msg!("Position is at liquidation risk");
            // Trigger liquidation process if needed
        } else {
            msg!("Position is healthy");
        }
        
        Ok(())
    }

    /// Settle PnL (public operation - only final result)
    pub fn settle_pnl(
        ctx: Context<SettlePnL>,
        pnl_amount: i64, // Can be negative for losses
    ) -> Result<()> {
        let position = &mut ctx.accounts.position;
        let trader_account = &mut ctx.accounts.trader_account;
        
        require!(
            position.is_active,
            PerpsError::PositionNotActive
        );

        // Update trader account with PnL
        if pnl_amount > 0 {
            // Profit - add to account
            trader_account.total_deposits += pnl_amount as u64;
        } else {
            // Loss - subtract from account
            let loss = (-pnl_amount) as u64;
            require!(
                trader_account.total_deposits >= loss,
                PerpsError::InsufficientCollateral
            );
            trader_account.total_deposits -= loss;
        }

        position.is_active = false;
        position.closed_at = Clock::get()?.unix_timestamp;
        
        msg!("PnL settled: {} lamports", pnl_amount);
        Ok(())
    }

    /// Withdraw collateral (public operation)
    pub fn withdraw_collateral(
        ctx: Context<WithdrawCollateral>,
        amount: u64,
    ) -> Result<()> {
        let trader_account = &mut ctx.accounts.trader_account;
        
        require!(
            trader_account.total_deposits >= amount,
            PerpsError::InsufficientCollateral
        );

        // Transfer SOL from program to user
        **ctx.accounts.trader_account.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;

        trader_account.total_withdrawals += amount;
        
        msg!("Withdrew {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeTrader<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TraderAccount::LEN,
        seeds = [b"trader", authority.key().as_ref()],
        bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(
        mut,
        seeds = [b"trader", authority.key().as_ref()],
        bump = trader_account.bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(
        init,
        payer = trader,
        space = 8 + Position::LEN,
        seeds = [b"position", trader.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    #[account(
        seeds = [b"trader", trader.key().as_ref()],
        bump = trader_account.bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(
        init,
        payer = trader,
        space = 8 + Order::LEN,
        seeds = [b"order", trader.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteOrderMatch<'info> {
    #[account(mut)]
    pub order: Account<'info, Order>,
}

#[derive(Accounts)]
pub struct CheckLiquidation<'info> {
    #[account(mut)]
    pub position: Account<'info, Position>,
}

#[derive(Accounts)]
pub struct SettlePnL<'info> {
    #[account(mut)]
    pub position: Account<'info, Position>,
    
    #[account(
        mut,
        seeds = [b"trader", trader_account.authority.as_ref()],
        bump = trader_account.bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(
        mut,
        seeds = [b"trader", authority.key().as_ref()],
        bump = trader_account.bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct TraderAccount {
    pub authority: Pubkey,
    pub bump: u8,
    pub total_deposits: u64,
    pub total_withdrawals: u64,
}

impl TraderAccount {
    pub const LEN: usize = 32 + 1 + 8 + 8;
}

#[account]
pub struct Position {
    pub trader: Pubkey,
    pub encrypted_data: Vec<u8>, // Encrypted position data via Arcium
    pub position_hash: [u8; 32], // Hash for verification
    pub opened_at: i64,
    pub closed_at: Option<i64>,
    pub is_active: bool,
}

impl Position {
    pub const LEN: usize = 32 + 4 + 32 + 8 + 9 + 1; // Approximate
}

#[account]
pub struct Order {
    pub trader: Pubkey,
    pub encrypted_data: Vec<u8>, // Encrypted order data via Arcium
    pub order_hash: [u8; 32],
    pub placed_at: i64,
    pub executed_at: Option<i64>,
    pub status: OrderStatus,
}

impl Order {
    pub const LEN: usize = 32 + 4 + 32 + 8 + 9 + 1; // Approximate
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Pending,
    Matched,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MatchResult {
    pub execution_price: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct HealthCheckResult {
    pub is_liquidatable: bool,
    pub health_ratio: u64, // Scaled by 10000 (e.g., 15000 = 1.5x)
}

#[error_code]
pub enum PerpsError {
    #[msg("Invalid position hash")]
    InvalidPositionHash,
    #[msg("Invalid order hash")]
    InvalidOrderHash,
    #[msg("Order already executed")]
    OrderAlreadyExecuted,
    #[msg("Position not active")]
    PositionNotActive,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
}
