import React from "react";
import styled from "styled-components";
import { useMarktone } from "./MarktoneProvider";

const PreviewArea = styled.div`
  flex-basis: 50%;
  align-self: stretch;

  margin: 0;
  padding: 0 20px;

  border-left: 1px solid gray;
  border-radius: 0 4px 4px 0;

  overflow-x: auto;
`;

const MarkdownPreview = () => {
  const { renderedComponent } = useMarktone();

  return <PreviewArea>{renderedComponent}</PreviewArea>;
};

export default MarkdownPreview;
