#!/usr/bin/env bash
# StayVault のプログラムを devnet で更新する（Mac / Linux 共通）。
# 実行: リポジトリのルートで `RPC_URL=<Helius などの devnet RPC> bash scripts/deploy-devnet.sh`
#   公開 RPC（api.devnet.solana.com）や WSL では書き込みの取引が届かず Blockhash expired が続くことがあるので、RPC_URL を指定する
#   更新権限の鍵の場所を変えるとき: `bash scripts/deploy-devnet.sh ~/path/to/authority.json`
#   鍵の既定: ~/.config/solana/stayvault-authority.json があればそれ、なければ ~/.config/solana/id.json
# やること: 鍵の確認 → 残高の確認 → 残ったバッファの回収 → 必要なら領域の拡張 → RPC 経由でデプロイ → 結果の表示
set -euo pipefail

PROGRAM_ID="GJet47eJPYYAxHz5RFvxqVKv3n6d6uWZWPsRUSzjB5ZG"
AUTHORITY_ADDRESS="9o5Cn87tuPi5JSX5kAg9YPxSnr71pFr9cm1BXUT8LszU"
DEFAULT_AUTH="$HOME/.config/solana/stayvault-authority.json"
[ -f "$DEFAULT_AUTH" ] || DEFAULT_AUTH="$HOME/.config/solana/id.json"
AUTH="${1:-$DEFAULT_AUTH}"
RPC="${RPC_URL:-https://api.devnet.solana.com}"
SO="target/deploy/stayvault.so"

[ -f "$SO" ] || { echo "❌ $SO がありません。先に anchor build を実行してください"; exit 1; }
[ -f "$AUTH" ] || { echo "❌ 更新権限の鍵 $AUTH がありません"; exit 1; }

addr="$(solana address -k "$AUTH")"
if [ "$addr" != "$AUTHORITY_ADDRESS" ]; then
  echo "❌ 鍵のアドレスが違います: $addr（期待: $AUTHORITY_ADDRESS）"; exit 1
fi
echo "✅ 更新権限の鍵: $addr"

bal="$(solana balance "$AUTHORITY_ADDRESS" --url "$RPC" | awk '{print $1}')"
echo "   残高: $bal SOL"
if awk "BEGIN{exit !($bal < 2.5)}"; then
  echo "❌ SOL が足りません（2.5 SOL 以上が目安）。faucet.solana.com で $AUTHORITY_ADDRESS に送ってから再実行してください"; exit 1
fi

echo "   前回の失敗で残ったバッファがあれば閉じて SOL を回収します"
solana program close --buffers -k "$AUTH" --url "$RPC" || true

size="$(wc -c < "$SO" | tr -d ' ')"
cur="$(solana program show "$PROGRAM_ID" --url "$RPC" | awk '/Data Length/{print $3}')"
echo "   新しいプログラム: $size バイト / 今の上限: $cur バイト"
if [ "$size" -gt "$cur" ]; then
  extra=$(( size - cur + 10240 ))
  echo "   上限を $extra バイト広げます"
  solana program extend "$PROGRAM_ID" "$extra" -k "$AUTH" --url "$RPC"
fi

before="$(solana program show "$PROGRAM_ID" --url "$RPC" | awk '/Last Deployed In Slot/{print $5}')"
echo "   RPC: ${RPC%%\?*}（APIキーは表示しない）"
echo "   デプロイします（RPC 経由・優先手数料つき。数分かかります）"
solana program deploy "$SO" \
  --program-id "$PROGRAM_ID" \
  -k "$AUTH" \
  --url "$RPC" \
  --use-rpc \
  --with-compute-unit-price 50000 \
  --max-sign-attempts 100

after="$(solana program show "$PROGRAM_ID" --url "$RPC" | awk '/Last Deployed In Slot/{print $5}')"
solana program show "$PROGRAM_ID" --url "$RPC"
if [ "$after" != "$before" ]; then
  echo "✅ 更新できました（Last Deployed In Slot: $before → $after）"
else
  echo "❌ Last Deployed In Slot が変わっていません。手順書 docs/st-payout-guide-windows.md の 5-3 を見てください"; exit 1
fi
