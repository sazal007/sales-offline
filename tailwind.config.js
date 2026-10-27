/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        surface: "#f7f5f3",

        ink: "#241a12",
        "ink-soft": "#79726b",

        brand: "#e8452c",
        "brand-dark": "#c7331d",
        "brand-soft": "#fde7e0",

        night: "#14121f",
        "night-soft": "#211d33",

        gold: "#f2b134",

        border: "#ececea",

        primary: "#e8452c",
        "primary-foreground": "#ffffff",

        secondary: "#f7f5f3",
        "secondary-foreground": "#241a12",

        muted: "#f7f5f3",
        "muted-foreground": "#79726b",

        accent: "#fde7e0",
        "accent-foreground": "#e8452c",

        destructive: "#dc2626",

        input: "#ececea",
        ring: "#e8452c",

        card: "#ffffff",
        "card-foreground": "#241a12",

        popover: "#ffffff",
        "popover-foreground": "#241a12",
      },
    },
  },

  plugins: [],
};
