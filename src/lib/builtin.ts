import { KIND } from "./common";
import {
  die,
  dieMap,
  dieMapAdd,
  dieMapFinish,
  MIN_PROBABILITY,
  sequence,
  type Collection,
  type Die,
  type ProgramValue,
  type Sequence,
} from "./vm-common";

type ParamKindMap = {
  [KIND.NUMBER]: number;
  [KIND.SEQUENCE]: Sequence;
  [KIND.DIE]: Die;
  [KIND.COLLECTION]: Collection;
  [KIND.ANY]: ProgramValue;
};

type ParamKind<
  Params,
  It extends readonly unknown[] = [],
> = Params extends readonly [infer First, ...infer Rest]
  ? First extends keyof ParamKindMap
    ? ParamKind<Rest, [...It, ParamKindMap[First]]>
    : ParamKind<Rest, It>
  : It;

type FunctionName = readonly (string | null)[];
type FunctionPattern = readonly (string | keyof ParamKindMap)[];

type SysFunc = {
  match: (name: FunctionName) => readonly KIND[] | false;
  func: (...args: readonly ProgramValue[]) => ProgramValue;
};

function exactMatch(name: FunctionName, pattern: FunctionPattern): boolean {
  if (name.length !== pattern.length) {
    return false;
  }
  for (let i = 0; i < name.length; i++) {
    const n = name[i];
    const p = pattern[i];
    if (typeof p === "string" && n !== p) {
      return false;
    }
  }
  return true;
}

function sysFunc<Params extends FunctionPattern>(
  params: Params,
  func: (...args: ParamKind<Params>) => ProgramValue,
): SysFunc {
  const paramKinds = params.filter((p) => typeof p === "number");
  return {
    match(name) {
      return exactMatch(name, params) ? paramKinds : false;
    },
    func: func as (...args: readonly ProgramValue[]) => ProgramValue,
  };
}

function variadicFunc<
  Params extends FunctionPattern,
  Variadic extends FunctionPattern,
>(
  params: Params,
  variadic: Variadic,
  func: (
    ...args: [...ParamKind<Params>, ...ParamKind<Variadic>]
  ) => ProgramValue,
): SysFunc {
  const paramKinds = params.filter((p) => typeof p === "number");
  const variadicKinds = variadic.filter((p) => typeof p === "number");
  return {
    match(name) {
      if (!exactMatch(name.slice(0, params.length), params)) {
        return false;
      }
      const remainingArgs = name.slice(params.length);
      const segmentLength = variadic.length;
      if (remainingArgs.length % segmentLength !== 0) {
        return false;
      }
      const result = [...paramKinds];
      for (let i = 0; i < remainingArgs.length; i += segmentLength) {
        const segment = remainingArgs.slice(i, i + segmentLength);
        if (!exactMatch(segment, variadic)) {
          return false;
        }
        result.push(...variadicKinds);
      }
      return result;
    },
    func: func as (...args: readonly ProgramValue[]) => ProgramValue,
  };
}

const builtins: SysFunc[] = [
  sysFunc(["absolute", KIND.NUMBER] as const, Math.abs),
  sysFunc([KIND.SEQUENCE, "contains", KIND.NUMBER] as const, (seq, num) => {
    return seq.includes(num) ? 1 : 0;
  }),
  sysFunc(
    ["count", KIND.SEQUENCE, "in", KIND.SEQUENCE] as const,
    (seq1, seq2) => {
      let count = 0;
      for (const item of seq1) {
        for (const item2 of seq2) {
          if (item === item2) {
            count++;
          }
        }
      }
      return count;
    },
  ),
  sysFunc(
    ["maximum", "of", KIND.DIE] as const,
    (die) => die[die.length - 1][0],
  ),
  sysFunc(["reverse", KIND.SEQUENCE] as const, (seq) =>
    sequence([...seq].reverse()),
  ),
  sysFunc(["sort", KIND.SEQUENCE] as const, (seq) =>
    sequence([...seq].sort((a, b) => a - b)),
  ),
  sysFunc(["explode", KIND.DIE] as const, (d) => {
    if (d.length === 0) {
      return d;
    }
    const [nMax, pMax] = d[d.length - 1];
    const map = dieMap();
    let multiplier = 0;
    while (true) {
      const pMod = Math.pow(pMax, multiplier);
      const nMod = nMax * multiplier;
      for (let i = 0; i < d.length - 1; i++) {
        const [n, p] = d[i];
        dieMapAdd(map, n + nMod, p * pMod);
      }
      if (pMod < MIN_PROBABILITY) {
        dieMapAdd(map, nMax + nMod, pMax * pMod);
        break;
      }
      multiplier++;
    }
    return die(dieMapFinish(map));
  }),
  variadicFunc(
    ["highest", "of", KIND.NUMBER] as const,
    ["and", KIND.NUMBER] as const,
    Math.max,
  ),
  variadicFunc(
    ["lowest", "of", KIND.NUMBER] as const,
    ["and", KIND.NUMBER] as const,
    Math.min,
  ),
];

export function sysCall(num: number, args: ProgramValue[]): ProgramValue {
  return builtins[num].func(...args);
}
