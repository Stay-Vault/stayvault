# StayVault 画面改修 手順書（Windows・Gemini版）

最終更新: 2026年9月29日（登録済みの寮「Stay-Dorm」を追加、支払元の表示を MetaMask に変更、ホーム画面を自動再生つきに作り直し）

**対象読者**: 公開デモ手順書（`public-demo-guide-windows.md`）まで終え、GitHub Pages でデモを公開済みの人。Windows（WSL2 の Ubuntu）で作業する。

**この手順書で作るもの**: `app/stayvault.html` を改修版に差し替え、次の4点を反映した状態で公開し直す。

| 変更 | 内容 | 審査との関係 |
| --- | --- | --- |
| 英語化 | 画面の文言をすべて英語にする | 公式ルール第12条(a)(i)「全コンテンツは英語」 |
| Explorer リンク | 取引ごとに「View on Solana Explorer」を画面に出す。ホームの取引履歴（History）の各行にも出す | UX（ブロックチェーンを活かしたUX）、透明性 |
| 処理中の表示 | 送金中はボタンにスピナーを出し、他のボタンを押せなくする | devnet の待ち時間で固まって見えるのを防ぐ |
| ホーム画面の作り直し | 入居確認と毎週の支払いが自動で進む。段階表示、残高と「寮に支払い済み／今退去したら戻る額」、1年分の帯、次の支払日（実際の日付）、履歴を1画面にまとめる。進めるボタンは「Demo controls」に移して目立たなくする | 「期日に自動で払われ、残りは守られている」という価値を、説明なしで見てわかるようにする |
| 模擬の明示 | ログイン、MetaMask の接続、AUD 着金に「Simulated」の表示を付ける。本物の取引には「Live on Solana devnet」 | 本物と模擬の境界を審査員が一目でわかる |

見た目は Basecoat 1.0.2（shadcn/ui の見た目を React なしで使えるライブラリ）で整える。CDN のファイルを1行読み込むだけで、ビルドも Tailwind も要らない。単一 HTML・ビルドなしの構成はそのまま。

**変えないもの**: エスクローの命令を組み立てる部分（`window.SV = { ... }`）。引数とアカウントの並びは1文字も変えていない。変わったのはコメントの英訳と、最後に「準備完了」を画面に知らせる2行だけ。プログラムの再ビルドや再デプロイは要らない。

**この手順書の限界**: 改修版は、送金部分を模擬に置き換えたブラウザで画面の流れ（入力 → 支払い → 支払日を進める → 途中退去）を通してある。ただし、Basecoat を CDN から読み込んだ状態の見た目と、devnet への実際の送金は、まだ確かめていない（未検証）。U3 と U4 が通った時点で確認済みになる。

**所要時間**: 1時間前後。

**締切との関係**: 提出期限は 10/12 23:59 PT。main に入れた瞬間に公開デモが切り替わるので、U3・U4 を手元で通してから main に入れる。遅くとも 10/8 ごろまでに済ませ、デモ動画の撮り直しに間に合わせる。

---

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| U1 | ブランチを切る | 5分 |
| U2 | 改修版のファイルを入れる | 10分 |
| U3 | 手元で動かして確かめる | 20分 |
| U4 | 見た目を確かめる（ダークモード・スマホ幅） | 10分 |
| U5 | README に機能別の状態表を足す | 10分 |
| U6 | CLAUDE.md・GEMINI.md に書き足す | 5分 |
| U7 | コミットして main に入れ、公開版を確かめる | 10分 |

---

## U1. ブランチを切る

```bash
cd ~/stayvault
git checkout main && git pull
git checkout -b feat/ui-refresh
```

途中で Mac に切り替えるときは、エスクロー実装手順書の B章と同じ手順で、このブランチを push してから移る（`git push -u origin feat/ui-refresh`）。Gemini が別のブランチ名を勧めてきても、`feat/ui-refresh` の1本で進める。

---

## U2. 改修版のファイルを入れる

### U2-1. Windows のダウンロードフォルダから WSL へコピーする

Claude から受け取った `stayvault.html` と `ui-refresh-guide-windows.md`（この手順書）は、Windows の「ダウンロード」フォルダに保存されている。Ubuntu からは `/mnt/c/Users/<Windowsのユーザー名>/Downloads/` で見える。

```bash
ls /mnt/c/Users/
```

一覧に出た自分のユーザー名を使って、次のようにコピーする。`<ユーザー名>` は自分のものに置き換える。

```bash
cp /mnt/c/Users/<ユーザー名>/Downloads/stayvault.html ~/stayvault/app/stayvault.html
cp /mnt/c/Users/<ユーザー名>/Downloads/ui-refresh-guide-windows.md ~/stayvault/docs/
```

古い `stayvault.html` は上書きされるが、Git に残っているので、いつでも `git checkout main -- app/stayvault.html` で戻せる。

### U2-2. 命令の組み立て部分が変わっていないことを確かめる

CLAUDE.md の決まりで、命令の引数やアカウントの並びを変えたら `scripts/e2e-devnet.mjs` も合わせる必要がある。今回は変えていないことを、差分で確かめる。

```bash
cd ~/stayvault
git show main:app/stayvault.html | sed -n '/window.SV = {/,/^};/p' > /tmp/sv-old.txt
sed -n '/window.SV = {/,/^};/p' app/stayvault.html > /tmp/sv-new.txt
diff /tmp/sv-old.txt /tmp/sv-new.txt
```

出てくる差分が、`//` から後ろ（コメント）の日本語が英語になった3行だけなら正しい。`acc(` や `dv.set` で始まる部分に差分が出たら、ファイルが壊れているので U2-1 からやり直す。

---

## U3. 手元で動かして確かめる

改修版では、寮「Stay-Dorm」が最初から1件登録されている。期間は1年（52週）、家賃は週 300 AUD、振込先は C-Bank（BSB 482-731、口座番号 60517294。どちらも架空の番号）。審査員はログインのあと、寮の入力をせずに支払いまで進める。

1年分を一度に預けるので、入金額は約 10,300 USDC になる。公開用のデモ財布（`demo-public.json`）には 1億 USDC 入っているので問題ないが、手元用の `wallet-demo.json` は 10,000 USDC しかなく足りない。そのため、支払いまで試すときは必ず下のとおり `wallet-demo.json` を外して、公開用の財布で動かす。

公開版と同じ条件で確かめるため、公開デモ手順書の P4 と同じく `wallet-demo.json` を一時的に外へ移す。

```bash
cd ~/stayvault
mv app/wallet-demo.json ~/wallet-demo.json.bak
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows 側の Chrome か Edge で `http://localhost:8000/` を開き、`F12` で Console を開いておく。

### U3-1. 読み込みの確認

- 右上のバッジが「Connecting to devnet…」から数秒で緑の「Solana devnet」に変わる
- Console に `demo config: ./demo-public.json` と `StayVault escrow ready:` が出る
- ボタンや入力欄が、角丸で紫のボタン、枠付きの入力欄になっている（Basecoat が読めている）

バッジが「Devnet unavailable」になったら「困ったとき」を見る。

### U3-2. 通しの流れ

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 「Sign in」を押す | ウォレットの接続画面に進み、MetaMask が選ばれている。黄色の点線枠で「Simulated.」と出ている |
| 2 | 「Allow connection」を押す | 寮の選択画面に進む。登録済みの「Stay-Dorm」（週 300 AUD、C-Bank、2027年9月30日退去）が選ばれている |
| 3 | 「+ Add another dorm」→ 何も入れずに「Add dorm」 | 未入力の欄が赤くなり、赤い通知が出る。左上の戻るボタンで選択画面に戻る |
| 4 | 「Continue」を押す | 期間の画面の選択肢が 1 month／3 months／6 months／1 year の4つで、「1 year」（52 weekly payments）が選ばれている。合計 15,600 AUD |
| 5 | 「Review」を押す | 確認画面に「1 year (52 weeks, every Monday)」、エスクロー入金額 10,263.16 USDC、手数料 51.32 USDC、支払額 10,314.47 USDC と出る。支払元と返金先は MetaMask |
| 6 | 「Pay from MetaMask」を押す | ボタンにスピナーと「Locking rent in escrow…」、続いて「Confirming move-in…」。devnet に取引が2回送られるので10秒ほどかかる。ホームに移ると、段階表示は「Deposited」「Moved in」に緑のチェック、「Paying weekly」が現在地。帯の1マス目が緑で、History に「Moved in · week 1 paid」と「Deposited」の2行 |
| 7 | 画面下の通知の「View on Explorer」を押す | Solana Explorer の devnet で取引が開く |
| 8 | ホームで何もせず10秒ほど待つ | 2週目が自動で支払われる。「Next payment」が「Mon, Oct 19 · 300 AUD to Stay-Dorm」に進み、History の上に「Week 2 paid」が増える |
| 9 | さらに30秒ほど待つ | 約10秒ごとに1週分が自動で支払われる。残高が減り、マスが緑になり、History の上に行が増える（表示は新しい2件。古いものは「Show ○ earlier」で開く）。8週分進むと自動で止まり、Demo controls に案内が出る |
| 9b | Demo controls の「Pause」→「Next week」→「Resume」 | 止めている間は自動で進まない。「Next week」を押すと1週分だけ進む（支払日が来るまで数秒待つことがある）。「Resume」で自動に戻る |
| 10 | 「Move out early」→ 確認の枠で「Confirm move-out」 | 確認の枠に「寮に残る額」と「MetaMask に戻る額」が出る。確定すると残りのマスが斜線になり、段階表示の最後が「Ended」に変わる。Demo controls は消える |
| 11 | History の各「Explorer」を開く | すべて Explorer に表示される |

11 まで通ったら、サーバーの窓で `Ctrl + C` を押して止め、`wallet-demo.json` を元に戻す。

```bash
mv ~/wallet-demo.json.bak app/wallet-demo.json
```

---

## U4. 見た目を確かめる

U3 のサーバーをもう一度動かして確かめる。`wallet-demo.json` を戻したあとの状態では、1年分の支払いは残高不足で失敗する。U4 では見た目だけを見て、「Pay from MetaMask」は押さない。ホーム画面まで見たいときは、U3 と同じく `wallet-demo.json` を外してから動かす。

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

### U4-1. スマートフォンの幅

`F12` を開いた状態で `Ctrl + Shift + M` を押すと、スマートフォンの幅で表示できる。上の機種選択で「iPhone 12 Pro」などを選び、全画面を1周する。次の点を見る。

- 横スクロールが出ない
- 画面下の通知が画面からはみ出さない
- ボタンが指で押せる大きさになっている

### U4-2. ダークモード

Windows の「設定」→「個人用設定」→「色」→「モードを選ぶ」を「ダーク」にして、ページを再読み込みする。文字が背景に沈んでいないか、「Simulated」の枠が読めるかを見る。確かめたら元に戻す。

見た目で気になった点があれば、色は `<style>` の先頭にある `:root{ ... }`（ライト）と `html.dark{ ... }`（ダーク）の値だけを直す。ボタンや入力欄の形そのものは Basecoat が決めているので、個別の CSS を足すより、この色の値を変えるほうが崩れにくい。

---

## U5. README に機能別の状態表を足す

審査員が「どこまで本当に動くのか」を探さなくて済むよう、README の Live demo の節の手順（1〜5）のすぐ下に、次の表をそのまま貼る。規約に合わせて英語にしてある。

```bash
code README.md
```

```markdown
### What is live and what is simulated

| Part | Status | Notes |
| --- | --- | --- |
| Escrow deposit, weekly release, early move-out refund | Live on Solana devnet | Anchor program `GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG`. Every step links to Solana Explorer in the app |
| Move-in confirmation | Live on Solana devnet | Signed by the operator's demo wallet together with the first release |
| Sign-in and account creation | Simulated | No accounts are stored |
| Wallet connection (MetaMask) | Simulated | MetaMask does not open. A devnet demo wallet signs in its place, so judges need no wallet or test tokens |
| AUD payout to the dorm | Simulated | The operator receives test USDC on devnet. The AUD amount is displayed only. Production needs a licensed Australian off-ramp partner |
| Sample dorm | Pre-filled | "Stay-Dorm" (300 AUD a week, 1 year, bank C-Bank) is registered so judges can go straight to payment. Bank details are fictional |
| Timing | Shortened for the demo | One week = 10 seconds. The demo assumes the child has already moved in, so the dorm's move-in confirmation (with week 1) is sent right after the deposit. Payments then run by themselves (up to 8 weeks per run), just as they would on real rent days. "Demo controls" (Pause, Next week) only exist for this demo |
```

README の「Open the browser console to see a Solana Explorer link for every transaction.」の1文は、画面に出るようになったので次に書き換える。

```markdown
Every transaction shows a "View on Solana Explorer" link in the app.
```

---

## U6. CLAUDE.md・GEMINI.md に書き足す

次に Gemini や Claude Code がこのファイルを触るとき、Basecoat を外したり、日本語に戻したりしないよう、決まりを足す。

`CLAUDE.md` の「ハッカソンMVPの範囲」の節の最後に、次の4行を足す。

```
- 画面の文言は英語（公式ルール第12条）。日本語に戻さない
- 見た目は Basecoat 1.0.2 の CDN（basecoat.cdn.min.css）で整える。Tailwind やビルドは入れない。色は :root と html.dark の変数で変える
- 画面の DEMO_WEEK_MS（ミリ秒）と、module 内の DEMO_INTERVAL（秒）は同じ長さにそろえる
- ホーム画面の毎週の支払いは自動で進む。1回の自動再生は AUTO_BATCH（8週）で止める。公開用デモ財布の devnet SOL を守るためなので、増やさない
- 模擬の画面には sim-note（Simulated）を付ける。本物の取引は logTx で History に記録し、Explorer リンクを出す
```

`GEMINI.md` の「とくに次の4点」の一覧の最後に、次の1行を足す。

```
- 画面は英語・Basecoat のまま保つ（詳細は CLAUDE.md の MVP の範囲）
```

---

## U7. コミットして main に入れ、公開版を確かめる

```bash
cd ~/stayvault
git status
```

一覧を1行ずつ確かめる。

- 出てよい: `app/stayvault.html`、`README.md`、`CLAUDE.md`、`GEMINI.md`、`docs/ui-refresh-guide-windows.md`
- 出てはいけない: `app/wallet-demo.json`、`id.json`、`-keypair.json`、`-backup.json`

出てはいけないものが1つでもあれば、`add` せずに止める。

```bash
git add .
git commit -m "feat: English UI with Basecoat, Explorer links and loading states"
git push -u origin feat/ui-refresh
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

GitHub Pages は main から公開しているので、設定は触らなくてよい。1〜5分後、シークレットウィンドウ（`Ctrl + Shift + N`）で公開 URL を開き、U3-2 の表をもう一度通す。古い日本語の画面が出たら、`Ctrl + Shift + R` で再読み込みする。

---

## Gemini に頼むときの書き方

この先、画面の文言や色を Gemini に直してもらうときは、最初に次の一文を付ける。命令の組み立て部分を触られる事故を防ぐためだ。

```
app/stayvault.html の <script type="module"> の中（window.SV の部分）は変更しないでください。
変えてよいのは <style> と、1つ目の <script> の画面表示の部分だけです。
画面の文言は英語のままにしてください。
```

直してもらったあとは、U2-2 の差分確認を毎回やる。

---

## 困ったとき

**ボタンや入力欄が素の HTML の見た目になる** → Basecoat の CSS を読めていない。`F12` の Network タブで `basecoat.cdn.min.css` が赤くなっていないか見る。社内ネットワークなどで `cdn.jsdelivr.net` が止められていると起きる。自宅の回線やスマートフォンのテザリングで開き直す。

**右上が「Devnet unavailable」になる** → `esm.sh` からの読み込みか、`demo-public.json` の読み込みに失敗している。Console の赤いエラーを見る。`Neither wallet-demo.json nor demo-public.json was found` と出ていれば、`app/demo-public.json` がない（公開デモ手順書の P6）。前の日本語版では同じエラーが「wallet-demo.json も demo-public.json も見つかりません」と出ていた。

**毎週の支払いが自動で進まない** → Demo controls のボタンが「Resume」になっていないか見る。8週分進むと自動で止まる仕様で、ブラウザのタブを切り替えたときも止まる（戻ると再開する）。赤い通知「A weekly payment didn’t go through」が出たときは止まっているので、「Next week」か「Resume」で再開する。直らなければ、ページを再読み込みして最初からやり直す。

**動きが出ない（残高が一気に切り替わる、マスが弾まない）** → Windows の「設定」→「アクセシビリティ」→「視覚効果」→「アニメーション効果」がオフになっていると、画面の動きをすべて止める作りにしてある。数字と帯の色は変わるので、機能には影響しない。

**支払うと赤い通知「The deposit did not go through」が出る** → 手元で `wallet-demo.json` を使っていると、1年分（約 10,300 USDC）に対して残高 10,000 USDC で足りない。U3 のとおり `wallet-demo.json` を外して動かす。公開版で出るときは、デモ財布の残高切れが多い。公開デモ手順書の P9 のとおり `node scripts/check-demo.mjs` で残高を確かめる。

**前の画面に戻したい** → `git checkout main -- app/stayvault.html` で main の版に戻る（main にマージする前なら改修前の版）。main にマージしたあとなら、GitHub でそのプルリクエストの「Revert」を押す。
