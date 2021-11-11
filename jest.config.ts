import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
  preset: "ts-jest",
  setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
  testEnvironment: "jsdom",
  clearMocks: true,
  verbose: true,
};

export default config;
