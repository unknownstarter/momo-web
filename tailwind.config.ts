import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pretendard: ["var(--font-pretendard)", "system-ui", "sans-serif"],
      },
      colors: {
        hanji: {
          DEFAULT: "#F7F3EE",
          secondary: "#F0EDE8",
          elevated: "#FEFCF9",
          border: "#E8E4DF",
          text: "#E8E4DF", // dark mode 본문
        },
        ink: {
          DEFAULT: "#2D2D2D",
          bg: "#1D1E23",
          secondary: "#2A2B32",
          elevated: "#35363F",
          border: "#35363F",
          muted: "#6B6B6B",
          tertiary: "#A0A0A0",
        },
        brand: { DEFAULT: "#A8C8E8" },
        accent: { DEFAULT: "#F2D0D5" },
        element: {
          wood: "#8FB89A",
          fire: "#D4918E",
          earth: "#C8B68E",
          metal: "#B8BCC0",
          water: "#89B0CB",
          "wood-pastel": "#D4E4D7",
          "fire-pastel": "#F0D4D2",
          "earth-pastel": "#E8DFC8",
          "metal-pastel": "#E0E2E4",
          "water-pastel": "#C8DBEA",
        },
        compat: {
          destined: "#C27A88",
          excellent: "#C49A7C",
          good: "#A8B0A0",
          average: "#959EA2",
        },
        /** 랜딩 인트로 훅 액센트 (design-system 인트로 골드) */
        intro: { gold: "#B8A080" },
      },
      borderRadius: {
        card: "16px",
        button: "12px",
        dialog: "20px",
      },
      boxShadow: {
        low: "0 1px 2px rgba(0, 0, 0, 0.04)",
        medium: "0 2px 8px rgba(0, 0, 0, 0.06)",
        high: "0 4px 16px rgba(0, 0, 0, 0.08)",
        mystic: "0 0 20px 2px rgba(200, 182, 142, 0.15)",
      },
      maxWidth: {
        mobile: "430px",
        "mobile-wide": "480px", // 답답함 완화용 넓은 모바일
      },
    },
  },
  plugins: [],
};

export default config;
