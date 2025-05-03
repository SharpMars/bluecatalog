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
});
