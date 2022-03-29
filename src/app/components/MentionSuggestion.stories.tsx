import { ComponentStoryObj } from "@storybook/react";
import MentionSuggestion from "./MentionSuggestion";

type Story = ComponentStoryObj<typeof MentionSuggestion>;

export default { component: MentionSuggestion };

export const Default: Story = {
  args: {
    suggestedEntities: [
      {
        entityType: "user",
        id: "1",
        code: "test",
        name: "Test",
        avatarUrl: "https://i.pravatar.cc/300",
      },
    ],
  },
};
