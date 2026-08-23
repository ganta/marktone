import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom has no layout, so it ships neither checkVisibility nor a usable
// offsetParent. Only the display:none case matters to the code under test.
if (Element.prototype.checkVisibility === undefined) {
  Element.prototype.checkVisibility = function checkVisibility(): boolean {
    for (
      let el: Element | null = this;
      el !== null;
      el = el.parentElement ?? null
    ) {
      if (getComputedStyle(el).display === "none") return false;
    }
    return this.isConnected;
  };
}
