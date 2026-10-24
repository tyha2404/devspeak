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

const uiServerPatterns = [
  {
    group: ["@/lib/supabase/*", "@/features/*"],
    message: "Game/UI code talks to the server through API routes only.",
  },
];
const phaserPaths = [
  { name: "phaser", message: "Phaser is client-only (loaded via next/dynamic in PhaserGame)." },
  { name: "@/game/main", message: "Phaser is client-only." },
  { name: "@/game/config", message: "Phaser is client-only." },
];
const phaserPatterns = {
  group: ["@/game/scenes/*", "@/game/entities/*", "@/game/systems/*"],
  message: "Phaser modules are client-only; import pure data from @/game/data instead.",
};

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
    // Server-only code: route handlers, domain logic, and admin Server Components/Actions.
    ignores: ["src/app/api/**", "src/app/admin/**", "src/features/**", "src/lib/**"],
    rules: { "no-restricted-imports": ["error", { patterns: serverOnlyPatterns }] },
  },
  {
    // The game client (Phaser) talks to the server through API routes only.
    files: ["src/game/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...serverOnlyPatterns, ...uiServerPatterns] },
      ],
    },
  },
  {
    // React UI: no server modules, and no Phaser (it must never reach server rendering).
    files: ["src/components/**/*.{ts,tsx}", "src/stores/**/*.{ts,tsx}"],
    ignores: ["src/components/game/PhaserGame.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: phaserPaths,
          patterns: [...serverOnlyPatterns, ...uiServerPatterns, phaserPatterns],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**", "src/app/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: phaserPaths, patterns: [...serverOnlyPatterns, phaserPatterns] },
      ],
    },
  },
];

export default eslintConfig;
