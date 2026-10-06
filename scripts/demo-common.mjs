// デモ用の財布・テスト用USDC・物件（SPV金庫と投資家名簿つき）をまとめて作る共通処理。
// setup-demo.mjs（手元用）と make-public-demo.mjs（公開用）の両方から使う。
// 物件の料率と投資家の口数は、画面（app/stayvault.html の DORMS）と同じ値にそろえる。
import crypto from "node:crypto";
import {
  Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const PROPERTY = {
  managerBps: 900,   // 管理費 9%
  reserveBps: 300,   // 修繕積立 3%（金庫に残す）
  feeBps: 100,       // StayVault の手数料 1%
  totalUnits: 1000,
  holders: [
    { name: "Investor A", units: 400 },
    { name: "Investor B", units: 250 },
    { name: "Investor C", units: 200 },
    { name: "Investor D", units: 100 },
    { name: "Investor E", units: 50 },
  ],
};

const disc = (name) => crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8);
const acc = (pubkey, isWritable = false, isSigner = false) => ({ pubkey, isWritable, isSigner });

/**
 * conn: Connection、funder: SOL とテスト用USDC の発行権限を持つ財布（~/.config/solana/id.json）
 * solForParent: 親役に渡す SOL（取引手数料はすべて親役が払う）、usdcForParent: 親役に入れるテスト用USDC
 * solForOperator: 管理会社役に渡す SOL（e2e 用。公開デモでは 0）
 */
export async function createDemo({ conn, funder, programId, solForParent, usdcForParent, solForOperator = 0 }) {
  const PID = new PublicKey(programId);
  const parent = Keypair.generate();
  const operator = Keypair.generate();    // 管理会社役（入居確認と退去に署名）
  const authority = Keypair.generate();   // ST業者役（物件の権限者。distribute に署名）
  const feeOwner = Keypair.generate();    // StayVault の手数料の受取先（公開鍵だけ使う）
  const investors = PROPERTY.holders.map(() => Keypair.generate()); // 投資家（公開鍵だけ使う）

  await sendAndConfirmTransaction(conn, new Transaction().add(SystemProgram.transfer({
    fromPubkey: funder.publicKey, toPubkey: parent.publicKey, lamports: Math.round(solForParent * LAMPORTS_PER_SOL),
  })), [funder]);
  // 管理会社役は署名するだけなので通常は SOL 不要。e2e の「親の署名なし」の確認でだけ手数料を払う
  if (solForOperator > 0) {
    await sendAndConfirmTransaction(conn, new Transaction().add(SystemProgram.transfer({
      fromPubkey: funder.publicKey, toPubkey: operator.publicKey, lamports: Math.round(solForOperator * LAMPORTS_PER_SOL),
    })), [funder]);
  }

  // テスト用USDC（小数6桁）。発行権限は funder に残るので、公開された鍵で勝手に発行されることはない
  const mint = await createMint(conn, funder, funder.publicKey, null, 6);
  const ata = async (owner) => (await getOrCreateAssociatedTokenAccount(conn, funder, mint, owner)).address;
  const parentAta = await ata(parent.publicKey);
  const managerToken = await ata(operator.publicKey);
  const feeToken = await ata(feeOwner.publicKey);
  const holderTokens = [];
  for (const k of investors) holderTokens.push(await ata(k.publicKey));
  await mintTo(conn, funder, mint, parentAta, funder, usdcForParent * 1_000_000);

  // init_property: 物件・SPV金庫・料率・投資家名簿を一度に登録する
  const propertyId = BigInt(Date.now());
  const idLe = Buffer.alloc(8); idLe.writeBigUInt64LE(propertyId);
  const property = PublicKey.findProgramAddressSync([Buffer.from("property"), authority.publicKey.toBuffer(), idLe], PID)[0];
  const propertyVault = PublicKey.findProgramAddressSync([Buffer.from("property_vault"), property.toBuffer()], PID)[0];

  const head = Buffer.alloc(8 + 2 + 2 + 2 + 4 + 4);
  let o = 0;
  head.writeBigUInt64LE(propertyId, o); o += 8;
  head.writeUInt16LE(PROPERTY.managerBps, o); o += 2;
  head.writeUInt16LE(PROPERTY.reserveBps, o); o += 2;
  head.writeUInt16LE(PROPERTY.feeBps, o); o += 2;
  head.writeUInt32LE(PROPERTY.totalUnits, o); o += 4;
  head.writeUInt32LE(PROPERTY.holders.length, o);            // Vec<Holder> の長さ
  const body = Buffer.concat(PROPERTY.holders.map((h, i) => {
    const b = Buffer.alloc(36); holderTokens[i].toBuffer().copy(b, 0); b.writeUInt32LE(h.units, 32); return b;
  }));
  const initIx = new TransactionInstruction({
    programId: PID,
    data: Buffer.concat([disc("init_property"), head, body]),
    keys: [
      acc(funder.publicKey, true, true), acc(authority.publicKey, false, true), acc(operator.publicKey), acc(mint),
      acc(managerToken), acc(feeToken), acc(property, true), acc(propertyVault, true),
      acc(TOKEN_PROGRAM_ID), acc(SystemProgram.programId),
    ],
  });
  await sendAndConfirmTransaction(conn, new Transaction().add(initIx), [funder, authority]);

  return {
    programId,
    mint: mint.toBase58(),
    parent: Array.from(parent.secretKey),
    operator: Array.from(operator.secretKey),
    authority: Array.from(authority.secretKey),
    property: property.toBase58(),
    propertyVault: propertyVault.toBase58(),
    managerToken: managerToken.toBase58(),
    feeToken: feeToken.toBase58(),
    holders: PROPERTY.holders.map((h, i) => ({ ...h, owner: investors[i].publicKey.toBase58(), token: holderTokens[i].toBase58() })),
  };
}
