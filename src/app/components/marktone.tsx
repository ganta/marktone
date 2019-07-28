import * as React from 'react';
import ReactTextareaAutocomplete, { ItemComponentProps } from '@webscopeio/react-textarea-autocomplete';
import '@webscopeio/react-textarea-autocomplete/style.css';
import * as marked from 'marked';
import Kintone from '../kintone';

interface MarktoneProps {
    originalEditorField: HTMLElement;
}

interface MarktoneState {
    rawText: string;
}

enum DirectoryEntityType {
    USER = 'user',
    ORGANIZATION = 'organization',
    GROUP = 'group',
}

interface MentionCandidateItem {
    type: DirectoryEntityType;
    id: number;
    name: string;
    avatar: string;
}

const MentionCandidate = (props: ItemComponentProps<MentionCandidateItem>) => {
    const {
        entity: {
            type, id, name, avatar,
        },
    } = props;

    return (
        <span className="mention-candidate" data-type={type} data-id={id}>
            <span className="avatar">
                <img className="avatar-image" src={avatar} alt={name} />
            </span>
            <span className="name">
                <span className="display-name">{name}</span>
            </span>
        </span>
    );
};

async function dataProvider(token: string) {
    const presetOrganizationImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/organization_48.png';
    const presetGroupImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/group_48.png';

    const rawData = await Kintone.searchDirectory(token);
    const { result } = rawData;

    const users = result.users.map((user): MentionCandidateItem => ({
        type: DirectoryEntityType.USER,
        id: parseInt(user.id, 10),
        name: user.name,
        avatar: user.photo.size_24,
    }));
    const organizations = result.orgs.map((organization): MentionCandidateItem => ({
        type: DirectoryEntityType.ORGANIZATION,
        id: parseInt(organization.id, 10),
        name: organization.name,
        avatar: presetOrganizationImageURL,
    }));
    const groups = result.groups.map((group): MentionCandidateItem => ({
        type: DirectoryEntityType.GROUP,
        id: parseInt(group.id, 10),
        name: group.name,
        avatar: presetGroupImageURL,
    }));

    return [...users, ...organizations, ...groups];
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
    private textArea: HTMLTextAreaElement | undefined;

    constructor(props: MarktoneProps) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount(): void {
        const { textArea } = this;
        if (textArea) {
            textArea.focus();
        }
    }

    handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        if (event.currentTarget === null) { return; }

        const rawText = event.currentTarget.value;

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
                            output: ({ type, name, id }) => {
                                const replacedName = name.replace(' ', '_');
                                return `@${type}:${id}/${replacedName}`;
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
