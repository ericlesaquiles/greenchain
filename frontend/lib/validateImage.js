/**
 * Converts a File to base64 string.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates a photo against the selected waste category using AI.
 *
 * @param {File} photoFile
 * @param {string} category - e.g. "Plastic", "Paper", etc.
 * @returns {Promise<{valid, confidence, reason, detected}>}
 */
export async function validateImage(photoFile, category) {
  const imageBase64 = await fileToBase64(photoFile);

  const response = await fetch("/api/validate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      mimeType: photoFile.type,
      category,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Validation failed");
  }

  return response.json();
}
