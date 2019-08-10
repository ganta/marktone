import * as React from 'react';
import * as marked from 'marked';
import ReactTextareaAutocomplete, { ItemComponentProps } from '@webscopeio/react-textarea-autocomplete';

import MarktoneRenderer from '../markdown/renderer/marktone-renderer';
import KintoneClient from '../kintone/kintone-client';
import MentionReplacer from '../markdown/replacer/mention-replacer';
import { DirectoryEntityType } from '../kintone/directory-entity';

import '@webscopeio/react-textarea-autocomplete/style.css';

export interface ReplyMention {
    type: DirectoryEntityType;
    code: string;
}

interface MarktoneProps {
    originalForm: HTMLFormElement;
    replayMentions: ReplyMention[];
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
    private static convertReplyMentionsToText(replyMentions: ReplyMention[]): string {
        const currentUser = KintoneClient.getLoginUser();
        const normalizedMentions = replyMentions.filter((replyMention) => {
            if (replyMention.type !== DirectoryEntityType.USER) return true;
            return replyMention.code !== currentUser.code;
        });
        const mentions = normalizedMentions.map(replyMention => MentionReplacer.createMention(replyMention.type, replyMention.code));
        return mentions.join(' ');
    }

    private textArea: HTMLTextAreaElement | undefined;

    private readonly originalForm: HTMLFormElement;

    private readonly mentionReplacer: MentionReplacer;

    constructor(props: MarktoneProps) {
        super(props);
        this.originalForm = props.originalForm;

        this.mentionReplacer = new MentionReplacer();

        this.state = {
            rawText: '',
        };

        marked.setOptions({
            gfm: true, // Enable GitHub Flavored Markdown.
            breaks: true, // Add 'br' element on a single line break.
            headerIds: false,
            renderer: new MarktoneRenderer(this.mentionReplacer),
        });

        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount(): void {
        const { textArea, props } = this;
        if (textArea) {
            textArea.focus();

            // Setting the value to `rawText` should be done in the constructor,
            // but in order to perform Markdown rendering, run it in `componentDidMount()`.
            const replayMentionsText = Marktone.convertReplyMentionsToText(props.replayMentions);
            this.setState({ rawText: replayMentionsText === '' ? '' : `${replayMentionsText} ` });
        }
    }

    async handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        const rawText = event.target.value;
        this.setState({ rawText });

        await this.mentionReplacer.fetchDirectoryEntityInText(rawText);

        const originalEditorField = this.originalEditorField();
        originalEditorField.innerHTML = marked(rawText);
    }

    private originalEditorField(): HTMLElement {
        return this.originalForm.querySelector('div.ocean-ui-editor-field[role="textbox"]') as HTMLElement;
    }

    render() {
        const { rawText } = this.state;

        return (
            <div className="marktone">
                <ReactTextareaAutocomplete
                    value={rawText}
                    trigger={{
                        '@': {
                            dataProvider,
                            component: MentionCandidate,
                            output: ({ type, code }) => MentionReplacer.createMention(type, code),
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
