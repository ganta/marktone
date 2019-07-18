import '../styles/content.scss';

import * as marked from 'marked';

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

function hasMarktone(element: HTMLElement): boolean {
    const list = element.getElementsByClassName('marktone');
    return list.length > 0;
}

function addMarktone(event: Event, element: HTMLElement): void {
    // eslint-disable-next-line no-console
    console.log(event, element);

    if (hasMarktone(element)) {
        return;
    }

    const marktone = document.createElement('div');
    marktone.classList.add('marktone');

    const textArea = document.createElement('textarea') as HTMLTextAreaElement;
    textArea.classList.add('marktone-textarea');

    textArea.addEventListener('keyup', (): void => {
        const originalEditorField = element.querySelector('div.ocean-ui-editor-field[role="textbox"]') as HTMLElement;
        originalEditorField.innerHTML = marked(textArea.value);
    });

    marktone.appendChild(textArea);
    element.prepend(marktone);

    textArea.focus();
}

delegateEvent(document, 'click', 'form.ocean-ui-comments-commentform-form', addMarktone);
