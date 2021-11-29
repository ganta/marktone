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
};
