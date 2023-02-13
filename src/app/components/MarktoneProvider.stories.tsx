import { Meta, StoryObj } from "@storybook/react";
import MarktoneProvider from "./MarktoneProvider";

const meta: Meta<typeof MarktoneProvider> = {
  component: MarktoneProvider,
};
export default meta;

export const Primary: StoryObj<typeof MarktoneProvider> = {
  args: {},
};
