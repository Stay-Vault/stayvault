# StayVault
Solana上の家賃エスクローと、物件の投資家への家賃分配。親が全週分をUSDCで入金し、入居確認のあと週ごとに物件のSPV金庫へ解放する。金庫に集まった家賃は、物件の権限者（ST業者）の署名で、料率どおりに管理会社・StayVault・投資家へ分配する。

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

## ハッカソンMVPの範囲（2026-10-01 改訂。ST分配モデル）
- 命令は7つだけ: init_property / create_vault / confirm_move_in / release / refund_unconfirmed / move_out / distribute
- 署名者: init_property=物件の権限者（ST業者役）、create_vault=親（口座の作成費用は payer の StayVault役）、confirm_move_in=親と運営者の両方、release=不要（誰が実行してもよい）、refund_unconfirmed=親、move_out=親と運営者の両方、distribute=物件の権限者
- operator は「物件の管理会社」の意味で使う。名前は変えない
- 家賃の送り先は物件のSPV金庫（Property PDA が管理するトークン口座）。release は送り先をこの金庫に固定する
- distribute は、金庫の残高から修繕積立の残高を除いた額を総額とし、管理費・StayVaultの手数料を送り、修繕積立は金庫に残し、残りを名簿の口数比で投資家へ送る。端数は修繕積立に足す
- デモの料率: ST投資家 70%、不動産管理会社 10%、修繕積立 10%、その他費用 7%（保険・税金など）、StayVault 利用料 3%。オンチェーンでは manager_bps=1000、fee_bps=300、reserve_bps=1700（修繕積立とその他費用をまとめて金庫に残す）。画面は修繕積立とその他費用を分けて表示する（DORMS の bps.repair / bps.other）。scripts/demo-common.mjs、scripts/e2e-devnet.mjs、app/stayvault.html の DORMS をそろえる
- 親の負担はゼロ。すべての取引の手数料の支払者（fee payer）は StayVault役（demo-public.json の sponsor）で、create_vault の口座の作成費用（rent）も payer として StayVault役が払う。親役の財布は SOL を持たない。画面と資料に「親が手数料を払う」と読める表現を書かない
- 口座を閉じて rent を StayVault に戻す処理は対象外（入れるなら move_out / refund_unconfirmed で閉じる）
- 投資家名簿は init_property で登録し、デモ中は変えない。上限は10人（MAX_HOLDERS）。distribute には投資家の口座を名簿の順で remaining_accounts に渡す
- 分配の記録はイベント（Distributed、RentReleased）で残す。記録用のアカウントは作らない
- 親は手数料を払わない。トランザクション手数料はデモでは親役の財布がすべて払う
- Vault と Property は秘密鍵を持たないPDA。StayVault自身はどの命令でも署名者にならず、資金を動かせない
- MVPの対象外: 14日待機の終了申請、名簿の更新、修繕積立の引き出し、親子2-of-2、自動実行（クランカー）、AUDオフランプ、ログインとウォレット接続（画面はモックのまま）
- 条件判定に外部オラクルを使わない。Clockとアカウント内の値だけで判定する
- デモはdevnetのテスト用USDC（自前のmint、小数6桁）。mintはVaultアカウントに保存する
- デモでは10秒を1週として扱う（app/stayvault.html の DEMO_INTERVAL）
- MVPの対象外: 親子2-of-2、自動実行（クランカー）、手数料の徴収、AUDオフランプ、ログインと口座接続（画面はモックのまま）
- 命令の引数・アカウントの順番を変えたら、app/stayvault.html と scripts/e2e-devnet.mjs、scripts/demo-common.mjs の命令組み立て部分も必ず合わせる
- Property のフィールドの順番を変えない（e2e-devnet.mjs が reserve_balance を 186 バイト目から読んでいる）
- 動作確認は scripts/e2e-devnet.mjs（devnet 上で7命令を通しで試す）で行う。anchor init が作った LiteSVM のテスト雛形は使っていない
- 画面の文言は英語（公式ルール第12条）。日本語に戻さない
- 見た目は Basecoat 1.0.2 の CDN（basecoat.cdn.min.css）で整える。Tailwind やビルドは入れない。色は :root と html.dark の変数で変える
- 画面の DEMO_WEEK_MS（ミリ秒）と、module 内の DEMO_INTERVAL（秒）は同じ長さにそろえる
- 模擬の画面には sim-note（Simulated）を付ける。本物の取引は logTx（親の履歴）か showEvent（右側パネル）で記録し、Explorer リンクを出す
- 右側パネルは、左の画面の役割と、その画面で審査員に伝えたいことだけを書く（renderAside）。関係ない情報を足さない
- 右側パネルの要点: 支払い中も最後の画面と同じお金の流れの図を出し、金額を動かす（Escrow は毎週減り、Property vault は分配待ちの額と金庫に残した額、Investors／Manager／StayVault は累計と ✓）。図の上に今の割合の細い帯、図の下に次の分配までのゲージと直近の取引、投資家5人の表（アドレスのリンク、直近の分配額、累計）。✓ は分配の前後に残高を読んで一致したときだけ。高さ900pxでスクロールせずに見えること。最後の画面は「Where the rent went」として、事業資料のお金の流れの図と同じ形（Parent → Escrow → Property vault（SPV）→ Investors／Manager／StayVault、親への返金は赤の破線）に今回の金額を入れて見せる。図の上に高さ8pxの帯（色は各箱と1対1で対応）、図の下に投資家5人の受取額とアドレスのリンク
- 画面に、プログラムにない機能を「できる」と書かない
- ロゴは app/brand/ の SVG を使う（最終版 1b：屋根の形の輪の南京錠に、アーチ扉の家。紫1色、Claude Design で調整済み）。48px 以上は stayvault-mark.svg、40px 以下は stayvault-mark-small.svg、文字つきは stayvault-logo-horizontal.svg。形や色を作り直さない。ロゴに緑を使わない
- アプリ内の文字は Bricolage Grotesque（800）で「Stay」を --ink、「Vault」を --jac。favicon は stayvault.html の <link rel="icon"> に埋め込み済み

## 2台で作業するときの決まり（1人で Mac と Windows を切り替える）
- 作業ブランチは feat/escrow の1本。端末を替える前に必ず commit と push、着いたら git pull
- Program ID は GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG。Program ID の鍵（target/deploy/stayvault-keypair.json）は2台に同じものを置いてある
- anchor build / anchor keys sync はどちらの端末でもよい。keys sync の前に solana address -k target/deploy/stayvault-keypair.json で上の ID が出ることを確かめる
- DeclaredProgramIdMismatch やID不一致のエラーが出たら、keys sync で ID を書き換えて直そうとしない。まずその端末の鍵ファイルの ID を確かめる
- デプロイは更新権限のある端末だけで、`RPC_URL=<Helius などの devnet RPC> bash scripts/deploy-devnet.sh` で行う。デプロイ前に必ず git pull と anchor build をする
- 公開 RPC（api.devnet.solana.com）での anchor deploy は、WSL では書き込みの取引が届かず Blockhash expired が続いて失敗した。途中のバッファを --buffer で再開すると Verifier error になる。失敗したらバッファを閉じて最初からやり直す（deploy-devnet.sh は自動で閉じる）
- Helius などの RPC の URL（APIキー入り）は、app/demo-public.json、コード、コミット、チャットに書かない。公開デモの rpc は https://api.devnet.solana.com のままにする
- 更新権限のある財布: Windows (~/.config/solana/id.json、アドレス 9o5Cn87tuPi5JSX5kAg9YPxSnr71pFr9cm1BXUT8LszU)
- Git に入らないもの: ~/.config/solana/id.json、target/deploy/stayvault-keypair.json、app/wallet-demo.json。どれも秘密鍵入りなので絶対にコミットしない
- 鍵のバックアップ（*-backup.json）は .gitignore に当てはまらない。リポジトリの中に置かない
- wallet-demo.json は端末ごとに scripts/setup-demo.mjs で作る
- Windows では Gemini、Mac では Claude Code を使う。どちらもこのファイルの決まりに従う
- 例外: app/demo-public.json は審査員向けに意図的に公開する devnet 専用のデモ財布（親役・管理会社役・ST業者役）と物件の情報。コミットしてよい。作り直すときは scripts/make-public-demo.mjs を使う
- GitHub Pages は main から公開している。feat/escrow で作業し、確認が済んでから main にマージする
- ~/.config/solana/id.json は更新権限とテスト用USDCの発行権限を持つので、どんな理由でも公開しない。demo-public.json に含めない
