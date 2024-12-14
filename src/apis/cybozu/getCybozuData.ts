import { type CybozuData, CybozuDataSchema } from "@/models/CybozuData.ts";

declare global {
  interface DocumentEventMap {
    cybozuDataPass: CustomEvent<CybozuData>;
  }
}

const dataReceptionTimeoutMilliseconds = 1000;

let cachedData: CybozuData | undefined;

export async function getCybozuData(): Promise<CybozuData> {
  if (cachedData) {
    return cachedData;
  }

  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      document.removeEventListener("cybozuDataPass", handler);
      reject(
        new Error(
          `Could not receive the Cybozu data within ${dataReceptionTimeoutMilliseconds} milliseconds`,
        ),
      );
    });

    function handler(event: CustomEvent) {
      clearTimeout(timeoutTimer);
      cachedData = CybozuDataSchema.parse(event.detail);
      resolve(cachedData);
    }

    document.addEventListener("cybozuDataPass", handler, { once: true });

    const scriptEl = document.createElement("script");
    scriptEl.src = chrome.runtime.getURL("js/passCybozuData.js");
    document.body.appendChild(scriptEl);
  });
}

export function clearCachedCybozuData(): void {
  cachedData = undefined;
}
