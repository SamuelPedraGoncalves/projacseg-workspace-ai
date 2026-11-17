/**
 * Leitor de PHP `serialize()` restrito a DADOS. Não instancia classes nem segue referências:
 * objetos (`O:`/`C:`), referências (`r:`/`R:`) e enums (`E:`) são recusados. Chaves vão para objetos
 * sem protótipo (sem poluição via `__proto__`). Limites de profundidade e tamanho evitam abuso.
 */

export type PhpValue = null | boolean | number | string | PhpValue[] | PhpRecord;
export interface PhpRecord {
  [key: string]: PhpValue;
}

export class PhpUnserializeError extends Error {}

export interface UnserializeOptions {
  maxDepth?: number;
  maxStringBytes?: number;
}

export function phpUnserialize(input: Buffer, options: UnserializeOptions = {}): PhpValue {
  const maxDepth = options.maxDepth ?? 256;
  const maxStringBytes = options.maxStringBytes ?? 8 * 1024 * 1024;
  let i = 0;

  const fail = (message: string): never => {
    throw new PhpUnserializeError(`${message} (posição ${i})`);
  };
  const expect = (char: string) => {
    if (input[i] !== char.charCodeAt(0)) fail(`esperado "${char}"`);
    i += 1;
  };
  const readUntil = (char: string): string => {
    const end = input.indexOf(char, i);
    if (end < 0) fail(`"${char}" não encontrado`);
    const text = input.toString("latin1", i, end);
    i = end + 1;
    return text;
  };
  const readInt = (char: string): number => {
    const text = readUntil(char);
    if (!/^-?\d+$/.test(text)) fail(`inteiro inválido "${text.slice(0, 20)}"`);
    return Number(text);
  };

  const parse = (depth: number): PhpValue => {
    if (depth > maxDepth) fail("profundidade máxima excedida");
    const type = String.fromCharCode(input[i] ?? 0);
    i += 1;
    if (type === "N") {
      expect(";");
      return null;
    }
    expect(":");
    switch (type) {
      case "b":
        return readUntil(";") === "1";
      case "i":
        return readInt(";");
      case "d": {
        const value = Number(readUntil(";"));
        return Number.isFinite(value) ? value : 0;
      }
      case "s": {
        const length = readInt(":");
        if (length < 0 || length > maxStringBytes) fail("string grande demais");
        expect('"');
        if (i + length > input.length) fail("string truncada");
        const text = input.toString("utf8", i, i + length);
        i += length;
        expect('"');
        expect(";");
        return text;
      }
      case "a": {
        const count = readInt(":");
        expect("{");
        const record: PhpRecord = Object.create(null) as PhpRecord;
        const keys: (string | number)[] = [];
        for (let n = 0; n < count; n += 1) {
          const key = parse(depth + 1);
          if (typeof key !== "string" && typeof key !== "number") fail("chave de array inválida");
          keys.push(key as string | number);
          record[String(key)] = parse(depth + 1);
        }
        expect("}");
        const isList = keys.every((key, index) => key === index);
        return isList ? keys.map((key) => record[String(key)]!) : record;
      }
      default:
        return fail(`tipo PHP "${type}" não permitido (somente dados)`);
    }
  };

  const value = parse(0);
  if (i !== input.length) fail("conteúdo extra após o valor");
  return value;
}
