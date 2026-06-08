export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, mimeType, category } = req.body;

    if (!imageBase64 || !mimeType || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `You are a recycling evidence validator for an environmental impact platform.

Analyze this image and determine whether it plausibly shows a recycling action for the category: "${category}".

Categories and what counts as valid evidence:
- Plastic: plastic bottles, containers, packaging, bags, PET items
- Paper: newspapers, cardboard boxes, paper packaging, books, magazines
- Metal: cans, tins, metal containers, aluminum items, scrap metal
- Glass: glass bottles, jars, broken glass for recycling
- Organic: food waste, garden waste, compostable materials

Respond ONLY with a JSON object, no preamble, no markdown, no backticks:
{
  "valid": true or false,
  "confidence": "high", "medium", or "low",
  "reason": "one sentence explaining your assessment",
  "detected": "brief description of what you see in the image"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(500).json({ error: "Image validation service unavailable" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("Gemini raw response:", text);

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Validation error:", err);
    return res.status(500).json({ error: err.message });
  }
}
