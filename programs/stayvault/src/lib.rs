use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// このプロジェクトの Program ID。target/deploy/stayvault-keypair.json の ID と一致している必要がある
declare_id!("GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG");

/// 名簿に載せられる投資家の上限（1回の distribute で送れる宛先の数に合わせる）
pub const MAX_HOLDERS: usize = 10;
const BPS: u128 = 10_000;

#[program]
pub mod stayvault {
    use super::*;

    /// ST業者（物件の権限者）が、物件・SPV金庫・料率・投資家名簿を一度に登録する。
    /// デモでは scripts/make-public-demo.mjs が事前に1回だけ実行する（画面には出さない）
    pub fn init_property(
        ctx: Context<InitProperty>,
        property_id: u64,
        manager_bps: u16,
        reserve_bps: u16,
        fee_bps: u16,
        total_units: u32,
        holders: Vec<Holder>,
    ) -> Result<()> {
        require!(
            manager_bps as u32 + reserve_bps as u32 + fee_bps as u32 <= 10_000,
            VaultError::InvalidParams
        );
        require!(
            !holders.is_empty() && holders.len() <= MAX_HOLDERS,
            VaultError::InvalidHolders
        );
        let sum: u64 = holders.iter().map(|h| h.units as u64).sum();
        require!(
            total_units > 0 && sum == total_units as u64,
            VaultError::InvalidHolders
        );

        let p = &mut ctx.accounts.property;
        p.authority = ctx.accounts.authority.key();
        p.operator = ctx.accounts.operator.key();
        p.mint = ctx.accounts.mint.key();
        p.manager_token = ctx.accounts.manager_token.key();
        p.fee_token = ctx.accounts.fee_token.key();
        p.property_id = property_id;
        p.manager_bps = manager_bps;
        p.reserve_bps = reserve_bps;
        p.fee_bps = fee_bps;
        p.total_units = total_units;
        p.reserve_balance = 0;
        p.payout_count = 0;
        p.holders = holders;
        p.bump = ctx.bumps.property;
        Ok(())
    }

    /// 親がエスクローを作り、全週分のUSDCを一括で入金する（HTMLの「Set aside」ボタン）
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_id: u64,
        weekly_amount: u64,
        total_weeks: u16,
        first_pay_ts: i64,
        interval_secs: i64,
        confirm_deadline: i64,
    ) -> Result<()> {
        require!(
            weekly_amount > 0 && total_weeks > 0 && interval_secs > 0,
            VaultError::InvalidParams
        );
        let total = weekly_amount
            .checked_mul(total_weeks as u64)
            .ok_or(VaultError::InvalidParams)?;

        let v = &mut ctx.accounts.vault;
        v.parent = ctx.accounts.parent.key();
        v.operator = ctx.accounts.operator.key();
        v.mint = ctx.accounts.mint.key();
        v.property = ctx.accounts.property.key();
        v.vault_id = vault_id;
        v.weekly_amount = weekly_amount;
        v.total_weeks = total_weeks;
        v.paid_weeks = 0;
        v.first_pay_ts = first_pay_ts;
        v.interval_secs = interval_secs;
        v.confirm_deadline = confirm_deadline;
        v.confirmed = false;
        v.closed = false;
        v.bump = ctx.bumps.vault;

        // Anchor 1.x: CpiContext には呼び出すプログラムの ID（Pubkey）を渡す
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.parent_token.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.parent.to_account_info(),
                },
            ),
            total,
        )
    }

    /// 入居確認。親と運営者（管理会社）の両方の署名が必要（期限内のみ）
    pub fn confirm_move_in(ctx: Context<ConfirmMoveIn>) -> Result<()> {
        let v = &mut ctx.accounts.vault;
        require!(!v.closed, VaultError::Closed);
        require!(!v.confirmed, VaultError::AlreadyConfirmed);
        require!(
            Clock::get()?.unix_timestamp <= v.confirm_deadline,
            VaultError::DeadlinePassed
        );
        v.confirmed = true;
        Ok(())
    }

    /// 支払日が来た1週分を物件のSPV金庫へ払い出す。誰が呼んでもよい（送り先は固定）
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let v = &ctx.accounts.vault;
        require!(!v.closed, VaultError::Closed);
        require!(v.confirmed, VaultError::NotConfirmed);
        require!(v.paid_weeks < v.total_weeks, VaultError::AllPaid);
        let due = v.first_pay_ts + v.interval_secs * v.paid_weeks as i64;
        require!(Clock::get()?.unix_timestamp >= due, VaultError::NotDueYet);
        let amount = v.weekly_amount;

        pay_out(
            &ctx.accounts.vault,
            &ctx.accounts.vault_token,
            &ctx.accounts.property_vault,
            &ctx.accounts.token_program,
            amount,
        )?;
        let v = &mut ctx.accounts.vault;
        v.paid_weeks += 1;
        emit!(RentReleased {
            vault: v.key(),
            property: v.property,
            week: v.paid_weeks,
            amount,
        });
        Ok(())
    }

    /// 期限までに入居確認がなかった場合、親だけの署名で全額を返金する
    pub fn refund_unconfirmed(ctx: Context<RefundUnconfirmed>) -> Result<()> {
        let v = &ctx.accounts.vault;
        require!(!v.closed, VaultError::Closed);
        require!(!v.confirmed, VaultError::AlreadyConfirmed);
        require!(
            Clock::get()?.unix_timestamp > v.confirm_deadline,
            VaultError::DeadlineNotPassed
        );
        let amount = ctx.accounts.vault_token.amount;
        pay_out(
            &ctx.accounts.vault,
            &ctx.accounts.vault_token,
            &ctx.accounts.parent_token,
            &ctx.accounts.token_program,
            amount,
        )?;
        ctx.accounts.vault.closed = true;
        Ok(())
    }

    /// 途中退去。親と運営者の両方の署名で、未払いの週の分を親へ戻す
    pub fn move_out(ctx: Context<MoveOut>) -> Result<()> {
        require!(!ctx.accounts.vault.closed, VaultError::Closed);
        let amount = ctx.accounts.vault_token.amount;
        pay_out(
            &ctx.accounts.vault,
            &ctx.accounts.vault_token,
            &ctx.accounts.parent_token,
            &ctx.accounts.token_program,
            amount,
        )?;
        ctx.accounts.vault.closed = true;
        Ok(())
    }

    /// 月次分配。ST業者（物件の権限者）が署名する。
    /// 金庫の残高から修繕積立の残高を除いた額を総額とし、管理費・手数料を送り、修繕積立は金庫に残し、
    /// 残りを名簿の口数比で投資家へ送る。投資家の口座は remaining_accounts に名簿の順で渡す
    pub fn distribute<'info>(ctx: Context<'_, '_, 'info, 'info, Distribute<'info>>) -> Result<()> {
        let p = &ctx.accounts.property;
        let holders = p.holders.clone();
        require!(
            ctx.remaining_accounts.len() == holders.len(),
            VaultError::WrongHolderAccount
        );
        for (i, h) in holders.iter().enumerate() {
            require_keys_eq!(
                ctx.remaining_accounts[i].key(),
                h.token,
                VaultError::WrongHolderAccount
            );
        }

        let gross = ctx
            .accounts
            .property_vault
            .amount
            .checked_sub(p.reserve_balance)
            .ok_or(VaultError::NothingToDistribute)?;
        require!(gross > 0, VaultError::NothingToDistribute);

        let part = |bps: u16| ((gross as u128) * (bps as u128) / BPS) as u64;
        let manager = part(p.manager_bps);
        let fee = part(p.fee_bps);
        let reserve = part(p.reserve_bps);
        let net = gross - manager - fee - reserve;
        let total_units = p.total_units as u128;
        let shares: Vec<u64> = holders
            .iter()
            .map(|h| ((net as u128) * (h.units as u128) / total_units) as u64)
            .collect();
        let paid: u64 = shares.iter().sum();
        let kept = reserve + (net - paid); // 端数は修繕積立に足して金庫に残す

        property_pay(
            &ctx.accounts.property,
            &ctx.accounts.property_vault,
            ctx.accounts.manager_token.to_account_info(),
            &ctx.accounts.token_program,
            manager,
        )?;
        property_pay(
            &ctx.accounts.property,
            &ctx.accounts.property_vault,
            ctx.accounts.fee_token.to_account_info(),
            &ctx.accounts.token_program,
            fee,
        )?;
        for (i, amount) in shares.iter().enumerate() {
            property_pay(
                &ctx.accounts.property,
                &ctx.accounts.property_vault,
                ctx.remaining_accounts[i].to_account_info(),
                &ctx.accounts.token_program,
                *amount,
            )?;
        }

        let p = &mut ctx.accounts.property;
        p.reserve_balance += kept;
        p.payout_count += 1;
        emit!(Distributed {
            property: p.key(),
            payout: p.payout_count,
            gross,
            manager,
            fee,
            reserve: kept,
            shares,
        });
        Ok(())
    }
}

/// Vault PDAの署名でトークンを送る。送り先はアカウント制約で固定済み
fn pay_out<'info>(
    vault: &Account<'info, Vault>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let id = vault.vault_id.to_le_bytes();
    let bump = [vault.bump];
    let seeds: &[&[u8]] = &[b"vault", vault.parent.as_ref(), &id, &bump];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.key(),
            Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: vault.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )
}

/// Property PDAの署名でSPV金庫からトークンを送る（distribute 専用）
fn property_pay<'info>(
    property: &Account<'info, Property>,
    from: &Account<'info, TokenAccount>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let id = property.property_id.to_le_bytes();
    let bump = [property.bump];
    let seeds: &[&[u8]] = &[b"property", property.authority.as_ref(), &id, &bump];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.key(),
            Transfer {
                from: from.to_account_info(),
                to,
                authority: property.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )
}

#[derive(Accounts)]
// Anchor 1.x: #[instruction(..)] は命令の引数をすべて同じ順番で並べる必要がある
#[instruction(
    property_id: u64,
    manager_bps: u16,
    reserve_bps: u16,
    fee_bps: u16,
    total_units: u32,
    holders: Vec<Holder>
)]
pub struct InitProperty<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// ST業者（物件の権限者）。distribute の署名者になる
    pub authority: Signer<'info>,
    /// CHECK: 物件の管理会社。Vault の operator と同じ役。署名は confirm_move_in / move_out で要求する
    pub operator: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    /// 管理費の受取口座（管理会社のUSDC口座）
    #[account(token::mint = mint, token::authority = operator)]
    pub manager_token: Account<'info, TokenAccount>,
    /// StayVault の手数料の受取口座
    #[account(token::mint = mint)]
    pub fee_token: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        space = 8 + Property::INIT_SPACE,
        seeds = [b"property", authority.key().as_ref(), &property_id.to_le_bytes()],
        bump
    )]
    pub property: Account<'info, Property>,
    /// SPV金庫。秘密鍵を持たない Property PDA が管理する
    #[account(
        init,
        payer = payer,
        seeds = [b"property_vault", property.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = property
    )]
    pub property_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
// Anchor 1.x: #[instruction(..)] は命令の引数をすべて同じ順番で並べる必要がある
#[instruction(
    vault_id: u64,
    weekly_amount: u64,
    total_weeks: u16,
    first_pay_ts: i64,
    interval_secs: i64,
    confirm_deadline: i64
)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub parent: Signer<'info>,
    /// CHECK: 寮の運営者（管理会社）。物件に登録された operator と一致することを property 側で確かめる
    pub operator: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = parent)]
    pub parent_token: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = parent,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", parent.key().as_ref(), &vault_id.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = parent,
        seeds = [b"vault_token", vault.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault
    )]
    pub vault_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    /// 家賃の行き先になる物件。運営者と mint が物件の登録内容と一致すること
    #[account(has_one = operator, has_one = mint)]
    pub property: Account<'info, Property>,
}

#[derive(Accounts)]
pub struct ConfirmMoveIn<'info> {
    pub operator: Signer<'info>,
    #[account(mut, has_one = operator, has_one = parent)]
    pub vault: Account<'info, Vault>,
    pub parent: Signer<'info>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"vault_token", vault.key().as_ref()], bump)]
    pub vault_token: Account<'info, TokenAccount>,
    /// 送り先は、エスクローに記録した物件のSPV金庫だけ
    #[account(mut, seeds = [b"property_vault", vault.property.as_ref()], bump)]
    pub property_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundUnconfirmed<'info> {
    pub parent: Signer<'info>,
    #[account(mut, has_one = parent)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"vault_token", vault.key().as_ref()], bump)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault.mint, token::authority = parent)]
    pub parent_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MoveOut<'info> {
    pub parent: Signer<'info>,
    pub operator: Signer<'info>,
    #[account(mut, has_one = parent, has_one = operator)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"vault_token", vault.key().as_ref()], bump)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault.mint, token::authority = parent)]
    pub parent_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority, has_one = manager_token, has_one = fee_token)]
    pub property: Account<'info, Property>,
    #[account(mut, seeds = [b"property_vault", property.key().as_ref()], bump)]
    pub property_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub manager_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts: 投資家のUSDC口座（名簿の順、writable）
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub parent: Pubkey,
    pub operator: Pubkey,
    pub mint: Pubkey,
    pub property: Pubkey,
    pub vault_id: u64,
    pub weekly_amount: u64,
    pub total_weeks: u16,
    pub paid_weeks: u16,
    pub first_pay_ts: i64,
    pub interval_secs: i64,
    pub confirm_deadline: i64,
    pub confirmed: bool,
    pub closed: bool,
    pub bump: u8,
}

/// 物件。フィールドの順番を変えると、スクリプトと画面の読み取り位置（reserve_balance）がずれる
#[account]
#[derive(InitSpace)]
pub struct Property {
    pub authority: Pubkey,
    pub operator: Pubkey,
    pub mint: Pubkey,
    pub manager_token: Pubkey,
    pub fee_token: Pubkey,
    pub property_id: u64,
    pub manager_bps: u16,
    pub reserve_bps: u16,
    pub fee_bps: u16,
    pub total_units: u32,
    pub reserve_balance: u64,
    pub payout_count: u32,
    #[max_len(10)]
    pub holders: Vec<Holder>,
    pub bump: u8,
}

/// 投資家1人分。token は投資家のUSDC口座、units は保有口数
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Holder {
    pub token: Pubkey,
    pub units: u32,
}

#[event]
pub struct RentReleased {
    pub vault: Pubkey,
    pub property: Pubkey,
    pub week: u16,
    pub amount: u64,
}

#[event]
pub struct Distributed {
    pub property: Pubkey,
    pub payout: u32,
    pub gross: u64,
    pub manager: u64,
    pub fee: u64,
    pub reserve: u64,
    pub shares: Vec<u64>,
}

#[error_code]
pub enum VaultError {
    #[msg("Invalid parameters")]
    InvalidParams,
    #[msg("Vault is closed")]
    Closed,
    #[msg("Move-in already confirmed")]
    AlreadyConfirmed,
    #[msg("Move-in not confirmed yet")]
    NotConfirmed,
    #[msg("Confirmation deadline has passed")]
    DeadlinePassed,
    #[msg("Confirmation deadline has not passed yet")]
    DeadlineNotPassed,
    #[msg("All weeks already paid")]
    AllPaid,
    #[msg("Next payment is not due yet")]
    NotDueYet,
    #[msg("Investor list is invalid")]
    InvalidHolders,
    #[msg("Investor accounts do not match the investor list")]
    WrongHolderAccount,
    #[msg("Nothing to distribute")]
    NothingToDistribute,
}
