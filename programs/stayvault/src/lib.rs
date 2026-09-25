use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// このプロジェクトの Program ID。target/deploy/stayvault-keypair.json の ID と一致している必要がある
declare_id!("GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG");

#[program]
pub mod stayvault {
    use super::*;

    /// 親がエスクローを作り、全週分のUSDCを一括で入金する（HTMLの「支払う」ボタン）
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

    /// 運営者が入居を確認する（期限内のみ）
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

    /// 支払日が来た1週分を運営者へ払い出す。誰が呼んでもよい（送り先は固定）
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
            &ctx.accounts.operator_token,
            &ctx.accounts.token_program,
            amount,
        )?;
        ctx.accounts.vault.paid_weeks += 1;
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
    /// CHECK: 寮の運営者。署名は confirm_move_in / move_out で要求する
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
}

#[derive(Accounts)]
pub struct ConfirmMoveIn<'info> {
    pub operator: Signer<'info>,
    #[account(mut, has_one = operator)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"vault_token", vault.key().as_ref()], bump)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault.mint, token::authority = vault.operator)]
    pub operator_token: Account<'info, TokenAccount>,
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

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub parent: Pubkey,
    pub operator: Pubkey,
    pub mint: Pubkey,
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
}
