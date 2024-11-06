import KintoneClient from "@/app/kintone/kintone-client.ts";
import MentionReplacer from "@/app/markdown/replacer/mention-replacer.ts";
import type { Meta, StoryObj } from "@storybook/react";
import Marktone from ".";

const meta = {
  component: Marktone,
} satisfies Meta<typeof Marktone>;

export default meta;
type Story = StoryObj<typeof Marktone>;

// FIXME: Remove the following workaround
document.body.dataset.loginUser = JSON.stringify({});
const kintoneClient = new KintoneClient();
const mentionReplacer = new MentionReplacer(kintoneClient);

export const Default: Story = {
  args: {
    originalFormEl: document.createElement("form"),
    kintoneClient: kintoneClient,
    replayMentions: [],
    mentionReplacer: mentionReplacer,
  },
} satisfies Story;
