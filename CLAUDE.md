# StayVault
Solana上の家賃エスクロー。親が全週分を入金し、入居確認のあと週ごとに寮の運営者へ解放する。

## 固定バージョン（変更しない）
- Rust 1.90.0
- Solana CLI 4.1.2
- Anchor 1.2.0
- Node.js 22.23.2
- Yarn 1.22.22

このプロジェクトでは上記バージョンを使用する。Anchor 0.32 以前の書き方は使わない。とくに次の3点に注意する。
- CpiContext::new / new_with_signer の第1引数はプログラムの ID（例: ctx.accounts.token_program.key()）。to_account_info() ではない
- #[instruction(..)] には命令の引数をすべて、同じ順番で並べる
- TypeScript のパッケージは @anchor-lang/core（@coral-xyz/anchor ではない）

## ハッカソンMVPの範囲（2026-09-25 確定）
- 命令は5つだけ: create_vault / confirm_move_in / release / refund_unconfirmed / move_out
- 署名者: create_vault=親、confirm_move_in=運営者、release=不要（誰が実行してもよい）、refund_unconfirmed=親、move_out=親と運営者の両方
- Vaultは秘密鍵を持たないPDA。StayVault自身はどの命令でも署名者にならず、資金を動かせない
- 条件判定に外部オラクルを使わない。Clockとアカウント内の値だけで判定する
- デモはdevnetのテスト用USDC（自前のmint、小数6桁）。mintはVaultアカウントに保存する
- デモでは10秒を1週として扱う（app/stayvault.html の DEMO_INTERVAL）
- MVPの対象外: 親子2-of-2、自動実行（クランカー）、手数料の徴収、AUDオフランプ、ログインと口座接続（画面はモックのまま）
- 命令の引数・アカウントの順番を変えたら、app/stayvault.html と scripts/e2e-devnet.mjs の命令組み立て部分も必ず合わせる
- 動作確認は scripts/e2e-devnet.mjs（devnet 上で5命令を通しで試す）で行う。anchor init が作った LiteSVM のテスト雛形は使っていない

## 2台で作業するときの決まり（1人で Mac と Windows を切り替える）
- 作業ブランチは feat/escrow の1本。端末を替える前に必ず commit と push、着いたら git pull
- Program ID は GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG。Program ID の鍵（target/deploy/stayvault-keypair.json）は2台に同じものを置いてある
- anchor build / anchor keys sync はどちらの端末でもよい。keys sync の前に solana address -k target/deploy/stayvault-keypair.json で上の ID が出ることを確かめる
- DeclaredProgramIdMismatch やID不一致のエラーが出たら、keys sync で ID を書き換えて直そうとしない。まずその端末の鍵ファイルの ID を確かめる
- anchor deploy は更新権限のある端末だけで実行する。デプロイ前に必ず git pull と anchor build をする
- 更新権限のある財布: Windows (~/.config/solana/id.json、アドレス 9o5Cn87tuPi5JSX5kAg9YPxSnr71pFr9cm1BXUT8LszU)
- Git に入らないもの: ~/.config/solana/id.json、target/deploy/stayvault-keypair.json、app/wallet-demo.json。どれも秘密鍵入りなので絶対にコミットしない
- 鍵のバックアップ（*-backup.json）は .gitignore に当てはまらない。リポジトリの中に置かない
- wallet-demo.json は端末ごとに scripts/setup-demo.mjs で作る
- Windows では Gemini、Mac では Claude Code を使う。どちらもこのファイルの決まりに従う
- 例外: app/demo-public.json は審査員向けに意図的に公開する devnet 専用のデモ財布。コミットしてよい。作り直すときは scripts/make-public-demo.mjs を使う
- ~/.config/solana/id.json は更新権限とテスト用USDCの発行権限を持つので、どんな理由でも公開しない。demo-public.json に含めない
