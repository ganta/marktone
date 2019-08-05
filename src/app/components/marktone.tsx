import * as React from 'react';
import * as marked from 'marked';
import ReactTextareaAutocomplete, { ItemComponentProps } from '@webscopeio/react-textarea-autocomplete';

import MarktoneRenderer from '../markdown/renderer/marktone-renderer';
import KintoneClient from '../kintone/kintone-client';
import MentionReplacer from '../markdown/replacer/mention-replacer';
import { DirectoryEntityType } from '../kintone/directory-entity';

import '@webscopeio/react-textarea-autocomplete/style.css';

interface MarktoneProps {
    originalEditorField: HTMLElement;
}

interface MarktoneState {
    rawText: string;
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
        entity: {
            type, id, code, name, avatar,
        },
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

async function dataProvider(token: string) {
    const collection = await KintoneClient.searchDirectory(token);
    return collection.flat();
}

class Marktone extends React.Component<MarktoneProps, MarktoneState> {
    private textArea: HTMLTextAreaElement | undefined;

    private readonly mentionReplacer: MentionReplacer;

    constructor(props: MarktoneProps) {
        super(props);
        this.mentionReplacer = new MentionReplacer();

        marked.setOptions({
            gfm: true, // Enable GitHub Flavored Markdown.
            breaks: true, // Add 'br' element on a single line break.
            headerIds: false,
            renderer: new MarktoneRenderer(this.mentionReplacer),
        });

        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount(): void {
        const { textArea } = this;
        if (textArea) {
            textArea.focus();
        }
    }

    async handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        if (event.currentTarget === null) {
            return;
        }

        const rawText = event.currentTarget.value;

        await this.mentionReplacer.fetchDirectoryEntityInText(rawText);

        const { originalEditorField } = this.props;
        originalEditorField.innerHTML = marked(rawText);
    }

    render() {
        return (
            <div className="marktone">
                <ReactTextareaAutocomplete
                    trigger={{
                        '@': {
                            dataProvider,
                            component: MentionCandidate,
                            output: ({ type, code }) => {
                                const escapedCode = MentionReplacer.escapeCode(code);
                                if (type === DirectoryEntityType.USER) {
                                    return `@${escapedCode}`;
                                }
                                return `@${type}/${escapedCode}`;
                            },
                        },
                    }}
                    loadingComponent={() => <span>Loading</span>}
                    className="marktone-textarea"
                    innerRef={(textArea) => { this.textArea = textArea; }}
                    onChange={this.handleChange}

                    containerClassName="marktone-autocomplete-container"
                    dropdownClassName="marktone-autocomplete-dropdown"
                    listClassName="marktone-autocomplete-list"
                    itemClassName="marktone-autocomplete-item"
                    loaderClassName="marktone-autocomplete-loader"
                />
            </div>
        );
    }
}

export default Marktone;
