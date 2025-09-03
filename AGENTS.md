# Marktone

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Marktone is a Chrome extension that transforms Rich Text input areas on kintone (a Cybozu collaboration platform) into Markdown input areas.
It allows users to write comments, posts, and messages using Markdown syntax with support for mentions, emojis, and syntax highlighting.

## Key Commands

### Development

- `npm run dev` - Build and watch for changes during development
- `npm run build` - Build the extension for production
- `npm run package` - Create a distributable zip file for the extension

### Testing

- `npm test` - Run all tests using Vitest
- `npm run test -- path/to/test.test.ts` - Run a specific test file

### Code Quality

- `npm run typecheck` - Run TypeScript type checking without emitting files
- `npm run lint` - Run both Biome and Prettier linters
- `npm run fix` - Automatically fix linting issues

### Storybook

- `npm run storybook` - Start Storybook for component development
- `npm run build-storybook` - Build static Storybook site
- `npm run chromatic` - Run visual regression tests with Chromatic

## Architecture

### Extension Structure

The project is a Chrome Extension (Manifest V3) with the following key parts:

1. **Content Script** (`src/app/content.tsx`) - Injected into kintone pages to replace rich text editors with Markdown editors
2. **Background Service Worker** (`src/app/background.ts`) - Handles extension lifecycle and storage operations
3. **Content Loader** (`public/content-loader.js`) - Bootstraps the content script and injects necessary data

### Key Technologies

- **React**: UI components for the Markdown editor
- **TypeScript**: Type-safe development
- **Vite**: Build tool and bundler
- **Vanilla Extract**: CSS-in-JS styling
- **Marked**: Markdown parsing
- **DOMPurify**: HTML sanitization
- **highlight.js**: Syntax highlighting for code blocks

### Important Patterns

#### API Integration

- Cybozu/kintone API client in `src/app/kintone/kintone-client.ts`
- Directory entity caching for user/organization data in `src/app/kintone/directory-entity-cache.ts`

#### Markdown Processing

- Custom renderer extending marked.js in `src/app/markdown/renderer/marktoneRenderer.ts`
- Emoji replacement using gemoji in `src/app/markdown/replacer/emoji-replacer.ts`
- Mention replacement for @-mentions in `src/app/markdown/replacer/mention-replacer.ts`

#### Component Architecture

- Main Marktone component in `src/components/Marktone/index.tsx`
- Uses `@webscopeio/react-textarea-autocomplete` for mention suggestions
- Storybook stories for component development

### Build Configuration

- Uses Vite with multiple entry points (content.js and background.js)
- Path alias `@/` maps to `src/` directory
- Outputs to `dist/` directory with specific naming for extension files
- CSS extraction configured to output `content.css` for injection

### Testing

- Vitest for unit testing with JSDOM environment
- Test setup file at `tests/setup.ts`
- Tests located alongside source files and in `tests/` directory
