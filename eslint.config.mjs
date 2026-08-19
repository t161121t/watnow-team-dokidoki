import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// ディレクトリ構成のガード。責務の説明は各ディレクトリの README と
// docs/アーキテクチャ.md を参照。ここはそれを機械的に強制する設定。
const architectureBoundaries = {
  files: [
    "app/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "scripts/**/*.{ts,tsx}",
  ],
  plugins: { boundaries },
  settings: {
    // app/generated/** は Prisma Client の生成物（gitignore対象）。
    // 通常の app/ ルートとしては扱わない。
    "boundaries/ignore": ["app/generated/**"],
    "boundaries/elements": [
      { type: "app", pattern: "app/**" },
      {
        type: "feature-ui",
        pattern: "features/*/components/**",
        capture: ["domain"],
      },
      {
        type: "feature-actions",
        pattern: "features/*/actions.{ts,tsx}",
        capture: ["domain"],
      },
      {
        type: "feature-server",
        pattern: "features/*/server/**",
        capture: ["domain"],
      },
      {
        // constants.ts / types.ts など、そのドメイン内で共有する
        // 純粋な値・型の置き場。feature-actions/feature-server より
        // 後ろに置くことで、actions.{ts,tsx} は先にそちらへマッチする。
        type: "feature-shared",
        pattern: "features/*/*.{ts,tsx}",
        capture: ["domain"],
      },
      { type: "lib-db", pattern: "lib/db/**" },
      { type: "lib-supabase", pattern: "lib/supabase/**" },
      { type: "lib", pattern: "lib/**" },
      {
        // partialMatch: false が必須（2026-08-20発覚の設定不具合の修正）。
        // eslint-plugin-boundariesはデフォルト（フォルダモード + 部分一致）だと、
        // ファイル名側から1階層ずつ遡ってパターンを照合するため、
        // "features/*/components/**" (feature-ui) より前に、同名ディレクトリを
        // 指すこの汎用パターンが浅い階層で先にマッチしてしまい、
        // features/<domain>/components/**配下のファイルが誤って"components"型と
        // 判定されていた（feature-uiの許可ポリシーが一切効かない状態だった）。
        // partialMatch: false でルートからのフルパス一致を要求することで、この
        // 誤判定を防ぐ。他の型（他ディレクトリ名との衝突が無い）は同様の問題が
        // 起きないため変更していないが、根本的には全要素を見直す必要がある
        // （別途issue化）。
        type: "components",
        pattern: "components/**",
        partialMatch: false,
      },
      { type: "scripts", pattern: "scripts/**" },
    ],
    // lib/prisma.ts は「lib」型に含まれる（フォルダ単位でしか要素定義できないため）。
    // これ単体への import 制限は下の no-restricted-imports（restrictedPrismaAccess）で行う。
  },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        policies: [
          {
            from: { element: { type: "app" } },
            allow: [
              { to: { element: { type: "feature-ui" } } },
              { to: { element: { type: "feature-actions" } } },
              { to: { element: { type: "components" } } },
              { to: { element: { type: "lib" } } },
            ],
          },
          {
            from: { element: { type: "feature-ui" } },
            allow: [
              {
                to: {
                  element: {
                    type: "feature-ui",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              {
                // RSC（Server Component）からの読み取りはactions.tsを経由せず
                // server/を直接呼んでよい（2026-08-20方針変更。理由は
                // docs/アーキテクチャ.md参照）。server/は`import "server-only"`が
                // 付いているため、Client Componentからは呼ぼうとしてもビルドエラーに
                // なる（RSC以外からの直接呼び出しはこの仕組みで防がれる）。
                // 書き込み（mutation）はこのルールでは区別できないため、
                // actions.ts経由にする規約はコードレビューで担保する。
                to: {
                  element: {
                    type: "feature-server",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              {
                to: {
                  element: {
                    type: "feature-shared",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              { to: { element: { type: "components" } } },
              { to: { element: { type: "lib" } } },
              // server/を直接呼ぶRSCが自分でuserIdを取得できるようにするため
              // （lib/supabase/server.tsのgetCurrentUserId）。上のfeature-server
              // 許可と対になる変更（2026-08-20）。
              { to: { element: { type: "lib-supabase" } } },
            ],
          },
          {
            from: { element: { type: "feature-actions" } },
            allow: [
              {
                to: {
                  element: {
                    type: "feature-server",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              {
                to: {
                  element: {
                    type: "feature-shared",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              { to: { element: { type: "lib-db" } } },
              { to: { element: { type: "lib-supabase" } } },
              { to: { element: { type: "lib" } } },
            ],
          },
          {
            from: { element: { type: "feature-server" } },
            allow: [
              {
                to: {
                  element: {
                    type: "feature-shared",
                    captured: { domain: "{{from.domain}}" },
                  },
                },
              },
              { to: { element: { type: "lib-db" } } },
              { to: { element: { type: "lib" } } },
            ],
          },
          {
            from: { element: { type: "feature-shared" } },
            allow: [{ to: { element: { type: "lib" } } }],
          },
          {
            from: { element: { type: "components" } },
            allow: [
              { to: { element: { type: "components" } } },
              { to: { element: { type: "lib" } } },
            ],
          },
          {
            from: { element: { type: "lib-db" } },
            allow: [{ to: { element: { type: "lib" } } }],
          },
          {
            from: { element: { type: "lib-supabase" } },
            allow: [{ to: { element: { type: "lib" } } }],
          },
          {
            from: { element: { type: "scripts" } },
            allow: [
              { to: { element: { type: "lib-db" } } },
              { to: { element: { type: "lib-prisma" } } },
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "feature-server" } } },
            ],
          },
        ],
      },
    ],
  },
};

// 「実際のクエリは必ず lib/db/rls.ts の withRlsContext 経由」「Supabase Client は
// Auth/Storage/Realtime専用」を強制する。ESLint flat config は同じファイルに
// 複数 config block が同じルール名を設定すると後勝ち（マージされない）ので、
// no-restricted-imports は1ブロックにまとめる。
const restrictedDirectDbAccess = {
  files: ["**/*.{ts,tsx}"],
  ignores: [
    "lib/prisma.ts",
    "lib/db/**",
    "lib/supabase/**",
    "scripts/**",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@/lib/prisma",
              "@/app/generated/prisma/*",
              "@prisma/client",
            ],
            message:
              "Prisma Client を直接 import しない。@/lib/db/rls.ts の withRlsContext 等を経由する（features/*/server/* から）。",
          },
          {
            group: ["@supabase/supabase-js", "@supabase/ssr"],
            message:
              "Supabase Client を直接作らない。@/lib/supabase/server の関数を使う（テーブルの読み書きはPrisma経由。Auth/Storage/Realtime専用）。",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  architectureBoundaries,
  restrictedDirectDbAccess,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "app/generated/**",
  ]),
]);

export default eslintConfig;
