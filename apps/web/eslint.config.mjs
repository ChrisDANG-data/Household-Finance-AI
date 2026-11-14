import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // New React Compiler rule that flags the common "load data in useEffect" pattern
      // used across this app. Kept visible as a warning; it does not block CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Ambient browser-type declarations legitimately use `declare var`.
    files: ["**/*.d.ts"],
    rules: { "no-var": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
