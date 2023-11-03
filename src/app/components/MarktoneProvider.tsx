import React, { createContext, useContext } from "react";
import styled from "styled-components";
import { useMarkdown } from "../hooks/useMarkdown";
import MarkdownEditor from "./MarkdownEditor";
import MarkdownPreview from "./MarkdownPreview";

type MarktoneContextType = {
  markdown: string;
  setMarkdown: (text: string) => void;
  renderedComponent: JSX.Element;
};

const MarktoneContext = createContext<MarktoneContextType | undefined>(
  undefined,
);

export const useMarktone = () => {
  const ctx = useContext(MarktoneContext);

  if (!ctx) {
    throw new Error("useMarktone must be inside a Provider with a value");
  }

  return ctx;
};

const MarktoneArea = styled.div`
  display: flex;
  flex-direction: row;

  width: 100%;
  min-height: 150px;

  margin: 0;
  padding: 0;

  border-width: 1px;
  border-color: gray;
  border-style: solid;
  border-radius: 4px;
`;

const MarktoneProvider = () => {
  const { markdown, setMarkdown, renderedComponent } = useMarkdown("");

  return (
    <React.StrictMode>
      <MarktoneContext.Provider
        value={{ markdown, setMarkdown, renderedComponent }}
      >
        <MarktoneArea>
          <MarkdownEditor />
          <MarkdownPreview />
        </MarktoneArea>
      </MarktoneContext.Provider>
    </React.StrictMode>
  );
};

export default MarktoneProvider;
