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
  CALL: 27,
  G_LOAD: 28,
  G_STORE: 29,
  LOOP_INIT: 30,
  LOOP_START: 31,
  OUTPUT: 32,
  OUTPUT_NAMED: 33,
  IMMEDIATE: 34,
  FUNCTION_INIT: 35,
  FUNCTION_LOOP: 36,
  RESERVE: 37,
});
export type OPCODE = ValueOf<typeof OPCODE>;

export const KIND = freeze({
  ANY: 0,
  NUMBER: 1,
  SEQUENCE: 2,
  DIE: 3,
  COLLECTION: 4,
  NUMBER_LIST: 5,
  SEQUENCE_LIST: 6,
  FRAME: 7,
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
  outputNames: string[];
  debugLocations: Location[];
  debugFrames: readonly DebugFrame[];
};
export type DieItem = readonly [value: number, probability: number];

export type Output = [name: string, value: readonly DieItem[]];

export type DebugInfo = {
  location: Location;
  functionName: string;
  variables: readonly (readonly [name: string, value: string])[];
};

export abstract class BaseError extends Error {
  declare debugInfo: DebugInfo[];
  constructor(message: string, debugInfo: DebugInfo[]) {
    super(message);
    this.debugInfo = debugInfo;
  }

  abstract errorType(): "syntax" | "compiler" | "runtime";
}

export const OUTPUT_NAME_VARIABLES = /\[([A-Z]+)\]/gu;
