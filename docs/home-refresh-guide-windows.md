# StayVault ホーム画面の更新手順（Windows・Gemini版）

最終更新: 2026年9月29日

**前提**: 画面改修手順書（`docs/ui-refresh-guide-windows.md`）の「登録済みの寮 Stay-Dorm を追加、支払元の表示を MetaMask に変更」版を最後まで終え、公開済みであること。つまり今の公開デモのホーム画面は、「Advance to next rent day (demo)」ボタンで1週ずつ進め、下に「On-chain activity」が並ぶ状態になっている。Windows（WSL2 の Ubuntu）で作業する。

**この手順書でやること**: `app/stayvault.html` を最新版に差し替え、ホーム画面を作り直して公開し直す。ホーム以外の画面（ログイン、MetaMask の接続、寮の選択、期間、確認）は変わらない。

| 場所 | 今（前回の版） | この手順のあと |
| --- | --- | --- |
| 支払いボタンを押したあと | 入金だけ行い、ホームは「Waiting for move-in」から始まる | 入金に続けて寮の入居確認も送る。ホームは入居済み・1週目支払い済みから始まる |
| 週を進める方法 | 「Advance to next rent day (demo)」を押す。秒数が0になるまで押せない | 10秒ごとに自動で進む（8週分で自動停止） |
| デモ用の操作 | 大きなボタン2つ（進める、途中退去） | 最下部の点線枠「Demo controls」の Pause と Next week だけ。途中退去は控えめな「Move out early」 |
| 画面上部 | 状態のバッジ1つ | 「Deposited → Moved in → Paying weekly → Ends」の段階表示 |
| 残高 | 数字1つ | 残高の下に「Paid to dorm」と「Refundable now」を並べる |
| 帯 | 52マスを4段に並べる | 1段の52マスに、月のラベル（Oct 2026、Jan、Apr、Sep 2027） |
| 次の支払い | 「Next rent day in ○s」 | 「Next payment: Mon, Oct 12 · 300 AUD to Stay-Dorm」のように実際の日付 |
| 取引の履歴 | 「On-chain activity」に全件 | 「History」に新しい2件。古いものは「Show ○ earlier」で開く |
| 途中退去 | 押すとすぐ返金 | 「寮に残る額」と「MetaMask に戻る額」を見せる確認の枠を1枚はさむ |

**変えないもの**: エスクローの命令を組み立てる部分（`window.SV = { ... }`）。前回の公開版から1文字も変えていない（H3 で確かめる）。プログラムの再ビルドや再デプロイは要らない。

**所要時間**: 40分前後。

**締切との関係**: 提出期限は 10/12 23:59 PT。main に入れた瞬間に公開デモが切り替わるので、H4 を手元で通してから main に入れる。技術デモ動画はこの版で撮る。

---

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| H1 | ブランチを切る | 5分 |
| H2 | 最新版のファイルを入れる | 5分 |
| H3 | 命令の組み立て部分が変わっていないことを確かめる | 5分 |
| H4 | 手元で動かして確かめる | 15分 |
| H5 | README と CLAUDE.md を直す | 5分 |
| H6 | コミットして main に入れ、公開版を確かめる | 10分 |

---

## H1. ブランチを切る

```bash
cd ~/stayvault
git checkout main && git pull
git checkout -b feat/home-refresh
```

途中で Mac に切り替えるときは、先に `git push -u origin feat/home-refresh` で push してから移る。

---

## H2. 最新版のファイルを入れる

Claude から受け取った3つのファイルを、Windows の「ダウンロード」フォルダに保存しておく。

- `stayvault.html`（最新版のデモ）
- `ui-refresh-guide-windows.md`（画面改修手順書の最新版。確認の表を新しい動きに合わせてある）
- `home-refresh-guide-windows.md`（この手順書）

`<ユーザー名>` を自分の Windows のユーザー名に置き換えて実行する。わからなければ `ls /mnt/c/Users/` で確かめる。

```bash
D=/mnt/c/Users/<ユーザー名>/Downloads
cp $D/stayvault.html ~/stayvault/app/stayvault.html
cp $D/ui-refresh-guide-windows.md ~/stayvault/docs/
cp $D/home-refresh-guide-windows.md ~/stayvault/docs/
```

ダウンロードを繰り返すと、Windows が `stayvault (1).html` のように名前を変えて保存することがある。`cp` で「No such file」と出たら、`ls $D` で実際の名前を確かめ、一番新しいものをコピーする。

---

## H3. 命令の組み立て部分が変わっていないことを確かめる

```bash
cd ~/stayvault
git show main:app/stayvault.html | sed -n '/window.SV = {/,/^};/p' > /tmp/sv-old.txt
sed -n '/window.SV = {/,/^};/p' app/stayvault.html > /tmp/sv-new.txt
diff /tmp/sv-old.txt /tmp/sv-new.txt && echo "SV unchanged"
```

`SV unchanged` とだけ出れば正しい。差分が出たら、古いファイルか別のファイルをコピーしている。H2 からやり直す。

---

## H4. 手元で動かして確かめる

1年分（約 10,300 USDC）を一度に預けるので、手元用の `wallet-demo.json`（10,000 USDC）では足りない。公開用の財布で動かすため、一時的に外へ移す。

```bash
cd ~/stayvault
mv app/wallet-demo.json ~/wallet-demo.json.bak
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows 側の Chrome か Edge で `http://localhost:8000/` を開き、`F12` で Console を開いておく。ホームで「Advance to next rent day (demo)」のボタンが出たら古い版が残っている。`Ctrl + Shift + R` で再読み込みする。

### H4-1. ホームまで進む

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 「Sign in」→「Allow connection」→「Continue」→「Review」 | 確認画面に「1 year (52 weeks, every Monday)」、支払額 10,314.47 USDC |
| 2 | 「Pay from MetaMask」を押す | ボタンの表示が「Locking rent in escrow…」から「Confirming move-in…」に変わる。devnet に2回送るので10秒ほどかかる |

### H4-2. ホームが見本の画像と同じか

ホームに移った直後に、次の点を見る。

| 場所 | 期待する表示 |
| --- | --- |
| 段階表示 | 「Deposited」「Moved in」に緑のチェック、「Paying weekly」が紫で現在地、「Ends」は灰色 |
| 残高 | 10,065.79 USDC |
| 2つの枠 | 「Paid to dorm」300 AUD（1 of 52 weeks）、「Refundable now」10,065.79 USDC（If you move out） |
| 帯 | 1マス目が緑、2マス目が紫の枠。下に Oct 2026、Jan、Apr、Sep 2027 |
| Next payment | 「Mon, Oct 12 · 300 AUD to Stay-Dorm」「Paid automatically. Nothing to do.」 |
| History | 「Moved in · week 1 paid · 300 AUD」と「Deposited 10,263.16 USDC」の2行。それぞれに「Explorer」 |
| 下部 | 「Move out early」ボタンと、点線枠の「Demo controls」（Pause、Next week） |

「Deposited」の行の日付は、操作した日（今日）になる。見本の画像で Sep 29 になっているのは、その日に撮ったため。

### H4-3. 動きを確かめる

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 何もせず10秒ほど待つ | 2週目が自動で払われる。残高が減り、2マス目が緑、「Next payment」が Mon, Oct 19 に進む。History の一番上に「Week 2 paid」が増え、下に「Show 1 earlier」が出る |
| 2 | さらに10秒待つ | 3週目が払われ、「Show 2 earlier」に変わる。押すと古い行も開く |
| 3 | 「Pause」を押し、10秒以上待つ | 支払いが進まない。ボタンが「Resume」に、Next payment の下が「Paused in this demo.」に変わる |
| 4 | 「Next week」を押す | 1週分だけ進む。数秒待たされることがある（プログラム上の支払日を待っている） |
| 5 | 「Resume」を押す | 自動で進むのが再開する |
| 6 | 「Move out early」→「Confirm move-out」 | 確認の枠に「Stays with the dorm」と「Back to your MetaMask」の額が出る。確定すると残りのマスが斜線になり、段階表示の最後が「Ended」、Demo controls が消える |
| 7 | History の「Explorer」を2〜3件開く | Solana Explorer の devnet で取引が表示される |

すべて通ったら、サーバーの窓で `Ctrl + C` を押して止め、`wallet-demo.json` を元に戻す。

```bash
mv ~/wallet-demo.json.bak app/wallet-demo.json
```

---

## H5. README と CLAUDE.md を直す

### H5-1. README の状態表

```bash
code README.md
```

「What is live and what is simulated」の表の `Timing` の行（今は `One week = 10 seconds, so judges can see several payments in a minute` と書いてある行）を、次の1行に差し替える。

```markdown
| Timing | Shortened for the demo | One week = 10 seconds. The demo assumes the child has already moved in, so the dorm's move-in confirmation (with week 1) is sent right after the deposit. Payments then run by themselves (up to 8 weeks per run), just as they would on real rent days. "Demo controls" (Pause, Next week) only exist for this demo |
```

### H5-2. CLAUDE.md

```bash
code CLAUDE.md
```

前回「ハッカソンMVPの範囲」の節に足した4行のうち、4行目に「On-chain activity」という古い名前が残っている。次の1行を探す。

```
- 模擬の画面には sim-note（Simulated）を付ける。本物の取引は logTx で On-chain activity に記録し、Explorer リンクを出す
```

これを、次の4行に置き換える。Gemini や Claude Code が今後ホーム画面に大きなボタンを戻したり、自動再生の上限を増やしたりしないようにするため。

```
- 模擬の画面には sim-note（Simulated）を付ける。本物の取引は logTx で History に記録し、Explorer リンクを出す
- デモでは入金の直後に入居確認（confirmAndRelease）を送り、ホームは入居済み・1週目支払い済みから始める
- 以後の支払いは自動。1回の自動再生は AUTO_BATCH（8週）で止める。公開用デモ財布の devnet SOL を守るためなので、増やさない。デモ用の操作は「Demo controls」枠の Pause と Next week だけに置き、ほかに進めるボタンを作らない
- ホーム画面の構成（段階表示、残高、Paid to dorm／Refundable now、52マスの帯、Next payment、History 2件、Move out early）は変えない
```

`GEMINI.md` は前回足した1行（画面は英語・Basecoat のまま保つ）のままでよい。

---

## H6. コミットして main に入れ、公開版を確かめる

```bash
cd ~/stayvault
git status
```

- 出てよい: `app/stayvault.html`、`README.md`、`CLAUDE.md`、`docs/ui-refresh-guide-windows.md`、`docs/home-refresh-guide-windows.md`
- 出てはいけない: `app/wallet-demo.json`、`id.json`、`-keypair.json`、`-backup.json`

出てはいけないものが1つでもあれば、`add` せずに止める。

```bash
git add .
git commit -m "feat: home screen with auto-paid weeks, dated schedule and demo controls"
git push -u origin feat/home-refresh
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

1〜5分後、シークレットウィンドウ（`Ctrl + Shift + N`）で公開 URL を開き、H4-1 から H4-3 の #1 までをもう一度通す。ホームに「Advance to next rent day (demo)」が出たら、GitHub Pages の反映がまだ。数分待って `Ctrl + Shift + R` で再読み込みする。

---

## 困ったとき

**「Pay from MetaMask」のあと、赤い通知「Rent is in escrow, but move-in confirmation didn’t go through」が出る** → 入金は済んでいて、入居確認の送信だけ失敗している。ホームに移っているので、Demo controls の「Next week」を押すと入居確認をやり直せる。

**赤い通知「The deposit didn’t go through」が出る** → 手元で `wallet-demo.json` を使っていると残高不足で失敗する。H4 のとおり外してから動かす。公開版で出るときは、公開デモ手順書の P9 のとおり `node scripts/check-demo.mjs` でデモ財布の残高を確かめる。

**自動で進まない** → Demo controls のボタンが「Resume」になっていないか見る。8週分進むと自動で止まる仕様で、ブラウザのタブを切り替えたときも止まる（戻ると再開する）。

**ボタンや入力欄が素の HTML の見た目になる** → Basecoat の CSS を読めていない。`F12` の Network タブで `basecoat.cdn.min.css` が赤くなっていないか見る。社内ネットワークなどで `cdn.jsdelivr.net` が止められていると起きる。

**前の画面に戻したい** → main にマージする前なら `git checkout main -- app/stayvault.html`。マージしたあとなら、GitHub でそのプルリクエストの「Revert」を押す。
