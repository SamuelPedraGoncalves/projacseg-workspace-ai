/**
 * Carregamento da BX24 JS SDK (biblioteca oficial dos aplicativos Bitrix24).
 *
 * A SDK só é carregada quando a página está aberta DENTRO de um portal Bitrix24 (iframe de
 * aplicativo). Fora dele — desenvolvimento local, demonstração, testes — nada é baixado e a
 * aplicação roda em modo demonstrativo.
 *
 * Segurança: a autenticação fica a cargo da própria SDK. Este código nunca chama `BX24.getAuth()`
 * nem lê, guarda ou envia tokens.
 */

export const BX24_SDK_URL = "https://api.bitrix24.com/api/v1/";
const SDK_TIMEOUT_MS = 8000;

export interface Bx24Result<T = unknown> {
  error(): unknown;
  data(): T;
}

/** Subconjunto da BX24 JS SDK usado pela aplicação. */
export interface Bx24Sdk {
  init(callback: () => void): void;
  callMethod<T = unknown>(
    method: string,
    params: Record<string, unknown>,
    callback: (result: Bx24Result<T>) => void,
  ): void;
  /** Abre um caminho do portal no slider do Bitrix24 (ex.: card do negócio). */
  openPath(path: string, callback?: (result: unknown) => void): void;
  getDomain(): string;
  im: {
    /** Abre o messenger do Bitrix24 no diálogo informado (ID do usuário/bot ou "chatXX"). */
    openMessenger(dialogId?: string): void;
  };
}

declare global {
  interface Window {
    BX24?: Bx24Sdk;
  }
}

/**
 * O Bitrix24 abre aplicativos num iframe e acrescenta `DOMAIN` e `APP_SID` à URL.
 * Exigir os dois evita carregar a SDK em qualquer outro iframe.
 */
export function isInsideBitrix24(win: Window = window): boolean {
  let framed: boolean;
  try {
    framed = win.self !== win.top;
  } catch {
    framed = true; // acesso ao top bloqueado = está num iframe de outra origem
  }
  if (!framed) return false;
  const params = new URLSearchParams(win.location.search);
  return params.has("DOMAIN") && params.has("APP_SID");
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar a BX24 JS SDK."));
    document.head.appendChild(script);
  });
}

/** Carrega e inicializa a SDK. Retorna `null` fora do Bitrix24 ou em caso de falha. */
export async function loadBitrix24Sdk(win: Window = window): Promise<Bx24Sdk | null> {
  if (!isInsideBitrix24(win)) return null;

  try {
    if (!win.BX24) await injectScript(BX24_SDK_URL);
    const sdk = win.BX24;
    if (!sdk) return null;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("BX24.init expirou.")), SDK_TIMEOUT_MS);
      sdk.init(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    return sdk;
  } catch (error) {
    console.warn("Bitrix24 indisponível; seguindo em modo demonstrativo.", error);
    return null;
  }
}

/** `callMethod` em formato Promise. */
export function callBx24<T>(
  sdk: Bx24Sdk,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    sdk.callMethod<T>(method, params, (result) => {
      const error = result.error();
      if (error) reject(new Error(`${method}: ${String(error)}`));
      else resolve(result.data());
    });
  });
}
