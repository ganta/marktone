import { MarkedOptions, Renderer } from "marked";
import MentionReplacer from "../replacer/mention-replacer";
import KintoneClient from "../../kintone/kintone-client";
import hljs from "highlight.js";
import { highlightStyles, languageAliases } from "./highlight-settings";

class MarktoneRendererHelper {
  static escapeHTML(html: string): string {
    const escapeTest = /[&<>"']/;
    const escapeReplace = new RegExp(escapeTest, "g");
    const replacements: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, (ch) => replacements[ch]);
    }

    return html;
  }

  static unescapeHTML(html: string): string {
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

  static highlightCode(code: string, specifiedLanguage: string): string {
    let language = specifiedLanguage;

    if (!hljs.listLanguages().includes(specifiedLanguage)) {
      language = languageAliases[specifiedLanguage] || "plaintext";
    }
    const highlightedCode = hljs.highlight(language, code).value;
    const highlightedCodeWithInlineStyle = highlightedCode.replace(
      /class="([\w-]+)"/g,
      (matchedString, className) => {
        const style = highlightStyles[className];
        if (style === undefined) return matchedString;
        return `style="${style}"`;
      }
    );

    return highlightedCodeWithInlineStyle;
  }
}

interface Render {
  options: MarkedOptions;
}

/* eslint-disable class-methods-use-this */
class MarktoneRenderer extends Renderer {
  private mentionReplacer: MentionReplacer;
  private static MONOSPACE_FONT_FAMILIES: readonly string[] = [
    "SFMono-Regular",
    "Consolas",
    "Liberation Mono",
    "Menlo",
    "monospace",
  ];
  private monospaceFontFamiliesString: string;

  constructor(mentionReplacer: MentionReplacer, options?: MarkedOptions) {
    super(options);
    this.mentionReplacer = mentionReplacer;
    this.monospaceFontFamiliesString = MarktoneRenderer.MONOSPACE_FONT_FAMILIES.map(
      (familyName) => `'${familyName}'`
    ).join(", ");
  }

  //
  // Block level renderer methods
  //

  heading(text: string, level: number): string {
    const fontSize = 2.0 - 0.2 * level;
    const lineHeight = 1.6 - 0.05 * level;
    const margin = 12 - level;
    let style = `font-size: ${fontSize}em; font-weight: bold; line-height: ${lineHeight}em; margin: ${margin}px 0;`;
    if (level <= 2) {
      style += " border-bottom: 1px solid #ddd;";
    }

    return `<h${level} style="${style}">${text}</h${level}>`;
  }

  html(html: string): string {
    return this.mentionReplacer.replaceMention(html);
  }

  code(code: string, language: string, isEscaped: boolean): string {
    const unescapedCode = isEscaped
      ? MarktoneRendererHelper.unescapeHTML(code)
      : code;
    const escapedCodeWithHighlight = MarktoneRendererHelper.highlightCode(
      unescapedCode,
      language
    );

    const preStyle =
      "background-color: #f6f8fa; border-radius: 3px; padding: 8px 16px;";
    const codeStyle = `font-family: ${this.monospaceFontFamiliesString};`;
    console.log(codeStyle);

    return `<pre style="${preStyle}"><code style="${codeStyle}">${escapedCodeWithHighlight}</code></pre>`;
  }

  blockquote(quote: string): string {
    const style =
      "border-left: .25em solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em;";
    return `<blockquote style="${style}">${quote}</blockquote>`;
  }

  paragraph(text: string): string {
    const style = "margin: 0 0 16px;";
    return `<p style="${style}">${text}</p>`;
  }

  table(header: string, body: string): string {
    const tableBody = body ? `<tbody>${body}</tbody>` : "";
    const style =
      "border-collapse: collapse; border-spacing: 0; margin: 0 0 16px;";
    return `<table style="${style}"><thead>${header}</thead>${tableBody}</table>`;
  }

  tablerow(content: string): string {
    const style = "background-color: #fff; border-top: 1px solid #c6cbd1;";
    return `<tr style="${style}">${content}</tr>`;
  }

  tablecell(
    content: string,
    flags: { header: boolean; align: "center" | "left" | "right" | null }
  ): string {
    const type = flags.header ? "th" : "td";
    const style = "border: 1px solid #dfe2e5; padding: 6px 13px;";
    const tag = flags.align
      ? `<${type} align="${flags.align}" style="${style}">`
      : `<${type} style="${style}">`;
    return `${tag}${content}</${type}>`;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Because the inheritance source argument is omitted.
  listitem(text: string, isTask: boolean): string {
    let style = "";
    if (isTask) {
      style = "list-style-type: none; margin-left: -20px; text-indent: -19px;";
    }
    return `<li style="${style}">${text}</li>`;
  }

  checkbox(checked: boolean): string {
    const length = 10;

    const imageURL = checked
      ? "https://static.cybozu.com/contents/k/image/argo/form/checkbox-checked.png"
      : "https://static.cybozu.com/contents/k/image/argo/form/checkbox.png";
    const alternateText = checked ? "checked" : "unchecked";
    const style = "margin: 0 4px;";

    return `<img width="${length}" height="${length}" src="${imageURL}" alt="${alternateText}" style="${style}">`;
  }

  //
  // Inline level renderer methods
  //

  text(text: string): string {
    return this.mentionReplacer.replaceMention(text);
  }

  codespan(code: string): string {
    const style = `background-color: rgba(27,31,35,.05); border-radius: 3px; margin: 0 1px; padding: .2em .4em; font-family: ${this.monospaceFontFamiliesString};`;
    return `<code style="${style}">${code}</code>`;
  }

  del(text: string): string {
    // A del element is removed by kintone.
    // Use `text-decoration` because A `text-decoration-line` is also removed by kintone.
    return `<span style="text-decoration: line-through;">${text}</span>`;
  }

  link(href: string, title: string, text: string): string {
    // For later sanitization with DOMPurify, skip the `href` sanitization here.

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
      href: MarktoneRendererHelper.escapeHTML(href),
    };
    if (title) attributes.title = title;

    const attributesString = Object.keys(attributes)
      .map<string>((key) => `${key}="${attributes[key]}"`)
      .join(" ");
    return `<a ${attributesString}>${text}</a>`;
  }

  image(href: string, title: string | null, text: string): string {
    // For later sanitization with DOMPurify, skip the `href` sanitization here.

    if (href === null) {
      return text;
    }

    const additionalAttributes: { [key: string]: string } = {};
    let imageURL = href;

    if (title != null && title.startsWith("=")) {
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
  }
}
/* eslint-enable class-methods-use-this */

export default MarktoneRenderer;
