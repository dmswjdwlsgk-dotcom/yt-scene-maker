// src/lib/search.js

// Pexels image search
export async function pexelsSearchImages(apiKey, query, count = 5, orientation) {
  const params = new URLSearchParams({ query, per_page: String(count), size: "large" });
  if (orientation) params.set("orientation", orientation);
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) throw new Error(`Pexels API Error (${res.status})`);
  return (await res.json()).photos;
}

// Pexels video search
export async function pexelsSearchVideos(apiKey, query, count = 3, orientation) {
  const params = new URLSearchParams({ query, per_page: String(count), size: "large" });
  if (orientation) params.set("orientation", orientation);
  const res = await fetch(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) throw new Error(`Pexels Video API Error (${res.status})`);
  return (await res.json()).videos;
}

// Pixabay image search
export async function pixabaySearchImages(apiKey, query, count = 5, orientation) {
  const params = new URLSearchParams({
    key: apiKey,
    q: encodeURIComponent(query),
    per_page: String(count),
    image_type: "photo",
    safesearch: "true",
  });
  if (orientation === "vertical") params.set("orientation", "vertical");
  const res = await fetch(`https://pixabay.com/api/?${params}`);
  if (!res.ok) throw new Error(`Pixabay API Error (${res.status})`);
  return (await res.json()).hits;
}

// Pixabay video search
export async function pixabaySearchVideos(apiKey, query, count = 3) {
  const params = new URLSearchParams({
    key: apiKey,
    q: encodeURIComponent(query),
    per_page: String(count),
    video_type: "film",
    safesearch: "true",
  });
  const res = await fetch(`https://pixabay.com/api/videos/?${params}`);
  if (!res.ok) throw new Error(`Pixabay Video API Error (${res.status})`);
  return (await res.json()).hits;
}

// Get orientation string for aspect ratio
export function getOrientation(aspectRatio) {
  if (aspectRatio === "9:16") return "portrait";
  if (aspectRatio === "1:1") return "squarish";
  return "landscape";
}

// Convert image URL to base64 data URL
export async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("이미지 다운로드 실패");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
