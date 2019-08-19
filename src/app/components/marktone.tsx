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
    renderedHTML: string;
    previewHeight: number;
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

    private readonly kintoneClient: KintoneClient;

    private textArea: HTMLTextAreaElement | undefined;

    private readonly originalForm: HTMLFormElement;

    private readonly mentionReplacer: MentionReplacer;

    constructor(props: MarktoneProps) {
        super(props);
        this.originalForm = props.originalForm;

        this.kintoneClient = new KintoneClient();
        this.mentionReplacer = new MentionReplacer(this.kintoneClient);

        this.state = {
            rawText: '',
            renderedHTML: '',
            previewHeight: 0,
        };

        marked.setOptions({
            gfm: true, // Enable GitHub Flavored Markdown.
            breaks: true, // Add 'br' element on a single line break.
            headerIds: false,
            renderer: new MarktoneRenderer(this.mentionReplacer),
        });

        this.handleChange = this.handleChange.bind(this);
        this.kintoneDirectoryProvider = this.kintoneDirectoryProvider.bind(this);
        this.getTextAreaHeight = this.getTextAreaHeight.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.setMouseDownEvent = this.setMouseDownEvent.bind(this);
    }

    componentDidMount(): void {
        const { textArea, props } = this;
        if (textArea) {
            textArea.focus();

            textArea.addEventListener('mousedown', this.setMouseDownEvent);

            this.setState({ previewHeight: textArea.offsetHeight });

            // Setting the value to `rawText` should be done in the constructor,
            // but in order to perform Markdown rendering, run it in `componentDidMount()`.
            const replayMentionsText = Marktone.convertReplyMentionsToText(props.replayMentions);
            this.setState({ rawText: replayMentionsText === '' ? '' : `${replayMentionsText} ` });
        }
    }

    setMouseDownEvent() {
        this.handleClick();
    }

    getTextAreaHeight() {
        const { textArea } = this;
        if (textArea) {
            this.setState({ previewHeight: textArea.offsetHeight });
        }
        document.removeEventListener('mouseup', this.getTextAreaHeight);
    }

    async handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        const rawText = event.target.value;
        this.setState({ rawText });

        await this.mentionReplacer.fetchDirectoryEntityInText(rawText);

        const originalEditorField = this.originalEditorField();
        const renderedHTML = marked(rawText);
        originalEditorField.innerHTML = renderedHTML;
        this.setState({ renderedHTML });
    }

    handleClick() {
        document.addEventListener('mouseup', this.getTextAreaHeight);
    }

    private originalEditorField(): HTMLElement {
        return this.originalForm.querySelector('div.ocean-ui-editor-field[role="textbox"]') as HTMLElement;
    }

    private async kintoneDirectoryProvider(token: string) {
        const collection = await this.kintoneClient.searchDirectory(token);
        return collection.flat();
    }

    render() {
        const { rawText, renderedHTML, previewHeight } = this.state;

        return (
            <div className="marktone">
                <div className="editor-area">
                    <ReactTextareaAutocomplete
                        value={rawText}
                        trigger={{
                            '@': {
                                dataProvider: this.kintoneDirectoryProvider,
                                component: MentionCandidate,
                                output: ({ type, code }) => MentionReplacer.createMention(type, code),
                            },
                        }}
                        loadingComponent={() => <span>Loading</span>}
                        innerRef={(textArea) => { this.textArea = textArea; }}
                        onChange={this.handleChange}

                        containerClassName="autocomplete-container"
                        dropdownClassName="autocomplete-dropdown"
                        listClassName="autocomplete-list"
                        itemClassName="autocomplete-item"
                        loaderClassName="autocomplete-loader"
                    />
                    <div className="preview-wrapper" style={{ height: previewHeight }}>
                        {/* eslint-disable-next-line react/no-danger */}
                        <div className="preview" dangerouslySetInnerHTML={{ __html: renderedHTML }} />
                    </div>
                </div>
            </div>
        );
    }
}

export default Marktone;
