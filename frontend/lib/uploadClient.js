/**
 * Calls the /api/upload route with a photo file and metadata.
 * Keeps the Pinata JWT server-side only.
 *
 * @param {File} photoFile
 * @param {Object} metadata
 * @returns {Promise<{photoCid, metadataCid, photoUrl, metadataUrl}>}
 */
export async function uploadEvidenceClient(photoFile, metadata) {
  const formData = new FormData();
  formData.append("photo", photoFile);
  formData.append("metadata", JSON.stringify(metadata));

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Upload failed");
  }

  return response.json();
}
