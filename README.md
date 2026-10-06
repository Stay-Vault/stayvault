# stayvault
<img src="app/brand/stayvault-logo-horizontal.svg" width="280" alt="StayVault logo: a padlock with a roof-shaped shackle holding a home">
## Live demo

**Try it:** [https://Stay-Vault.github.io/stayvault/](https://Stay-Vault.github.io/stayvault/)

The demo runs on Solana **devnet** against the deployed StayVault program
(`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG`). Sign-in and the MetaMask connection are mocks;
every payment step sends a real devnet transaction. The panel next to the phone explains each screen.

1. Sign in and connect a wallet (mock)
2. Choose the dorm (already listed by its owner, the token issuer), pick a period, review
3. **Set aside** – the parent deposits every week's rent in USDC into an escrow account owned by the program
4. **Approve move-in** – the parent and the property manager both sign; week 1 goes to the property vault. After that, one week is released every 10 seconds
5. **Monthly payout** – every 4 weeks the token issuer signs `distribute`: 9% to the property manager, 1% to StayVault, 3% stays in the vault as a repair reserve, and the rest goes to 5 investors by units held
6. **Move out early** – the parent and the property manager both sign, and unpaid weeks return to the parent

Every transaction shows a "View on Explorer" link.

Demo video: <link>

### About the keys in `app/demo-public.json`

`app/demo-public.json` contains the secret keys of three **devnet-only demo wallets** (parent, property manager and token issuer), plus the addresses of the demo property and its investors.
They are published on purpose so that anyone can try the demo without installing a wallet.
They hold only devnet SOL and a test token with no real value, and are never used on mainnet.
In production, the parent signs with their own wallet, and the property manager and the token issuer sign from their own systems.
If the demo stops because the balance ran out, please watch the demo video above.

StayVault is a Solana-based rent escrow for international students. Parents set rent aside in USDC, it is released to the dorm one week at a time after move-in, and the dorm's investors receive their share in USDC. StayVault never holds the money.

AUD amounts in the app are display estimates at 1 AUD = 0.71 USD. The child's name ("Yuri") and the dorm ("Stay-Dorm", Brisbane) are fictional sample data.

MetaMask and the MetaMask fox logo are trademarks of Consensys. StayVault is not affiliated with or endorsed by MetaMask or Consensys; the demo only shows MetaMask as the parent's wallet and does not connect to it.