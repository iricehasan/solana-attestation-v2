import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import path from "path";
import {
  fetchMaybeAttestation,
  fetchMaybeCredential,
  fetchMaybeSchema,
  deserializeAttestationData,
  convertSasSchemaToBorshSchema,
} from "sas-lib";
import { createSolanaRpc, mainnet, Address } from "@solana/kit";

const filePath = path.resolve(__dirname, "./data/response.json");
const raw = readFileSync(filePath, "utf-8");
const blockData = JSON.parse(raw);

// ----------------------------------
// Main Function
// ----------------------------------
(async () => {
  const PROGRAM_ID = new PublicKey(
    "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG"
  );

  let newAccountAddress: PublicKey | null = null;

  for (const tx of blockData.block.transactions || []) {
    for (const innerIx of tx.meta?.innerInstructions || []) {
      for (const ix of innerIx.instructions || []) {
        if (
          ix.programId === "11111111111111111111111111111111" &&
          ix.parsed?.type === "createAccount"
        ) {
          const owner = ix.parsed.info?.owner;
          const newAccount = ix.parsed.info?.newAccount;

          if (owner === PROGRAM_ID.toBase58() && newAccount) {
            console.log("✅ Matching createAccount instruction found:");
            console.log("🔹 owner:", owner);
            console.log("🔹 newAccount:", newAccount);

            newAccountAddress = new PublicKey(newAccount);
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

  console.log(`🔍 Fetching decoded data for ${newAccountAddress}`);

  async function tryFetch<T>(fn: () => Promise<T | null>): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      return null;
    }
  }

  // This is required for sas-lib functions as solana/web3.js Connection does not match in type
  const rpc = createSolanaRpc(mainnet("https://api.mainnet-beta.solana.com"));

  const newAddress = newAccountAddress.toBase58() as Address<string>;
  const [cred, schema, attestation] = await Promise.all([
    tryFetch(() => fetchMaybeCredential(rpc, newAddress)),
    tryFetch(() => fetchMaybeSchema(rpc, newAddress)),
    tryFetch(() => fetchMaybeAttestation(rpc, newAddress)),
  ]);

  if (cred?.exists) {
    console.log("🧾 Credential:", cred);
  } else if (schema?.exists) {
    console.log("📜 Schema:", schema);
  } else if (attestation?.exists) {
    console.log("🔐 Attestation:", attestation);

    const schemaAddress = attestation.data.schema as Address<string>;
    const schema = await tryFetch(() => fetchMaybeSchema(rpc, schemaAddress));

    if (schema?.exists) {
      const attestationData = deserializeAttestationData(
        schema.data,
        new Uint8Array(attestation.data.data)
      );
      console.log("📦 Parsed Attestation Fields:", attestationData);
      const schemaData = convertSasSchemaToBorshSchema(schema.data);
      console.log("📦 Parsed Schema Fields:", schemaData);
    } else {
      console.warn("⚠️ Schema not found for attestation.");
    }
  } else {
    console.log("❌ No matching SAS account type found.");
  }
})();
