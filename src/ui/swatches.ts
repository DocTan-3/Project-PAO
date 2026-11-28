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
      "#cdb89b",
      "#241509",
      "#4d2f1a"
    ],
    "night": [
      "#150d07",
      "#e2cfb3",
      "#c49565"
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
      "#e3e9ef",
      "#1c2b3a",
      "#3a5c80"
    ],
    "night": [
      "#0d141c",
      "#dae3ec",
      "#7ca2c6"
    ]
  },
  "freedom": {
    "day": [
      "#e7ece1",
      "#283628",
      "#648a58"
    ],
    "night": [
      "#141b15",
      "#dde6d9",
      "#9fbf8f"
    ]
  },
  "grace": {
    "day": [
      "#f7e6ee",
      "#4a2238",
      "#a8537f"
    ],
    "night": [
      "#28141f",
      "#f6dcea",
      "#d683ad"
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
