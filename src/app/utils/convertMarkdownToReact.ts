import { unified } from "unified";
import fromHtml from "remark-parse";
import toHast from "remark-rehype";
import toReact from "rehype-react";
import withSanitize, { defaultSchema } from "rehype-sanitize";
import { createElement } from "react";
import withGfm from "remark-gfm";
import withBreaks from "remark-breaks";
import withHighlight from "rehype-highlight";
import withInlineHighlight from "./rehypeInlineHighlight";
import withCustomStyle from "./rehypeCustomStyle";

export const convertMarkdownToReactElement = async (
  markdown: string,
): Promise<JSX.Element> => {
  const { result } = await unified()
    .use(fromHtml)
    .use(withGfm, { singleTilde: false })
    .use(withBreaks)
    .use(toHast)
    .use(withSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code || []), ["className"]],
      },
    })
    .use(withHighlight, { detect: true })
    .use(withInlineHighlight)
    .use(withCustomStyle)
    .use(toReact, { createElement })
    .process(markdown);

  return result;
};
