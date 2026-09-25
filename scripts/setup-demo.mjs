// devnet用のデモ財布（親・運営者）とテスト用USDCを作り、app/wallet-demo.json に書き出す。
// 実行: リポジトリのルートで `node scripts/setup-demo.mjs`（先に anchor build 済みであること）
// wallet-demo.json は .gitignore の wallet*.json で除外される。devnet専用、本物の資産を入れないこと。
import fs from "node:fs";
import os from "node:os";
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const RPC = "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");
const funder = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8")))
);
const programId = JSON.parse(fs.readFileSync("target/idl/stayvault.json", "utf8")).address;

const parent = Keypair.generate();
const operator = Keypair.generate();

// 親役に手数料・家賃口座の作成費用として 0.1 SOL を渡す（運営者役は署名するだけなのでSOL不要）
await sendAndConfirmTransaction(
  conn,
  new Transaction().add(SystemProgram.transfer({
    fromPubkey: funder.publicKey, toPubkey: parent.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL,
  })),
  [funder]
);

// テスト用USDC（小数6桁）。本物のUSDCではない
const mint = await createMint(conn, funder, funder.publicKey, null, 6);
const parentAta = await getOrCreateAssociatedTokenAccount(conn, funder, mint, parent.publicKey);
await getOrCreateAssociatedTokenAccount(conn, funder, mint, operator.publicKey);
await mintTo(conn, funder, mint, parentAta.address, funder, 10_000 * 1_000_000); // 10,000 USDC

fs.writeFileSync("app/wallet-demo.json", JSON.stringify({
  rpc: RPC,
  programId,
  mint: mint.toBase58(),
  parent: Array.from(parent.secretKey),
  operator: Array.from(operator.secretKey),
}, null, 2));

console.log("programId:", programId);
console.log("mint     :", mint.toBase58());
console.log("parent   :", parent.publicKey.toBase58());
console.log("operator :", operator.publicKey.toBase58());
console.log("-> app/wallet-demo.json を書き出しました");
