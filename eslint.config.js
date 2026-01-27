const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const __dirname = path.resolve();
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: [
      "next",
      "next/core-web-vitals"
    ]
  }
});

module.exports = [
  ...compat.extends("next", "next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Tus reglas personalizadas aquí
    },
  },
];