// devnet用のデモ財布（親・管理会社・ST業者・StayVault）、テスト用USDC、物件を作り、app/wallet-demo.json に書き出す。
// 実行: リポジトリのルートで `node scripts/setup-demo.mjs`（先に anchor build と anchor deploy 済みであること）
// wallet-demo.json は .gitignore の wallet*.json で除外される。devnet専用、本物の資産を入れないこと。
import fs from "node:fs";
import os from "node:os";
import { Connection, Keypair } from "@solana/web3.js";
import { createDemo } from "./demo-common.mjs";

const RPC = "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");
const funder = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8")))
);
const programId = JSON.parse(fs.readFileSync("target/idl/stayvault.json", "utf8")).address;

// StayVault役に 0.5 SOL（取引手数料と口座の作成費用）。親役は SOL を持たない。テスト用USDCは1年分（52週 × 213 USDC）を超える 20,000
const demo = await createDemo({ conn, funder, programId, solForSponsor: 0.5, usdcForParent: 1_000_000 });
fs.writeFileSync("app/wallet-demo.json", JSON.stringify({ rpc: RPC, ...demo }, null, 2));

console.log("programId:", programId);
console.log("mint     :", demo.mint);
console.log("property :", demo.property);
console.log("-> app/wallet-demo.json を書き出しました");
