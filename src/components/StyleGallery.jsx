import { STYLES } from "../lib/styles.js";

// Actual preview images (from original app)
const BASE = import.meta.env.BASE_URL;
const STYLE_IMAGES = {
  info:               `${BASE}styles/info.png`,
  issue_youtube:      `${BASE}styles/issue_youtube.png`,
  realistic_stickman: `${BASE}styles/realistic.png`,
  history:            `${BASE}styles/history.png`,
  history_toon:       `${BASE}styles/3d_docu.png`,
  scifi:              `${BASE}styles/scifi.png`,
  paint_explainer:    `${BASE}styles/paint_explainer.png`,
  paint_story:        `${BASE}styles/paint_story.png`,
  comic_realism:      `${BASE}styles/comic_realism.png`,
  senior_real:        `${BASE}styles/senior_real.png`,
  pink_skull:         `${BASE}styles/pink_skull.png`,
  animal_skull:       `${BASE}styles/animal_skull.png`,
  countryball:        `${BASE}styles/countryball.png`,
  real_countryball:   `${BASE}styles/real_countryball.png`,
  manga:              `${BASE}styles/manga.png`,
  game_unreal:        `${BASE}styles/game_unreal.png`,
  photo_docu:         `${BASE}styles/photo_docu.png`,
  webtoon:            `${BASE}styles/webtoon.png`,
  custom:             `${BASE}styles/custom.png`,
};

// Style-specific preview colors and backgrounds (fallback)
const STYLE_PREVIEWS = {
  auto:               { bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", accent: "#e94560" },
  info:               { bg: "linear-gradient(135deg, #fff9c4 0%, #fff176 50%, #ffee58 100%)", accent: "#f57f17" },
  issue_youtube:      { bg: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2d3a4a 100%)", accent: "#4fc3f7" },
  realistic_stickman: { bg: "linear-gradient(135deg, #1a0a00 0%, #2d1700 50%, #3d2200 100%)", accent: "#ff7043" },
  documentary:        { bg: "linear-gradient(135deg, #0d0d0d 0%, #1a1510 50%, #2a1f14 100%)", accent: "#d4a053" },
  history:            { bg: "linear-gradient(135deg, #0a0a1a 0%, #1a1230 50%, #2d1f4a 100%)", accent: "#9575cd" },
  history_toon:       { bg: "linear-gradient(135deg, #1a1500 0%, #2d2600 50%, #3d3200 100%)", accent: "#ffd54f" },
  scifi:              { bg: "linear-gradient(135deg, #001a1a 0%, #002d2d 50%, #003d3d 100%)", accent: "#00e5ff" },
  paint_explainer:    { bg: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 50%, #d0d0d0 100%)", accent: "#333" },
  paint_story:        { bg: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 50%, #ffe082 100%)", accent: "#5d4037" },
  paint_info:         { bg: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)", accent: "#1565c0" },
  paint_economy:      { bg: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)", accent: "#2e7d32" },
  paint_hist_explainer:{ bg: "linear-gradient(135deg, #fbe9e7 0%, #ffccbc 50%, #ffab91 100%)", accent: "#bf360c" },
  comic_realism:      { bg: "linear-gradient(135deg, #1a0020 0%, #2d0040 50%, #3d0060 100%)", accent: "#e040fb" },
  senior_real:        { bg: "linear-gradient(135deg, #1a1210 0%, #2d1f1a 50%, #3d2d24 100%)", accent: "#ffb74d" },
  pink_skull:         { bg: "linear-gradient(135deg, #ff80ab 0%, #ff4081 50%, #f50057 100%)", accent: "#fff" },
  animal_skull:       { bg: "linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)", accent: "#fff" },
  countryball:        { bg: "linear-gradient(135deg, #000 0%, #111 50%, #000 100%)", accent: "#fff" },
  real_countryball:   { bg: "linear-gradient(135deg, #1a2a1a 0%, #2d402d 50%, #3d503d 100%)", accent: "#69f0ae" },
  glamour_countryball:{ bg: "linear-gradient(135deg, #2d0030 0%, #4a004f 50%, #6a0060 100%)", accent: "#f48fb1" },
  webtoon:            { bg: "linear-gradient(135deg, #001233 0%, #011f6e 50%, #023e8a 100%)", accent: "#90e0ef" },
  manga:              { bg: "linear-gradient(135deg, #1a0a2e 0%, #2d1a4a 50%, #4a2d6e 100%)", accent: "#f8bbd0" },
  game_unreal:        { bg: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)", accent: "#76ff03" },
  photo_docu:         { bg: "linear-gradient(135deg, #1a1400 0%, #2d2400 50%, #3d3200 100%)", accent: "#ffd740" },
  clay:               { bg: "linear-gradient(135deg, #f5e6d3 0%, #ead5bb 50%, #dfc5a3 100%)", accent: "#795548" },
  economy_caricature: { bg: "linear-gradient(135deg, #0d1b4a 0%, #1a2d6e 50%, #2d4a9e 100%)", accent: "#ffeb3b" },
  custom:             { bg: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)", accent: "#bdbdbd" },
};

// Style preview icon/visual
const STYLE_VISUALS = {
  auto:               "🤖✨",
  info:               "💡🌟",
  issue_youtube:      "📊📈",
  realistic_stickman: "🎬🎭",
  documentary:        "🎞️🎭",
  history:            "🏛️⚔️",
  history_toon:       "📰✏️",
  scifi:              "⚙️🔬",
  paint_explainer:    "🖌️✏️",
  paint_story:        "📖🖍️",
  paint_info:         "📋🔵",
  paint_economy:      "💰📉",
  paint_hist_explainer:"🗺️⚔️",
  comic_realism:      "😂📷",
  senior_real:        "👴👵",
  pink_skull:         "💀💗",
  animal_skull:       "🦴🐾",
  countryball:        "🌍⚽",
  real_countryball:   "🌐🌏",
  glamour_countryball:"💃🌺",
  webtoon:            "🎨✨",
  manga:              "🌸🍃",
  game_unreal:        "🎮🕹️",
  photo_docu:         "📷🎥",
  clay:               "🏺🧸",
  economy_caricature: "🎭😄",
  custom:             "✏️⚡",
};

const LABEL_COLORS = {
  "밝은 정보/이슈": { bg: "#ef4444", text: "#fff" },
  "지식 이슈": { bg: "#3b82f6", text: "#fff" },
  "스틱맨 드라마": { bg: "#f97316", text: "#fff" },
  "역사/다큐": { bg: "#8b5cf6", text: "#fff" },
};

export default function StyleGallery({ selected, onSelect, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.8)",
      zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#111318",
        borderRadius: 20,
        width: "100%", maxWidth: 900,
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #1E2430",
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>🎨 스타일 갤러리</h2>
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>원하는 화풍을 선택하세요.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1F2128", border: "none", borderRadius: 10,
              padding: "6px 16px", color: "#9CA3AF", fontSize: 14,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            닫기
          </button>
        </div>

        {/* Grid */}
        <div style={{
          overflowY: "auto", padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          alignContent: "start",
        }}>
          {STYLES.map((style) => {
            const preview = STYLE_PREVIEWS[style.id] || { bg: "#1F2128", accent: "#fff" };
            const visual = STYLE_VISUALS[style.id] || style.emoji;
            const isSelected = selected === style.id;

            return (
              <button
                key={style.id}
                onClick={() => { onSelect(style.id); onClose(); }}
                style={{
                  background: "#1a1d27",
                  border: `2px solid ${isSelected ? "#F97316" : "#2D3748"}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Preview image area */}
                <div style={{
                  height: 120,
                  background: preview.bg,
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                  borderRadius: "12px 12px 0 0",
                }}>
                  {STYLE_IMAGES[style.id] ? (
                    <img
                      src={STYLE_IMAGES[style.id]}
                      alt={style.label}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <>
                      <div style={{
                        position: "absolute", inset: 0,
                        backgroundImage: `radial-gradient(circle at 30% 50%, ${preview.accent}20 0%, transparent 60%)`,
                      }} />
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 38, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                      }}>
                        {visual}
                      </div>
                    </>
                  )}
                  {/* Selected indicator */}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "#F97316", borderRadius: "50%",
                      width: 22, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "#fff", fontWeight: 700,
                      zIndex: 2,
                    }}>
                      ✓
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "8px 12px 12px", background: "#1a1d27" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>
                    {style.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.4, marginTop: 3 }}>
                    {style.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
