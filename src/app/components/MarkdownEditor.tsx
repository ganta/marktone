import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  useState,
} from "react";
import styled from "styled-components";
import { useMarktone } from "./MarktoneProvider";
import MentionSuggestion from "./MentionSuggestion";

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
  const [suggestionActivity, setSuggestionActivity] = useState(false);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ): void => {
    handleRenderMarkdown(event);
    handleAutoComplete(event);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    const { key } = event;
    console.log({ key });
  };

  const handleRenderMarkdown: ChangeEventHandler<HTMLTextAreaElement> = ({
    target,
  }) => {
    setMarkdown(target.value);
  };

  const handleAutoComplete: ChangeEventHandler<HTMLTextAreaElement> = ({
    target,
  }) => {
    const { selectionStart, selectionEnd, selectionDirection } = target;
    console.log({ selectionStart, selectionEnd, selectionDirection });
    const charOnCaret = [...target.value][selectionEnd - 1];
    console.log({ charOnCaret });

    setSuggestionActivity(charOnCaret === "@");
  };

  return (
    <Editor>
      <TextArea
        value={markdown}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {suggestionActivity && <MentionSuggestion suggestedEntities={[]} />}
    </Editor>
  );
};

export default MarkdownEditor;
