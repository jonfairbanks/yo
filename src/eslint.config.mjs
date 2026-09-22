import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "out/**",
    "public/vendor/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      // This React Hooks 7 rule was not part of the prior lint configuration.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
