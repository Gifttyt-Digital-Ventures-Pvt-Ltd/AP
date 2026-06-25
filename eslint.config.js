import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  console: "readonly",
  sessionStorage: "readonly",
  localStorage: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  File: "readonly",
  Blob: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  alert: "readonly",
  confirm: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  atob: "readonly",
  btoa: "readonly",
  crypto: "readonly",
};

const nodeGlobals = {
  process: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  module: "readonly",
  require: "readonly",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.cjs",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: browserGlobals,
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Catches missing imports / undefined identifiers before runtime.
      "no-undef": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["vite.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
];
