// 審査員向けに公開する、デモ専用の財布を作り app/demo-public.json に書き出す。
// 実行: リポジトリのルートで `node scripts/make-public-demo.mjs`（SOL の量を変えるなら `node scripts/make-public-demo.mjs 2`）
//
// app/demo-public.json は GitHub で意図的に公開する。中身は devnet 専用のデモ財布（親役・運営者役）の鍵だけ。
// SOL を出す財布（~/.config/solana/id.json）と、テスト用 USDC の発行権限はこのファイルに含めない。
import fs from "node:fs";
import os from "node:os";
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const SOL_FOR_PARENT = Number(process.argv[2] ?? 1);   // 1回の支払いで約 0.004 SOL。1 SOL で約250回
const USDC_FOR_PARENT = 100_000_000;                     // 「退去日まで」1回で約5,500 USDC を預けるため多めに入れる

const RPC = "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");
const funder = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8")))
);
const programId = JSON.parse(fs.readFileSync("target/idl/stayvault.json", "utf8")).address;

const funderSol = (await conn.getBalance(funder.publicKey)) / LAMPORTS_PER_SOL;
const need = SOL_FOR_PARENT + 0.05;
if (funderSol < need) {
  console.error(`SOL が足りません: 手元の財布 ${funderSol} SOL / 必要 約 ${need} SOL`);
  console.error("faucet.solana.com で `solana address` のアドレスに送ってもらってから、もう一度実行してください。");
  process.exit(1);
}

const parent = Keypair.generate();
const operator = Keypair.generate();

await sendAndConfirmTransaction(
  conn,
  new Transaction().add(SystemProgram.transfer({
    fromPubkey: funder.publicKey, toPubkey: parent.publicKey, lamports: Math.round(SOL_FOR_PARENT * LAMPORTS_PER_SOL),
  })),
  [funder]
);

// テスト用USDC（小数6桁）。発行権限は funder に残るので、公開された鍵で勝手に発行されることはない
const mint = await createMint(conn, funder, funder.publicKey, null, 6);
const parentAta = await getOrCreateAssociatedTokenAccount(conn, funder, mint, parent.publicKey);
await getOrCreateAssociatedTokenAccount(conn, funder, mint, operator.publicKey);
await mintTo(conn, funder, mint, parentAta.address, funder, USDC_FOR_PARENT * 1_000_000);

fs.writeFileSync("app/demo-public.json", JSON.stringify({
  note: "Devnet-only demo wallets for StayVault judges. Intentionally public. Holds no real value. Never use on mainnet.",
  rpc: RPC,
  programId,
  mint: mint.toBase58(),
  parent: Array.from(parent.secretKey),
  operator: Array.from(operator.secretKey),
}, null, 2));

console.log("programId:", programId);
console.log("mint     :", mint.toBase58(), "（発行権限: 手元の財布）");
console.log("parent   :", parent.publicKey.toBase58(), `（${SOL_FOR_PARENT} SOL / ${USDC_FOR_PARENT.toLocaleString()} テスト用USDC）`);
console.log("operator :", operator.publicKey.toBase58());
console.log("-> app/demo-public.json を書き出しました（このファイルは公開します）");
