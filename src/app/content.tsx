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
  )!;

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
  formElement: HTMLElement,
  replyMentions: ReplyMention[] = []
): void {
  const originalCommentContainer = formElement.parentElement!;

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

function addMarktoneForSpaceThread(element: HTMLElement) {
  const formElement = element.querySelector<HTMLElement>(
    "form.ocean-ui-comments-commentform-form"
  )!;
  addMarktone(formElement);
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
  replyButton: HTMLElement
): Promise<void> {
  // Get the comment form element
  const commentsWrapper =
    replyButton.closest("div.ocean-ui-comments-post-wrapper") ||
    replyButton.closest("div.ocean-ui-comments-commentbase")!;
  const formElement = commentsWrapper.querySelector<HTMLFormElement>(
    "form.ocean-ui-comments-commentform-form"
  )!;

  // Collect the reply mentions
  const commentBaseBody = replyButton.closest(
    "div.ocean-ui-comments-commentbase-body"
  )!;
  const commentBaseUser = commentBaseBody.querySelector<HTMLAnchorElement>(
    "a.ocean-ui-comments-commentbase-user"
  )!;

  const replyMentions: ReplyMention[] = [];
  replyMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

  if (
    replyButton.classList.contains("ocean-ui-comments-commentbase-commentall")
  ) {
    const commentBaseText = commentBaseBody.querySelector<HTMLElement>(
      "span.ocean-ui-comments-commentbase-text"
    )!;
    const mentions = await extractReplyMentions(commentBaseText);
    replyMentions.push(...mentions);
  }

  addMarktone(formElement, replyMentions);
}

async function addMarktoneWhenRecordCommentReply(
  replyButton: HTMLElement
): Promise<void> {
  // Get the comment form element
  const sidebarList = document.getElementById("sidebar-list-gaia")!;
  const formElement = sidebarList.parentElement!.querySelector<HTMLFormElement>(
    "form.ocean-ui-comments-commentform-form"
  )!;

  // Collect the reply mentions
  const itemListItem = replyButton.closest("li.itemlist-item-gaia")!;
  const commentListBody = itemListItem.querySelector<HTMLElement>(
    "div.commentlist-body-gaia"
  )!;
  const commentBaseUser = itemListItem.querySelector<HTMLAnchorElement>(
    ".itemlist-user-gaia > a"
  )!;

  const replyMentions: ReplyMention[] = [];
  replyMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

  if (replyButton.classList.contains("commentlist-footer-replyall-gaia")) {
    const mentions = await extractReplyMentions(commentListBody);
    replyMentions.push(...mentions);
  }

  addMarktone(formElement, replyMentions);
}

function delegateClickEvent(
  selector: string,
  callback: (elem: HTMLElement) => void
): void {
  document.addEventListener("click", event => {
    const targetElement = event.target as HTMLElement;
    const specifiedElement = targetElement.closest<HTMLElement>(selector);
    if (specifiedElement !== null) {
      callback(specifiedElement);
    }
  });
}

// for the first comment of space or people
delegateClickEvent("form.ocean-ui-comments-commentform-form", addMarktone);
delegateClickEvent("div.ocean-space-thread", addMarktoneForSpaceThread);
delegateClickEvent("div.ocean-people-userthread", addMarktoneForSpaceThread);

// for the reply comment of space or people
delegateClickEvent(
  "a.ocean-ui-comments-commentbase-comment",
  addMarktoneWhenSpaceCommentReply
);

// for the replay all comment of space or people
delegateClickEvent(
  "a.ocean-ui-comments-commentbase-commentall",
  addMarktoneWhenSpaceCommentReply
);

// for the reply comment of record
delegateClickEvent(
  "a.commentlist-footer-reply-gaia",
  addMarktoneWhenRecordCommentReply
);

// for the reply all comment of record
delegateClickEvent(
  "a.commentlist-footer-replyall-gaia",
  addMarktoneWhenRecordCommentReply
);
