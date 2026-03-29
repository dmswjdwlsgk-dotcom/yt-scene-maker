// src/components/ImageSearchModal.jsx
import { useState, useEffect } from "react";
import {
  pexelsSearchImages, pexelsSearchVideos,
  pixabaySearchImages, pixabaySearchVideos,
  fetchImageAsBase64,
} from "../lib/search.js";

const RESULTS_PER_PAGE = 9;

const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 16,
  },
  modal: {
    background: "#1A1D27",
    borderRadius: 20,
    width: "100%", maxWidth: 800,
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #1E2430",
    flexShrink: 0,
  },
  body: {
    flex: 1, overflowY: "auto",
    padding: "16px 24px",
  },
  footer: {
    padding: "14px 24px",
    borderTop: "1px solid #1E2430",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "inherit",
  },
  searchBtn: {
    padding: "10px 20px",
    background: "linear-gradient(90deg, #F97316, #EF4444)",
    border: "none", borderRadius: 10,
    color: "#fff", fontWeight: 700, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
    flexShrink: 0,
  },
  tabBtn: (active) => ({
    padding: "7px 16px",
    background: active ? "rgba(249,115,22,0.15)" : "transparent",
    border: active ? "1px solid #F97316" : "1px solid #1E2430",
    borderRadius: 8, cursor: "pointer",
    color: active ? "#F97316" : "#9CA3AF",
    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  card: (selected) => ({
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    border: selected ? "3px solid #F97316" : "2px solid transparent",
    position: "relative",
    aspectRatio: "16/9",
    background: "#0E1117",
    transition: "transform 0.15s, border-color 0.15s",
  }),
  img: {
    width: "100%", height: "100%",
    objectFit: "cover", display: "block",
  },
  pageBtn: (disabled) => ({
    padding: "8px 16px",
    background: disabled ? "#1E2430" : "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 8,
    color: disabled ? "#4B5563" : "#D1D5DB",
    fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }),
};

export default function ImageSearchModal({ onClose, onSelect, initialQuery = "", pexelsKey = "", pixabayKey = "", aspectRatio = "16:9" }) {
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState(pexelsKey ? "pexels" : "pixabay");
  const [mediaType, setMediaType] = useState("image");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [applying, setApplying] = useState(false);

  // Determine orientation
  const orientation = aspectRatio === "9:16" ? "portrait" : aspectRatio === "1:1" ? "squarish" : "landscape";

  async function doSearch(pageNum = 1) {
    const q = query.trim();
    if (!q) return;

    const apiKey = source === "pexels" ? pexelsKey : pixabayKey;
    if (!apiKey) {
      setError(`${source === "pexels" ? "Pexels" : "Pixabay"} API 키가 설정되지 않았습니다. API 키 관리에서 입력해주세요.`);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSelectedItem(null);

    try {
      let items = [];
      if (source === "pexels") {
        if (mediaType === "image") {
          items = await pexelsSearchImages(apiKey, q, RESULTS_PER_PAGE, orientation);
        } else {
          items = await pexelsSearchVideos(apiKey, q, RESULTS_PER_PAGE, orientation);
        }
      } else {
        if (mediaType === "image") {
          items = await pixabaySearchImages(apiKey, q, RESULTS_PER_PAGE, orientation);
        } else {
          items = await pixabaySearchVideos(apiKey, q, RESULTS_PER_PAGE);
        }
      }
      setResults(items);
      setPage(pageNum);
      setTotalPages(items.length === RESULTS_PER_PAGE ? pageNum + 1 : pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-search on open if initial query is provided
  useEffect(() => {
    if (initialQuery.trim()) {
      doSearch(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getThumbnail(item) {
    if (source === "pexels") {
      if (mediaType === "image") {
        return item.src?.medium || item.src?.original;
      } else {
        // Pexels video thumbnail
        return item.image || item.video_files?.[0]?.link;
      }
    } else {
      // Pixabay
      if (mediaType === "image") {
        return item.previewURL || item.webformatURL;
      } else {
        return item.videos?.tiny?.url || item.previewURL;
      }
    }
  }

  function getFullUrl(item) {
    if (source === "pexels") {
      if (mediaType === "image") {
        return item.src?.large2x || item.src?.large || item.src?.original;
      } else {
        const hd = item.video_files?.find((f) => f.quality === "hd") || item.video_files?.[0];
        return hd?.link;
      }
    } else {
      if (mediaType === "image") {
        return item.largeImageURL || item.webformatURL;
      } else {
        return item.videos?.large?.url || item.videos?.medium?.url || item.videos?.small?.url;
      }
    }
  }

  async function handleApply() {
    if (!selectedItem) return;
    setApplying(true);
    try {
      if (mediaType === "image") {
        const url = getFullUrl(selectedItem);
        const base64 = await fetchImageAsBase64(url);
        onSelect({ type: "image", base64, url });
      } else {
        const url = getFullUrl(selectedItem);
        onSelect({ type: "video", url });
      }
      onClose();
    } catch (err) {
      setError(`선택 실패: ${err.message}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              🔍 이미지 / 영상 검색
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "#2D3748", border: "none", borderRadius: 8,
                width: 32, height: 32, cursor: "pointer", color: "#9CA3AF",
                fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              style={S.input}
              placeholder="검색어 입력..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch(1)}
            />
            <button onClick={() => doSearch(1)} disabled={loading} style={{ ...S.searchBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "검색 중..." : "검색"}
            </button>
          </div>

          {/* Source + Type tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>출처</span>
              <button onClick={() => setSource("pexels")} style={S.tabBtn(source === "pexels")}>
                Pexels
              </button>
              <button onClick={() => setSource("pixabay")} style={S.tabBtn(source === "pixabay")}>
                Pixabay
              </button>
            </div>
            <div style={{ width: 1, background: "#1E2430", margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>유형</span>
              <button onClick={() => setMediaType("image")} style={S.tabBtn(mediaType === "image")}>
                이미지
              </button>
              <button onClick={() => setMediaType("video")} style={S.tabBtn(mediaType === "video")}>
                영상
              </button>
            </div>
          </div>
        </div>

        {/* Body - results */}
        <div style={S.body}>
          {error && (
            <div style={{
              padding: "12px 14px", background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10,
              color: "#FCA5A5", fontSize: 13, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6B7280" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
              <div>검색 중...</div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6B7280" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14 }}>검색어를 입력하고 검색 버튼을 누르세요</div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={S.grid}>
              {results.map((item, idx) => {
                const thumb = getThumbnail(item);
                const isSelected = selectedItem === item;
                return (
                  <div
                    key={item.id || idx}
                    style={S.card(isSelected)}
                    onClick={() => setSelectedItem(item)}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.transform = "scale(1.02)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        style={S.img}
                        loading="lazy"
                      />
                    )}
                    {isSelected && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(249,115,22,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "#F97316", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                        }}>
                          ✓
                        </div>
                      </div>
                    )}
                    {mediaType === "video" && (
                      <div style={{
                        position: "absolute", bottom: 6, right: 6,
                        background: "rgba(0,0,0,0.7)", borderRadius: 4,
                        padding: "2px 6px", fontSize: 10, color: "#fff",
                      }}>
                        영상
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - pagination + apply */}
        <div style={S.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => doSearch(page - 1)}
              disabled={page <= 1 || loading}
              style={S.pageBtn(page <= 1 || loading)}
            >
              ← 이전
            </button>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              {page} 페이지
            </span>
            <button
              onClick={() => doSearch(page + 1)}
              disabled={results.length < RESULTS_PER_PAGE || loading}
              style={S.pageBtn(results.length < RESULTS_PER_PAGE || loading)}
            >
              다음 →
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedItem && (
              <span style={{ fontSize: 12, color: "#34D399" }}>1개 선택됨</span>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", background: "transparent",
                border: "1px solid #1E2430", borderRadius: 10,
                color: "#9CA3AF", fontSize: 13, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              취소
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedItem || applying}
              style={{
                padding: "9px 22px",
                background: selectedItem ? "linear-gradient(90deg, #F97316, #EF4444)" : "#374151",
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: selectedItem ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                opacity: applying ? 0.7 : 1,
              }}
            >
              {applying ? "적용 중..." : "선택 적용"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
