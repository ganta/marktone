import React, { KeyboardEvent, ReactElement } from "react";
import marked from "marked";
import DOMPurify from "dompurify";
import ReactTextareaAutocomplete, {
  ItemComponentProps,
} from "@webscopeio/react-textarea-autocomplete";

import MarktoneRenderer from "../markdown/renderer/marktone-renderer";
import KintoneClient from "../kintone/kintone-client";
import MentionReplacer from "../markdown/replacer/mention-replacer";
import {
  DirectoryEntity,
  DirectoryEntityType,
} from "../kintone/directory-entity";

import "@webscopeio/react-textarea-autocomplete/style.css";

const { useState, useEffect, useRef } = React;

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

/**
 * The mention candidate component.
 */
const MentionCandidate: React.FC<ItemComponentProps<MentionCandidateItem>> = (
  props: ItemComponentProps<MentionCandidateItem>
) => {
  const {
    entity: { code, name, avatar },
  } = props;

  return (
    <span className="mention-candidate">
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

/**
 * Marktone component.
 */
const Marktone: React.FC<MarktoneProps> = (props: MarktoneProps) => {
  const { originalFormEl, kintoneClient, mentionReplacer } = props;

  // Setup Marked.js
  marked.setOptions({
    gfm: true, // Enable GitHub Flavored Markdown.
    breaks: true, // Add 'br' element on a single line break.
    headerIds: false,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore for `listitem()`
    renderer: new MarktoneRenderer(mentionReplacer),
  });

  /**
   * Converts the reply mention objects to the mentions text.
   *
   * @param replyMentions - The reply mention objects
   * @return The string with mentions separated by spaces
   */
  const convertReplyMentionsToText = (
    replyMentions: ReplyMention[]
  ): string => {
    const currentUser = KintoneClient.getLoginUser();
    const normalizedMentions = replyMentions.filter((replyMention) => {
      if (replyMention.type !== DirectoryEntityType.USER) return true;
      return replyMention.code !== currentUser.code;
    });
    const mentions = normalizedMentions.map((replyMention) =>
      MentionReplacer.createMention(replyMention.type, replyMention.code)
    );
    return mentions.join(" ");
  };

  // The Markdown raw text
  const [rawText, setRawText] = useState("");

  // Inserts the mentions string to the raw text when the reply mentions were set.
  useEffect(() => {
    const replayMentionsText = convertReplyMentionsToText(props.replayMentions);
    setRawText(replayMentionsText === "" ? "" : `${replayMentionsText} `);
  }, [props.replayMentions]);

  // The HTML with Markdown rendered
  const [renderedHTML, setRenderedHTML] = useState("");

  // The original editor field HTML element of kintone
  const originalEditorFieldEl = originalFormEl.querySelector<HTMLElement>(
    'div.ocean-ui-editor-field[role="textbox"]'
  )!;

  // Get Marktone enabled status.
  const isMarktoneEnabled = (): boolean => {
    const marktoneEnabled = document.body.dataset.marktoneEnabled;

    if (marktoneEnabled === undefined) return true;

    return document.body.dataset.marktoneEnabled === "true";
  };

  // Updates the kintone original editor field with the rendered HTML.
  useEffect(() => {
    if (isMarktoneEnabled()) {
      originalEditorFieldEl.innerHTML = renderedHTML;
    }
  }, [renderedHTML, originalEditorFieldEl]);

  // The reference of the Markdown text area
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Shows the confirm dialog before leave the page.
  useEffect(() => {
    const showConfirmDialogOnBeforeUnload = (
      event: BeforeUnloadEvent
    ): void => {
      if (textAreaRef.current !== null && textAreaRef.current.value === "") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", showConfirmDialogOnBeforeUnload);

    const showConfirmDialogOnHashChangeAnchorClicked = (event: Event): void => {
      const currentPathname = window.location.pathname;
      const currentHash = window.location.hash;
      const targetEl = event.target as HTMLElement;
      const hashChangeAnchorEl = targetEl.closest<HTMLAnchorElement>(
        `a[href^="${currentPathname}#"]:not([href="${currentPathname}${currentHash}"])`
      );

      if (hashChangeAnchorEl === null) return;

      if (
        textAreaRef.current === null ||
        textAreaRef.current!.value === "" ||
        confirm("Changes you made may not be saved.")
      ) {
        window.removeEventListener(
          "beforeunload",
          showConfirmDialogOnBeforeUnload
        );
        document.removeEventListener(
          "click",
          showConfirmDialogOnHashChangeAnchorClicked
        );
      } else {
        event.preventDefault();
      }
    };
    document.addEventListener(
      "click",
      showConfirmDialogOnHashChangeAnchorClicked
    );

    return (): void => {
      window.removeEventListener(
        "beforeunload",
        showConfirmDialogOnBeforeUnload
      );
      document.removeEventListener(
        "hashchange",
        showConfirmDialogOnHashChangeAnchorClicked
      );
    };
  }, []);

  // The reference of Marktone
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabModeThresholdWidth = 600;
    const marktoneEl = ref.current!;

    const resizeObserver = new ResizeObserver(
      (entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
          if (entry.contentRect.width < tabModeThresholdWidth) {
            marktoneEl.classList.add("tab-mode");
          } else {
            marktoneEl.classList.remove("tab-mode");
          }
        });
      }
    );
    resizeObserver.observe(marktoneEl, { box: "border-box" });
  }, []);

  /**
   * Handles the event when the Markdown textarea is updated.
   */
  const handleChangeMarkdownTextArea = async (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): Promise<void> => {
    const markdownText = event.target.value;
    setRawText(markdownText);

    await mentionReplacer.fetchDirectoryEntityInText(markdownText);

    const htmlString = marked(markdownText);
    const sanitizedHTML = DOMPurify.sanitize(htmlString);
    setRenderedHTML(sanitizedHTML);
  };

  // The preview area height
  const [previewHeight, setPreviewHeight] = useState(0);

  /**
   * Handles the behavior when the Markdown text area is resized.
   */
  const handleResizeTextArea = (textAreaEl: HTMLTextAreaElement): void => {
    const resizeObserver = new MutationObserver((_records, _observer) => {
      setPreviewHeight(textAreaEl.offsetHeight);
    });

    resizeObserver.observe(textAreaEl, {
      attributes: true,
      attributeFilter: ["style"],
    });

    setPreviewHeight(textAreaEl.offsetHeight);
  };

  /**
   * Returns the kintone users, organizations and groups that matches the specified token.
   */
  const kintoneDirectoryProvider = async (
    token: string
  ): Promise<DirectoryEntity[]> => {
    const collection = await kintoneClient.searchDirectory(token);
    return collection.flat();
  };

  // Whether the file is being dragged
  const [isDragging, setDragging] = useState(false);

  /**
   * Handles the event when the dragged file enters the element.
   */
  const handleDragEnter = (): void => {
    setDragging(true);
  };

  /**
   * Handles the event when the dragged file leaves the element.
   */
  const handleDragLeave = (): void => {
    setDragging(false);
  };

  // The reference of ReactTextAreaAutocomplete component
  const reactTextAreaAutocompleteRef = useRef<
    ReactTextareaAutocomplete<MentionCandidateItem>
  >(null);

  /**
   * Gets the caret position of the Markdown text area.
   */
  const getCaretPosition = (): number => {
    if (reactTextAreaAutocompleteRef.current === null) return 0;
    return reactTextAreaAutocompleteRef.current.getCaretPosition();
  };

  /**
   * Moves the caret position of the Markdown text area.
   */
  const setCaretPosition = (position: number): void => {
    if (reactTextAreaAutocompleteRef.current === null) return;
    reactTextAreaAutocompleteRef.current.setCaretPosition(position);
  };

  /**
   * Returns whether file upload is supported.
   */
  const isSupportedFileUploading = (): boolean => {
    return (
      KintoneClient.isPeoplePage() ||
      KintoneClient.isSpacePage() ||
      KintoneClient.isNotificationPage()
    );
  };

  /**
   * Handles the event when the file is dropped to the Markdown text area.
   */
  const handleDropFile = async (
    event: React.DragEvent<HTMLTextAreaElement>
  ): Promise<void> => {
    event.stopPropagation();
    event.preventDefault();

    setDragging(false);

    const files = Array.from<File>(event.dataTransfer.files);

    let caretPosition = getCaretPosition();
    let currentRawText = rawText;

    for (const file of files) {
      const uploadingText = file.type.startsWith("image/")
        ? `![](Uploading... ${file.name})`
        : `[](Uploading... ${file.name}]`;

      currentRawText = `${currentRawText.slice(
        0,
        caretPosition
      )}${uploadingText}\n${currentRawText.slice(caretPosition)}`;

      caretPosition += uploadingText.length + 1;

      setRawText(currentRawText);
      setCaretPosition(caretPosition);

      const response = await kintoneClient.uploadFile(file);

      const uploadedText = response.result.image
        ? `![${file.name}](tmp:${response.result.fileKey} "=${KintoneClient.defaultThumbnailWidth}")`
        : `[${file.name}](tmp:${response.result.fileKey})`;

      currentRawText = currentRawText.replace(uploadingText, uploadedText);
      setRawText(currentRawText);

      caretPosition += uploadedText.length - uploadingText.length;
      setCaretPosition(caretPosition);
    }
  };

  const handleClickEditorTab = (): void => {
    ref.current!.classList.remove("preview-active");
    textAreaRef.current!.focus();
  };
  const handleKeyDownEditorTab = (event: KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      handleClickEditorTab();
    }
  };

  const handleClickPreviewTab = (): void => {
    ref.current!.classList.add("preview-active");
  };
  const handleKeyDownPreviewTab = (event: KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      handleClickPreviewTab();
    }
  };

  /**
   * Do nothing.
   */
  const doNothing = (): void => {
    // Do nothing.
  };

  return (
    <div ref={ref} className="marktone">
      <div className="tabs">
        <div
          className="tab edit-tab"
          onClick={handleClickEditorTab}
          onKeyDown={handleKeyDownEditorTab}
          role="tab"
          tabIndex={0}
        >
          Edit
        </div>
        <div
          className="tab preview-tab"
          onClick={handleClickPreviewTab}
          onKeyDown={handleKeyDownPreviewTab}
          role="tab"
          tabIndex={0}
        >
          Preview
        </div>
      </div>
      <div className="editor-area">
        <div className="textarea-wrapper">
          <ReactTextareaAutocomplete
            value={rawText}
            trigger={{
              "@": {
                dataProvider: kintoneDirectoryProvider,
                component: MentionCandidate,
                output: ({ type, code }): string => {
                  return MentionReplacer.createMention(type, code);
                },
              },
            }}
            loadingComponent={(): ReactElement => <span>Loading...</span>}
            onChange={handleChangeMarkdownTextArea}
            onDragEnter={
              isSupportedFileUploading() ? handleDragEnter : doNothing
            }
            onDragLeave={
              isSupportedFileUploading() ? handleDragLeave : doNothing
            }
            onDrop={isSupportedFileUploading() ? handleDropFile : doNothing}
            ref={reactTextAreaAutocompleteRef}
            innerRef={(textAreaEl): void => {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              textAreaRef.current = textAreaEl;
              if (textAreaEl) {
                textAreaEl.focus();

                handleResizeTextArea(textAreaEl);
              }
            }}
            movePopupAsYouType
            className={isDragging ? "dragging" : ""}
            containerClassName="autocomplete-container"
            dropdownClassName="autocomplete-dropdown"
            listClassName="autocomplete-list"
            itemClassName="autocomplete-item"
            loaderClassName="autocomplete-loader"
          />
        </div>
        <div className="preview-wrapper" style={{ height: previewHeight }}>
          {/* Exclude the jsx-a11y/no-static-element-interactions rule because no suitable role exists. */}
          {/* eslint-disable-next-line react/no-danger,jsx-a11y/no-static-element-interactions */}
          <div
            className="preview"
            onClick={(event): void => event.preventDefault()}
            onKeyDown={(event): void => event.preventDefault()}
            onKeyUp={(event): void => event.preventDefault()}
            onKeyPress={(event): void => event.preventDefault()}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        </div>
      </div>
    </div>
  );
};

export default Marktone;
