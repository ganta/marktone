import { ComponentStoryObj } from "@storybook/react";
import MentionSuggestion from "./MentionSuggestion";

type Story = ComponentStoryObj<typeof MentionSuggestion>;

export default { component: MentionSuggestion };

export const Default: Story = {
  args: { suggestedEntities: [] },
};
