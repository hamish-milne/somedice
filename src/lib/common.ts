const { freeze } = Object;

type ValueOf<T> = T[keyof T];

export const BINARY_OPERATOR = freeze({
  ADD: 1,
  SUBTRACT: 2,
  MULTIPLY: 3,
  DIVIDE: 4,
  EXPONENT: 5,
  EQUAL: 6,
  NOT_EQUAL: 7,
  LESS_THAN: 8,
  GREATER_THAN: 9,
  LESS_THAN_EQUAL: 10,
  GREATER_THAN_EQUAL: 11,
  AND: 12,
  OR: 13,
  NOT: 14,
  D: 15,
  AT: 16,
  RANGE: 17,
  LENGTH: 18,
});
export type BINARY_OPERATOR = ValueOf<typeof BINARY_OPERATOR>;

export const UNARY_OPERATOR = freeze({
  UNARY_PLUS: 0, // Same as NOP
  UNARY_MINUS: 19,
  UNARY_D: 20,
});
export type UNARY_OPERATOR = ValueOf<typeof UNARY_OPERATOR>;

export const OPCODE = freeze({
  NOP: 0,
  ...BINARY_OPERATOR,
  ...UNARY_OPERATOR,
  SEQUENCE: 21,
  L_LOAD: 22,
  L_STORE: 23,
  RETURN: 24,
  JUMP: 25,
  JUMP_IF_FALSE: 26,
  CALL: 28,
  G_LOAD: 29,
  G_STORE: 30,
  LOOP_INIT: 31,
  LOOP_START: 32,
  OUTPUT: 33,
  OUTPUT_NAMED: 34,
  IMMEDIATE: 35,
  FUNCTION_INIT: 36,
  FUNCTION_LOOP: 37,
  RESERVE: 38,
});
export type OPCODE = ValueOf<typeof OPCODE>;

export const KIND = freeze({
  ANY: 0,
  NUMBER: 1,
  SEQUENCE: 2,
  DIE: 3,
  COLLECTION: 4,
  ARGLIST: 5,
});
export type KIND = ValueOf<typeof KIND>;

export type Location = readonly [line: number, column: number];
export type DebugFrame = readonly [
  fromPc: number,
  toPc: number,
  functionName: string,
  variables: readonly string[],
];

export type Program = {
  code: number[];
  outputNames: string[][];
  debugLocations: Location[];
  debugFrames: readonly DebugFrame[];
};

export type Sequence = readonly number[] & { readonly kind: typeof KIND.SEQUENCE };
export type DieItem = readonly [value: number, count: number];
export type Die = readonly DieItem[] & { readonly kind: typeof KIND.DIE };
export type Collection = readonly [count: number, die: Die] & {
  readonly kind: typeof KIND.COLLECTION;
};
export type ArgListItem = readonly [arg: ProgramValue, count: number];
export type ArgList = readonly ArgListItem[] & {
  readonly kind: typeof KIND.ARGLIST;
};
export type ProgramValue = number | Sequence | Die | Collection | ArgList;

const MAX_STRING_ITEMS = 10;

export function valueToString(value: ProgramValue): string {
  if (typeof value === "number") {
    return value.toString();
  }
  const ellipsis = value.length > MAX_STRING_ITEMS ? ",..." : "";
  switch (value.kind) {
    case KIND.SEQUENCE:
      return `[${value.slice(0, MAX_STRING_ITEMS).join(",")}${ellipsis}]`;
    case KIND.DIE:
      return `{${value
        .slice(0, MAX_STRING_ITEMS)
        .map(([v, c]) => `${v}:${c}`)
        .join(",")}${ellipsis}}`;
    case KIND.COLLECTION:
      return `${value[0]}d${valueToString(value[1])}`;
    case KIND.ARGLIST:
      return `<${value
        .slice(0, MAX_STRING_ITEMS)
        .map(([seq, count]) => `${valueToString(seq)}:${count}`)
        .join(",")}${ellipsis}>`;
    default:
      return "<unknown>";
  }
}

export type Output = [name: string, value: Die];

export type DebugInfo = {
  location: Location;
  functionName: string;
  variables: readonly (readonly [name: string, value: ProgramValue])[];
};

export abstract class BaseError extends Error {
  declare debugInfo: DebugInfo[];
  constructor(message: string, debugInfo: DebugInfo[]) {
    super(message);
    this.debugInfo = debugInfo;
  }

  abstract errorType(): "syntax" | "compiler" | "runtime";
}
