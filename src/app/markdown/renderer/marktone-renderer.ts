/* eslint-disable import/no-duplicates */
import * as marked from 'marked';
import { MarkedOptions, Renderer } from 'marked';

/* eslint-enable import/no-duplicates */

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

    static escapeHTML(html: string): string {
        const escapeTest = /[&<>"']/;
        const escapeReplace = /[&<>"']/g;
        const replacements: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };

        if (escapeTest.test(html)) {
            return html.replace(escapeReplace, ch => replacements[ch]);
        }

        return html;
    }
}

interface Render {
    options: MarkedOptions;
}

class MarktoneRenderer extends Renderer {
    /* eslint-disable class-methods-use-this */

    //
    // Block level renderer methods
    //

    heading(text: string, level: number): string {
        const fontSize = 2.0 - (0.2 * level);
        let style = `font-size: ${fontSize}em; font-weight: bold;`;
        if (level <= 2) {
            style += ' border-bottom: 1px solid #ddd;';
        }

        return `<h${level} style="${style}">${text}</h${level}>`;
    }

    html(html: string): string {
        return MarktoneRendererHelper.convertMentionToHTML(html);
    }

    code(code: string, language: string, isEscaped: boolean): string {
        const escapedCode = isEscaped ? code : MarktoneRendererHelper.escapeHTML(code);
        const style = 'background-color: #f6f8fa; border-radius: 3px; padding: 8px 16px;';

        return `<pre style="${style}"><code>${escapedCode}</code></pre>`;
    }

    blockquote(quote: string): string {
        const style = 'border-left: .25em solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em;';
        return `<blockquote style="${style}">${quote}</blockquote>`;
    }

    table(header: string, body: string): string {
        const tableBody = body ? `<tbody>${body}</tbody>` : '';
        const style = 'border-collapse: collapse; border-spacing: 0; margin: 0 0 16px;';
        return `<table style="${style}"><thead>${header}</thead>${tableBody}</table>`;
    }

    tablerow(content: string): string {
        const style = 'background-color: #fff; border-top: 1px solid #c6cbd1;';
        return `<tr style="${style}">${content}</tr>`;
    }

    tablecell(content: string, flags: { header: boolean; align: 'center' | 'left' | 'right' | null }): string {
        const type = flags.header ? 'th' : 'td';
        const style = 'border: 1px solid #dfe2e5; padding: 6px 13px;';
        const tag = flags.align
            ? `<${type} align="${flags.align}" style="${style}">`
            : `<${type} style="${style}">`;
        return `${tag}${content}</${type}>`;
    }

    //
    // Inline level renderer methods
    //

    text(text: string): string {
        return MarktoneRendererHelper.convertMentionToHTML(text);
    }

    codespan(code: string): string {
        const style = 'background-color: rgba(27,31,35,.05); border-radius: 3px; margin: 0 1px; padding: .2em .4em;';
        return `<code style="${style}">${code}</code>`;
    }

    /* eslint-enable class-methods-use-this */
}

export default MarktoneRenderer;
