# StayVault ST分配モデルへの改修手順書（Windows・Gemini版）

2026年10月1日作成 ／ 対象ブランチ: feat/escrow ／ 公開: GitHub Pages（main）

## この手順書で行うこと

今の5命令のエスクローを、最新モデルに改修する。

- 親がUSDCで全週分を入金する（変更なし）
- 入居確認は**親と管理会社の両方**が署名する
- 毎週の家賃は、運営者の口座ではなく**物件のSPV金庫**に入る
- 4週ごとに、物件の権限者（ST業者役）の署名で**分配**する。管理費9%と手数料1%を送り、修繕積立3%は金庫に残し、残りを投資家5人へ口数比で送る

機能は増やしすぎない。命令は2つ足すだけで、既存の2つ（refund_unconfirmed、move_out）は変えない。

| 命令 | 扱い | 署名者 |
| --- | --- | --- |
| init_property | 追加。物件・SPV金庫・料率・投資家名簿を一度に登録する（デモ前にスクリプトが実行） | ST業者役 |
| create_vault | 変更。物件を受け取って記録する。引数は同じ | 親 |
| confirm_move_in | 変更。親の署名を必須にする | 親＋管理会社 |
| release | 変更。送り先をSPV金庫にする | 不要 |
| refund_unconfirmed | 変更なし | 親 |
| move_out | 変更なし | 親＋管理会社 |
| distribute | 追加。料率どおりに分配し、イベントで記録する | ST業者役 |

対象外にしたもの: 14日待機の終了申請、名簿の更新、修繕積立の引き出し。画面からも「14日待機」の文言を外してある。

**所要時間の目安**: 手順1〜3が1日、手順4（ビルドの手直し）が0.5〜1日、手順5〜8が1日。合計2.5〜3日。

---

## 同梱ファイル

zip（`stayvault-st-payout.zip`）の中身と、リポジトリでの扱い。

| ファイル | 扱い | 内容 |
| --- | --- | --- |
| `programs/stayvault/src/lib.rs` | 上書き | 7命令のプログラム |
| `programs/stayvault/src/state.rs`、`instructions.rs`、`instructions/` | **削除** | anchor init の雛形（Counter）の残り。lib.rs から使われていない |
| `scripts/demo-common.mjs` | 新規 | デモの財布・テスト用USDC・物件（init_property）を作る共通処理 |
| `scripts/setup-demo.mjs` | 上書き | 手元用の `app/wallet-demo.json` を作る |
| `scripts/make-public-demo.mjs` | 上書き | 公開用の `app/demo-public.json` を作る |
| `scripts/e2e-devnet.mjs` | 上書き | devnet で7命令を通しで確かめる |
| `scripts/check-demo.mjs` | 変更なし | ― |
| `app/stayvault.html` | 上書き | 新しい画面（9:16、6画面）。右側パネルは画面ごとの説明。分配では投資家ごとの着金を確認し、最後の画面で預けたお金の行き先と手数料の明細を1本の帯グラフで示す |
| `Anchor.toml` | 上書き | `[programs.devnet]` の節を追加 |
| `CLAUDE.md` | 上書き | 「ハッカソンMVPの範囲」をST分配モデルに改訂 |
| `README.md` | 上書き | Live demo の説明を新しい流れに改訂 |
| `docs/st-payout-guide-windows.md` | 新規 | この手順書 |

**重要**: この zip のコードは、Anchor のビルド環境がない場所で書いた。手順4のビルドで小さなエラーが出る可能性がある。出たら Gemini に全文を渡して直す（手順4-3）。

---

## 全体の流れ

| 手順 | 場所 | 内容 | 公開サイト |
| --- | --- | --- | --- |
| 1 | main | 今の版をタグで保存する | 旧版のまま動く |
| 2 | feat/escrow | 同梱ファイルを入れてコミットする | 旧版のまま動く |
| 3 | ― | 旧版のデモ動画が必要なら録画する | 旧版のまま動く |
| 4 | feat/escrow | ビルドする。サイズを確かめる | 旧版のまま動く |
| 5 | devnet | デプロイする | **ここから動かない** |
| 6 | feat/escrow | 手元の財布を作り、e2e を通す | 動かない |
| 7 | 手元 | localhost で画面を最後まで通す | 動かない |
| 8 | main | 公開用の財布を作り、main にマージする | **新版に切り替わる** |

手順5〜8は同じ日にまとめて行う。うまくいけば1〜2時間で終わる。

---

## A. Gemini の使い方

Ubuntu の窓で `cd ~/stayvault && gemini` と打って起動する。最初に次を送る。

```
CLAUDE.md と GEMINI.md を読んで、このリポジトリの決まりを要約して。
```

手順2のあとは、新しい CLAUDE.md が読まれる。その後は、各手順の「Gemini に頼む場合」の文を貼る。

- 1回に頼むのは1手順だけにする
- `anchor deploy` と `node scripts/*.mjs` は devnet の SOL を使うので、常に許可する設定にしない
- `lib.rs` や `stayvault.html` を書き換える提案は、差分を見てから許可する
- バージョンを上げる提案、新しいブランチを切る提案、鍵ファイルの中身を表示する操作は断る

詰まったら、エラーを要約せず全文を貼る。

```
StayVault のST分配モデル改修手順書（docs/st-payout-guide-windows.md）の手順○-○で止まりました。
環境: Windows WSL2 / Anchor 1.2.0 / Solana CLI 4.1.2 / Rust 1.90.0
実行したコマンド:
（ここに貼る）
出たメッセージ（全文）:
（ここに貼る）
```

---

## 手順1. 今の版を保存する

公開中の版（main）にタグを付ける。CLAUDE.md の決まりで新しいブランチは切らないので、タグで残す。

```bash
cd ~/stayvault
git fetch
git log --oneline -1 origin/main
git log --oneline -1 origin/feat/escrow
```

2行の結果を見比べておく（同じでも違ってもよい。タグは main に付ける）。

```bash
git checkout main && git pull
git status                     # "nothing to commit" であること
git tag -a v1-escrow-mvp -m "Public demo before the ST payout model"
git push origin v1-escrow-mvp
git checkout feat/escrow && git pull
```

デプロイ済みのプログラム本体も、リポジトリの外に保存しておく。

```bash
solana program dump GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG ~/stayvault-v1.so --url devnet
ls -l ~/stayvault-v1.so
```

GitHub の Releases で `v1-escrow-mvp` からリリースを作ると、zip でもダウンロードできる（任意）。

**確認**: GitHub の Tags に `v1-escrow-mvp` がある。`~/stayvault-v1.so` がある。

---

## 手順2. 同梱ファイルを入れる

### 2-1. zip を Ubuntu 側に持ってきて展開する

```bash
ls /mnt/c/Users
mkdir -p ~/Downloads
cp /mnt/c/Users/<Windowsのユーザー名>/Downloads/stayvault-st-payout.zip ~/Downloads/
cd ~/Downloads && rm -rf stayvault-st-payout && unzip stayvault-st-payout.zip
ls ~/Downloads/stayvault-st-payout
```

### 2-2. 差分を見てからコピーする

**Gemini に頼む場合**

```
~/Downloads/stayvault-st-payout/docs/st-payout-guide-windows.md の手順2-2を実行して。
CLAUDE.md と README.md は上書きする前に、今のリポジトリとの差分を見せて。
```

**自分で打つ場合**

```bash
cd ~/stayvault
git branch --show-current      # feat/escrow であること
git diff --no-index CLAUDE.md ~/Downloads/stayvault-st-payout/CLAUDE.md
git diff --no-index README.md ~/Downloads/stayvault-st-payout/README.md
```

`-` で始まる行は、今のファイルにだけある内容。残したい行があれば、上書きのあとに書き戻す。`q` で閉じる。

```bash
B=~/Downloads/stayvault-st-payout
cp $B/programs/stayvault/src/lib.rs programs/stayvault/src/lib.rs
git rm -r --quiet programs/stayvault/src/state.rs programs/stayvault/src/instructions.rs programs/stayvault/src/instructions
cp $B/scripts/demo-common.mjs $B/scripts/setup-demo.mjs $B/scripts/make-public-demo.mjs $B/scripts/e2e-devnet.mjs scripts/
cp $B/app/stayvault.html app/
cp $B/Anchor.toml $B/CLAUDE.md $B/README.md .
cp $B/docs/st-payout-guide-windows.md docs/
git status
```

`git rm` で「did not match any files」と出たら、雛形はすでに消えている。そのまま進む。

### 2-3. コミットする

`git status` に鍵ファイル（`id.json`、`*-keypair.json`、`wallet-demo.json`、`*-backup.json`）が出ていないことを確かめてから実行する。

```bash
git add -A
git commit -m "feat: ST payout model (property vault, distribute) - source"
git push
```

**確認**: `git log --oneline -1` に今のコミットが出る。

---

## 手順3. 旧版のデモ動画（必要な場合だけ）

手順5のデプロイで、公開中の旧版は動かなくなる。旧版の画面を動画で残したい場合は、ここで公開URLを開いて録画しておく。

---

## 手順4. ビルドする

### 4-1. Program ID を確かめる

```bash
cd ~/stayvault
solana address -k target/deploy/stayvault-keypair.json
```

`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG` が出ること。違う ID が出たら `anchor keys sync` で直そうとせず、ここで止める（CLAUDE.md の決まり）。

### 4-2. ビルドする

**Gemini に頼む場合**

```
docs/st-payout-guide-windows.md の手順4-2を実行して。エラーが出たら、直す前に原因と直し方を説明して。
```

**自分で打つ場合**

```bash
anchor build
ls -l target/deploy/stayvault.so target/idl/stayvault.json
grep -c '"name": "distribute"' target/idl/stayvault.json      # 1 以上なら新しい IDL
```

### 4-3. エラーが出たとき

コードを書いた環境では Anchor でビルドできなかったため、出やすい箇所を先に書いておく。Gemini には「CLAUDE.md の決まり（Anchor 1.2.0）の範囲で、命令の動き（アカウントの並び・計算・署名者）を変えずに直して」と伝える。

| 出やすいエラー | 場所 | 直し方の方針 |
| --- | --- | --- |
| lifetime may not live long enough、remaining_accounts まわり | `distribute` の関数定義 `Context<'_, '_, 'info, 'info, Distribute<'info>>` | Anchor 1.2.0 の `Context` の書き方に合わせる。remaining_accounts の各口座を CPI に渡せればよい |
| cannot borrow ... as mutable | `distribute` の最後の `let p = &mut ctx.accounts.property;` | 先に必要な値をローカル変数にコピーしてから可変で借りる |
| the trait InitSpace is not implemented / max_len | `Property.holders`、`Holder` | `#[max_len(10)]` と `#[derive(InitSpace)]` の付け方を Anchor 1.2.0 に合わせる |
| IDL のビルドで Holder の型が見つからない | `Holder` | `#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]` が付いていることを確かめる |

**変えてはいけないもの**（画面とスクリプトがこの形に合わせてある）:

- 命令ごとのアカウントの並び（付録Aの表）
- `create_vault` の引数
- `Property` のフィールドの順番（e2e が `reserve_balance` を 186 バイト目から読む）
- イベント `Distributed` のフィールドの順番（画面がログから読む）

並びを変えざるを得なかった場合は、`app/stayvault.html`、`scripts/e2e-devnet.mjs`、`scripts/demo-common.mjs` も同じように直す。

### 4-4. プログラムのサイズを確かめる

```bash
stat -c %s target/deploy/stayvault.so                                         # 新しいサイズ（バイト）
solana program show GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG --url devnet  # Data Length が今の上限
```

新しいサイズが Data Length より大きい場合は、手順5でデプロイが失敗する。差の分（少し余裕を持たせる）を先に広げておく。

```bash
solana program extend GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG <足りないバイト数 + 10000> --url devnet
```

ビルドが通ったらコミットする。

```bash
git add -A && git commit -m "fix: build fixes for ST payout model" && git push    # 直した箇所がある場合
```

---

## 手順5. devnet にデプロイする

**この手順から公開デモは動かなくなる。手順8まで続けて行う。**

### 5-1. この端末でデプロイしてよいかを確かめる

```bash
solana address        # 9o5Cn87tuPi5JSX5kAg9YPxSnr71pFr9cm1BXUT8LszU であること（更新権限のある財布）
solana config get     # RPC URL が devnet であること
solana balance        # 3 SOL 以上あること
```

足りなければ `solana airdrop 2` を試し、断られたら faucet.solana.com で `solana address` のアドレスに送ってもらう。デプロイでは、プログラムの大きさに応じた SOL が一時的に必要になる（終わると大半は戻る）。

### 5-2. デプロイする

```bash
git pull
anchor build
anchor deploy --provider.cluster devnet
solana program show GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG --url devnet
```

`Last Deployed In Slot` が新しくなっていれば完了。「account data too small」のようなエラーが出たら、手順4-4の `solana program extend` を行ってから、もう一度 `anchor deploy` する。

---

## 手順6. 手元の財布を作り、e2e を通す

### 6-1. 手元用の財布と物件を作る

```bash
yarn install            # @solana/spl-token と @solana/web3.js（初回だけ）
node scripts/setup-demo.mjs
```

`property :` にアドレスが出て、「app/wallet-demo.json を書き出しました」で終われば完了。物件の登録（init_property）もここで行われる。

### 6-2. e2e を通す

**Gemini に頼む場合**

```
node scripts/e2e-devnet.mjs を実行して。失敗したら、どの確認で失敗したかと、ログの該当部分を見せて。
```

**自分で打つ場合**

```bash
node scripts/e2e-devnet.mjs
```

1分ほどかかる。次の確認がすべて ✅ になり、最後に「すべて通りました」と出れば完了。

- create_vault: 6週分がエスクローに入る
- release: 入居確認の前は払い出せない
- confirm_move_in: 親の署名がないと通らない
- 初週分と4週分がSPV金庫に届く
- distribute: ST業者以外は分配できない／名簿と違う口座には送れない
- distribute: 管理費・手数料・修繕積立・投資家5人の金額が計算どおり（4週 852 USDC なら 76.68 / 8.52 / 25.56 / 741.24）
- distribute: 分配する額がなければ通らない
- move_out: 未払いの2週分が親に戻る
- refund_unconfirmed: 期限後に全額が親に戻る

`❌` が出たら、その行とログを Gemini に渡す。プログラムを直したら、手順5-2（デプロイ）からやり直す。

```bash
git add -A && git commit -m "test: e2e passes for ST payout model" && git push    # 直した箇所がある場合
```

---

## 手順7. 手元で画面を最後まで通す

```bash
cd ~/stayvault
python3 -m http.server 8000
```

Windows のブラウザで `http://localhost:8000/app/stayvault.html` を開く。手元では `app/wallet-demo.json` が使われる。右上が「Solana devnet」（緑）になってから操作する。

| 確認すること | 期待する結果 |
| --- | --- |
| Sign in → Connect → Choose a dorm → How long? → Review | 右側パネルの説明が画面ごとに変わる |
| Set aside | 数秒で「Rent is in escrow」。ホームに入居確認のカードが出る |
| Approve move-in | 「Week 1 paid」。右側に物件の金庫が出る |
| 約40秒待つ | 4週分たまると自動で分配される。右側の投資家5人の行に「✓ +○○ arrived」が付き、「Last payout」の内訳（帯グラフ）が更新される |
| 投資家の行の ✓ | 分配の前後に投資家のUSDC口座の残高を読み、増えた額が分配額と一致したときだけ付く。付かずに「sent」と出たら、Console のエラーを見る |
| Explorer のリンク | 分配の取引に、投資家5人への送金が並ぶ |
| Move out early → Confirm move-out | 残りの週が戻り、「Closed」になる |
| 最後の画面の右側 | 「Where the rent went」。親が預けた額の行き先（親への返金・投資家・管理費9%・修繕積立3%・手数料1%）が1本の帯と金額で並ぶ。投資家5人の累計受取額と着金チェック、口座アドレス（先頭4文字…末尾4文字）のリンクが出る |
| 投資家のアドレスのリンク | Explorer でその投資家のUSDC口座が開き、分配の受け取りが確認できる |

ブラウザの開発者ツール（F12）の Console に赤いエラーが出ていないことも確かめる。終わったら Ubuntu の窓で `Ctrl+C` を押してサーバーを止める。

---

## 手順8. 公開デモを作り、main にマージする

### 8-1. 公開用の財布と物件を作る

```bash
cd ~/stayvault
node scripts/make-public-demo.mjs
node scripts/check-demo.mjs
git add app/demo-public.json
git commit -m "chore: public demo wallets and property for ST payout model"
git push
```

`check-demo.mjs` で、親役の SOL とテスト用USDC が十分にあることを確かめる。

### 8-2. main にマージする

```bash
git checkout main
git pull
git merge feat/escrow
git push origin main
git checkout feat/escrow
```

GitHub のプルリクエストでマージしてもよい。

### 8-3. 公開サイトで確かめる

数分待ってから `https://Stay-Vault.github.io/stayvault/` を開き、手順7の表を公開サイトでもう一度通す。キャッシュが残って古い画面が出る場合は、`Ctrl+Shift+R` で再読み込みする。

---

## 手順9. 仕上げ

- README の `Demo video: <link>` に、録画した動画のリンクを入れる
- 審査期間中は、ときどき `node scripts/check-demo.mjs` で残高を確かめる。足りなければ表示されるコマンドで SOL を足す

---

## 困ったとき

| 症状 | 原因と対処 |
| --- | --- |
| `DeclaredProgramIdMismatch` | 鍵ファイルの ID が違う。`anchor keys sync` で直さず、手順4-1で鍵ファイルを確かめる |
| デプロイで「insufficient funds」 | 更新権限のある財布の SOL が足りない。faucet で足す |
| デプロイで「account data too small」 | プログラムが大きくなった。手順4-4の `solana program extend` |
| 画面の右上が「Devnet unavailable」 | 設定ファイルが読めていない。`app/wallet-demo.json`（手元）か `app/demo-public.json`（公開）を作り直す。古いファイルには `property` がないので、Console に「The config file has no property」と出る |
| 分配で `NothingToDistribute` | 金庫に修繕積立以外の残高がない。別の人が先に分配した場合にも出る |
| 分配で `WrongHolderAccount` | 画面・スクリプトが渡す投資家の口座の順番が、名簿と違う |
| e2e で `AccountNotSigner` の確認が失敗する | 管理会社役に SOL がない。`setup-demo.mjs` を作り直す（管理会社役に 0.02 SOL を渡す） |
| 公開サイトが古いまま | main に push できているか確かめる。反映に数分かかる |

---

## 付録A. 命令ごとのアカウントの並び

画面（`app/stayvault.html`）、`scripts/e2e-devnet.mjs`、`scripts/demo-common.mjs` はこの並びで組み立てている。

| 命令 | アカウント（上から順） | 引数 |
| --- | --- | --- |
| init_property | payer（署名・書込）、authority（署名）、operator、mint、manager_token、fee_token、property（書込）、property_vault（書込）、token_program、system_program | property_id u64、manager_bps u16、reserve_bps u16、fee_bps u16、total_units u32、holders Vec<{token, units u32}> |
| create_vault | parent（署名・書込）、operator、mint、parent_token（書込）、vault（書込）、vault_token（書込）、token_program、system_program、**property** | 変更なし（42バイト） |
| confirm_move_in | operator（署名）、vault（書込）、**parent（署名）** | なし |
| release | vault（書込）、vault_token（書込）、**property_vault（書込）**、token_program | なし |
| refund_unconfirmed | 変更なし | なし |
| move_out | 変更なし | なし |
| distribute | authority（署名）、property（書込）、property_vault（書込）、manager_token（書込）、fee_token（書込）、token_program、＋投資家のUSDC口座（書込、名簿の順） | なし |

PDA のシード:

- property: `["property", authority, property_id(u64 LE)]`
- property_vault: `["property_vault", property]`
- vault / vault_token: 変更なし

## 付録B. 分配の計算

distribute は次の順で計算する（画面の `split()` と e2e の `expectedSplit()` も同じ）。

1. 総額 = 金庫の残高 − 修繕積立の残高
2. 管理費 = 総額 × 900 ÷ 10,000（切り捨て）。手数料（100）と修繕積立（300）も同じ
3. 投資家への原資 = 総額 − 管理費 − 手数料 − 修繕積立
4. 投資家ごと = 原資 × 口数 ÷ 1,000（切り捨て）
5. 端数（原資 − 投資家への合計）は修繕積立に足し、金庫に残す

例: 4週分 852 USDC → 管理費 76.68、手数料 8.52、修繕積立 25.56、投資家へ 741.24（A 296.496、B 185.31、C 148.248、D 74.124、E 37.062）

## 付録C. 公開デモの設定ファイル（app/demo-public.json）の項目

| 項目 | 内容 |
| --- | --- |
| rpc、programId、mint | 変更なし |
| parent、operator | 親役・管理会社役の秘密鍵（devnet専用） |
| authority | ST業者役の秘密鍵（devnet専用。分配に署名する） |
| property、propertyVault | 物件とSPV金庫のアドレス |
| managerToken、feeToken | 管理費と手数料の受取口座 |
| holders | 投資家5人の名前・口数・ウォレット・USDC口座（公開鍵だけ） |

SOL を出す財布（`~/.config/solana/id.json`）とテスト用USDCの発行権限は、このファイルに含めない。
