// 公開デモの財布の残高を確かめる。審査期間中にときどき実行する。
// 実行: リポジトリのルートで `node scripts/check-demo.mjs`
import fs from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";

const cfg = JSON.parse(fs.readFileSync("app/demo-public.json", "utf8"));
const conn = new Connection(cfg.rpc, "confirmed");
const parent = Keypair.fromSecretKey(Uint8Array.from(cfg.parent)).publicKey;
const mint = new PublicKey(cfg.mint);

const sol = (await conn.getBalance(parent)) / LAMPORTS_PER_SOL;
let usdc = 0;
try { usdc = Number((await getAccount(conn, getAssociatedTokenAddressSync(mint, parent))).amount) / 1e6; } catch {}

console.log("親役のアドレス:", parent.toBase58());
console.log("SOL           :", sol, sol < 0.1 ? "← 少ない。足してください" : "");
console.log("テスト用USDC  :", usdc.toLocaleString(), usdc < 50_000 ? "← 少ない。財布を作り直してください" : "");
if (sol < 0.1) {
  console.log("\nSOL を足すコマンド:");
  console.log(`solana transfer ${parent.toBase58()} 1 --url devnet --allow-unfunded-recipient`);
}
