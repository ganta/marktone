// Resize Observer
// https://drafts.csswg.org/resize-observer/

type ResizeObserverBoxOptions = "content-box" | "border-box";

interface ResizeObserverOptions {
  box: ResizeObserverBoxOptions;
}

interface ResizeObserver {
  observe(target: Node, options?: ResizeObserverOptions): void;
  unobserve(target: Node): void;
  disconnect(): void;
}

declare let ResizeObserver: {
  prototype: ResizeObserver;
  new (callback: ResizeObserverCallback): ResizeObserver;
};

interface ResizeObserverCallback {
  (entries: ResizeObserverEntry[], observer: ResizeObserver): void;
}

interface ResizeObserverEntry {
  readonly target: Element;
  readonly contentRect: DOMRectReadOnly;
  readonly borderBoxSize: ResizeObserverSize;
  readonly contentBoxSize: ResizeObserverSize;
}

type UnrestrictedDouble = Float64Array;

interface ResizeObserverSize {
  readonly inlineSize: UnrestrictedDouble;
  readonly blockSize: UnrestrictedDouble;
}

interface Window {
  ResizeObserver: ResizeObserver;
}
