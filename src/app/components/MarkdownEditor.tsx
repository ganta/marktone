import React, { ChangeEventHandler } from "react";
import styled from "styled-components";
import { useMarktone } from "./MarktoneProvider";

const Editor = styled.div`
  display: flex;
  flex-direction: column;

  flex-basis: 50%;
  align-self: stretch;

  margin: 0;
  padding: 0;
`;

const TextArea = styled.textarea`
  resize: vertical;

  flex-grow: 1;
  align-self: stretch;
  align-items: stretch;

  margin: 0;
  padding: 8px;

  border: none;
  border-radius: 4px 0 0 4px;

  &:focus {
    outline: none;
    box-shadow: 0 0 6px #719ece;
    border-radius: 4px 0 0 4px;
  }
`;

const MarkdownEditor = () => {
  const { markdown, setMarkdown } = useMarktone();

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ): void => {
    setMarkdown(event.target.value);
  };

  return (
    <Editor>
      <TextArea value={markdown} onChange={handleChange} />
    </Editor>
  );
};

export default MarkdownEditor;
