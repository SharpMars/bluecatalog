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
  shortcuts: {
    card: "light:bg-neutral-100 dark:bg-neutral-800 p-4 light:text-black dark:text-white b-transparent hover:b-[HSL(211,100%,63%)] b-1 rounded-xl transition-ease-in-out transition-100 transition-border-color",
  },
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
