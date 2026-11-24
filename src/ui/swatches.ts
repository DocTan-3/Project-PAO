// [background, text, accent] for each palette and mode (the full set of colors is in styles.css).
export const SWATCHES: Record<string, Record<"day" | "night", [string, string, string]>> = {
  "classic": {
    "day": [
      "#ffffff",
      "#000000",
      "#000000"
    ],
    "night": [
      "#000000",
      "#ffffff",
      "#ffffff"
    ]
  },
  "bpcg": {
    "day": [
      "#d8c5ad",
      "#2a1a10",
      "#5a3a22"
    ],
    "night": [
      "#1a1009",
      "#e6d3b8",
      "#b88a5a"
    ]
  },
  "devotion": {
    "day": [
      "#f3efe4",
      "#2a2a2a",
      "#555555"
    ],
    "night": [
      "#1c1c1c",
      "#e8e4d8",
      "#b0b0b0"
    ]
  },
  "deep": {
    "day": [
      "#e6ebf0",
      "#1f2f3f",
      "#3f6285"
    ],
    "night": [
      "#0f1720",
      "#dde6ee",
      "#7fa6c9"
    ]
  },
  "freedom": {
    "day": [
      "#e9eee3",
      "#2b3a2d",
      "#6b8f5e"
    ],
    "night": [
      "#161d17",
      "#e0e8dc",
      "#a3c293"
    ]
  },
  "grace": {
    "day": [
      "#fff1f5",
      "#5c2c40",
      "#e58fb0"
    ],
    "night": [
      "#301823",
      "#ffe0ea",
      "#ffa6c6"
    ]
  },
  "sacrifice": {
    "day": [
      "#efe6ee",
      "#3d2a44",
      "#8a5a96"
    ],
    "night": [
      "#231a27",
      "#efe3f2",
      "#c093ce"
    ]
  }
} as const as never;
