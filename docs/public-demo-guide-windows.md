# StayVault 公開デモ手順書（Windows・Gemini版）

最終更新: 2026年9月25日

**対象読者**: エスクロー実装手順書のステップ6（main へのマージ）まで終えた人。Windows（WSL2 の Ubuntu）で作業する。

**この手順書で作るもの**: 審査員がブラウザで URL を開くだけで、デモを最初から最後まで触れる状態。GitHub Pages で `https://<organization名>.github.io/stayvault/` に公開する。

**考え方**: 画面が署名に使うデモ用の財布（親役・運営者役）の鍵を、`app/demo-public.json` として意図的に公開する。devnet 専用で価値のない財布なので、漏れても被害はない。公開してよいのはこの2つの財布だけで、SOL を出す自分の財布（`~/.config/solana/id.json`）は公開しない。自分の財布は、プログラムの更新権限を持つ唯一の財布だからだ。

**所要時間**: 1時間前後。GitHub Pages の反映待ちに数分かかる。

**締切との関係**: 提出期限は 10/12 23:59 PT。審査員が触れる状態を提出前に確かめたいので、遅くとも 10/10 ごろまでに済ませる。

---

## 全体の流れ

| ステップ | 内容 | 目安 |
| --- | --- | --- |
| P1 | ブランチを切ってファイルを入れる | 10分 |
| P2 | 公開用のデモ財布を作る | 10分 |
| P3 | 画面の読み込み先を1か所直す | 5分 |
| P4 | 手元で公開版と同じ動きを確かめる | 10分 |
| P5 | README と CLAUDE.md・GEMINI.md に書き足す | 10分 |
| P6 | コミットして main に入れる | 10分 |
| P7 | GitHub Pages を有効にする | 5分 |
| P8 | 公開 URL で確かめる | 10分 |
| P9 | 審査期間中の見回り | 随時 |

---

## P1. ブランチを切ってファイルを入れる

### P1-1. main を最新にしてブランチを切る

```bash
cd ~/stayvault
git checkout main && git pull
git checkout -b feat/public-demo
```

エスクロー実装で使った `feat/escrow` はマージ済みなので、公開の作業は新しいブランチで行う。

### P1-2. 同梱ファイルを入れる

このチャットの `stayvault-public-demo.zip` を Windows でダウンロードしてから実行する。`<Windowsのユーザー名>` は `ls /mnt/c/Users` で確かめる。

```bash
cp /mnt/c/Users/<Windowsのユーザー名>/Downloads/stayvault-public-demo.zip ~/Downloads/
cd ~/Downloads && rm -rf stayvault-public-demo && unzip stayvault-public-demo.zip
cd ~/stayvault
cp ~/Downloads/stayvault-public-demo/scripts/*.mjs scripts/
cp ~/Downloads/stayvault-public-demo/index.html ~/Downloads/stayvault-public-demo/.nojekyll .
cp ~/Downloads/stayvault-public-demo/docs/*.md docs/
git status
```

増えるファイルは次のとおり。

| ファイル | 役割 |
| --- | --- |
| `scripts/make-public-demo.mjs` | 公開用のデモ財布を作り、`app/demo-public.json` に書き出す |
| `scripts/check-demo.mjs` | 公開用のデモ財布の残高を確かめる |
| `index.html` | `https://…/stayvault/` を開いたときに、デモの画面へ転送する |
| `.nojekyll` | GitHub Pages がファイルを加工せず、そのまま公開するための空ファイル |
| `docs/README-demo-section.md` | README に貼る英語の説明文 |
| `docs/public-demo-guide-windows.md` | この手順書 |

---

## P2. 公開用のデモ財布を作る

開発中に使った `app/wallet-demo.json` の財布は公開しない。以前 Gemini に中身を見せた可能性もあるので、公開用には新しい財布を作る。

```bash
cd ~/stayvault
solana config get
solana balance
```

devnet を向いていて、1.1 SOL 以上あることを確かめる。足りなければ faucet.solana.com で `solana address` のアドレスに送ってもらう。

```bash
node scripts/make-public-demo.mjs
```

このスクリプトは次の4つを行う。

1. 親役と運営者役の新しい財布を作る
2. 親役に 1 SOL を送る（1回の支払いで約 0.004 SOL を使うので、約250回ぶん）
3. 新しいテスト用 USDC を発行し、親役に 1億 USDC を配る（「退去日まで」を選ぶと1回で約5,500 USDC を預けるため）
4. それらを `app/demo-public.json` に書き出す

`-> app/demo-public.json を書き出しました（このファイルは公開します）` と出れば成功。テスト用 USDC の発行権限は自分の財布に残るので、公開された鍵で勝手に USDC を増やされることはない。

このファイルが Git の対象になっているか（除外されていないか）も確かめる。

```bash
git check-ignore -v app/demo-public.json
```

何も表示されなければ正しい（除外されていない）。

**Gemini に頼む場合**

```
docs/public-demo-guide-windows.md の P2 を実行して。make-public-demo.mjs の前に solana balance の結果を見せて止めて。
app/demo-public.json と ~/.config/solana/id.json の中身は表示しないで。
```

---

## P3. 画面の読み込み先を1か所直す

今の画面は `wallet-demo.json` だけを読む。公開版では `demo-public.json` を読む必要がある。手元での開発は今までどおり続けたいので、「`wallet-demo.json` があればそれを使い、なければ `demo-public.json` を使う」形にする。GitHub には `wallet-demo.json` がないので、公開版では自動的に `demo-public.json` が使われる。

VS Code で `app/stayvault.html` を開く。

```bash
cd ~/stayvault && code app/stayvault.html
```

`Ctrl + F` で `wallet-demo.json").json()` を検索すると、次の1行が見つかる。

```javascript
const cfg = await (await fetch("./wallet-demo.json")).json();
```

この1行を、次の9行に置き換えて `Ctrl + S` で保存する。

```javascript
// 手元の開発では wallet-demo.json、公開版（GitHub Pages）では demo-public.json を使う
async function loadCfg() {
  for (const f of ["./wallet-demo.json", "./demo-public.json"]) {
    const r = await fetch(f, { cache: "no-store" });
    if (r.ok) { console.log("demo config:", f); return r.json(); }
  }
  throw new Error("wallet-demo.json も demo-public.json も見つかりません");
}
const cfg = await loadCfg();
```

変わったのがこの部分だけかを確かめる。

```bash
git diff app/stayvault.html
```

`-` の行が1行、`+` の行が9行出れば正しい。

**Gemini に頼む場合**

```
docs/public-demo-guide-windows.md の P3 のとおり、app/stayvault.html の1行だけを置き換えて。ほかの行は変えないで。終わったら git diff を見せて。
```

Gemini が、鍵の中身を HTML に直接書き込む方法を提案してきても採用しない。鍵を作り直すたびに HTML を書き換えることになるからだ。

---

## P4. 手元で公開版と同じ動きを確かめる

公開版には `wallet-demo.json` がない。同じ状態を手元で作るため、`wallet-demo.json` を一時的にリポジトリの外へ移してから確かめる。

```bash
cd ~/stayvault
mv app/wallet-demo.json ~/wallet-demo.json.bak
python3 -m http.server 8000 --bind 127.0.0.1
```

今回は `-d app` を付けずに、リポジトリの最上位から配信する。GitHub Pages と同じ配置で確かめるためだ。最上位から配信すると `target/deploy/` の鍵も配信範囲に入るので、`--bind 127.0.0.1` で自分のパソコンからしか見えないようにしている（GitHub Pages には Git に入れたファイルしか載らないので、公開版では問題にならない）。

Windows 側のブラウザで `http://localhost:8000/` を開く。`index.html` がデモの画面に転送すれば正しい。`F12` の Console に `demo config: ./demo-public.json` と `StayVault escrow ready:` が出ていることを確かめ、エスクロー実装手順書のステップ5と同じ流れ（支払う → 支払日を進める → 途中退去）を1回通す。

終わったら、サーバーの窓で `Ctrl + C` を押して止め、`wallet-demo.json` を元に戻す。

```bash
mv ~/wallet-demo.json.bak app/wallet-demo.json
```

---

## P5. README と CLAUDE.md・GEMINI.md に書き足す

### P5-1. README に説明を足す

ハッカソンの規約では、提出物は英語で書く必要がある。README に貼る説明は英語で用意してある。

```bash
code README.md docs/README-demo-section.md
```

`docs/README-demo-section.md` の中身を全部コピーして、`README.md` の最初の見出しの下に貼る。`<organization>` は自分の Organization 名に、`<link>` はデモ動画の URL（まだなければ、この行を消しておく）に書き換えて保存する。

README の「About the keys」の節は必ず残す。審査員や、GitHub を見た人が「秘密鍵が漏れている」と誤解しないためだ。

### P5-2. CLAUDE.md と GEMINI.md の鍵の決まりを直す

今の決まりには「鍵ファイルをコミットしない」とある。`demo-public.json` だけは意図的に公開するので、AI が止めたり、逆に他の鍵まで公開を勧めたりしないよう、例外を書き足す。

`CLAUDE.md` の「2台で作業するときの決まり」の節に、次の2行を足す。

```
- 例外: app/demo-public.json は審査員向けに意図的に公開する devnet 専用のデモ財布。コミットしてよい。作り直すときは scripts/make-public-demo.mjs を使う
- ~/.config/solana/id.json は更新権限とテスト用USDCの発行権限を持つので、どんな理由でも公開しない。demo-public.json に含めない
```

`GEMINI.md` の「鍵ファイル…をコミットしない」の行のすぐ下に、次の1行を足す。

```
- 例外: app/demo-public.json だけは意図的に公開してよい（詳細は CLAUDE.md）
```

---

## P6. コミットして main に入れる

```bash
cd ~/stayvault
git status
```

一覧を1行ずつ確かめる。

- 出てよい: `app/demo-public.json`、`app/stayvault.html`、`scripts/make-public-demo.mjs`、`scripts/check-demo.mjs`、`index.html`、`.nojekyll`、`README.md`、`CLAUDE.md`、`GEMINI.md`、`docs/` の2ファイル
- 出てはいけない: `app/wallet-demo.json`、`id.json`、`-keypair.json`、`-backup.json`

出てはいけないものが1つでもあれば、`add` せずに止める。

```bash
git add .
git commit -m "feat: public devnet demo on GitHub Pages"
git push -u origin feat/public-demo
```

GitHub の「Compare & pull request」からプルリクエストを作り、自分でマージする。マージしたら手元も main に戻す。

```bash
git checkout main && git pull
```

---

## P7. GitHub Pages を有効にする

ブラウザで GitHub のリポジトリを開いて操作する。

1. リポジトリの **Settings** を開く
2. 左のメニューの **Pages** を開く
3. **Source** で **Deploy from a branch** を選ぶ
4. **Branch** で `main`、フォルダで `/ (root)` を選び、**Save** を押す

1〜5分待ってからページを再読み込みすると、上部に `Your site is live at https://<organization名>.github.io/stayvault/` と出る。これが審査員に渡す URL になる。

`/ (root)` を選ぶのは、GitHub Pages が公開元に最上位か `/docs` しか選べないためだ。最上位を選べば、`app/` の中身もそのまま公開される。

---

## P8. 公開 URL で確かめる

審査員と同じ条件で確かめるため、ブラウザのシークレットウィンドウ（Chrome は `Ctrl + Shift + N`）で公開 URL を開く。

1. `https://<organization名>.github.io/stayvault/` がデモの画面に転送される
2. `F12` の Console に `demo config: ./demo-public.json` と `StayVault escrow ready:` が出る
3. 支払う → 支払日を進める（2回） → 途中退去 が最後まで通る
4. Console の `tx:` のリンクを開くと、Solana Explorer に取引が表示される

できれば、スマートフォンでも同じ URL を開いて画面が崩れないか見ておく。審査員がスマートフォンで開くこともある。

通ったら、この URL を README の `<organization>` の箇所と、colosseum.com の提出フォームに載せる。

---

## P9. 審査期間中の見回り

鍵を公開しているので、誰でもデモ財布の残高を抜き取れる。お金の被害はないが、残高が尽きると審査員が触ったときに「送金できませんでした」で止まる。提出後から結果発表（12/5ごろ）まで、ときどき残高を確かめる。

```bash
cd ~/stayvault
node scripts/check-demo.mjs
```

| 表示 | 対処 |
| --- | --- |
| SOL の行に「少ない」と出る | 表示されたコマンドで 1 SOL を足す |
| テスト用USDC の行に「少ない」と出る | 財布を作り直す（下） |
| 残高が急に空になっている | 抜き取られた。財布を作り直す（下） |

財布を作り直すときは、P2 の `node scripts/make-public-demo.mjs` をもう一度実行し、`app/demo-public.json` をコミットして main に push する。HTML は触らなくてよい。GitHub Pages は数分で新しい財布に切り替わる。

---

## 困ったとき

**公開 URL が 404 になる** → P7 の設定から数分待つ。それでも 404 なら、Settings → Pages の Branch が `main` と `/ (root)` になっているか、リポジトリが Public かを確かめる。

**公開版の Console に「wallet-demo.json も demo-public.json も見つかりません」** → `app/demo-public.json` がコミットされていない。`git ls-files app/demo-public.json` で何も出なければ、P6 をやり直す。

**公開版の Console に `wallet-demo.json` の 404 が出る** → 正常。まず `wallet-demo.json` を探し、ないので `demo-public.json` を読んでいる。`demo config: ./demo-public.json` が続けて出ていればよい。

**公開版だけ「送金できませんでした」になる** → `node scripts/check-demo.mjs` で残高を見る。残高があるなら、Console のエラーを Gemini に貼る。

**更新したのに公開版が古いまま** → GitHub Pages の反映に数分かかる。ブラウザのキャッシュが原因のこともあるので、シークレットウィンドウで開き直す。

**make-public-demo.mjs で「SOL が足りません」** → 表示のとおり、faucet.solana.com で自分の財布に SOL を送ってもらう。
