import { defineConfig, presetIcons, presetWebFonts, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({
      dark: "class",
    }),
    presetWebFonts({
      provider: "bunny",
      fonts: {
        sans: {
          name: "DM Sans",
          weights: [400, 600, 700, 900],
        },
      },
      themeKey: "font",
    }),
    presetIcons({}),
  ],
  rules: [["moz-appearance-textfield", { "-moz-appearance": "textfield" }]],
  theme: {
    animation: {
      keyframes: {
        flutter: "{0%,100% {transform:scaleX(1)} 50% {transform:scaleX(.3)}}",
      },
      durations: {
        flutter: "400ms",
      },
      timingFns: {
        flutter: "ease-in-out",
      },
      counts: {
        flutter: "infinite",
      },
    },
  },
});
