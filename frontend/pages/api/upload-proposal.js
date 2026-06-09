export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { IncomingForm } = await import("formidable");
    const form = new IncomingForm();

    const { fields } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { PinataSDK } = await import("pinata-web3");
    const pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
    });

    const metadata = JSON.parse(fields.metadata[0]);
    const upload = await pinata.upload.json(metadata);

    return res.status(200).json({ cid: upload.IpfsHash });
  } catch (err) {
    console.error("Proposal upload error:", err);
    return res.status(500).json({ error: err.message });
  }
}
