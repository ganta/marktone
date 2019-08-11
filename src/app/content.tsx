import '../styles/content.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Marktone, { ReplyMention } from './components/marktone';
import { DirectoryEntityType } from './kintone/directory-entity';
import KintoneClient from './kintone/kintone-client';

// Pass the login user information to DOM.
// Because `window.kintone` cannot be referred directly from Chrome extension.
const initializationScript = document.createElement('script');
initializationScript.text = `
    document.body.dataset.LoginUser = JSON.stringify(kintone.getLoginUser());
`;
document.body.appendChild(initializationScript);

function delegateEvent(
    element: Document | HTMLElement,
    eventName: string,
    selector: string,
    callback: (evt: Event, elem: HTMLElement) => void,
): void {
    element.addEventListener(eventName, (event: Event): void => {
        const targetElement = event.target as HTMLElement;
        const specifiedElement = targetElement.closest(selector) as HTMLElement;
        if (specifiedElement) {
            callback(event, specifiedElement);
        }
    });
}

function renderMarktone(marktoneContainer: HTMLElement, originalForm: HTMLFormElement, replyMentions: ReplyMention[]): void {
    const marktoneComponent = (
        <Marktone
            originalForm={originalForm}
            replayMentions={replyMentions}
        />
    );

    const commentFormEditor = originalForm.querySelector('div.ocean-ui-comments-commentform-editor') as HTMLElement;
    if (commentFormEditor.childElementCount > 0) { // Does the original editor area exist?
        ReactDOM.render(marktoneComponent, marktoneContainer);
    } else {
        // When "Reply to all", wait for the original editor area to be inserted.
        const formEditorInsertedObserver = new MutationObserver(() => {
            ReactDOM.render(marktoneComponent, marktoneContainer);
        });
        formEditorInsertedObserver.observe(commentFormEditor as Node, { childList: true });
    }
}

function addMarktone(event: Event, formElement: HTMLElement, replyMentions: ReplyMention[] = []): void {
    let marktoneContainer = formElement.querySelector('div.marktone-container') as HTMLElement;
    if (marktoneContainer !== null) { return; } // Do nothing if the container already exists.

    // Create Marktone Container.
    marktoneContainer = document.createElement('div');
    marktoneContainer.classList.add('marktone-container');
    formElement.prepend(marktoneContainer);

    renderMarktone(marktoneContainer, formElement as HTMLFormElement, replyMentions);

    // Toggle opening and closing of Marktone according to the expansion state of the original form.
    const formExpandedObserver = new MutationObserver(() => {
        const originalCommentContainer = formElement.parentElement as HTMLElement;
        const isOriginalFormExpanded = (originalCommentContainer.getAttribute('aria-expanded') === 'true');

        if (isOriginalFormExpanded) {
            renderMarktone(marktoneContainer, formElement as HTMLFormElement, replyMentions);
        } else {
            ReactDOM.unmountComponentAtNode(marktoneContainer);
        }
    });
    formExpandedObserver.observe(
        formElement.parentElement as Node,
        { attributes: true, attributeFilter: ['aria-expanded'] },
    );
}

function convertHTMLAnchorElementToReplyMention(element: HTMLAnchorElement): ReplyMention {
    const type = DirectoryEntityType.USER;
    const code = element.href.split('/').slice(-1)[0]; // '/k/#people/user/{code}'
    return { type, code };
}

async function extractReplyMentions(commentBaseText: HTMLElement): Promise<ReplyMention[]> {
    const idAndTypes = Array.from<HTMLAnchorElement, { type: string; id: string }>(
        commentBaseText.querySelectorAll('a.ocean-ui-plugin-mention-user'),
        (anchor) => {
            if (anchor.hasAttribute('data-org-mention-id')) {
                return { type: 'ORGANIZATION', id: anchor.dataset.orgMentionId as string };
            }
            if (anchor.hasAttribute('data-group-mention-id')) {
                return { type: 'GROUP', id: anchor.dataset.groupMentionId as string };
            }
            return { type: 'USER', id: anchor.dataset.mentionId as string };
        },
    );
    const entities = await KintoneClient.ListDirectoryEntityByIdAndType(idAndTypes);
    return entities.map((entity) => {
        return { type: entity.type, code: entity.code };
    });
}

async function addMarktoneWhenReply(event: Event, replyButton: HTMLElement): Promise<void> {
    let commentsWrapper = replyButton.closest('div.ocean-ui-comments-post-wrapper') as HTMLElement | null;
    if (commentsWrapper === null) { // The first comment has not wrapper.
        commentsWrapper = replyButton.closest('div.ocean-ui-comments-commentbase') as HTMLElement;
    }
    const formElement = commentsWrapper.querySelector('form.ocean-ui-comments-commentform-form') as HTMLElement;

    const commentBaseBody = replyButton.closest('div.ocean-ui-comments-commentbase-body') as HTMLElement;
    const commentBaseUser = commentBaseBody.querySelector('a.ocean-ui-comments-commentbase-user') as HTMLAnchorElement;
    const replyMentions: ReplyMention[] = [];
    replyMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

    if (replyButton.classList.contains('ocean-ui-comments-commentbase-commentall')) {
        const commentBaseText = commentBaseBody.querySelector('span.ocean-ui-comments-commentbase-text') as HTMLElement;
        const mentions = await extractReplyMentions(commentBaseText);
        replyMentions.push(...mentions);
    }

    addMarktone(event, formElement, replyMentions);
}

// for the first comment
delegateEvent(document, 'click', 'form.ocean-ui-comments-commentform-form', addMarktone);
// for the reply comment
delegateEvent(document, 'click', 'a.ocean-ui-comments-commentbase-comment', addMarktoneWhenReply);
// for the replay all comment
delegateEvent(document, 'click', 'a.ocean-ui-comments-commentbase-commentall', addMarktoneWhenReply);
