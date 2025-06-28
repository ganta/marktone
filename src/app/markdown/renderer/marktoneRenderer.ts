import hljs from "highlight.js";
import type { RendererObject } from "marked";
import KintoneClient from "@/app/kintone/kintone-client";
import EmojiReplacer from "@/app/markdown/replacer/emoji-replacer.ts";
import type MentionReplacer from "@/app/markdown/replacer/mention-replacer";
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

    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const fontSize = 2.0 - 0.2 * depth;
      const lineHeight = 1.6 - 0.05 * depth;
      const margin = 12 - depth;
      let style = `font-size: ${fontSize}em; font-weight: bold; line-height: ${lineHeight}em; margin: ${margin}px 0;`;
      if (depth <= 2) {
        style += " border-bottom: 1px solid #ddd;";
      }

      return `<h${depth} style="${style}">${text}</h${depth}>`;
    },

    html({ text }) {
      return mentionReplacer.replaceMention(emojiReplacer.replaceEmoji(text));
    },

    code({ text, lang, escaped }) {
      const unescapedCode = escaped ? unescapeHTML(text) : text;
      const escapedCodeWithHighlight = highlightCode(
        unescapedCode,
        lang || "plaintext",
      );

      const preStyle =
        "background-color: #f6f8fa; border-radius: 3px; padding: 8px 16px;";
      const codeStyle = `font-family: ${monospaceFontFamiliesString};`;

      return `<pre style="${preStyle}"><code style="${codeStyle}">${escapedCodeWithHighlight}</code></pre>`;
    },

    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      const style =
        "border-left: .25em solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em;";
      return `<blockquote style="${style}">${body}</blockquote>`;
    },

    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      const style = "margin: 0 0 16px;";
      return `<p style="${style}">${text}</p>`;
    },

    table({ header, rows }) {
      const headerText = header.map((cell) => this.tablecell(cell)).join("");
      const tableHeader = this.tablerow({ text: headerText });

      const body = rows
        .map((row) => {
          const rowText = row.map((cell) => this.tablecell(cell)).join("");
          return this.tablerow({ text: rowText });
        })
        .join("");
      const tableBody = body ? `<tbody>${body}</tbody>` : "";

      const style =
        "border-collapse: collapse; border-spacing: 0; margin: 0 0 16px;";
      return `<table style="${style}"><thead>${tableHeader}</thead>${tableBody}</table>`;
    },

    tablerow({ text }) {
      const style = "background-color: #fff; border-top: 1px solid #c6cbd1;";
      return `<tr style="${style}">${text}</tr>`;
    },

    tablecell({ tokens, header, align }): string {
      const content = this.parser.parseInline(tokens);
      const type = header ? "th" : "td";
      const style = "border: 1px solid #dfe2e5; padding: 6px 13px;";
      const tag = align
        ? `<${type} align="${align}" style="${style}">`
        : `<${type} style="${style}">`;
      return `${tag}${content}</${type}>`;
    },

    listitem({ tokens, checked, task, loose }) {
      let itemBody = "";
      let style = "text-indent: 0";
      if (task) {
        style = "list-style-type: none; text-indent: -19px;";
        const checkbox = this.checkbox({ checked: !!checked });
        if (loose) {
          if (tokens.length > 0 && tokens[0].type === "paragraph") {
            tokens[0].text = `${checkbox} ${tokens[0].text}`;
            if (
              tokens[0].tokens &&
              tokens[0].tokens.length > 0 &&
              tokens[0].tokens[0].type === "text"
            ) {
              tokens[0].tokens[0].text = `${checkbox} ${tokens[0].tokens[0].text}`;
            }
          } else {
            tokens.unshift({
              type: "text",
              raw: `${checkbox} `,
              text: `${checkbox} `,
            });
          }
        } else {
          itemBody += `${checkbox} `;
        }
      }
      itemBody += this.parser.parse(tokens, loose);
      return `<li style="${style}">${itemBody}</li>`;
    },

    checkbox({ checked }) {
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

    text(token) {
      const text =
        "tokens" in token && token.tokens
          ? this.parser.parseInline(token.tokens)
          : token.text;
      return mentionReplacer.replaceMention(emojiReplacer.replaceEmoji(text));
    },

    codespan({ text }) {
      const style = `background-color: rgba(27,31,35,.05); border-radius: 3px; margin: 0 1px; padding: .2em .4em; font-family: ${monospaceFontFamiliesString};`;
      return `<code style="${style}">${text}</code>`;
    },

    del({ tokens }) {
      const text = this.parser.parseInline(tokens);
      // A del element is removed by kintone.
      // Use `text-decoration` because A `text-decoration-line` is also removed by kintone.
      return `<span style="text-decoration: line-through;">${text}</span>`;
    },

    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
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

    image({ href, title, text }) {
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
