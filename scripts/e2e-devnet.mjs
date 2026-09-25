// devnet にデプロイした StayVault を、5つの命令すべてについて通しで試す。
// 実行: リポジトリのルートで `node scripts/e2e-devnet.mjs`
// 前提: デプロイ済みで、scripts/setup-demo.mjs で app/wallet-demo.json を作ってあること。
// 画面（app/stayvault.html）と同じ方法で命令を組み立てるので、これが通れば画面側の組み立ても正しい。
import fs from "node:fs";
import crypto from "node:crypto";
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const cfg = JSON.parse(fs.readFileSync("app/wallet-demo.json", "utf8"));
const conn = new Connection(cfg.rpc, "confirmed");
const PID = new PublicKey(cfg.programId);
const MINT = new PublicKey(cfg.mint);
const parent = Keypair.fromSecretKey(Uint8Array.from(cfg.parent));
const operator = Keypair.fromSecretKey(Uint8Array.from(cfg.operator));

const ata = (o) => PublicKey.findProgramAddressSync([o.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ATA)[0];
const parentAta = ata(parent.publicKey);
const operatorAta = ata(operator.publicKey);
const acc = (pubkey, isWritable = false, isSigner = false) => ({ pubkey, isWritable, isSigner });
const disc = (name) => crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8);
const ix = (name, keys, args = Buffer.alloc(0)) =>
  new TransactionInstruction({ programId: PID, keys, data: Buffer.concat([disc(name), args]) });
const send = (ixs, signers) => sendAndConfirmTransaction(conn, new Transaction().add(...ixs), signers); // 手数料は先頭の署名者（親）
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bal = async (a) => Number((await getAccount(conn, a)).amount);

let step = 0;
function ok(msg) { console.log(`✅ ${++step}. ${msg}`); }
function fail(msg) { console.error(`❌ ${++step}. ${msg}`); process.exit(1); }
function expectEq(actual, expected, msg) {
  if (actual !== expected) fail(`${msg}（期待 ${expected}、実際 ${actual}）`);
  ok(msg);
}
async function expectError(promise, code, msg) {
  try { await promise; } catch (e) {
    const text = String(e) + (e.transactionLogs || e.logs || []).join("\n");
    if (text.includes(code)) return ok(msg);
    console.error(text);
    return fail(`${msg}（${code} 以外のエラーで失敗した。上のログを見る）`);
  }
  fail(`${msg}（成功してしまった）`);
}

// 画面と同じ並びで create_vault の引数を組み立てる
function newVault({ weekly, weeks, interval, deadlineIn }) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const args = Buffer.alloc(42);
  args.writeBigUInt64LE(BigInt(Date.now()), 0);          // vault_id
  args.writeBigUInt64LE(BigInt(weekly), 8);              // weekly_amount
  args.writeUInt16LE(weeks, 16);                         // total_weeks
  args.writeBigInt64LE(now - 15n, 18);                   // first_pay_ts
  args.writeBigInt64LE(BigInt(interval), 26);            // interval_secs
  args.writeBigInt64LE(now + BigInt(deadlineIn), 34);    // confirm_deadline
  const vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), parent.publicKey.toBuffer(), args.subarray(0, 8)], PID)[0];
  const vaultToken = PublicKey.findProgramAddressSync([Buffer.from("vault_token"), vault.toBuffer()], PID)[0];
  const create = ix("create_vault", [
    acc(parent.publicKey, true, true), acc(operator.publicKey), acc(MINT), acc(parentAta, true),
    acc(vault, true), acc(vaultToken, true), acc(TOKEN), acc(SystemProgram.programId),
  ], args);
  return { vault, vaultToken, create };
}
const releaseIx = (v) => ix("release", [acc(v.vault, true), acc(v.vaultToken, true), acc(operatorAta, true), acc(TOKEN)]);
const confirmIx = (v) => ix("confirm_move_in", [acc(operator.publicKey, false, true), acc(v.vault, true)]);
const moveOutIx = (v) => ix("move_out", [
  acc(parent.publicKey, false, true), acc(operator.publicKey, false, true), acc(v.vault, true),
  acc(v.vaultToken, true), acc(parentAta, true), acc(TOKEN),
]);
const refundIx = (v) => ix("refund_unconfirmed", [
  acc(parent.publicKey, false, true), acc(v.vault, true), acc(v.vaultToken, true), acc(parentAta, true), acc(TOKEN),
]);

const WEEKLY = 100_000_000; // 100 USDC
console.log("Program ID:", PID.toBase58());

// --- シナリオA: 入金 → 確認前は払えない → 入居確認 → 2週分払う → 途中退去 ---
const a = newVault({ weekly: WEEKLY, weeks: 3, interval: 2, deadlineIn: 300 });
const op0 = await bal(operatorAta);
const pa0 = await bal(parentAta);

await send([a.create], [parent]);
expectEq(await bal(a.vaultToken), WEEKLY * 3, "create_vault: 3週分がエスクローに入った");

await expectError(send([releaseIx(a)], [parent]), "NotConfirmed", "release: 入居確認の前は払い出せない");

await send([confirmIx(a), releaseIx(a)], [parent, operator]);
expectEq((await bal(operatorAta)) - op0, WEEKLY, "confirm_move_in + release: 初週分が運営者に届いた");

await sleep(3000);
await send([releaseIx(a)], [parent]);
expectEq((await bal(operatorAta)) - op0, WEEKLY * 2, "release: 2週目が運営者に届いた");

await send([moveOutIx(a)], [parent, operator]);
expectEq(await bal(a.vaultToken), 0, "move_out: エスクローが空になった");
expectEq(pa0 - (await bal(parentAta)), WEEKLY * 2, "move_out: 未払いの1週分が親に戻った");

await expectError(send([releaseIx(a)], [parent]), "Closed", "release: 退去後は払い出せない");

// --- シナリオB: 期限までに入居確認がなければ、親だけで全額を取り戻せる ---
const b = newVault({ weekly: WEEKLY, weeks: 2, interval: 2, deadlineIn: 5 });
const pb0 = await bal(parentAta);
await send([b.create], [parent]);
await expectError(send([refundIx(b)], [parent]), "DeadlineNotPassed", "refund_unconfirmed: 期限前は返金できない");
console.log("   入居確認の期限が過ぎるのを20秒待つ…");
await sleep(20000);
await send([refundIx(b)], [parent]);
expectEq(await bal(parentAta), pb0, "refund_unconfirmed: 全額が親に戻った");

console.log("\nすべて通りました。プログラムと画面の命令組み立ては設計どおりに動いています。");
