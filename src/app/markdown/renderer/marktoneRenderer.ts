import hljs from "highlight.js";
import type { RendererObject } from "marked";
import KintoneClient from "../../kintone/kintone-client";
import EmojiReplacer from "../replacer/emoji-replacer.ts";
import type MentionReplacer from "../replacer/mention-replacer";
import { highlightStyles, languageAliases } from "./highlight-settings";

const monospaceFontFamilies = [
  "SFMono-Regular",
  "Consolas",
  "Liberation Mono",
  "Menlo",
  "monospace",
];
const monospaceFontFamiliesString = monospaceFontFamilies
  .map((familyName) => `'${familyName}'`)
  .join(", ");

export function getMarktoneRenderer(
  mentionReplacer: MentionReplacer,
): RendererObject {
  const emojiReplacer = new EmojiReplacer();

  return {
    //
    // Block level renderer methods
    //

    heading(text, level) {
      const fontSize = 2.0 - 0.2 * level;
      const lineHeight = 1.6 - 0.05 * level;
      const margin = 12 - level;
      let style = `font-size: ${fontSize}em; font-weight: bold; line-height: ${lineHeight}em; margin: ${margin}px 0;`;
      if (level <= 2) {
        style += " border-bottom: 1px solid #ddd;";
      }

      return `<h${level} style="${style}">${text}</h${level}>`;
    },

    html(html) {
      return mentionReplacer.replaceMention(emojiReplacer.replaceEmoji(html));
    },

    code(code, infostring, escaped) {
      const unescapedCode = escaped ? unescapeHTML(code) : code;
      const escapedCodeWithHighlight = highlightCode(
        unescapedCode,
        infostring || "plaintext",
      );

      const preStyle =
        "background-color: #f6f8fa; border-radius: 3px; padding: 8px 16px;";
      const codeStyle = `font-family: ${monospaceFontFamiliesString};`;

      return `<pre style="${preStyle}"><code style="${codeStyle}">${escapedCodeWithHighlight}</code></pre>`;
    },

    blockquote(quote) {
      const style =
        "border-left: .25em solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em;";
      return `<blockquote style="${style}">${quote}</blockquote>`;
    },

    paragraph(text) {
      const style = "margin: 0 0 16px;";
      return `<p style="${style}">${text}</p>`;
    },

    table(header, body) {
      const tableBody = body ? `<tbody>${body}</tbody>` : "";
      const style =
        "border-collapse: collapse; border-spacing: 0; margin: 0 0 16px;";
      return `<table style="${style}"><thead>${header}</thead>${tableBody}</table>`;
    },

    tablerow(content) {
      const style = "background-color: #fff; border-top: 1px solid #c6cbd1;";
      return `<tr style="${style}">${content}</tr>`;
    },

    tablecell(content, flags): string {
      const type = flags.header ? "th" : "td";
      const style = "border: 1px solid #dfe2e5; padding: 6px 13px;";
      const tag = flags.align
        ? `<${type} align="${flags.align}" style="${style}">`
        : `<${type} style="${style}">`;
      return `${tag}${content}</${type}>`;
    },

    listitem(text, task) {
      let style = "text-indent: 0";
      if (task) {
        style = "list-style-type: none; text-indent: -19px;";
      }
      return `<li style="${style}">${text}</li>`;
    },

    checkbox(checked) {
      const length = 10;

      const imageURL = checked
        ? "https://static.cybozu.com/contents/k/image/argo/form/checkbox-checked.png"
        : "https://static.cybozu.com/contents/k/image/argo/form/checkbox.png";
      const alternateText = checked ? "checked" : "unchecked";
      const style = "margin: 0 4px;";

      return `<img width="${length}" height="${length}" src="${imageURL}" alt="${alternateText}" style="${style}">`;
    },

    //
    // Inline level renderer methods
    //

    text(text) {
      return mentionReplacer.replaceMention(emojiReplacer.replaceEmoji(text));
    },

    codespan(code) {
      const style = `background-color: rgba(27,31,35,.05); border-radius: 3px; margin: 0 1px; padding: .2em .4em; font-family: ${monospaceFontFamiliesString};`;
      return `<code style="${style}">${code}</code>`;
    },

    del(text) {
      // A del element is removed by kintone.
      // Use `text-decoration` because A `text-decoration-line` is also removed by kintone.
      return `<span style="text-decoration: line-through;">${text}</span>`;
    },

    link(href, title, text) {
      if (href === null) return text;

      if (href.startsWith("tmp:")) {
        const matched = href.match(/tmp:(?<fileKey>[0-9a-z-]+)/);
        if (!matched || !matched.groups) return text;

        const fileKey = matched.groups.fileKey;
        const fileURL = KintoneClient.getDownloadURL(fileKey);

        const attributes: { [key: string]: string } = {
          href: fileURL,
          class: "cybozu-tmp-file ocean-ui-plugin-linkbubble-no",
          "data-file": fileKey || "",
        };
        const attributesString = Object.entries(attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        const iconURL = KintoneClient.getFileIconURL(text);

        return `<a ${attributesString}><img alt="${text}" src="${iconURL}">${text}</a>`;
      }

      const attributes: { [key: string]: string } = {
        href,
      };
      if (title) attributes.title = title;

      const attributesString = Object.keys(attributes)
        .map<string>((key) => `${key}="${attributes[key]}"`)
        .join(" ");
      return `<a ${attributesString}>${text}</a>`;
    },

    image(href, title, text) {
      if (href === null) {
        return text;
      }

      const additionalAttributes: { [key: string]: string } = {};
      let imageURL = href;

      if (title?.startsWith("=")) {
        additionalAttributes.width = title.slice(1);
      }

      if (href.startsWith("tmp:")) {
        const fileKey = href.split(":")[1];

        additionalAttributes.class = "cybozu-tmp-file";
        additionalAttributes["data-original"] = imageURL; // This URL must not include width.
        additionalAttributes["data-file"] = fileKey;

        const additionalParams: { [key: string]: string } = {};
        if (additionalAttributes.width != null) {
          additionalParams.w = additionalAttributes.width;
        }

        imageURL = KintoneClient.getDownloadURL(fileKey, additionalParams);
      }

      const additionalAttributesString = Object.keys(additionalAttributes)
        .map<string>((key) => `${key}="${additionalAttributes[key]}"`)
        .join(" ");

      return `<img src="${imageURL}" alt="${text}" ${additionalAttributesString}>`;
    },
  };
}

//
// helper functions
//

function unescapeHTML(html: string): string {
  const unescapeTest = /(&(?:lt|amp|gt|quot|#39);)/;
  const unescapeReplace = new RegExp(unescapeTest, "g");
  const replacements: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  if (unescapeTest.test(html)) {
    return html.replace(unescapeReplace, (ch) => replacements[ch]);
  }

  return html;
}

function highlightCode(code: string, specifiedLanguage: string): string {
  let language = specifiedLanguage;

  if (!hljs.listLanguages().includes(specifiedLanguage)) {
    language = languageAliases[specifiedLanguage] || "plaintext";
  }
  const highlightedCode = hljs.highlight(code, { language }).value;
  const highlightedCodeWithInlineStyle = highlightedCode.replace(
    /class="([\w-]+)"/g,
    (matchedString, className) => {
      const style = highlightStyles[className as string];
      if (style === undefined) return matchedString;
      return `style="${style}"`;
    },
  );

  return highlightedCodeWithInlineStyle;
}
