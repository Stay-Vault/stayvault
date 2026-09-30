# StayVault MetaMask ロゴ追加の手順（Windows・Gemini版）

最終更新: 2026年9月30日（公式ロゴの SVG をダウンロードフォルダに置いた状態から進める版）

**前提**: ロゴ追加の手順（`docs/logo-guide-windows.md`、最終版 1b「屋根の輪」）を最後まで終え、公開済みであること。Windows（WSL2 の Ubuntu）で作業する。

**この手順書でやること**: MetaMask の公式ロゴ（キツネのマーク）を公式サイトからダウンロードしてリポジトリに置き、デモの2か所に表示する。

| 場所 | 変更前 | 変更後 |
| --- | --- | --- |
| ウォレット接続画面の「MetaMask」 | 文字だけ | 文字の左に MetaMask のロゴ（28px） |
| 確認画面の「Refunds to」 | 「MetaMask」の文字だけ | 文字の左に MetaMask のロゴ（16px） |

**ロゴのファイルについて**: MetaMask のロゴは Consensys の商標で、HTML の中には描いていない。`stayvault.html` は `app/brand/partners/metamask-fox.svg` というファイルを読み込むだけにしてある。このファイルは、必ず MetaMask の公式サイトから自分でダウンロードして置く。ファイルが置かれていないときは、ロゴの枠ごと消えて、今までどおり文字だけが表示される。

**変えないもの**: デモの流れと動き、エスクローの命令を組み立てる部分（`window.SV = { ... }`）。署名は今までどおりデモ用の財布で行い、MetaMask は開かない（表示だけ）。

**所要時間**: 25分前後。

---

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| M1 | ブランチを切る | 3分 |
| M2 | MetaMask の公式ロゴがダウンロードフォルダにあることを確かめる | 3分 |
| M3 | ファイルを入れる | 7分 |
| M4 | 命令の組み立て部分が変わっていないことを確かめる | 2分 |
| M5 | 手元で見た目を確かめる | 5分 |
| M6 | README に商標の表記を足し、コミットして公開する | 5分 |

---

## M1. ブランチを切る

```bash
cd ~/stayvault
git checkout main && git pull
git status
```

`nothing to commit, working tree clean` と出てから次に進む。

```bash
git checkout -b feat/metamask-logo
```

---

## M2. MetaMask の公式ロゴがダウンロードフォルダにあることを確かめる

MetaMask の公式サイト（`https://metamask.io/assets`）からダウンロードした、キツネのマークだけの SVG を、Windows の「ダウンロード」フォルダに直接置いてある前提で進める。まだなら、公式サイトから、文字の「MetaMask」が付いていないキツネのマークだけの SVG をダウンロードして、ダウンロードフォルダに置く。非公式の配布サイトや画像検索で見つけたロゴは使わない。

ダウンロードフォルダにある SVG を、新しい順に一覧にする。

```bash
D=/mnt/c/Users/nkohara/Downloads
ls -lt $D/*.svg | head
```

`nkohara` は Windows のユーザー名。違う場合は自分の名前に置き換える。

一覧の中から、MetaMask のキツネのロゴのファイルを探す。名前に「metamask」や「fox」が入っていることが多い。次のものは StayVault のロゴなので、間違えないようにする。

- `stayvault-` で始まるファイル
- `favicon.svg`

名前に「metamask」を含むファイルだけを探したいときは、次でもよい。

```bash
ls -lt $D/*.svg | grep -i -E 'metamask|fox'
```

---

## M3. ファイルを入れる

### M3-1. MetaMask のロゴをコピーする

M2 で見つけたファイル名を `<見つけたファイル名>` に入れて実行する。名前に空白や括弧が含まれていても動くよう、`"` で囲んである。

```bash
mkdir -p ~/stayvault/app/brand/partners
cp "$D/<見つけたファイル名>.svg" ~/stayvault/app/brand/partners/metamask-fox.svg
ls ~/stayvault/app/brand/partners
```

最後の `ls` で `metamask-fox.svg` と出れば正しい。コピー先の名前は必ず `metamask-fox.svg` にする（`stayvault.html` がこの名前で読み込むため）。ダウンロードしたファイルの名前がもともと `metamask-fox.svg` なら、`<見つけたファイル名>` に `metamask-fox` を入れる。

### M3-2. 中身が MetaMask のロゴか確かめる

```bash
head -c 100 ~/stayvault/app/brand/partners/metamask-fox.svg; echo
explorer.exe "$(wslpath -w ~/stayvault/app/brand/partners/metamask-fox.svg)"
```

1行目で `<svg` か `<?xml` が見えれば、中身は SVG。2行目で Windows のブラウザなどが開き、キツネのマークが表示されれば正しい。StayVault のロゴや別の画像が開いたら、M3-1 のファイル名を選び直す。

### M3-3. デモと手順書をコピーする

Claude から受け取った次の2つも、ダウンロードフォルダに保存しておく。

- `stayvault.html`（MetaMask のロゴの枠を足した版）
- `metamask-logo-guide-windows.md`（この手順書）

```bash
cp $D/stayvault.html ~/stayvault/app/stayvault.html
cp $D/metamask-logo-guide-windows.md ~/stayvault/docs/
```

同じ名前で何度も保存していると、Windows が `stayvault (1).html` のように番号を付ける。`ls -lt $D | head` で一番新しいものを確かめてからコピーする。

最新版の `stayvault.html` かどうかは、次で確かめる。

```bash
grep -c 'metamask-fox.svg' ~/stayvault/app/stayvault.html
grep -c '1b Roof shackle' ~/stayvault/app/stayvault.html
```

`2` と `1` が出れば正しい。`metamask-fox.svg` の数が `0` なら古いファイルなので、MetaMask のロゴの枠を足したときの返信に添付された `stayvault.html` をダウンロードし直す。

---

## M4. 命令の組み立て部分が変わっていないことを確かめる

```bash
cd ~/stayvault
git show main:app/stayvault.html | sed -n '/window.SV = {/,/^};/p' > /tmp/sv-old.txt
sed -n '/window.SV = {/,/^};/p' app/stayvault.html > /tmp/sv-new.txt
diff /tmp/sv-old.txt /tmp/sv-new.txt && echo "SV unchanged"
```

`SV unchanged` とだけ出れば正しい。

---

## M5. 手元で見た目を確かめる

1年分の支払いまでは進まないので、`wallet-demo.json` を外す必要はない。

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows 側の Chrome か Edge で `http://localhost:8000/` を開く。

| # | 操作 | 期待する結果 |
| --- | --- | --- |
| 1 | 「Sign in」を押す | ウォレット接続画面で、「MetaMask」の文字の左にキツネのロゴ。選択肢の枠からはみ出していない |
| 2 | 「Connect」→「Continue」→「Review」 | 確認画面の「Refunds to」の行で、「MetaMask」の文字の左に小さなキツネのロゴ |
| 3 | ダークモードで再読み込み | ロゴが背景に沈まずに見える |

ロゴが出ないときは「困ったとき」を見る。

確かめたら、サーバーの窓で `Ctrl + C` を押して止める。

---

## M6. README に商標の表記を足し、コミットして公開する

### M6-1. README

他社のロゴを使うので、README の最後に商標の表記を1行足す。

```bash
code README.md
```

```markdown
MetaMask and the MetaMask fox logo are trademarks of Consensys. StayVault is not affiliated with or endorsed by MetaMask or Consensys; the demo only shows MetaMask as the parent's wallet and does not connect to it.
```

### M6-2. コミットして公開する

```bash
cd ~/stayvault
git status
```

- 出てよい: `app/stayvault.html`、`app/brand/partners/metamask-fox.svg`、`README.md`、`docs/metamask-logo-guide-windows.md`
- 出てはいけない: `app/wallet-demo.json`、`app/demo-public.json`、`id.json`、`-keypair.json`、`-backup.json`

```bash
git add .
git commit -m "feat: show the official MetaMask logo on the wallet and review screens"
git push -u origin feat/metamask-logo
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

1〜5分後、シークレットウィンドウ（`Ctrl + Shift + N`）で公開 URL を開き、M5 の表の #1 と #2 を確かめる。

---

## 困ったとき

**ロゴが出ない（文字だけのまま）** → `app/brand/partners/metamask-fox.svg` が見つかっていない。次の3点を確かめる。

- `ls ~/stayvault/app/brand/partners` で `metamask-fox.svg` が出るか
- ファイル名が `metamask-fox.svg` になっているか（`MetaMask_Fox.svg` のような元の名前のままでは読み込まれない。M3-1 をやり直す）
- 中身が SVG か。`head -c 100 ~/stayvault/app/brand/partners/metamask-fox.svg` で `<svg` や `<?xml` が見えれば SVG

**ロゴが大きすぎる、または小さすぎる** → 公式ファイルの周りに余白が多いと、小さく見える。`stayvault.html` 側で 28px と 16px の枠に収めているので、形は崩れない。気になるときは Claude に「MetaMask のロゴを少し大きく」と頼む。

**公開版でだけロゴが出ない** → `metamask-fox.svg` をコミットし忘れている。`git status` と GitHub のファイル一覧で確かめる。
