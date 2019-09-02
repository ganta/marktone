import "../styles/content.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

import Marktone, { ReplyMention } from "./components/marktone";
import { DirectoryEntityType } from "./kintone/directory-entity";
import KintoneClient from "./kintone/kintone-client";
import MentionReplacer from "./markdown/replacer/mention-replacer";

// Pass the login user information to DOM.
// Because `window.kintone` cannot be referred directly from Chrome extension.
const initializationScript = document.createElement("script");
initializationScript.text = `
    document.body.dataset.loginUser = JSON.stringify(kintone.getLoginUser());
    document.body.dataset.requestToken = kintone.getRequestToken();
`;
document.body.appendChild(initializationScript);

function delegateEvent(
  element: Document | HTMLElement,
  eventName: string,
  selector: string,
  callback: (evt: Event, elem: HTMLElement) => void
): void {
  element.addEventListener(eventName, (event: Event): void => {
    const targetElement = event.target as HTMLElement;
    const specifiedElement = targetElement.closest(selector) as HTMLElement;
    if (specifiedElement) {
      callback(event, specifiedElement);
    }
  });
}

function renderMarktone(
  marktoneContainer: HTMLElement,
  originalForm: HTMLFormElement,
  replyMentions: ReplyMention[]
): void {
  const kintoneClient = new KintoneClient();
  const mentionReplacer = new MentionReplacer(kintoneClient);
  const marktoneComponent = (
    <Marktone
      originalFormEl={originalForm}
      replayMentions={replyMentions}
      kintoneClient={kintoneClient}
      mentionReplacer={mentionReplacer}
    />
  );

  const commentFormEditor = originalForm.querySelector<HTMLElement>(
    "div.ocean-ui-comments-commentform-editor"
  ) as HTMLElement;

  if (commentFormEditor.childElementCount > 0) {
    // Does the original editor area exist?
    ReactDOM.render(marktoneComponent, marktoneContainer);
  } else {
    // When "Reply to all", wait for the original editor area to be inserted.
    const formEditorInsertedObserver = new MutationObserver(() => {
      ReactDOM.render(marktoneComponent, marktoneContainer);
    });
    formEditorInsertedObserver.observe(commentFormEditor, {
      childList: true
    });
  }
}

function addMarktone(
  event: Event,
  formElement: HTMLElement,
  replyMentions: ReplyMention[] = []
): void {
  const originalCommentContainer = formElement.parentElement as HTMLElement;

  const isOriginalFormExpanded = () => {
    return originalCommentContainer.getAttribute("aria-expanded") === "true";
  };

  if (!isOriginalFormExpanded()) return;

  let marktoneContainer = formElement.querySelector<HTMLElement>(
    "div.marktone-container"
  );

  if (marktoneContainer !== null) return;

  // Create Marktone Container.
  marktoneContainer = document.createElement("div");
  marktoneContainer.classList.add("marktone-container");
  formElement.prepend(marktoneContainer);

  renderMarktone(
    marktoneContainer,
    formElement as HTMLFormElement,
    replyMentions
  );

  // Close Marktone according to the expansion state of the original form.
  const formExpandedObserver = new MutationObserver((mutations, observer) => {
    if (!isOriginalFormExpanded()) {
      ReactDOM.unmountComponentAtNode(marktoneContainer as Element);
      observer.disconnect();
      formElement.removeChild(marktoneContainer as Node);
    }
  });
  formExpandedObserver.observe(formElement.parentElement as Node, {
    attributes: true,
    attributeFilter: ["aria-expanded"]
  });
}

function convertHTMLAnchorElementToReplyMention(
  element: HTMLAnchorElement
): ReplyMention {
  const type = DirectoryEntityType.USER;
  const code = element.href.split("/").slice(-1)[0]; // '/k/#people/user/{code}'
  return { type, code };
}

async function extractReplyMentions(
  commentBaseText: HTMLElement
): Promise<ReplyMention[]> {
  const idAndTypes = Array.from<
    HTMLAnchorElement,
    { type: string; id: string }
  >(
    commentBaseText.querySelectorAll("a.ocean-ui-plugin-mention-user"),
    anchor => {
      if (anchor.hasAttribute("data-org-mention-id")) {
        return {
          type: "ORGANIZATION",
          id: anchor.dataset.orgMentionId as string
        };
      }
      if (anchor.hasAttribute("data-group-mention-id")) {
        return { type: "GROUP", id: anchor.dataset.groupMentionId as string };
      }
      return { type: "USER", id: anchor.dataset.mentionId as string };
    }
  );
  const client = new KintoneClient();
  const entities = await client.listDirectoryEntityByIdAndType(idAndTypes);
  return entities.map(entity => {
    return { type: entity.type, code: entity.code };
  });
}

async function addMarktoneWhenSpaceCommentReply(
  event: Event,
  replyButton: HTMLElement
): Promise<void> {
  // Get the comment form element
  const commentsWrapper = (replyButton.closest(
    "div.ocean-ui-comments-post-wrapper"
  ) || replyButton.closest("div.ocean-ui-comments-commentbase")) as HTMLElement;
  const formElement = commentsWrapper.querySelector<HTMLFormElement>(
    "form.ocean-ui-comments-commentform-form"
  ) as HTMLFormElement;

  // Collect the reply mentions
  const commentBaseBody = replyButton.closest(
    "div.ocean-ui-comments-commentbase-body"
  ) as HTMLElement;
  const commentBaseUser = commentBaseBody.querySelector<HTMLAnchorElement>(
    "a.ocean-ui-comments-commentbase-user"
  ) as HTMLAnchorElement;

  const replyMentions: ReplyMention[] = [];
  replyMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

  if (
    replyButton.classList.contains("ocean-ui-comments-commentbase-commentall")
  ) {
    const commentBaseText = commentBaseBody.querySelector<HTMLElement>(
      "span.ocean-ui-comments-commentbase-text"
    ) as HTMLElement;
    const mentions = await extractReplyMentions(commentBaseText);
    replyMentions.push(...mentions);
  }

  addMarktone(event, formElement, replyMentions);
}

async function addMarktoneWhenRecordCommentReply(
  event: Event,
  replyButton: HTMLElement
): Promise<void> {
  // Get the comment form element
  const sidebarList = document.getElementById(
    "sidebar-list-gaia"
  ) as HTMLElement;
  const formElement = (sidebarList.parentElement as HTMLElement).querySelector<
    HTMLFormElement
  >("form.ocean-ui-comments-commentform-form") as HTMLFormElement;

  // Collect the reply mentions
  const itemListItem = replyButton.closest(
    "li.itemlist-item-gaia"
  ) as HTMLLIElement;
  const commentListBody = itemListItem.querySelector<HTMLElement>(
    "div.commentlist-body-gaia"
  ) as HTMLElement;
  const commentBaseUser = itemListItem.querySelector<HTMLAnchorElement>(
    ".itemlist-user-gaia > a"
  ) as HTMLAnchorElement;

  const replyMentions: ReplyMention[] = [];
  replyMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

  if (replyButton.classList.contains("commentlist-footer-replyall-gaia")) {
    const mentions = await extractReplyMentions(commentListBody);
    replyMentions.push(...mentions);
  }

  addMarktone(event, formElement, replyMentions);
}

// for the first comment
delegateEvent(
  document,
  "click",
  "form.ocean-ui-comments-commentform-form",
  addMarktone
);

// for the reply comment
delegateEvent(
  document,
  "click",
  "a.ocean-ui-comments-commentbase-comment",
  addMarktoneWhenSpaceCommentReply
);

// for the replay all comment
delegateEvent(
  document,
  "click",
  "a.ocean-ui-comments-commentbase-commentall",
  addMarktoneWhenSpaceCommentReply
);

// for the record reply comment
delegateEvent(
  document,
  "click",
  "a.commentlist-footer-reply-gaia",
  addMarktoneWhenRecordCommentReply
);

// for the record reply all comment
delegateEvent(
  document,
  "click",
  "a.commentlist-footer-replyall-gaia",
  addMarktoneWhenRecordCommentReply
);
