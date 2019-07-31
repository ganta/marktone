import * as marked from 'marked';

class MarktoneRendererHelper {
    static convertMentionToHTML(str: string): string {
        const regexp = /@(user|organization|group):(\d+)\/([^\s]+)/g;
        const idAttributeNames: { [key: string]: string } = {
            user: 'mention-id',
            organization: 'org-mention-id',
            group: 'group-mention-id',
        };
        const className = 'ocean-ui-plugin-mention-user ocean-ui-plugin-linkbubble-no';
        const style = '-webkit-user-modify: read-only;';

        const replacer = (match: string, type: string, id: string, name: string): string => {
            const attrName = idAttributeNames[type];
            return `<a class="${className}" href="#" data-${attrName}="${id}" tabindex="-1" style="${style}">@${name}</a>`;
        };

        return str.replace(regexp, replacer);
    }
}

class MarktoneRenderer {
    static create(): marked.Renderer {
        const renderer = new marked.Renderer();

        renderer.heading = this.heading;
        renderer.html = this.html;
        renderer.text = this.text;

        return renderer;
    }

    //
    // Block level renderer methods
    //

    private static heading(text: string, level: number): string {
        const fontSize = 2.0 - (0.2 * level);
        let style = `font-size: ${fontSize}em; font-weight: bold;`;
        if (level <= 2) {
            style += ' border-bottom: 1px solid #ddd;';
        }

        return `<h${level} style="${style}">${text}</h${level}>`;
    }

    private static html(html: string): string {
        return MarktoneRendererHelper.convertMentionToHTML(html);
    }

    //
    // Inline level renderer methods
    //

    private static text(text: string): string {
        return MarktoneRendererHelper.convertMentionToHTML(text);
    }
}

export default MarktoneRenderer;
