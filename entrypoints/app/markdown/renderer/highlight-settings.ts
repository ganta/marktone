const red = "color: #d91e18;";
const orange = "color: #aa5d00;";
const yellow = "color: #ffd700;";
const green = "color: #008000;";
const blue = "color: #007faa;";
const purple = "color: #7928a1;";
const bold = "font-weight: bold;";

export const highlightStyles: { [index: string]: string } = {
  "hljs-comment": "color: #696969;",
  "hljs-quote": "color: #696969;",
  "hljs-meta": orange,
  "hljs-meta-keyword": orange,
  "hljs-meta-string": blue,
  "hljs-variable": red,
  "hljs-template-variable": red,
  "hljs-tag": red,
  "hljs-name": red,
  "hljs-selector-id": red,
  "hljs-selector-class": red,
  "hljs-regexp": red,
  "hljs-deletion": red,
  "hljs-number": orange,
  "hljs-built_in": orange,
  "hljs-builtin-name": orange,
  "hljs-literal": orange,
  "hljs-type": orange,
  "hljs-params": "",
  "hljs-link": orange,
  "hljs-attribute": yellow,
  "hljs-string": green,
  "hljs-symbol": green,
  "hljs-bullet": green,
  "hljs-addition": green,
  "hljs-title": blue,
  "hljs-section": blue,
  "hljs-keyword": purple,
  "hljs-selector-tag": purple,
  "hljs-emphasis": "font-style: italic;",
  "hljs-strong": bold,
  "hljs-class": bold,
};

export const languageAliases: { [index: string]: string } = {
  zsh: "bash",
  sh: "bash",
  "c++": "cpp",
  html: "xml",
  js: "javascript",
  ts: "typescript",
  kt: "kotlin",
  yaml: "yml",
};
