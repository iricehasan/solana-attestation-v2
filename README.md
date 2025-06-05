# 🔐 Solana Attestation Decoder

This project uses the [`sas-lib`](https://attest.solana.com/docs) package and `@solana/kit` to parse Solana block data and decode on-chain [SAS (Solana Attestation Service)](https://attest.solana.com/) accounts such as:

- 🧾 **Credential**
- 📜 **Schema**
- 🔐 **Attestation**

---

## 📦 Features

- Parses a given Solana block (from `.json` file)
- Identifies `createAccount` instructions for the SAS program
- Attempts to decode the resulting account as:
  - Credential
  - Schema
  - Attestation
- Logs structured decoded data to console

---

## 📁 Example Output

```typescript
✅ Matching createAccount instruction found:
🔹 owner: 22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG
🔹 newAccount: 4baXrisP9WUNASnuUHH2hoLmbSMssb59yGrSgjQCnTgq
🔍 Fetching decoded data for 4baXrisP9WUNASnuUHH2hoLmbSMssb59yGrSgjQCnTgq
🔐 Attestation: {
  executable: false,
  lamports: 2442960n,
  programAddress: '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG',
  space: 223n,
  address: '4baXrisP9WUNASnuUHH2hoLmbSMssb59yGrSgjQCnTgq',
  data: {
    discriminator: 2,
    nonce: 'Ex2x3p2sw9nMBJWuvgqvnEYUY6vVRg2AQsZRTysxe8fj',
    credential: 'Fz2oPU8q69BMmPXVhVzgSuBv4AHoJWmVL41GfofNZ7sP',
    schema: '6ahfuwpn7wXvhrWNT2D1Tinj7wuzQm1duTvHABRCCSwD',
    data: Uint8Array(50) [
       44,   0,   0,   0,  50,  70, 86, 77, 122, 102,
      102,  51, 116,  80,  66,  68, 85, 69,  52,  74,
      104, 114,  99,  52,  52, 103, 90, 80, 117, 117,
      101,  74, 116,  69, 120,  85, 56, 57, 121,  51,
      117,  54, 121, 103, 119, 105, 88, 54,   1,   0
    ],
    signer: 'A4XZKV1xpqtsvirDVAL2qbdQ7bKW6DXPkrUF8fRKtft9',
    expiry: 1751651587n,
    tokenAccount: '11111111111111111111111111111111'
  },
  exists: true
}
```
