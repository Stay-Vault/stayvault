// devnet にデプロイした StayVault を、7つの命令について通しで試す（init_property は setup-demo.mjs が実行済み）。
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
const authority = Keypair.fromSecretKey(Uint8Array.from(cfg.authority));
const sponsor = Keypair.fromSecretKey(Uint8Array.from(cfg.sponsor));   // StayVault役。すべての手数料と口座の作成費用を払う
const PROPERTY = new PublicKey(cfg.property);
const PROPERTY_VAULT = new PublicKey(cfg.propertyVault);
const MANAGER_TOKEN = new PublicKey(cfg.managerToken);
const FEE_TOKEN = new PublicKey(cfg.feeToken);
const HOLDERS = cfg.holders.map((h) => ({ ...h, token: new PublicKey(h.token) }));

const ata = (o) => PublicKey.findProgramAddressSync([o.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ATA)[0];
const parentAta = ata(parent.publicKey);
const acc = (pubkey, isWritable = false, isSigner = false) => ({ pubkey, isWritable, isSigner });
const disc = (name) => crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8);
const ix = (name, keys, args = Buffer.alloc(0)) =>
  new TransactionInstruction({ programId: PID, keys, data: Buffer.concat([disc(name), args]) });
// 手数料は先頭の署名者が払う。常に StayVault役を先頭にして、親が SOL を使わないことを確かめる
const send = (ixs, signers) => sendAndConfirmTransaction(conn, new Transaction().add(...ixs), [sponsor, ...signers.filter((s) => s !== sponsor)]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bal = async (a) => Number((await getAccount(conn, a)).amount);
// Property の reserve_balance（8 + 32×5 + 8 + 2×3 + 4 = 186 バイト目から u64）
const reserveBalance = async () => Number((await conn.getAccountInfo(PROPERTY)).data.readBigUInt64LE(186));

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

// 画面と同じ並びで create_vault の引数を組み立てる（引数は変更なし。アカウントの最後に物件が加わった）
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
    acc(parent.publicKey, false, true), acc(operator.publicKey), acc(MINT), acc(parentAta, true),
    acc(sponsor.publicKey, true, true), acc(vault, true), acc(vaultToken, true), acc(TOKEN), acc(SystemProgram.programId), acc(PROPERTY),
  ], args);
  return { vault, vaultToken, create };
}
const releaseIx = (v) => ix("release", [acc(v.vault, true), acc(v.vaultToken, true), acc(PROPERTY_VAULT, true), acc(TOKEN)]);
const confirmIx = (v, parentSigns = true) =>
  ix("confirm_move_in", [acc(operator.publicKey, false, true), acc(v.vault, true), acc(parent.publicKey, false, parentSigns)]);
const moveOutIx = (v) => ix("move_out", [
  acc(parent.publicKey, false, true), acc(operator.publicKey, false, true), acc(v.vault, true),
  acc(v.vaultToken, true), acc(parentAta, true), acc(TOKEN),
]);
const refundIx = (v) => ix("refund_unconfirmed", [
  acc(parent.publicKey, false, true), acc(v.vault, true), acc(v.vaultToken, true), acc(parentAta, true), acc(TOKEN),
]);
const distributeIx = (signer, holders = HOLDERS) => ix("distribute", [
  acc(signer.publicKey, false, true), acc(PROPERTY, true), acc(PROPERTY_VAULT, true),
  acc(MANAGER_TOKEN, true), acc(FEE_TOKEN, true), acc(TOKEN),
  ...holders.map((h) => acc(h.token, true)),
]);

// 画面と同じ計算で、分配の期待値を出す
function expectedSplit(gross) {
  const part = (bps) => Math.floor((gross * bps) / 10_000);
  const manager = part(1000), fee = part(300), reserve = part(1700);   // 管理会社10%・利用料3%・金庫に残す17%（修繕積立10%＋その他費用7%）
  const net = gross - manager - fee - reserve;
  const shares = HOLDERS.map((h) => Math.floor((net * h.units) / 1000));
  return { manager, fee, kept: reserve + (net - shares.reduce((a, c) => a + c, 0)), shares };
}

const WEEKLY = 213_000_000; // 213 USDC（週300 AUD）
console.log("Program ID:", PID.toBase58());
console.log("Property  :", PROPERTY.toBase58());

// --- シナリオA: 入金 → 入居確認（親＋管理会社） → 4週分を金庫へ → 分配 → 途中退去 ---
const a = newVault({ weekly: WEEKLY, weeks: 6, interval: 2, deadlineIn: 300 });
const pa0 = await bal(parentAta);

await send([a.create], [parent]);
expectEq(await bal(a.vaultToken), WEEKLY * 6, "create_vault: 6週分がエスクローに入った");

await expectError(send([releaseIx(a)], []), "NotConfirmed", "release: 入居確認の前は払い出せない");
await expectError(send([confirmIx(a, false)], [operator]), "AccountNotSigner", "confirm_move_in: 親の署名がないと通らない");

// 分配の総額をこのシナリオの家賃だけにするため、先に金庫に残っている分（修繕積立を除く）を分配しておく
if ((await bal(PROPERTY_VAULT)) > (await reserveBalance())) await send([distributeIx(authority)], [authority]);

const pv0 = await bal(PROPERTY_VAULT);
await send([confirmIx(a), releaseIx(a)], [parent, operator]);
expectEq((await bal(PROPERTY_VAULT)) - pv0, WEEKLY, "confirm_move_in + release: 初週分がSPV金庫に届いた");
for (let w = 2; w <= 4; w++) {
  await sleep(2500);
  await send([releaseIx(a)], []);
}
expectEq((await bal(PROPERTY_VAULT)) - pv0, WEEKLY * 4, "release: 4週分がSPV金庫に届いた");

await expectError(send([distributeIx(operator)], [operator]), "ConstraintHasOne", "distribute: ST業者以外は分配できない");
await expectError(send([distributeIx(authority, [...HOLDERS].reverse())], [authority]), "WrongHolderAccount",
  "distribute: 名簿と違う口座には送れない");

const gross = (await bal(PROPERTY_VAULT)) - (await reserveBalance());
const exp = expectedSplit(gross);
const m0 = await bal(MANAGER_TOKEN), f0 = await bal(FEE_TOKEN), r0 = await reserveBalance();
const h0 = await Promise.all(HOLDERS.map((h) => bal(h.token)));
await send([distributeIx(authority)], [authority]);
expectEq((await bal(MANAGER_TOKEN)) - m0, exp.manager, `distribute: 管理費 10%（${exp.manager / 1e6} USDC）が管理会社に届いた`);
expectEq((await bal(FEE_TOKEN)) - f0, exp.fee, `distribute: 利用料 3%（${exp.fee / 1e6} USDC）がStayVaultに届いた`);
expectEq((await reserveBalance()) - r0, exp.kept, `distribute: 修繕積立とその他費用 17%（${exp.kept / 1e6} USDC）が金庫に残った`);
for (let i = 0; i < HOLDERS.length; i++) {
  expectEq((await bal(HOLDERS[i].token)) - h0[i], exp.shares[i], `distribute: ${HOLDERS[i].name} に ${exp.shares[i] / 1e6} USDC`);
}
await expectError(send([distributeIx(authority)], [authority]), "NothingToDistribute", "distribute: 分配する額がなければ通らない");

await send([moveOutIx(a)], [parent, operator]);
expectEq(await bal(a.vaultToken), 0, "move_out: エスクローが空になった");
expectEq(pa0 - (await bal(parentAta)), WEEKLY * 4, "move_out: 未払いの2週分が親に戻った");
await expectError(send([releaseIx(a)], []), "Closed", "release: 退去後は払い出せない");

// --- シナリオB: 期限までに入居確認がなければ、親だけで全額を取り戻せる ---
const b = newVault({ weekly: WEEKLY, weeks: 2, interval: 2, deadlineIn: 5 });
const pb0 = await bal(parentAta);
await send([b.create], [parent]);
await expectError(send([refundIx(b)], [parent]), "DeadlineNotPassed", "refund_unconfirmed: 期限前は返金できない");
console.log("   入居確認の期限が過ぎるのを20秒待つ…");
await sleep(20000);
await send([refundIx(b)], [parent]);
expectEq(await bal(parentAta), pb0, "refund_unconfirmed: 全額が親に戻った");

expectEq(await conn.getBalance(parent.publicKey), 0, "親の SOL は 0 のまま（手数料と口座の作成費用は StayVault役が払った）");

console.log("\nすべて通りました。プログラムと画面の命令組み立ては設計どおりに動いています。");
