# StayVault ロゴ追加の手順（Windows・Gemini版）

最終更新: 2026年9月29日（最終版 1b「屋根の輪」）

**前提**: デザイン刷新の手順（`docs/design-refresh-guide-windows.md`、配色 A1「Refined」の版）を最後まで終え、公開済みであること。以前の Tick dial や Line lock のロゴでこの手順を一度進めていても、同じ手順で上書きしてよい（主なファイル名は同じ）。Windows（WSL2 の Ubuntu）で作業する。

**この手順書でやること**: ロゴのファイル一式をリポジトリに入れ、デモ画面の3か所（ブラウザのタブ、左上、ログイン画面）にロゴを出して公開し直す。README の先頭にもロゴを置く。

**変えないもの**: デモの流れと動き、エスクローの命令を組み立てる部分（`window.SV = { ... }`）。

**所要時間**: 30分前後。

---

## ロゴの意味

最終版は Claude Design で仕上げた「1b 屋根の輪」。南京錠の輪（シャックル）の上部が、家の屋根と同じ角度の切妻になっている。

- 南京錠 = Vault（金庫・エスクロー）。期日まで誰もお金を動かせない
- 輪そのものが屋根の形 = 南京錠と家（Stay、住まい）が1つの形に重なっている。輪の形だけで、ありふれた鍵のアイコンと区別できる
- 中の家には、アーチ形の扉を抜いてある。守られているのは、留学中の子どもが暮らす部屋
- 鍵を持っているのは親。お金は期日まで親の側にあり、使われなかった分は親に戻る
- 色は紫1色（#6E56CF）。ブリスベンの街が10〜11月に染まるジャカランダの花の色で、入居と家賃の支払いが始まる時期にあたる

Claude Design での調整内容：輪の外幅は本体の約55%、線幅 5（小サイズ版は 7）、家は本体の内側の視覚的な中心、屋根の角度は約41°で、角は線と同じ丸み。

小サイズ版（32px 以下）は線を太くし、家の扉を省いている。

## ファイル一式と使い分け

| ファイル | 中身 | 使う場所 |
| --- | --- | --- |
| `stayvault-mark.svg` | 標準のマーク（#6E56CF） | 48px 以上。スライド、LP |
| `stayvault-mark-dark.svg` | 暗い背景用（#A898F0） | 暗い背景のスライドや動画 |
| `stayvault-mark-white.svg` | 白抜き | 紫や写真の上に置くとき |
| `stayvault-mark-small.svg` | 小サイズ版（線を太く、扉なし） | 40px 以下。アプリの左上など |
| `stayvault-mark-small-dark.svg` | 小サイズ版の暗い背景用 | 暗い背景で 40px 以下 |
| `stayvault-app-icon.svg` | 紫の角丸の正方形（128、角丸 28）に白いマーク | アプリアイコン、X や Colosseum のプロフィール画像 |
| `stayvault-logo-horizontal.svg` | 横組み（マーク＋StayVault、文字は図形化済み） | README の先頭、ピッチ動画の表紙、提出ページ |
| `stayvault-logo-stacked.svg` | 縦組み（マークの下に StayVault） | 正方形に近い場所（動画の最後、ポスター） |
| `favicon.svg` | 小サイズ版。ブラウザのライト／ダークに合わせて色が変わる | ブラウザのタブ（デモでは HTML に埋め込み済み） |

横組みと縦組みは、文字が図形に変換されているので、Bricolage Grotesque の書体がないパソコンでも同じ見た目で表示される。

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| L1 | ブランチを切る | 5分 |
| L2 | ファイルを入れる | 5分 |
| L3 | 命令の組み立て部分が変わっていないことを確かめる | 3分 |
| L4 | 手元で見た目を確かめる | 7分 |
| L5 | README と CLAUDE.md を直す | 5分 |
| L6 | コミットして main に入れ、公開版を確かめる | 5分 |

---

## L1. ブランチを切る

```bash
cd ~/stayvault
git checkout main && git pull
git status
```

`nothing to commit, working tree clean` と出てから次に進む。

```bash
git checkout -b feat/logo
```

---

## L2. ファイルを入れる

Claude から受け取ったファイルを、Windows の「ダウンロード」フォルダに保存しておく。

- `stayvault.html`（ロゴ入りのデモ）
- `brand` フォルダの SVG ファイル9つ（`archive` の中は昔の案なので不要）
- `logo-guide-windows.md`（この手順書）

SVG は1つずつダウンロードすると、ダウンロードフォルダに直接並ぶ。その場合も下のコマンドで拾える。

```bash
D=/mnt/c/Users/<ユーザー名>/Downloads
mkdir -p ~/stayvault/app/brand
cp $D/stayvault.html ~/stayvault/app/stayvault.html
rm -f ~/stayvault/app/brand/*.svg
cp $D/stayvault-*.svg $D/favicon.svg ~/stayvault/app/brand/
cp $D/logo-guide-windows.md ~/stayvault/docs/
ls ~/stayvault/app/brand
```

`<ユーザー名>` は自分の Windows のユーザー名に置き換える（前回は `nkohara`）。`rm` の行は、以前のロゴのファイルを消すためのもの。最後の `ls` で9つのファイルが並べば正しい。ダウンロードで `brand` フォルダごと保存された場合は、`$D/brand/` を付けてコピーする。

最新版かどうかは、次で確かめる。

```bash
grep -c 'class="lm' ~/stayvault/app/stayvault.html
```

`2` と出れば正しい。`0` なら古いファイル。

---

## L3. 命令の組み立て部分が変わっていないことを確かめる

```bash
cd ~/stayvault
git show main:app/stayvault.html | sed -n '/window.SV = {/,/^};/p' > /tmp/sv-old.txt
sed -n '/window.SV = {/,/^};/p' app/stayvault.html > /tmp/sv-new.txt
diff /tmp/sv-old.txt /tmp/sv-new.txt && echo "SV unchanged"
```

`SV unchanged` とだけ出れば正しい。

---

## L4. 手元で見た目を確かめる

今回は見た目だけの変更なので、支払いまで進まなくてよい。`wallet-demo.json` を外す必要もない。

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Windows 側の Chrome か Edge で `http://localhost:8000/` を開く。

| 場所 | 期待する表示 |
| --- | --- |
| ブラウザのタブ | 屋根の形の輪をもつ紫の南京錠に、塗りの家が入ったアイコン。古いアイコン（または地球儀のマーク）のままなら、`Ctrl + Shift + R` で再読み込みする |
| 左上 | 小さな紫のマーク（屋根の形の輪の南京錠）と「StayVault」。「Stay」と「Vault」の間に隙間がない |
| ログイン画面 | 見出しの上に、大きめのマーク。中の家にアーチ形の扉が抜いてある |
| ダークモード | Windows を「ダーク」にして再読み込みすると、マークが明るい紫になる。タブのアイコンも同じように変わる（ブラウザによっては変わらない。問題ない） |

`http://localhost:8000/app/brand/stayvault-app-icon.svg` を開くと、アプリアイコンだけを単体で確認できる。

確かめたら、サーバーの窓で `Ctrl + C` を押して止める。

---

## L5. README と CLAUDE.md を直す

### L5-1. README の先頭にロゴを置く

```bash
code README.md
```

1行目のタイトル（`# StayVault` など）の直前に、次の1行を足す。以前のロゴの `<img ...>` の行を足していた場合は、それをこの行に置き換える。

```markdown
<img src="app/brand/stayvault-logo-horizontal.svg" width="280" alt="StayVault logo: a padlock with a roof-shaped shackle holding a home">
```

GitHub のリポジトリのトップページで、タイトルの上にロゴが表示されるようになる。

### L5-2. CLAUDE.md

「ハッカソンMVPの範囲」の節の最後に、次の2行を足す。

```
- ロゴは app/brand/ の SVG を使う（最終版 1b：屋根の形の輪の南京錠に、アーチ扉の家。紫1色、Claude Design で調整済み）。48px 以上は stayvault-mark.svg、40px 以下は stayvault-mark-small.svg、文字つきは stayvault-logo-horizontal.svg。形や色を作り直さない。ロゴに緑を使わない
- アプリ内の文字は Bricolage Grotesque（800）で「Stay」を --ink、「Vault」を --jac。favicon は stayvault.html の <link rel="icon"> に埋め込み済み
```

---

## L6. コミットして main に入れ、公開版を確かめる

```bash
cd ~/stayvault
git status
```

- 出てよい: `app/stayvault.html`、`app/brand/` の9ファイル（以前のロゴを入れていた場合は、その削除も出る）、`README.md`、`CLAUDE.md`、`docs/logo-guide-windows.md`
- 出てはいけない: `app/wallet-demo.json`、`app/demo-public.json`、`id.json`、`-keypair.json`、`-backup.json`

```bash
git add .
git commit -m "feat: final StayVault logo (roof shackle), lockups, favicon and app icon"
git push -u origin feat/logo
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

1〜5分後、シークレットウィンドウ（`Ctrl + Shift + N`）で公開 URL を開き、L4 の表の上から3行を確かめる。GitHub のリポジトリのトップページで、README の上にロゴが出ていることも見る。

---

## このあと使うとよい場所

- **Colosseum のプロジェクト画像と X のプロフィール画像**: `stayvault-app-icon.svg`。PNG が必要なときは、ブラウザで開いて画面を切り取るか、Claude に PNG への変換を頼む
- **ピッチ動画の表紙と最後のスライド**: 表紙は `stayvault-logo-horizontal.svg`、最後は `stayvault-logo-stacked.svg`
- **技術デモ動画**: 冒頭でブラウザのタブのアイコンと左上のロゴが映るように撮る

---

## 困ったとき

**タブのアイコンが変わらない** → ブラウザがアイコンを覚えている。シークレットウィンドウで開くか、`Ctrl + Shift + R` で再読み込みする。

**左上が「Stay Vault」と離れて見える** → 古い `stayvault.html` を使っている。L2 の `grep` で確かめる。

**README のロゴが表示されない** → `app/brand/stayvault-logo-horizontal.svg` をコミットし忘れている。`git status` で確かめる。

**前の状態に戻したい** → main にマージする前なら `git checkout main -- app/stayvault.html`。マージしたあとなら、GitHub でそのプルリクエストの「Revert」を押す。
