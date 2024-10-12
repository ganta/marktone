import { createElement } from "react";
import withHighlight from "rehype-highlight";
import toReact from "rehype-react";
import withSanitize, { defaultSchema } from "rehype-sanitize";
import withBreaks from "remark-breaks";
import withGfm from "remark-gfm";
import fromHtml from "remark-parse";
import toHast from "remark-rehype";
import { unified } from "unified";
import withCustomStyle from "./rehypeCustomStyle";
import withInlineHighlight from "./rehypeInlineHighlight";

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
