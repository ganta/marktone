import * as React from 'react';
import * as marked from 'marked';

interface MarktoneProps {
    rawText: string;
    originalEditorField: HTMLElement;
}

interface MarktoneState {
    rawText: string;
}

class MarktoneRendererFactory {
    static create(): marked.Renderer {
        const renderer = new marked.Renderer();

        renderer.heading = (text, level): string => {
            const fontSize = 2.0 - (0.2 * level);
            let style = `font-size: ${fontSize}em; font-weight: bold;`;
            if (level <= 2) {
                style += ' border-bottom: 1px solid #ddd;';
            }

            return `<h${level} style="${style}">${text}</h${level}>`;
        };

        return renderer;
    }
}

marked.setOptions({
    gfm: true, // Enable GitHub Flavored Markdown.
    breaks: true, // Add 'br' element on a single line break.
    headerIds: false,
    renderer: MarktoneRendererFactory.create(),
});

class Marktone extends React.Component<MarktoneProps, MarktoneState> {
    private readonly textArea: React.RefObject<HTMLTextAreaElement>;

    constructor(props: MarktoneProps) {
        super(props);
        this.state = { rawText: '' };
        this.textArea = React.createRef();
        this.focusTextArea = this.focusTextArea.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount(): void {
        this.focusTextArea();
    }

    focusTextArea() {
        const { textArea } = this;
        if (textArea !== null && textArea.current !== null) {
            textArea.current.focus();
        }
    }

    handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        const rawText = event.currentTarget.value;
        this.setState({ rawText });

        const { originalEditorField } = this.props;
        originalEditorField.innerHTML = marked(rawText);
    }

    render() {
        const { rawText } = this.state;
        return (
            <div className="marktone">
                <textarea
                    className="marktone-textarea"
                    ref={this.textArea}
                    value={rawText}
                    onChange={this.handleChange}
                />
            </div>
        );
    }
}

export default Marktone;
