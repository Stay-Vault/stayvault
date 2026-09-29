# StayVault デザイン刷新の手順（Windows・Gemini版）

最終更新: 2026年9月29日（文字を減らした版、配色 A1「Refined」）

**前提**: ホーム画面の更新手順（`docs/home-refresh-guide-windows.md`）を最後まで終え、公開済みであること。つまり今の公開デモのホーム画面は、段階表示（Deposited → Moved in → Paying weekly → Ends）、灰色の枠2つ、52マスの帯、紫の「Next payment」の枠、点線枠の「Demo controls」が並ぶ状態になっている。Windows（WSL2 の Ubuntu）で作業する。

**この手順書でやること**: `app/stayvault.html` を最新版に差し替え、全画面の見た目と文言を刷新して公開し直す。デモの流れ（ログイン → MetaMask 接続 → 寮の選択 → 期間 → 確認 → 支払い → ホーム）と、ボタンを押したときの動きは変わらない。

| 場所 | 今（前回の版） | この手順のあと |
| --- | --- | --- |
| 色 | 冷たい灰色の背景に紫 | 配色 A1「Refined」。わずかに温かい白（#FAF8F5）の背景、主役は澄んだ「Jacaranda」の紫（#6E56CF）、支払い済みは「Eucalyptus」の緑（#2E7D5B）。ダークモード用の配色も対にしてある |
| 書体 | 全体が Figtree | 見出しと数字に Bricolage Grotesque。本文は Figtree のまま |
| 文言 | 各画面に説明文 | Wise や Revolut のように最小限。見出しは短い一言（Prepay rent. Keep control.／Connect wallet／Choose a dorm／How long?／Review）で、説明文はほぼなくした。子どもの名前「Yuri」はホーム画面だけに出す |
| 金額 | USDC と AUD | 円の目安を添える（≈ ¥1.59M · 15,300 AUD）。¥158／USDC の概算と画面に明記。支払いボタンに金額を入れる（Pay 10,314.47 USDC） |
| ホームの主役 | 段階表示と横長の52マスの帯 | 1年分の52目盛りを円に並べた「金庫のダイヤル」。中央に残高、内側の針が次の支払い週を指し、支払いのたびに1目盛り進む |
| ホームの情報 | 灰色の枠、紫の枠、点線の枠 | 枠をやめ、区切り線の3行（Next payment／Paid to Stay-Dorm／Refundable now） |
| History | 「Explorer」の文字リンク | 取引ハッシュの短縮表示（例 `5xKq…9fQ2`）。押すと Explorer が開く |
| Demo controls | 点線の枠と2つのボタン | 画面下の1行の文字リンク（Demo · Pause · Next week） |
| 模擬の表示 | 点線の枠 | 点線の小さな丸と1行の文 |
| 上部 | 緑のバッジが2つ（Solana devnet、Live on devnet） | 右上の「● Solana devnet」1つだけ。ホームでは進捗バーも消える |
| パソコンで開いたとき | 画面の中央に縦長のカード | スマートフォンの枠の中にアプリ、右に審査員向けの説明パネル。「Last on-chain event」に、直前の取引の意味を平易な英語で出し、ハッシュから Explorer を開ける |

**変えないもの**: エスクローの命令を組み立てる部分（`window.SV = { ... }`）。前回の公開版から1文字も変えていない（D3 で確かめる）。プログラムの再ビルドや再デプロイは要らない。

**所要時間**: 45分前後。

**締切との関係**: 提出期限は 10/12 23:59 PT。main に入れた瞬間に公開デモが切り替わるので、D4 を手元で通してから main に入れる。技術デモ動画とピッチ動画の画面は、この版で撮り直す。

---

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| D1 | ブランチを切る | 5分 |
| D2 | 最新版のファイルを入れる | 5分 |
| D3 | 命令の組み立て部分が変わっていないことを確かめる | 5分 |
| D4 | 手元で動かして確かめる（スマートフォン幅とパソコン幅） | 20分 |
| D5 | README と CLAUDE.md を直す | 5分 |
| D6 | コミットして main に入れ、公開版を確かめる | 10分 |

---

## D1. ブランチを切る

作業前に、`main` に余計な変更が残っていないことを確かめる。

```bash
cd ~/stayvault
git checkout main && git pull
git status
```

`nothing to commit, working tree clean` と出れば問題ない。何かファイルが出たら、ここで止めて中身を確かめる（前回のように、財布更新など別の作業の変更が残っていることがある）。

```bash
git checkout -b feat/design-refresh
```

---

## D2. 最新版のファイルを入れる

Claude から受け取った2つのファイルを、Windows の「ダウンロード」フォルダに保存しておく。

- `stayvault.html`（最新版のデモ）
- `design-refresh-guide-windows.md`（この手順書）

同じ名前で何度も保存していると、Windows が `stayvault (1).html` のように番号を付ける。`ls $D` で一覧を見て、一番新しいものを使う。

```bash
D=/mnt/c/Users/<ユーザー名>/Downloads
ls -lt $D | head
cp $D/stayvault.html ~/stayvault/app/stayvault.html
cp $D/design-refresh-guide-windows.md ~/stayvault/docs/
```

`<ユーザー名>` は自分の Windows のユーザー名に置き換える（前回は `nkohara`）。

正しいファイルかどうかは、次で確かめられる。`Yuri` を含む行が表示されれば最新版。

```bash
grep -c "CHILD='Yuri'" ~/stayvault/app/stayvault.html
```

`1` と出れば正しい。`0` なら古いファイルなので、ダウンロードからやり直す。

---

## D3. 命令の組み立て部分が変わっていないことを確かめる

```bash
cd ~/stayvault
git show main:app/stayvault.html | sed -n '/window.SV = {/,/^};/p' > /tmp/sv-old.txt
sed -n '/window.SV = {/,/^};/p' app/stayvault.html > /tmp/sv-new.txt
diff /tmp/sv-old.txt /tmp/sv-new.txt && echo "SV unchanged"
```

`SV unchanged` とだけ出れば正しい。差分が出たら、別のファイルをコピーしている。D2 からやり直す。

---

## D4. 手元で動かして確かめる

1年分（約 10,300 USDC）を預けるので、公開用の財布で動かす。手元用の `wallet-demo.json` を一時的に外へ移す。

```bash
cd ~/stayvault
mv app/wallet-demo.json ~/wallet-demo.json.bak
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows 側の Chrome か Edge で `http://localhost:8000/` を開く。前の版（灰色の背景、または「Yuri's rent, kept safe」の見出し）が出たら `Ctrl + Shift + R` で再読み込みする。

### D4-1. パソコンの幅で見る

ブラウザを横に広げた状態（幅 960px 以上）で見る。

| 場所 | 期待する表示 |
| --- | --- |
| 全体 | 温かいベージュの背景に、黒い縁のスマートフォンの枠。右側に説明パネル |
| 説明パネル | 「Live demo on Solana devnet」「A parent in Japan prepays a year of rent in Brisbane.」、その下に「Last on-chain event」の枠（最初は Nothing yet）と「In this demo」の3行 |
| 右上 | 緑の点と「Solana devnet」。数秒たっても「Connecting to devnet…」のままなら「困ったとき」を見る |
| ログイン画面 | 大きな見出し「Prepay rent. Keep control.」、メールとパスワード、「Sign in」、小さく「Simulated sign-in」だけ |
| 書体 | 見出しが丸みと癖のある太字（Bricolage Grotesque）になっている。普通のゴシック体なら Google Fonts を読めていない |

### D4-2. 支払いまで進む

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 「Sign in」→「Connect」 | 寮の選択画面「Choose a dorm」。「Stay-Dorm」（300 AUD / week · until Sep 30, 2027）が選ばれている |
| 2 | 「Continue」 | 見出し「How long?」。「1 year」（52 payments）が選ばれ、下に「Dorm receives」15,600 AUD、「≈ ¥1.62M」、「Weekly from Mon, Oct 5」 |
| 3 | 「Review」 | 見出し「Review」と、区切り線の7行（Dorm、Period、Dorm receives、Rate、Fee、You pay、Refunds to）。「You pay」は 10,314.47 USDC、その下に小さく「≈ ¥1.63M」 |
| 4 | 「Pay 10,314.47 USDC」 | ボタンが「Locking rent in escrow…」から「Confirming move-in…」に変わる。10秒ほどでホームへ |

### D4-3. ホームを確かめる

| 場所 | 期待する表示 |
| --- | --- |
| 上部 | 「Yuri's rent · Stay-Dorm, Brisbane」。進捗バーは出ない |
| ダイヤル | 52目盛りの輪。一番上（Oct）の1目盛りが緑、次の目盛りが薄い紫で、内側の小さな三角の針がそれを指している。輪の外に Oct、Jan、Apr、Jul |
| ダイヤルの中央 | 「PROTECTED」、10,065.79、USDC、「≈ ¥1.59M · 15,300 AUD」 |
| ダイヤルの下 | 「Week 1 of 52 · Yuri moved in Oct 5」 |
| 3行 | Next payment「Mon, Oct 12 · 300 AUD」、Paid to Stay-Dorm「300 AUD」、Refundable now「10,065.79 USDC」 |
| History | 「Week 1 paid」と「Deposited」。右に等幅の文字でハッシュ（例 `5xKq…9fQ2`） |
| 下部 | 控えめな「Move out early」と、茶色の1行「Demo · Pause · Next week」 |
| 説明パネル | 「Last on-chain event」が「Week 1 paid」になり、枠が一瞬紫に光る |

### D4-4. 動きを確かめる

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 何もせず10秒待つ | 2目盛り目が緑になり、針が1目盛り進む（少し行き過ぎて戻る動き）。残高が減り、「Week 2 of 52」に。説明パネルが「Week 2 paid」に変わる |
| 2 | History のハッシュを押す | Solana Explorer の devnet で取引が開く。説明パネルのハッシュも同じ |
| 3 | 「Pause」→10秒待つ →「Next week」→「Resume」 | 止めている間は進まない。Next week で1目盛りだけ進み、Resume で自動に戻る |
| 4 | 「Move out early」→「Confirm move-out」 | 残りの目盛りが灰色になり、針が消える。中央が「CLOSED」「Refunded to MetaMask」。3行目が「Refunded」に変わる |

### D4-5. スマートフォンの幅で見る

`F12` を開き、`Ctrl + Shift + M` で「iPhone 12 Pro」などを選ぶ。説明パネルとスマートフォンの枠が消え、アプリが画面いっぱいに出ることを確かめる。ダイヤルが画面からはみ出さず、横スクロールが出ないことも見る。

### D4-6. ダークモード

Windows の「設定」→「個人用設定」→「色」→「モードを選ぶ」を「ダーク」にして再読み込みする。背景が濃い紫がかった黒（#16131E）になり、文字とダイヤルが読めることを確かめたら元に戻す。

すべて通ったら、サーバーの窓で `Ctrl + C` を押して止め、`wallet-demo.json` を元に戻す。

```bash
mv ~/wallet-demo.json.bak app/wallet-demo.json
```

---

## D5. README と CLAUDE.md を直す

### D5-1. README

README の状態表はそのままでよい。表の下に、次の1行を足す。審査員が円の金額を為替の実勢値と誤解しないようにするため。

```markdown
Yen amounts in the app are display estimates at ¥158 per USDC. The child's name ("Yuri") and the dorm ("Stay-Dorm", Brisbane) are fictional sample data.
```

### D5-2. CLAUDE.md

```bash
code CLAUDE.md
```

前回足した次の1行は、今回の画面と合わなくなった。

```
- ホーム画面の構成（段階表示、残高、Paid to dorm／Refundable now、52マスの帯、Next payment、History 2件、Move out early）は変えない
```

これを、次の4行に置き換える。

```
- ホーム画面の構成（52目盛りのダイヤルと中央の残高、区切り線の3行 Next payment／Paid to <寮>／Refundable now、History 2件と取引ハッシュ、Move out early、1行の Demo）は変えない。枠（カード）を増やさない
- 配色は A1「Refined」。Jacaranda（--jac #6E56CF、操作と現在地）と Eucalyptus（--euc #2E7D5B、支払い済み）の2色だけ。背景は --paper #FAF8F5。色は :root と html.dark の変数で変える
- 見出しと数字は Bricolage Grotesque（--display）、本文は Figtree。子どもの名前は CHILD='Yuri' で固定し、ホーム画面にだけ出す。ほかの画面は Wise／Revolut のように最小限の文字にし、説明文を足さない。円は JPY=158 の概算で、画面に概算と明記する
- パソコン幅（960px 以上）ではスマートフォンの枠と右の説明パネル（.aside）を出す。logTx には kind（deposit／movein／release／refund）を渡し、説明パネルの文を切り替える
```

前回足した「以後の支払いは自動。1回の自動再生は AUTO_BATCH（8週）で止める…」の行はそのまま残す。「Demo controls」枠という言い方は、画面下の「Demo」の1行を指すものとして読み替えてよい。

---

## D6. コミットして main に入れ、公開版を確かめる

```bash
cd ~/stayvault
git status
```

- 出てよい: `app/stayvault.html`、`README.md`、`CLAUDE.md`、`docs/design-refresh-guide-windows.md`
- 出てはいけない: `app/wallet-demo.json`、`app/demo-public.json`、`id.json`、`-keypair.json`、`-backup.json`

出てはいけないものが1つでもあれば、`add` せずに止める。

```bash
git add .
git commit -m "feat: vault dial home, jacaranda brand, parent-first copy and judge panel"
git push -u origin feat/design-refresh
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

1〜5分後、シークレットウィンドウ（`Ctrl + Shift + N`）で公開 URL を開き、D4-1 から D4-4 の #1 までをもう一度通す。灰色の背景の古い画面が出たら、GitHub Pages の反映がまだ。数分待って `Ctrl + Shift + R` で再読み込みする。

---

## 困ったとき

**見出しが普通のゴシック体になる** → Google Fonts を読めていない。`F12` の Network タブで `fonts.googleapis.com` が赤くなっていないか見る。社内ネットワークなどで止められていると起きる。機能には影響しない。

**ボタンや入力欄が素の HTML の見た目になる** → Basecoat の CSS（`cdn.jsdelivr.net`）を読めていない。上と同じく Network タブで確かめる。

**右上が「Devnet unavailable」になる** → `esm.sh` からの読み込みか、`demo-public.json` の読み込みに失敗している。Console の赤いエラーを見る。

**スマートフォンの枠と説明パネルが出ない** → ブラウザの幅が 960px 未満。ウィンドウを広げるか、`Ctrl + -` で表示を縮小する。

**パソコン幅で、アプリの中がスクロールできない** → スマートフォンの枠の中でマウスのホイールを回す。枠の外ではページ全体は動かない作りにしてある。

**赤い通知「Rent is in escrow, but move-in confirmation didn’t go through」** → 入金は済んでいる。ホームの「Demo」の行の「Next week」を押すと、入居確認をやり直せる。

**赤い通知「The deposit didn’t go through」** → 手元で `wallet-demo.json` を使っていると残高不足で失敗する。D4 のとおり外してから動かす。公開版で出るときは、公開デモ手順書の P9 のとおり `node scripts/check-demo.mjs` で残高を確かめる。

**前の画面に戻したい** → main にマージする前なら `git checkout main -- app/stayvault.html`。マージしたあとなら、GitHub でそのプルリクエストの「Revert」を押す。
