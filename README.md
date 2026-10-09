# stayvault
<img src="app/brand/stayvault-logo-horizontal.svg" width="280" alt="StayVault logo: a padlock with a roof-shaped shackle holding a home">
## Live demo

**Try the demo:** [https://stay-vault.github.io/stayvault/app/stayvault.html](https://stay-vault.github.io/stayvault/app/stayvault.html)

**Website:** [https://stay-vault.github.io/stayvault/](https://stay-vault.github.io/stayvault/)

The demo runs on Solana **devnet** against the deployed StayVault program
(`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG`). Sign-in and the MetaMask connection are mocks;
every payment step sends a real devnet transaction. The panel next to the phone explains each screen.

1. Sign in and connect a wallet (mock)
2. Choose the dorm (already listed by its owner, the token issuer), pick a period, review
3. **Set aside** – the parent deposits every week's rent in USDC into an escrow account owned by the program
4. **Approve move-in** – the parent and the property manager both sign; week 1 goes to the property vault. After that, one week is released every 10 seconds
5. **Monthly payout** – every 4 weeks the token issuer signs `distribute`: 70% goes to 5 investors by units held, 10% to the property manager, 3% to StayVault as its service fee, and 17% stays in the vault (a 10% repair reserve and 7% for other costs such as insurance and taxes). While rent flows, the panel draws the money-flow figure live: the escrow shrinks week by week, the property vault (SPV) fills up, and each payout raises the totals for investors, the property manager and StayVault. Each box links to its account, and the investors are listed below with their last payout and running total. Each arrival is checked by reading the balance on devnet before and after the payout and marked with ✓
6. **Move out early** – the parent and the property manager both sign, and unpaid weeks return to the parent. The last screen draws the same money-flow figure as our business document (parent → escrow → property vault (SPV) → investors, property manager and StayVault, with the refund back to the parent), filled with the real amounts from this run. Each box links to its account on Solana Explorer

Every transaction shows a "View on Explorer" link, and each investor's address opens their account on Solana Explorer, where the payouts they received can be checked.

Parents pay nothing beyond the rent: StayVault is the fee payer of every transaction and also pays the escrow account deposit, out of its service fee. The parent's demo wallet holds no SOL at all. The rates are demo settings for the listed dorm. In production, the token issuer sets them for each property.

Demo video: <link>

### About the keys in `app/demo-public.json`

`app/demo-public.json` contains the secret keys of four **devnet-only demo wallets** (parent, property manager, token issuer, and StayVault as the fee payer), plus the addresses of the demo property and its investors.
They are published on purpose so that anyone can try the demo without installing a wallet.
They hold only devnet SOL and a test token with no real value, and are never used on mainnet.
In production, the parent signs with their own wallet, and the property manager and the token issuer sign from their own systems.
If the demo stops because the balance ran out, please watch the demo video above.

## How it works

StayVault is a Solana-based rent escrow for international students. Parents set rent aside in USDC, it is released to the dorm one week at a time after move-in, and the dorm's investors receive their share in USDC every month. Rent moves wallet to wallet, so there is no off-ramp. StayVault never holds the money: the escrow and the property vault are program accounts with no private key.

| Instruction | Who signs | What it does |
| --- | --- | --- |
| `init_property` | Token issuer | Registers the dorm, its property vault, the fee rates and the investor list (run once before the demo) |
| `create_vault` | Parent (StayVault pays the account deposit) | Creates the escrow and deposits every week's rent |
| `confirm_move_in` | Parent + property manager | Confirms move-in |
| `release` | Anyone | Sends one week of rent to the property vault once it is due |
| `refund_unconfirmed` | Parent | Returns everything if move-in is not confirmed by the deadline |
| `move_out` | Parent + property manager | Returns the unpaid weeks to the parent |
| `distribute` | Token issuer | Pays the property manager and StayVault, keeps the repair reserve, and splits the rest among investors by units held; records the payout as an event |

The program is in `programs/stayvault/src/lib.rs`. `node scripts/e2e-devnet.mjs` runs all seven instructions end to end on devnet.

AUD amounts in the app are display estimates at 1 AUD = 0.71 USD. The child's name ("Yuri") and the dorm ("Stay-Dorm", Brisbane) are fictional sample data.

MetaMask and the MetaMask fox logo are trademarks of Consensys. StayVault is not affiliated with or endorsed by MetaMask or Consensys; the demo only shows MetaMask as the parent's wallet and does not connect to it.
