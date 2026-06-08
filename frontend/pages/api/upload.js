import { pinata } from "../../lib/pinata";

export const config = {
  api: {
    bodyParser: false, // we handle multipart manually
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse the incoming multipart form data
    const { IncomingForm } = await import("formidable");
    const form = new IncomingForm();

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // ─── Upload photo to IPFS ───────────────────────────────────────────────
    const photoFile = files.photo[0];
    const fileStream = (await import("fs")).createReadStream(photoFile.filepath);
    const blob = new Blob([await streamToBuffer(fileStream)], {
      type: photoFile.mimetype,
    });
    const file = new File([blob], photoFile.originalFilename, {
      type: photoFile.mimetype,
    });

    const photoUpload = await pinata.upload.file(file);
    const photoCid = photoUpload.IpfsHash;

    // ─── Build and upload metadata JSON ────────────────────────────────────
    const metadata = JSON.parse(fields.metadata[0]);
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

    const metadataUpload = await pinata.upload.json(evidenceMetadata);
    const metadataCid = metadataUpload.IpfsHash;

    return res.status(200).json({
      photoCid,
      metadataCid,
      photoUrl: `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${photoCid}`,
      metadataUrl: `${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${metadataCid}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Helper: convert a readable stream to a Buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
