module.exports = {
  root: true,
  env: {
    es6: true,
    browser: true,
    webextensions: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tsconfig.node.json"],
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
    "import/no-named-as-default": "off",
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
