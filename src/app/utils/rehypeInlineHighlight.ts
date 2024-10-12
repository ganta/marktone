import type { Element } from "hast";
import type { Plugin } from "unified";
import type { Transformer } from "unified/lib";
import { visit } from "unist-util-visit";

const rehypeInlineHighlight: Plugin = (): Transformer => {
  const visitor = (node: Element) => {
    inlineHighlight(node);
  };

  return (tree) => {
    visit(tree, "element", visitor);
  };
};

const inlineHighlight = (node: Element) => {
  const { properties } = node;

  if (!properties || !Array.isArray(properties.className)) {
    return;
  }

  const classNames = properties.className;

  properties.style = classNames
    .map((className) => {
      if (!style[className]) {
        return undefined;
      }

      return Object.entries(style[className])
        .map(([key, value]) => `${key}: ${value}`)
        .join(";");
    })
    .join(";");
};

export default rehypeInlineHighlight;

const color = {
  white: "#f6f6f6",
  black: "#111111",
  gray: "#696969",
  orange: "#aa5d00",
  red: "#af1b16",
  green: "#169a16",
  blue: "#057ea6",
  purple: "#741896",
  yellow: "#a88e10",
};

const style: Record<string, Record<string, string>> = {
  hljs: {
    display: "block",
    "overflow-x": "auto",
    padding: "6px 10px",
    "border-radius": "6px",
    background: color.white,
    color: color.black,
  },

  // Emphasis
  "hljs-emphasis": {
    "font-style": "italic",
  },

  // Strong
  "hljs-strong": {
    "font-weight": "bold",
  },

  // Comment
  "hljs-comment": {
    color: color.gray,
  },

  // Quote
  "hljs-quote": {
    color: color.gray,
  },

  // Metadata
  "hljs-meta": {
    color: color.orange,
    "font-weight": "bold",
  },

  // Variable
  "hljs-variable": {
    color: color.red,
  },
  "hljs-template-variable": {
    color: color.red,
  },

  // Literal: e.g. true, null
  "hljs-literal": {
    color: color.orange,
  },
  // String literal
  "hljs-string": {
    color: color.green,
  },
  // Regexp literal: e.g. /abc+/
  "hljs-regexp": {
    color: color.red,
  },
  // Number literal
  "hljs-number": {
    color: color.orange,
  },

  // Hyper Link: e.g. https://example.com/
  "hljs-link": {
    color: color.orange,
  },

  // Type: e.g. varchar, integer
  "hljs-type": {
    color: color.orange,
  },

  // Function name / Class name
  "hljs-title": {
    color: color.blue,
    "font-weight": "bold",
  },
  // Function parameters
  "hljs-params": {
    color: color.orange,
  },

  // Keyword: e.g. if, for
  "hljs-keyword": {
    color: color.purple,
    "font-weight": "bold",
  },

  // Built-in function / keyword: e.g. echo, int
  "hljs-built_in": {
    color: color.orange,
  },

  // HTML tag: e.g. <html></html>, <img />
  "hljs-tag": {
    color: color.purple,
  },
  // HTML element: e.g. html, body
  "hljs-name": {
    color: color.purple,
    "font-weight": "bold",
  },
  // HTML attribute / JavaScript Object property name
  "hljs-attr": {
    color: color.yellow,
  },

  // Punctuation: e.g. (, ), {, }, :
  "hljs-punctuation": {
    color: color.purple,
  },

  // CSS ID selector: e.g. #header
  "hljs-selector-id": {
    color: color.red,
  },
  // CSS class selector: e.g. .text
  "hljs-selector-class": {
    color: color.red,
  },
  // CSS Pseudo-classes: e.g. :hover
  "hljs-selector-pseudo": {
    color: color.red,
  },
  // CSS property name: e.g. background-color
  "hljs-attribute": {
    color: color.yellow,
    "font-weight": "bold",
  },
  // CSS attribute selector: e.g. [attr=value]
  "hljs-selector-attr": {
    color: color.yellow,
  },
  // CSS type selector: e.g. h1, em
  "hljs-selector-tag": {
    color: color.purple,
    "font-weight": "bold",
  },

  // Diff addition / modification: e.g. + added, ! modified
  "hljs-addition": {
    color: color.green,
  },
  // Diff deletion: e.g. - deleted
  "hljs-deletion": {
    color: color.red,
  },

  // Operator: e.g. +, =
  "hljs-operator": {
    color: color.red,
  },

  // Markdown reference-style link: e.g. [id]
  "hljs-symbol": {
    color: color.green,
  },
  // Markdown code block
  "hljs-code": {
    color: color.green,
  },

  // Bullet symbol: e.g. -, *
  "hljs-bullet": {
    color: color.green,
  },

  // Section: e.g. Markdown heading, TOML section name
  "hljs-section": {
    color: color.blue,
    "font-weight": "bold",
  },

  // Tag of Javadoc, PHPDoc, etc.
  "hljs-doctag": {
    color: color.purple,
    "font-weight": "bold",
  },

  // Template tag: e.g. {% }, {# }
  "hljs-template-tag": {
    color: color.purple,
  },
};
