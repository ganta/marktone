import '../styles/content.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Marktone from './components/marktone';

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

function addMarktone(event: Event, element: HTMLElement): void {
    // eslint-disable-next-line no-console
    console.log(event, element);

    let marktoneWrapper = element.querySelector('div.marktone-wrap') as HTMLElement;
    if (!marktoneWrapper) {
        marktoneWrapper = document.createElement('div');
        marktoneWrapper.classList.add('marktone-wrap');
        element.prepend(marktoneWrapper);
    }

    const originalEditorField = element.querySelector('div.ocean-ui-editor-field[role="textbox"]') as HTMLElement;
    ReactDOM.render(<Marktone rawText="" originalEditorField={originalEditorField} />, marktoneWrapper);
}

delegateEvent(document, 'click', 'form.ocean-ui-comments-commentform-form', addMarktone);
