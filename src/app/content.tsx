import '../styles/content.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Marktone, { ReplyMention } from './components/marktone';
import { DirectoryEntityType } from './kintone/directory-entity';

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

function addMarktone(event: Event, formElement: HTMLElement, replyMentions: ReplyMention[] = []): void {
    let marktoneContainer = formElement.querySelector('div.marktone-container') as HTMLElement;
    if (marktoneContainer !== null) { return; } // Do nothing if the container already exists.

    const originalEditorField = formElement.querySelector('div.ocean-ui-editor-field[role="textbox"]') as HTMLElement;

    // Create Marktone Container.
    marktoneContainer = document.createElement('div');
    marktoneContainer.classList.add('marktone-container');
    formElement.prepend(marktoneContainer);

    // First rendering.
    const marktoneComponent = (
        <Marktone
            originalEditorField={originalEditorField}
            replayMentions={replyMentions}
        />
    );
    ReactDOM.render(marktoneComponent, marktoneContainer);

    // Toggle opening and closing of Marktone according to the expansion state of the original form.
    const formExpandedObserver = new MutationObserver(() => {
        const originalCommentContainer = formElement.parentElement as HTMLElement;
        const isOriginalFormExpanded = (originalCommentContainer.getAttribute('aria-expanded') === 'true');

        if (isOriginalFormExpanded) {
            ReactDOM.render(marktoneComponent, marktoneContainer);
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

function addMarktoneWhenReply(event: Event, replyButton: HTMLElement): void {
    let commentsWrapper = replyButton.closest('div.ocean-ui-comments-post-wrapper') as HTMLElement;
    if (commentsWrapper === null) { // The first comment has not wrapper.
        commentsWrapper = replyButton.closest('div.ocean-ui-comments-commentbase') as HTMLElement;
    }
    const formElement = commentsWrapper.querySelector('form.ocean-ui-comments-commentform-form') as HTMLElement;

    const commentBaseBody = replyButton.closest('div.ocean-ui-comments-commentbase-body') as HTMLElement;
    const commentBaseUser = commentBaseBody.querySelector('a.ocean-ui-comments-commentbase-user') as HTMLAnchorElement;
    const replayMentions: ReplyMention[] = [];
    replayMentions.push(convertHTMLAnchorElementToReplyMention(commentBaseUser));

    addMarktone(event, formElement, replayMentions);
}

// for the first comment
delegateEvent(document, 'click', 'form.ocean-ui-comments-commentform-form', addMarktone);
// for the reply comment
delegateEvent(document, 'click', 'a.ocean-ui-comments-commentbase-comment', addMarktoneWhenReply);
// for the replay all comment
delegateEvent(document, 'click', 'a.ocean-ui-comments-commentbase-commentall', addMarktoneWhenReply);
