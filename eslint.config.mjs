import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**", ".next-dev/**", "coverage/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { "@next/next": nextPlugin }, rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs["core-web-vitals"].rules } },
  { languageOptions: { globals: { ...globals.node, ...globals.browser } }, rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
  } }
);
