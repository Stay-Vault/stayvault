## Live demo

**Try it:** https://<organization>.github.io/stayvault/

The demo runs on Solana **devnet** against the deployed StayVault escrow program
(`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG`). Login and bank connection screens are mocks;
the three payment buttons send real devnet transactions.

1. Log in and allow the connection (mock)
2. Register a dorm, pick a period, confirm
3. **Pay from SBI VC Trade** – the parent deposits all weeks into the escrow vault
4. **(Demo) Advance payment day** – the operator confirms move-in and one week is released (about 10 seconds = 1 week)
5. **Request move-out** – the parent and operator both sign, and unpaid weeks return to the parent

Open the browser console to see a Solana Explorer link for every transaction.

Demo video: <link>

### About the keys in `app/demo-public.json`

`app/demo-public.json` contains the secret keys of two **devnet-only demo wallets** (parent and operator).
They are published on purpose so that anyone can try the demo without installing a wallet.
They hold only devnet SOL and a test token with no real value, and are never used on mainnet.
In production, the parent signs with their own wallet and the operator signs from their own dashboard.
If the demo stops because the balance ran out, please watch the demo video above.
