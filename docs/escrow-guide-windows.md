# StayVault エスクロー実装手順書（Windows・Gemini版）

最終更新: 2026年9月25日（Anchor 1.2.0 に合わせて全面改訂）

**対象読者**: Windows（WSL2 の Ubuntu）で、1人で実装を進める人。同じ人が Mac でも作業し、区切りごとに端末を切り替える。Mac 側の手順は `escrow-guide-mac.md` にある。

**前提**: Windows のセットアップは完了している。Rust 1.90.0 / Solana CLI 4.1.2 / Anchor 1.2.0 / Node.js 22.23.2 / Yarn 1.22.22 が入り、`~/stayvault` にクローン済み。Program ID の鍵も配置済みで、`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG` を確認してある。

**この手順書で作るもの**: `stayvault.html` の3つのボタン（支払う／支払日を進める／途中退去）を、devnet 上の本物のエスクローにつなぐ。ログイン、SBI VCトレード連携、AUD への換金はモックのまま残す。

**読み方**: A章とB章を先に読む。そのあとステップ0〜6を順に進める。ステップ0は最初の1回だけ。端末を替えるときは、そのたびに B章をなぞる。D章以降は詰まったときに開く。

**この手順書の限界**: 同梱のコードは Anchor 1.2.0 の変更点に合わせて直したが、まだどの環境でもビルドしていない（未検証）。ステップ2の `anchor build` と、ステップ4の通しテストが通った時点で確認済みになる。

---

## A. 2台の役割 — デプロイだけは1台で行う

| 作業 | Windows | Mac |
| --- | --- | --- |
| ビルド（`anchor build`） | できる | できる |
| devnet へのデプロイ（`anchor deploy`） | 更新権限がある場合だけ | 更新権限がある場合だけ |
| 通しテスト・画面の確認 | できる | できる |

デプロイした財布が、そのプログラムを更新できる唯一の財布（更新権限）になる。更新権限がどちらの端末にあるかは、ステップ3の最初に確かめる。まだ一度もデプロイしていなければ、最初にデプロイした端末が更新権限を持つ。

Git に入らない鍵ファイルは3つある。どれも中身を Gemini に貼ったり、画面に表示させたりしない。

| ファイル | 中身 |
| --- | --- |
| `target/deploy/stayvault-keypair.json` | Program ID の鍵。Mac と同じものを置いてある |
| `~/.config/solana/id.json` | この端末の devnet 財布の鍵。Mac とは別のもの |
| `app/wallet-demo.json` | デモ用の親役・運営者役の鍵。ステップ4で作る |

作業ブランチは `feat/escrow` の1本だけにする。Gemini が別のブランチ（`feat/fund` など）を勧めてきても使わない。

---

## B. 切り替えの手順 — 端末を替えるたびに毎回やる

### Windows を離れる前

```bash
cd ~/stayvault
git status
git add .
git commit -m "wip: ステップ2まで"
git push
```

コミットメッセージには、どのステップまで進んだかを書く。`git status` の一覧に `wallet`、`-keypair.json`、`-backup.json`、`id.json` のどれかが含まれていたら、`add` せずに止まる（D章）。画面のサーバーを動かしていたら `Ctrl + C` で止める。

### Windows に着いたら（Mac から戻ってきたとき）

```bash
cd ~/stayvault
git fetch
git checkout feat/escrow
git pull
git log -1
yarn install
anchor build
```

`git log -1` に、Mac で書いたコミットメッセージが出れば同期できている。`yarn install` と `anchor build` は、Mac 側で部品やコードが変わっていても揃えるため。何度実行しても害はない。

---

## C. Gemini の使い方

### Gemini CLI を使う場合

Ubuntu の窓で `cd ~/stayvault && gemini` と打って起動する。リポジトリの `GEMINI.md` が読まれ、そこから `CLAUDE.md` の決まりを読むよう指示してある。起動したら、最初に次を送っておくと確実。

```
CLAUDE.md と GEMINI.md を読んで、このリポジトリの決まりを要約して。
```

各ステップの「Gemini に頼む場合」の文を貼れば、コマンドを実行してもらえる。コマンドの実行前に許可を求められたら、内容を読んでから許可する。`anchor deploy` と `node scripts/setup-demo.mjs` は devnet の SOL を使うので、常に許可する設定にはしない。`lib.rs` や `stayvault.html` を書き換える提案は、差分を見てから許可する。

### ブラウザの Gemini を使う場合

ブラウザの Gemini は、パソコンの中を見られない。最初に次の4つをアップロードしておく。

- `CLAUDE.md`
- `programs/stayvault/src/lib.rs`
- `app/stayvault.html`
- この手順書（`docs/escrow-guide-windows.md`）

ファイル選択のアドレス欄に `\\wsl$\Ubuntu\home\NaoyaKohara\stayvault` と入れると、Ubuntu の中のファイルを選べる。`Ubuntu` の部分は `Ubuntu-24.04` などになっていることがある。開けなければ `\\wsl$` とだけ入れて中を見る。

詰まったら、エラーを要約せず全文を貼る。

```
StayVault のエスクロー実装手順書（Windows版）のステップ○-○で止まりました。
環境: Windows WSL2 / Anchor 1.2.0 / Solana CLI 4.1.2 / Rust 1.90.0
実行したコマンド:
（ここに貼る）
出たメッセージ（全文）:
（ここに貼る）
```

Gemini が Anchor 0.32 以前の書き方（`CpiContext::new(ctx.accounts.token_program.to_account_info(), ...)` や `@coral-xyz/anchor`）を提案してきたら、「Anchor 1.2.0 で書いて」と指示し直す。

### ファイルを編集するとき

Ubuntu の窓で `cd ~/stayvault && code .` と打ち、VS Code（WSL拡張）で開く。エクスプローラーから `\\wsl$` をたどって直接編集すると、改行コードが Windows 式に変わってビルドが失敗することがある。アップロードのために読むだけなら `\\wsl$` 経由でよい。

---

## ステップ0. 以前の計画の片付け — 最初に1回だけ

**端末: どちらでも（1回だけ）。** 以前、別の実装計画書に沿って `feat/fund` ブランチや CLAUDE.md の追記を行った。その作業は今回の計画（この手順書の5命令）とは設計が違うので、使わずに保管し、今回の計画で最初からやり直す。履歴は消さずに残すので、あとで以前の作業を見たくなっても取り出せる。

### 0-1. 以前の作業がどこに入っているかを確かめる

```bash
cd ~/stayvault
git fetch --all --prune
git checkout main && git pull
git branch -a
grep -n "fund\|terminate\|reclaim\|10/05" CLAUDE.md
grep -rn "pub fn" programs/stayvault/src
```

- `feat/fund` が一覧にある → 0-2 で保管用の名前に変える
- main の CLAUDE.md や `pub fn` に `fund`・`terminate`・`reclaim` が出てくる → 以前の作業が main にも入っている。追加の作業は要らない。ステップ1〜2で上書きすれば今回の計画に置き換わる（2-2・2-3 はこの場合にも対応している）

### 0-2. `feat/fund` を保管用の名前に変える

```bash
git checkout feat/fund
git checkout main
git branch -m feat/fund archive/fund-old
git push origin archive/fund-old
git push origin --delete feat/fund
```

1〜2行目は、GitHub にだけある `feat/fund` を手元に持ってくるため。`feat/fund` がなければこの節は飛ばす。

### 0-3. AI に古い計画を読ませない

Claude や Gemini のプロジェクトに、以前の実装計画書・ビジネスモデル・「別端末での作業再開手順」を入れてある場合は、外すか、ファイル名に「旧」と付ける。残っていると、新しい会話で `fund` や `terminate` を前提にした答えが返ってくる。

以前の CLAUDE.md にあった「コントラクトは 2026-10-05 で凍結」を今回も守る場合は、ステップ1で CLAUDE.md を上書きしたあとに、「ハッカソンMVPの範囲」の節へ次の1行を足す。

```
- コントラクト（programs/）は 2026-10-05 で凍結。以降は画面と資料だけを直す
```

---

## ステップ1. 同梱ファイルをリポジトリに入れる

**端末: zip がある方。** Mac で済ませた場合は、B章の「着いたら」をやればこのステップは不要。

### 1-1. zip を Ubuntu 側に持ってきて展開する

```bash
sudo apt install -y unzip
ls /mnt/c/Users
mkdir -p ~/Downloads
cp /mnt/c/Users/<Windowsのユーザー名>/Downloads/stayvault-escrow.zip ~/Downloads/
cd ~/Downloads && rm -rf stayvault-escrow && unzip stayvault-escrow.zip
```

Windows のユーザー名は、2行目の一覧で確かめる。Ubuntu のユーザー名（NaoyaKohara）と違うことがある。

### 1-2. ブランチを切ってコピーする

**Gemini に頼む場合**

```
~/Downloads/stayvault-escrow/docs/escrow-guide-windows.md のステップ1-2を実行して。CLAUDE.md は上書きする前に、今のリポジトリの CLAUDE.md との差分を見せて。
```

**自分で打つ場合**

```bash
cd ~/stayvault
git checkout main && git pull
git checkout -b feat/escrow
git diff --no-index CLAUDE.md ~/Downloads/stayvault-escrow/CLAUDE.md
```

最後のコマンドで、今の `CLAUDE.md` と同梱版の差分が出る。`-` で始まる行は、今の `CLAUDE.md` にだけある内容だ。固定バージョンの節は同梱版にも同じ内容を入れてあるが、それ以外に残したい行があれば、上書きのあとに書き戻す。差分は `q` で閉じる。

```bash
cp -R ~/Downloads/stayvault-escrow/programs ~/Downloads/stayvault-escrow/scripts ~/Downloads/stayvault-escrow/app ~/Downloads/stayvault-escrow/docs .
cp ~/Downloads/stayvault-escrow/CLAUDE.md ~/Downloads/stayvault-escrow/GEMINI.md .
git status
```

`programs/stayvault/src/lib.rs` は上書きされる。`START_HERE.md` はコピーしない。

### 1-3. コミットする

`git status` に鍵ファイルが出ていないことを確かめてから実行する。

```bash
git add .
git commit -m "chore: add escrow bundle for anchor 1.2.0 (step1 done)"
git push -u origin feat/escrow
```

---

## ステップ2. プログラムを組み立ててビルドする

**端末: どちらでも。**

**Gemini に頼む場合**

```
docs/escrow-guide-windows.md のステップ2を 2-1 から 2-5 まで順に実行して。
lib.rs の設計（命令・引数・署名者）は変えないこと。バージョンは CLAUDE.md の固定バージョンから変えないこと。
エラーが出たら、原因を説明してから直して、直した差分を見せて。anchor build が通ったら止めて報告して。
```

**自分で打つ場合**は以下を上から順に。

### 2-1. クレート名が stayvault になっているか確かめる

```bash
cd ~/stayvault
grep -rn "stayvault_tmp" programs/stayvault/Cargo.toml Anchor.toml
```

何も出なければ次へ。出たら、その行の `stayvault_tmp` を `stayvault` に書き換える。

### 2-2. Cargo.toml にトークン用の部品を足す

まず今の書き方を確かめる。

```bash
grep -n "anchor" programs/stayvault/Cargo.toml
```

`anchor-spl` の行と、`idl-build` の行の `"anchor-spl/idl-build"` がすでに両方あれば（以前の作業で足してある場合）、この節は飛ばして 2-3 へ進む。

`[dependencies]` の `anchor-lang` の行のすぐ下に、**同じバージョン**で `anchor-spl` を足す。`anchor-lang` が `{ version = "1.2.0", features = [...] }` のような形で書かれていても、`anchor-spl` は次の1行でよい。

```toml
anchor-spl = "1.2.0"
```

同じファイルの `[features]` にある `idl-build` の行に、`"anchor-spl/idl-build"` を足す。

```toml
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]
```

`anchor-spl` は、USDC のようなトークンを送るための部品。`anchor-lang` とバージョンがずれるとビルドが通らないので、必ず同じ数字にする。

### 2-3. 雛形と以前のテストを片付ける

Anchor 1.2.0 の `anchor init` は、`lib.rs` のほかに `instructions/` や `state/` などを分けて作る。今回の `lib.rs` は1ファイルにまとまっているので、雛形の残りは使わない。残しておくと、Gemini がそちらを編集してしまうことがある。

```bash
ls programs/stayvault/src
ls programs/stayvault/tests tests 2>/dev/null
grep -n "\[\[test\]\]" -A 3 programs/stayvault/Cargo.toml
```

1行目で `lib.rs` 以外に出てきたファイルとフォルダ（`instructions`、`state`、`error.rs`、`constants.rs` など）を消す。

```bash
git rm -r programs/stayvault/src/instructions programs/stayvault/src/state
git rm programs/stayvault/src/error.rs programs/stayvault/src/constants.rs
```

存在しないものを指定すると `did not match any files` と出るだけなので、その行は飛ばしてよい。

2行目で出てきたテスト（雛形の `test_initialize.rs` や、以前の計画で作った `fund` などのテスト）も消す。どれも今回の `lib.rs` にない命令を呼ぶので、残すと `cargo test` が失敗する。

```bash
git rm -r programs/stayvault/tests
```

3行目で `[[test]]` の節が出てきたら、その節（`[[test]]` から次の空行まで）を Cargo.toml から消す。消したテストファイルを指したままだと、ビルドがファイルを探して止まる。`[dev-dependencies]` の litesvm や `=` 固定の行には手を付けない。後で LiteSVM のテストを書くときにそのまま使える。

### 2-4. Program ID を確かめてビルドする

```bash
solana address -k target/deploy/stayvault-keypair.json
grep -n "declare_id" programs/stayvault/src/lib.rs
anchor build
```

1行目と2行目の両方に `GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG` が出ることを確かめる。同梱の `lib.rs` には最初からこの ID を書いてあるので、`anchor keys sync` は打たなくてよい。Anchor 1.2.0 の `anchor build` は、`lib.rs` の ID と鍵ファイルの ID がずれているとエラーで止まる。

初回のビルドは、anchor-spl を足したぶん時間がかかる（5〜15分）。`Finished` と出れば成功。

### 2-5. 通しテスト用の部品を入れる

ステップ4のスクリプトと画面は、Solana の JavaScript 部品を使う。Anchor 1.2.0 の雛形には入っていないので足す。

```bash
yarn add -D @solana/web3.js@1.98.0 @solana/spl-token@^0.4
```

終わったら B章の「離れる前」をやって push しておく。コミットメッセージは `feat: escrow program builds on anchor 1.2.0 (step2 done)`。

---

## ステップ3. devnet にデプロイする

**端末: 更新権限のある端末だけ。**

### 3-1. この端末でデプロイしてよいかを確かめる

```bash
cd ~/stayvault
git pull
anchor build
solana program show GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG --url devnet
solana address
```

- `Authority:` のアドレスと `solana address` が同じ → この端末でデプロイしてよい。3-2 へ
- `Authority:` のアドレスと `solana address` が違う → Mac に更新権限がある。ここで B章の「離れる前」をやり、デプロイは Mac で行う
- `Unable to find the account` などと出る → まだ一度もデプロイしていない。ここでデプロイすると、Windows が更新権限を持つ。それでよければ 3-2 へ

### 3-2. devnet 用の設定と SOL を確かめる

`Anchor.toml` に devnet 用の節がなければ足す。

```bash
grep -n "programs.devnet" Anchor.toml
```

何も出なければ、`Anchor.toml` の `[programs.localnet]` の節の下に次を足す。

```toml
[programs.devnet]
stayvault = "GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG"
```

```bash
solana config get
solana balance
```

`RPC URL` が devnet で、残高が 3 SOL 以上あること。足りなければ `solana airdrop 2` を試し、断られたらブラウザで faucet.solana.com を開いて `solana address` のアドレスに送ってもらう。devnet を向いていなければ `solana config set --url devnet`。

### 3-3. デプロイする

```bash
anchor deploy --provider.cluster devnet
```

`GJet47eJ…` が表示され、エラーなく終われば完了。Anchor 1.2.0 はデプロイと同時に IDL（プログラムの設計図）も devnet に載せる。

### 3-4. デプロイのあとにやること

```bash
solana program show GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG --url devnet
```

`Authority:` がこの端末の `solana address` と同じなら、Windows が更新権限を持っている。初めてのデプロイだった場合は、次の2つを必ずやる。

1. `CLAUDE.md` の「更新権限のある財布: 未定」の行を、`- 更新権限のある財布: Windows（~/.config/solana/id.json、アドレス <solana address の値>）` に書き換える
2. `~/.config/solana/id.json` を、パスワードマネージャなどにバックアップする。この鍵をなくすと、プログラムを二度と更新できない

最後に B章の「離れる前」をやる。コミットメッセージは `feat: deploy escrow to devnet (step3 done)`。

---

## ステップ4. devnet で通しテストをする

**端末: どちらでも。** 旧版の手順書にあった `anchor test` の代わりに、このステップで動作を確かめる。devnet に載せたプログラムに対して、画面と同じ方法で5つの命令を順に実行する。これが通れば、プログラムと画面側の命令組み立ての両方が正しいと分かる。

**Gemini に頼む場合**

```
docs/escrow-guide-windows.md のステップ4を実行して。setup-demo.mjs を実行する前に solana balance の結果を見せて止めて。
```

### 4-1. デモ用の財布とテスト用 USDC を作る

```bash
cd ~/stayvault
solana balance
node scripts/setup-demo.mjs
```

0.3 SOL 以上あれば足りる。スクリプトは次の4つを行う。

1. 親役と運営者役の使い捨て財布を作る
2. 親役に手数料用として 0.1 SOL を送る
3. テスト用 USDC を発行し、親役に 10,000 USDC を配る
4. それらを `app/wallet-demo.json` に書き出す

`-> app/wallet-demo.json を書き出しました` と出れば成功。このファイルは Git に入らないので、Mac でも画面を動かすなら Mac でもこのステップを実行する。

### 4-2. 通しテストを実行する

```bash
node scripts/e2e-devnet.mjs
```

1分ほどかかる（途中で20秒待つ場面がある）。✅ が9個並び、最後に `すべて通りました。` と出れば成功。

❌ が出たら、そこで止まる。その行と、直前に出たログを全文 Gemini に貼る。未検証のコードなので、ここで問題が見つかるのは想定内だ。`lib.rs` を直したら、ステップ3のデプロイをやり直してから、このステップを再実行する。

---

## ステップ5. 画面で動作を確認する

**端末: ステップ4を実行した端末。**

### 5-1. 画面を開く

新しい Ubuntu の窓を開いて、サーバーを動かす（起動したままになる）。

```bash
cd ~/stayvault
python3 -m http.server 8000 -d app
```

Windows 側の Chrome か Edge で `http://localhost:8000/stayvault.html` を開く。`stayvault.html` をダブルクリックで開くと `wallet-demo.json` を読めないので、必ずこの URL から開く。止めるときはサーバーの窓で `Ctrl + C`。

### 5-2. デモの流れを通す

`F12` で開発者ツールを開き、「Console」タブを出しておく。`StayVault escrow ready:` と Program ID が出ていれば、画面はチェーンにつながっている。

| 操作 | 起きること | 画面の表示 |
| --- | --- | --- |
| ログイン → 連携を許可 | モック。チェーンには何も送らない | — |
| 寮を登録 → 期間を選ぶ → 確認 | モック | — |
| 「SBI VCトレードから支払う」 | 親の署名で全週分をエスクローに入金 | 「エスクローへ送金しました」 |
| 「支払日を進める」1回目 | 運営者の入居確認と初週分の払い出し | 「入居が確認され、初週分を支払いました」 |
| 同じボタン2回目以降 | その週の分を運営者へ（おおむね10秒で1週） | 「今週分を寮へ支払いました」 |
| 「途中退去を申請」 | 親と運営者の署名で、残りを親へ返金 | 「○○ USDC を返金しました」 |

操作のたびに Console に `tx: https://explorer.solana.com/...` が出る。開くと、その取引で誰の口座からいくら動いたかを確認できる。

発表で説明するときの要点は3つある。

- デモでは親と運営者の署名を1つの画面でまとめて行っている。本番では、運営者の署名は運営者の管理画面で行う
- 「支払日を進める」ボタンの役は、本番では期日に自動で取引を送る仕組みが担う
- StayVault 自身はどの命令でも署名者にならないので、預かった資金を動かせない

---

## ステップ6. main に入れる

ステップ5まで通ったら、B章の「離れる前」をやってから、GitHub で `feat/escrow` のプルリクエストを作って自分でマージする。マージしたら両方の端末で main に戻る。

```bash
cd ~/stayvault
git checkout main && git pull
```

---

## D. 困ったとき（逆引き）

### 同期

**`git pull` で `CONFLICT`** → Mac と Windows で同じファイルを書き換え、片方を push し忘れた。どちらを残すかを決めてから、Gemini に「このコンフリクトを解消して。残すのは○○の方」と頼む。

**`git status` に鍵ファイルが出る** → `add` しない。`-backup.json` はリポジトリの外に移すか消す。`wallet-demo.json` や `-keypair.json` が出るなら `.gitignore` が効いていないので、`cat .gitignore` の結果を Gemini に見せる。

**`git pull` しても Mac の変更が来ない** → Mac で `git push` していないか、別のブランチにいる。`git branch` で `* feat/escrow` になっているか見る。

### ビルド

**`anchor_spl` が見つからない、またはバージョンが解決できない** → 2-2 の `anchor-spl` が `anchor-lang` と同じバージョンか確かめる。

**`idl-build` に関するエラー** → 2-2 の `idl-build = [...]` の行を確かめる。

**`CpiContext` の引数の型が合わない（`expected Pubkey, found AccountInfo`）** → Anchor 0.32 の書き方が混ざっている。CLAUDE.md の固定バージョンの節にある3点を Gemini に見せて直させる。

**`#[instruction]` の引数に関するエラー** → `CreateVault` の上の `#[instruction(...)]` に、`create_vault` の引数6つが同じ順番で並んでいるか確かめる。

**`initialize`、`fund`、`instructions` が見つからないエラー、または `can't find ... test`** → 2-3 で消し残したファイルか、Cargo.toml の `[[test]]` の節が残っている。2-3 をやり直す。

**Program ID が合わないというエラー** → `solana address -k target/deploy/stayvault-keypair.json` を打つ。`GJet47eJ…` 以外が出たら鍵が違うので、Mac のバックアップから置き直す。`anchor keys sync` で直そうとしない。

### デプロイ

**`insufficient funds`** → SOL 不足。3-2 の faucet を使う。

**`authority` が合わない** → 更新権限のない端末でデプロイしている。3-1 に戻る。

**更新権限を Mac の財布に移したい** → 今の更新権限のある端末で次を実行する。新しいアドレスは Mac で `solana address` を打って出た値をそのまま貼る。1文字でも違うと誰も更新できなくなる。移したら CLAUDE.md の行も直す。

```bash
solana program set-upgrade-authority GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG --new-upgrade-authority <Mac の solana address> --skip-new-upgrade-authority-signer-check --url devnet
```

### 通しテストと画面

**`Cannot find package '@solana/web3.js'` や `'@solana/spl-token'`** → 2-5 の `yarn add` をしていないか、`yarn install` していない。

**`ENOENT ... target/idl/stayvault.json`** → この端末で `anchor build` をしていないか、`~/stayvault` 以外で実行している。`pwd` で確かめる。

**`ENOENT ... app/wallet-demo.json`** → 4-1 を先にやる。

**通しテストで `❌ 2. release: 入居確認の前は払い出せない`** → エラーの種類が違う。ログに `Program GJet… failed` 以外の文言（アカウントが見つからない等）があれば、デプロイが済んでいないか、古いコードのまま。ステップ3をやり直す。

**`no record of a prior credit`** → 親役の SOL がない。4-1 をやり直す。

**localhost につながらない** → サーバーの窓が動いているか見る。駄目なら Ubuntu で `hostname -I` を打ち、`http://<出たアドレス>:8000/stayvault.html` を開く。

**Console に `StayVault escrow ready` が出ない** → `wallet-demo.json` か外部ライブラリ（esm.sh）の読み込みで止まっている。赤いエラーを Gemini に貼る。

**「まだ支払日ではありません」** → 10秒待って押し直す。待っても出るなら Console のエラーを見る。

---

## E. やってはいけないこと

- **push しないまま Mac に移る** → Mac は古い状態から作業を始め、あとで `CONFLICT` になる。
- **`git pull` せずにデプロイする** → Mac で直したコードが反映されないまま devnet に載る。
- **Gemini の「バージョンを上げれば直る」「下げれば直る」提案を受け入れる** → Mac とずれて、片方だけビルドが通らなくなる。
- **`anchor keys sync` で ID のエラーを直そうとする** → `lib.rs` の ID が別の値に書き換わり、デプロイ済みのプログラムとつながらなくなる。やってしまったら push せずに `git checkout programs/ Anchor.toml` で戻す。
- **`lib.rs` の命令の引数や順番だけを変える** → 画面と通しテストの組み立てとずれて、すべての取引が拒否される。変えるときは `stayvault.html` と `e2e-devnet.mjs` も同時に直す。
- **鍵ファイルの中身を Gemini に貼る、コミットする** → devnet でも、その鍵は二度と使わず作り直す。

---

## F. 用語集

| 用語 | 意味 |
| --- | --- |
| Program ID | デプロイしたプログラムの住所。`GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG` |
| 更新権限 | デプロイ済みのプログラムを更新できる権利。最初にデプロイした財布が持つ |
| エスクロー（Vault） | 親が入れたお金を、条件が満たされるまで預かっておく口座。プログラムが管理する |
| PDA | 秘密鍵を持たないプログラム専用の住所。プログラムのルールでしか動かせない |
| 署名 | 「この取引は財布の持ち主が許可した」ことを示すデータ。秘密鍵で作る |
| テスト用 USDC | devnet でだけ使う、自分で発行した価値のないトークン |
| IDL | プログラムの命令や口座の形を書いた設計図。`anchor build` で作られる |
| 通しテスト | `scripts/e2e-devnet.mjs`。devnet 上で5つの命令を順に試す |
| Explorer | チェーン上の取引を誰でも見られるウェブサイト |

---

詰まった箇所は D章に1行ずつ足していく。Mac 版の手順書にも同じ項目を足しておくと、どちらの端末で詰まってもすぐ引ける。
