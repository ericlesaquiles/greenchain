export default function handler(req, res) {
  const jwt = process.env.PINATA_JWT;
  res.status(200).json({
    length: jwt?.length,
    firstChars: jwt?.substring(0, 20),
    lastChars: jwt?.substring(jwt.length - 20),
    segments: jwt?.split(".").length,
  });
}
