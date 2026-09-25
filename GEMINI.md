# StayVault（Gemini 向けの入口）

このリポジトリの前提と決まりは、すべて `CLAUDE.md` に書いてある。作業を始める前に、必ず `CLAUDE.md` を読み、その内容に従うこと。Mac 側の Claude Code と同じ決まりで作業するため、前提を二重に書かずに `CLAUDE.md` に一本化している。

とくに次の4点は、読み飛ばすと事故になる。

- バージョンは Anchor 1.2.0 / Solana CLI 4.1.2 / Rust 1.90.0 に固定。上げる・下げる提案をしない
- 作業ブランチは feat/escrow の1本だけ。新しいブランチを切る提案をしない
- anchor deploy は更新権限のある端末でしか実行しない（CLAUDE.md の「更新権限のある財布」を見る）
- 鍵ファイル（id.json、stayvault-keypair.json、wallet-demo.json、*-backup.json）をコミットしない。内容を表示・貼り付けしない
- 例外: app/demo-public.json だけは意図的に公開してよい（詳細は CLAUDE.md）

手順書は `docs/escrow-guide-windows.md`。
