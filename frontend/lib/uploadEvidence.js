import { pinata } from "./pinata";

/**
 * Uploads a photo and metadata to IPFS via Pinata.
 *
 * @param {File} photoFile       - The photo file captured at the discard point
 * @param {Object} metadata      - Discard metadata to store alongside the photo
 * @param {string} metadata.citizenAddress  - Wallet address of the citizen
 * @param {string} metadata.operatorAddress - Wallet address of the operator
 * @param {string} metadata.category        - Waste category (e.g. "Plastic")
 * @param {number} metadata.weightKg        - Estimated weight in kg
 * @param {string} metadata.location        - Human-readable location description
 *
 * @returns {Promise<string>} The CID of the metadata JSON — this is what gets stored on-chain
 */
export async function uploadEvidence(photoFile, metadata) {
  // ─── 1. Upload the photo ─────────────────────────────────────────────────
  console.log("Uploading photo to IPFS...");
  const photoUpload = await pinata.upload.file(photoFile);
  const photoCid = photoUpload.IpfsHash;
  console.log("Photo CID:", photoCid);

  // ─── 2. Build the metadata JSON ──────────────────────────────────────────
  const evidenceMetadata = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    citizen: metadata.citizenAddress,
    operator: metadata.operatorAddress,
    category: metadata.category,
    weightKg: metadata.weightKg,
    location: metadata.location,
    photo: {
      cid: photoCid,
      url: `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${photoCid}`,
    },
  };

  // ─── 3. Upload the metadata JSON ─────────────────────────────────────────
  console.log("Uploading metadata to IPFS...");
  const metadataUpload = await pinata.upload.json(evidenceMetadata);
  const metadataCid = metadataUpload.IpfsHash;
  console.log("Metadata CID:", metadataCid);

  // ─── 4. Return the metadata CID — this is what goes on-chain ─────────────
  return metadataCid;
}

/**
 * Builds a public gateway URL for any CID.
 *
 * @param {string} cid - IPFS CID
 * @returns {string} Full URL to access the content
 */
export function ipfsUrl(cid) {
  return `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${cid}`;
}
