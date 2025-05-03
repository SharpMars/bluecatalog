import { defineConfig, presetIcons, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({
      dark: "class",
    }),
    presetIcons({}),
  ],
  rules: [
    ["field-sizing-fixed", { "field-sizing": "fixed" }],
    ["field-sizing-content", { "field-sizing": "content" }],
    ["moz-appearance-textfield", { "-moz-appearance": "textfield" }],
  ],
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
