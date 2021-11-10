module.exports = {
  root: true,
  env: {
    webextensions: true,
    node: true,
  },
  globals: {
    document: true,
    window: true,
    MutationObserver: true,
    fetch: true,
  },
  plugins: ["import"],
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "prettier",
  ],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".ts", ".tsx", ".json"],
      },
    },
  },
  rules: {
    "import/order": "error",
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2019,
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
        ],
      },
    },
  ],
};
