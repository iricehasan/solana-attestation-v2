import { Connection, PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { Buffer } from "buffer";
import { readFileSync } from "fs";
import fetch from "node-fetch";
import path from "path";

const filePath = path.resolve(__dirname, "./data/response.json");
const raw = readFileSync(filePath, "utf-8");
const blockData = JSON.parse(raw);
// ----------------------------------
// ENUM: Account Types
// ----------------------------------
enum Tag {
  Credential = 0,
  Schema = 1,
  Attestation = 2,
}

// ----------------------------------
// Helpers for decoding Solana account data
// ----------------------------------
function readPubkey(buf: Buffer, off: number): [string, number] {
  const slice = buf.slice(off, off + 32);
  return [new PublicKey(slice as PublicKeyInitData).toBase58(), off + 32];
}

function readString(buf: Buffer, off: number): [string, number] {
  const len = buf.readUInt32LE(off);
  off += 4;
  const str = buf.slice(off, off + len).toString("utf8");
  return [str, off + len];
}

function toBuffer(data: any): Buffer {
  if (!data) throw new Error("account.data is undefined");
  if (Array.isArray(data) && typeof data[0] === "string") {
    const [b64, enc] = data as [string, string];
    return Buffer.from(b64, enc as BufferEncoding);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data as Uint8Array);
  }
  throw new Error("Unsupported account.data format");
}

// ----------------------------------
// Manual Decoders
// ----------------------------------
function decodeAttestation(buf: Buffer) {
  let off = 1;
  const [nonce, off1] = readPubkey(buf, off);
  off = off1;
  const [credential, off2] = readPubkey(buf, off);
  off = off2;
  const [schema, off3] = readPubkey(buf, off);
  off = off3;
  const [data, newOff] = readString(buf, off);
  off = newOff;
  const [signer, off4] = readPubkey(buf, off);
  off = off4;
  const expiryI64 = buf.readBigInt64LE(off);
  off += 8;
  const expiryDate =
    expiryI64 === BigInt(0)
      ? null
      : new Date(Number(expiryI64) * 1000).toISOString();
  const [tokenAccount] = readPubkey(buf, off);

  return {
    type: "Attestation",
    nonce,
    credential,
    schema,
    data,
    signer,
    expiry: expiryI64.toString(),
    expiryDate,
    tokenAccount,
  };
}

function decodeCredential(buf: Buffer) {
  let off = 1;
  const [authority, off1] = readPubkey(buf, off);
  off = off1;
  const [name, off2] = readString(buf, off);
  off = off2;
  const count = buf.readUInt32LE(off);
  off += 4;
  const authorizedSigners: string[] = [];
  for (let i = 0; i < count; i++) {
    const slice = buf.slice(off, off + 32);
    authorizedSigners.push(
      new PublicKey(slice as PublicKeyInitData).toBase58()
    );
    off += 32;
  }
  return {
    type: "Credential",
    authority,
    name,
    authorizedSigners,
  };
}

function decodeSchema(buf: Buffer) {
  let off = 1;
  const [cred, off1] = readPubkey(buf, off);
  off = off1;
  const [name, off2] = readString(buf, off);
  off = off2;
  const [desc, off3] = readString(buf, off);
  off = off3;
  const [layout, off4] = readString(buf, off);
  off = off4;
  const [fields, off5] = readString(buf, off);
  off = off5;
  const isPaused = buf.readUInt8(off) === 1;
  off += 1;
  const version = buf.readUInt8(off);
  off += 1;

  return {
    type: "Schema",
    credential: cred,
    name,
    description: desc,
    layout,
    fieldNames: fields,
    isPaused,
    version,
  };
}

// ----------------------------------
// Main Function
// ----------------------------------
(async () => {
  const conn = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const PROGRAM_ID = new PublicKey(
    "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG"
  );

  let newAccountAddress: PublicKey | null = null;

  for (const tx of blockData.block.transactions || []) {
    for (const innerIx of tx.meta?.innerInstructions || []) {
      for (const ix of innerIx.instructions || []) {
        if (
          ix.programId === "11111111111111111111111111111111" && // system program
          ix.parsed?.type === "createAccount" // ⚠️ parsed might not exist in inner
        ) {
          const owner = ix.parsed.info?.owner;
          const newAccount = ix.parsed.info?.newAccount;

          if (owner === PROGRAM_ID.toBase58() && newAccount) {
            console.log("✅ Matching createAccount instruction found:");
            console.log("🔹 owner:", owner);
            console.log("🔹 newAccount:", newAccount);

            newAccountAddress = new PublicKey(newAccount);
            console.log(
              `✅ Parsed newAccount: ${newAccountAddress.toBase58()}`
            );
            break;
          }
        }
      }
      if (newAccountAddress) break;
    }
    if (newAccountAddress) break;
  }

  if (!newAccountAddress) {
    console.error("❌ No matching newAccount found in block.");
    return;
  }

  const accountInfo = await conn.getAccountInfo(newAccountAddress);
  if (!accountInfo) {
    console.error("❌ Account not found on-chain.");
    return;
  }

  const buf = toBuffer(accountInfo.data);
  const tag = buf.readUInt8(0);
  let decoded;

  switch (tag) {
    case Tag.Attestation:
      decoded = decodeAttestation(buf);
      break;
    case Tag.Credential:
      decoded = decodeCredential(buf);
      break;
    case Tag.Schema:
      decoded = decodeSchema(buf);
      break;
    default:
      throw new Error(`Unknown tag: ${tag}`);
  }

  console.log(`🎉 Decoded account data:`);
  console.dir(decoded, { depth: null });
})();
