import { setCybozuData } from "@/apis/cybozu/api.ts";
import KintoneClient from "@/app/kintone/kintone-client.ts";
import MentionReplacer from "@/app/markdown/replacer/mention-replacer.ts";
import type { Meta, StoryObj } from "@storybook/react";
import Marktone from ".";

const meta = {
  component: Marktone,
} satisfies Meta<typeof Marktone>;

export default meta;
type Story = StoryObj<typeof Marktone>;

setCybozuData({
  LOGIN_USER: { code: "test_code" },
  DISPLAY_LOCALE: "ja",
  REQUEST_TOKEN: "test_token",
});
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

export const WithMarkdownText: Story = {
  name: "with a Markdown text",
  args: {
    originalFormEl: document.createElement("form"),
    kintoneClient: kintoneClient,
    replayMentions: [],
    mentionReplacer: mentionReplacer,
    markdownText: `# Block elements

## Headers

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## Blockquotes

> Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Donec ut placerat velit, a tristique est. Suspendisse eget turpis ultrices,
mollis dui eu, convallis purus. Donec commodo tincidunt tristique.

> Aenean pellentesque felis ac commodo tempor. Suspendisse potenti.
Morbi efficitur consequat vehicula. Mauris vestibulum nibh velit,
eget luctus massa gravida vitae. Vivamus hendrerit sapien vitae non.

## Lists

### Unordered list

- Red
- Green
- Blue

### Ordered list

1. First
2. Second
3. Third

## Code blocks

\`\`\`typescript
console.log("Hello, world!");
\`\`\`

# Span elements

## Links

This is [an example](http://example.com/ "Title") inline link.
[This link](http://example.net/) has no title attribute.

## Emphasis

*italic* or _italic_
**bold** or __bold__
***bold italic*** or ___bold italic___

## Code

\`code\`

## Emojis

:smile:

## Strikethrough

~~strikethrough~~

## Horizontal rule

---  
`,
  },
} satisfies Story;
