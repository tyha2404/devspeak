import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Server-only modules (service-role Supabase client, Anthropic client) must never
// be bundled for the browser or imported by the game client.
const serverOnlyPatterns = [
  {
    group: ["@/lib/supabase/admin", "@/lib/supabase/admin.*"],
    message: "Service-role client is server-only (app/api, features, scripts).",
  },
  {
    group: ["@/lib/anthropic", "@/lib/anthropic/*"],
    message: "Anthropic client is server-only (app/api, features, scripts).",
  },
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/types/database.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**", "src/features/**", "src/lib/**"],
    rules: { "no-restricted-imports": ["error", { patterns: serverOnlyPatterns }] },
  },
  {
    files: ["src/game/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...serverOnlyPatterns,
            {
              group: ["@/lib/supabase/*", "@/features/*"],
              message: "Game/UI code talks to the server through API routes only.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
