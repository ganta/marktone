import * as React from "react";
import * as marked from "marked";
import * as DOMPurify from "dompurify";
import ReactTextareaAutocomplete, {
  ItemComponentProps
} from "@webscopeio/react-textarea-autocomplete";

import MarktoneRenderer from "../markdown/renderer/marktone-renderer";
import KintoneClient from "../kintone/kintone-client";
import MentionReplacer from "../markdown/replacer/mention-replacer";
import { DirectoryEntityType } from "../kintone/directory-entity";

import "@webscopeio/react-textarea-autocomplete/style.css";

const { useState, useEffect } = React;

export interface ReplyMention {
  type: DirectoryEntityType;
  code: string;
}

interface MarktoneProps {
  originalFormEl: HTMLFormElement;
  replayMentions: ReplyMention[];
  kintoneClient: KintoneClient;
  mentionReplacer: MentionReplacer;
}

interface MentionCandidateItem {
  type: DirectoryEntityType;
  id: number;
  code: string;
  name: string;
  avatar: string;
}

const MentionCandidate = (props: ItemComponentProps<MentionCandidateItem>) => {
  const {
    entity: { type, id, code, name, avatar }
  } = props;

  return (
    <span className="mention-candidate" data-type={type} data-id={id}>
      <span className="avatar">
        <img className="avatar-image" src={avatar} alt={name} />
      </span>
      <span className="name">
        <span className="code">{code}</span>
        <span className="display-name">{name}</span>
      </span>
    </span>
  );
};

const Marktone = (props: MarktoneProps) => {
  const { originalFormEl, kintoneClient, mentionReplacer } = props;

  marked.setOptions({
    gfm: true, // Enable GitHub Flavored Markdown.
    breaks: true, // Add 'br' element on a single line break.
    headerIds: false,
    // @ts-ignore for `listitem()`
    renderer: new MarktoneRenderer(mentionReplacer)
  });

  const [rawText, setRawText] = useState("");
  const [renderedHTML, setRenderedHTML] = useState("");
  const [previewHeight, setPreviewHeight] = useState(0);

  const convertReplyMentionsToText = (
    replyMentions: ReplyMention[]
  ): string => {
    const currentUser = KintoneClient.getLoginUser();
    const normalizedMentions = replyMentions.filter(replyMention => {
      if (replyMention.type !== DirectoryEntityType.USER) return true;
      return replyMention.code !== currentUser.code;
    });
    const mentions = normalizedMentions.map(replyMention =>
      MentionReplacer.createMention(replyMention.type, replyMention.code)
    );
    return mentions.join(" ");
  };

  useEffect(() => {
    const replayMentionsText = convertReplyMentionsToText(props.replayMentions);
    setRawText(replayMentionsText === "" ? "" : `${replayMentionsText} `);
  }, [props.replayMentions]);

  const originalEditorFieldEl = originalFormEl.querySelector(
    'div.ocean-ui-editor-field[role="textbox"]'
  ) as HTMLElement;

  useEffect(() => {
    originalEditorFieldEl.innerHTML = renderedHTML;
  }, [renderedHTML, originalEditorFieldEl]);

  useEffect(() => {
    // Show the confirm dialog before leave the page.
    const showConfirmDialog = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", showConfirmDialog);

    return () => {
      window.removeEventListener("beforeunload", showConfirmDialog);
    };
  }, []);

  const handleChangeMarkdownTextArea = async (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const markdownText = event.target.value;
    setRawText(markdownText);

    await mentionReplacer.fetchDirectoryEntityInText(markdownText);

    const htmlString = marked(markdownText);
    const sanitizedHTML = DOMPurify.sanitize(htmlString);
    setRenderedHTML(sanitizedHTML);
  };

  const handleResizeTextArea = (textAreaEl: HTMLTextAreaElement) => {
    const resizeObserver = new MutationObserver((records, observer) => {
      setPreviewHeight(textAreaEl.offsetHeight);
    });

    resizeObserver.observe(textAreaEl, {
      attributes: true,
      attributeFilter: ["style"]
    });

    setPreviewHeight(textAreaEl.offsetHeight);
  };

  const kintoneDirectoryProvider = async (token: string) => {
    const collection = await kintoneClient.searchDirectory(token);
    return collection.flat();
  };

  return (
    <div className="marktone">
      <div className="editor-area">
        <ReactTextareaAutocomplete
          value={rawText}
          trigger={{
            "@": {
              dataProvider: kintoneDirectoryProvider,
              component: MentionCandidate,
              output: ({ type, code }) => {
                return MentionReplacer.createMention(type, code);
              }
            }
          }}
          loadingComponent={() => <span>Loading...</span>}
          onChange={handleChangeMarkdownTextArea}
          innerRef={textAreaEl => {
            if (textAreaEl) {
              textAreaEl.focus();

              handleResizeTextArea(textAreaEl);
            }
          }}
          containerClassName="autocomplete-container"
          dropdownClassName="autocomplete-dropdown"
          listClassName="autocomplete-list"
          itemClassName="autocomplete-item"
          loaderClassName="autocomplete-loader"
        />
        <div className="preview-wrapper" style={{ height: previewHeight }}>
          {/* Exclude the jsx-a11y/no-static-element-interactions rule because no suitable role exists. */}
          {/* eslint-disable-next-line react/no-danger,jsx-a11y/no-static-element-interactions */}
          <div
            className="preview"
            onClick={event => event.preventDefault()}
            onKeyDown={event => event.preventDefault()}
            onKeyUp={event => event.preventDefault()}
            onKeyPress={event => event.preventDefault()}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        </div>
      </div>
    </div>
  );
};

export default Marktone;
