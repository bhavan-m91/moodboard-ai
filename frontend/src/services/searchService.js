/**
 * SSE search service — POST-based streaming via ReadableStream.
 * Yields parsed event objects as they arrive from the backend.
 */

const API_BASE = "/api";

/**
 * @param {string} prompt
 * @param {string} projectName
 * @param {boolean} includeInternal
 * @yields {{ type: string, data?: any, message?: string, total?: number }}
 */
export async function* streamSearch(prompt, projectName = "", includeInternal = false) {
  const response = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, project_name: projectName, include_internal: includeInternal }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Search failed (${response.status}): ${errBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");

    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // SSE lines start with "data: "
      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6);
        try {
          const event = JSON.parse(jsonStr);
          yield event;
        } catch {
          // Malformed JSON — skip silently
        }
      }
    }
  }

  // Process any remaining data in buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ")) {
      try {
        yield JSON.parse(trimmed.slice(6));
      } catch {
        // skip
      }
    }
  }
}

/**
 * @param {string} originalPrompt
 * @param {string} followUp
 * @param {string[]} currentTags
 * @param {string} projectName
 * @param {boolean} includeInternal
 * @yields {{ type: string, data?: any, message?: string, total?: number, mode?: string, explanation?: string }}
 */
export async function* streamChat(originalPrompt, followUp, currentTags, projectName = "", includeInternal = false) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      original_prompt: originalPrompt, 
      follow_up: followUp, 
      current_tags: currentTags, 
      project_name: projectName,
      include_internal: includeInternal
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Chat search failed (${response.status}): ${errBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");

    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6);
        try {
          const event = JSON.parse(jsonStr);
          yield event;
        } catch {
          // fail silently for streaming fragments
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ")) {
      try {
        yield JSON.parse(trimmed.slice(6));
      } catch {
        // skip
      }
    }
  }
}

/**
 * Save an image to the wishlist backend.
 */
export async function saveToWishlist(projectName, imageResult, notes = "") {
  const response = await fetch(`${API_BASE}/wishlist/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: projectName,
      image_result: imageResult,
      notes,
    }),
  });
  if (!response.ok) throw new Error("Failed to save to wishlist");
  return response.json();
}

/**
 * Get all wishlist items for a project.
 */
export async function getWishlistItems(projectName) {
  const response = await fetch(`${API_BASE}/wishlist/${encodeURIComponent(projectName)}`);
  if (!response.ok) throw new Error("Failed to load wishlist");
  return response.json();
}

/**
 * Delete a wishlist item.
 */
export async function deleteWishlistItem(itemId) {
  const response = await fetch(`${API_BASE}/wishlist/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete item");
  return response.json();
}
