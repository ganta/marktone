import '../styles/content.scss';

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

delegateEvent(
    document,
    'click',
    'form[class$="-ui-comments-commentform-form"',
    (event, element): void => {
        // eslint-disable-next-line no-console
        console.log(event, element);
        const opened = element.querySelector('textarea[class="marktone-textarea"');
        if (opened) {
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.classList.add('marktone-textarea');
        const textAreaWrapper = element.querySelector('div[class$="-ui-comments-commentform-textarea-wrap"');
        if (textAreaWrapper) {
            textAreaWrapper.appendChild(textArea);
        }
    },
);
