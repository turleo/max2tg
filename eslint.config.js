import pluginJs from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import sort from "eslint-plugin-sort"
import tseslint from "typescript-eslint"

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.all,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({
    indent: 2,
    jsx: false,
    quotes: "double",
    semi: false,
  }),
  sort.configs["flat/recommended"],
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "func-style": ["error", "declaration"],
      "no-await-in-loop": "off",
      "no-case-declarations": "off",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-magic-numbers": ["error", { ignore: [0, 1], ignoreArrayIndexes: true }],
      "no-ternary": "off",
      "no-undefined": "off",
      "no-warning-comments": "warn",
      "one-var": ["error", "never"],
      "semi": ["error", "never"],
      "sort-imports": "off",
      "sort-keys": "off",
      "sort-vars": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          defaultProject: "tsconfig.json",
        },
      },
    },
  },
]
