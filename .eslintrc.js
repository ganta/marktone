module.exports = {
  root: true,
  env: {
    webextensions: true,
    node: true,
  },
  globals: {
    document: true,
    window: true,
    fetch: true,
  },
  plugins: ["import"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "prettier",
  ],
  settings: {
    react: {
      version: "17.0",
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".ts", ".tsx", ".json"],
      },
    },
  },
  rules: {
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
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
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            // Asynchronous React callbacks may return void.
            // https://github.com/typescript-eslint/typescript-eslint/issues/4619
            checksVoidReturn: {
              attributes: false,
            },
          },
        ],
      },
    },
  ],
};
