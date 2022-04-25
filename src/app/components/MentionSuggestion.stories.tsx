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
        code: "john",
        name: "John Doe",
        avatarUrl: "https://i.pravatar.cc/300?img=1",
      },
      {
        entityType: "user",
        id: "2",
        code: "jane",
        name: "Jane Doe",
        avatarUrl: "https://i.pravatar.cc/300?img=2",
      },
    ],
  },
};
