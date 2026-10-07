// 公開デモの財布の残高を確かめる。審査期間中にときどき実行する。
// 実行: リポジトリのルートで `node scripts/check-demo.mjs`
// 取引手数料と口座の作成費用は StayVault役が払う。親役は SOL を持たず、テスト用USDC だけを持つ
import fs from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";

const cfg = JSON.parse(fs.readFileSync("app/demo-public.json", "utf8"));
const conn = new Connection(process.env.RPC_URL ?? cfg.rpc, "confirmed");
if (!cfg.sponsor) { console.error("demo-public.json に sponsor がありません。scripts/make-public-demo.mjs で作り直してください"); process.exit(1); }
const parent = Keypair.fromSecretKey(Uint8Array.from(cfg.parent)).publicKey;
const sponsor = Keypair.fromSecretKey(Uint8Array.from(cfg.sponsor)).publicKey;
const mint = new PublicKey(cfg.mint);

const sol = (await conn.getBalance(sponsor)) / LAMPORTS_PER_SOL;
const parentSol = (await conn.getBalance(parent)) / LAMPORTS_PER_SOL;
let usdc = 0;
try { usdc = Number((await getAccount(conn, getAssociatedTokenAddressSync(mint, parent))).amount) / 1e6; } catch {}

console.log("StayVault役のアドレス:", sponsor.toBase58());
console.log("SOL                  :", sol, sol < 0.1 ? "← 少ない。足してください" : "");
console.log("親役のアドレス       :", parent.toBase58());
console.log("親役の SOL           :", parentSol, parentSol > 0 ? "（0 のはず。確認する）" : "（0 のままで正しい）");
console.log("親役のテスト用USDC   :", usdc.toLocaleString(), usdc < 50_000 ? "← 少ない。財布を作り直してください" : "");
if (sol < 0.1) {
  console.log("\nSOL を足すコマンド:");
  console.log(`solana transfer ${sponsor.toBase58()} 1 --url devnet --allow-unfunded-recipient`);
}
