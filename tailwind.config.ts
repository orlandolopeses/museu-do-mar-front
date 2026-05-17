import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mar: {
          azul:      "#1a5276",
          azul_claro:"#2e86c1",
          verde:     "#1a7a4a",
          areia:     "#d4a96a",
          cobre:     "#b5651d",
          creme:     "#fdf6e3",
          escuro:    "#0d2137",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
