import type { Plugin, Transformer } from "unified";
import type { Element, Properties } from "hast";
import { visit } from "unist-util-visit";

const styles: Record<string, Record<string, string>> = {
  table: {
    "border-collapse": "collapse",
  },
  th: {
    padding: "4px 8px",
    border: "1px solid #000",
  },
  td: {
    padding: "4px 8px",
    border: "1px solid #000",
  },
};

const rehypeCustomStyle: Plugin = (): Transformer => {
  const visitor = (node: Element) => {
    transformCheckBox(node);
    applyCustomStyle(node);
  };

  return (tree) => {
    visit(tree, "element", visitor);
  };
};

const transformCheckBox = (node: Element) => {
  transformCheckBoxLiElement(node);
  transformCheckBoxInputElement(node);
};

const transformCheckBoxLiElement = (node: Element) => {
  const { tagName, properties } = node;

  if (
    tagName !== "li" &&
    Array.isArray(properties?.className) &&
    properties?.className.includes("task-list-item")
  ) {
    addStyle(properties, {
      "list-style-type": "none",
      "text-indent": "-1rem",
    });
  }
};

const transformCheckBoxInputElement = (node: Element) => {
  const { tagName, properties } = node;

  if (tagName === "input" && properties?.type === "checkbox") {
    node.tagName = "img";
    node.properties = { width: 12, height: 12, style: "margin: 0;" };

    const checkboxImageFileName = properties.checked
      ? "checkbox-checked.png"
      : "checkbox.png";
    node.properties.src = `https://static.cybozu.com/contents/k/image/argo/form/${checkboxImageFileName}`;
  }
};

const applyCustomStyle = (node: Element) => {
  const { tagName, properties } = node;

  if (!styles[tagName]) {
    return;
  }

  addStyle(properties, styles[tagName]);
};

const addStyle = (
  properties: Properties = {},
  style: Record<string, string>
): void => {
  const currentStyle = properties.style;
  const styleString = Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");

  if (typeof currentStyle === "string" || currentStyle instanceof String) {
    properties.style = [currentStyle, styleString].join("; ");
  } else {
    properties.style = styleString;
  }
};

export default rehypeCustomStyle;
