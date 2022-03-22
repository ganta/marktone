const path = require("path");

module.exports = {
  stories: [
    {
      directory: "../src",
      files: "**/*.stories.tsx",
    },
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
  ],
  core: {
    builder: "webpack5",
  },
  webpackFinal: async (config) => {
    // To apply style for preview
    config.module.rules.push({
      use: ["style-loader", "css-loader", "sass-loader"],
      include: path.resolve(__dirname, "preview.scss"),
    });

    return config;
  },
};
