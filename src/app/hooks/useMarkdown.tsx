import React, { useEffect, useState } from "react";
import { convertMarkdownToReactElement } from "../utils/convertMarkdownToReact";

export const useMarkdown = (text: string) => {
  const [markdown, setMarkdown] = useState(text);
  const [renderedComponent, setRenderedComponent] = useState(<></>);

  useEffect(() => {
    void (async () => {
      const component = await convertMarkdownToReactElement(markdown);
      setRenderedComponent(component);
    })();
  }, [markdown]);

  return { markdown, setMarkdown, renderedComponent };
};
