import {
  CybozuDataInitializationTimeoutError,
  UninitializedCybozuDataError,
} from "@/apis/cybozu/errors.ts";
import { type CybozuData, CybozuDataSchema } from "@/models/CybozuData";
import type { LoginUser } from "@/models/LoginUser.ts";

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface DocumentEventMap {
    cybozuDataPass: CustomEvent<CybozuData>;
  }
}

const dataReceptionTimeoutMilliseconds = 1000;

let cybozuData: CybozuData | undefined;

export async function initializeCybozuData(): Promise<CybozuData> {
  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      document.removeEventListener("cybozuDataPass", handler);
      reject(
        new CybozuDataInitializationTimeoutError(
          dataReceptionTimeoutMilliseconds,
        ),
      );
    }, dataReceptionTimeoutMilliseconds);

    function handler(event: CustomEvent) {
      clearTimeout(timeoutTimer);
      const data = CybozuDataSchema.parse(JSON.parse(event.detail));
      setCybozuData(data);
      resolve(data);
    }

    document.addEventListener("cybozuDataPass", handler, {
      once: true,
    });

    const scriptEl = document.createElement("script");
    scriptEl.src = chrome.runtime.getURL("js/passCybozuData.js");
    document.body.appendChild(scriptEl);
  });
}

export function setCybozuData(data: CybozuData): void {
  cybozuData = data;
}

export function clearCybozuData(): void {
  cybozuData = undefined;
}

export function getLoginUser(): LoginUser {
  return getCybozuData().LOGIN_USER;
}

export function getRequestToken(): string {
  return getCybozuData().REQUEST_TOKEN;
}

export function getDisplayLocale(): string {
  return getCybozuData().DISPLAY_LOCALE;
}

function getCybozuData(): CybozuData {
  if (cybozuData === undefined) {
    throw new UninitializedCybozuDataError();
  }

  return cybozuData;
}
