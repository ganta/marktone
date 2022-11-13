import { nameToEmoji } from "gemoji";

class EmojiReplacer {
  private static emojiRegExp = /:([-+]?\w+):/g;

  replaceEmoji(text: string): string {
    const replacer = (match: string, name: string): string => {
      return nameToEmoji[name] || match;
    };
    return text.replace(EmojiReplacer.emojiRegExp, replacer);
  }
}

export default EmojiReplacer;
