// 審査員向けに公開する、デモ専用の財布と物件を作り app/demo-public.json に書き出す。
// 実行: リポジトリのルートで `node scripts/make-public-demo.mjs`（SOL の量を変えるなら `node scripts/make-public-demo.mjs 2`）
//
// app/demo-public.json は GitHub で意図的に公開する。中身は devnet 専用のデモ財布（親役・管理会社役・ST業者役）の鍵と、
// 物件と投資家のアドレスだけ。SOL を出す財布（~/.config/solana/id.json）と、テスト用 USDC の発行権限は含めない。
import fs from "node:fs";
import os from "node:os";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createDemo } from "./demo-common.mjs";

const SOL_FOR_PARENT = Number(process.argv[2] ?? 1);   // 取引手数料はすべて親役が払う。1 SOL で数百回分
const USDC_FOR_PARENT = 100_000_000;                     // 何度試されても尽きないよう多めに入れる

const RPC = "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");
const funder = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8")))
);
const programId = JSON.parse(fs.readFileSync("target/idl/stayvault.json", "utf8")).address;

const funderSol = (await conn.getBalance(funder.publicKey)) / LAMPORTS_PER_SOL;
const need = SOL_FOR_PARENT + 0.1;
if (funderSol < need) {
  console.error(`SOL が足りません: 手元の財布 ${funderSol} SOL / 必要 約 ${need} SOL`);
  console.error("faucet.solana.com で `solana address` のアドレスに送ってもらってから、もう一度実行してください。");
  process.exit(1);
}

const demo = await createDemo({ conn, funder, programId, solForParent: SOL_FOR_PARENT, usdcForParent: USDC_FOR_PARENT });
fs.writeFileSync("app/demo-public.json", JSON.stringify({
  note: "Devnet-only demo wallets for StayVault judges. Intentionally public. Holds no real value. Never use on mainnet.",
  rpc: RPC,
  ...demo,
}, null, 2));

console.log("programId:", programId);
console.log("mint     :", demo.mint, "（発行権限: 手元の財布）");
console.log("property :", demo.property);
console.log(`parent   : ${SOL_FOR_PARENT} SOL / ${USDC_FOR_PARENT.toLocaleString()} テスト用USDC`);
console.log("-> app/demo-public.json を書き出しました（このファイルは公開します）");
