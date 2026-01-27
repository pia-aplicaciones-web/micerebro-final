import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: [
      "next",
      "next/core-web-vitals"
    ]
  }
});

export default [
  ...compat.extends("next", "next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Tus reglas personalizadas aquí
    },
  },
];