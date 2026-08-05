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
  IMMEDIATE: 34,
  FUNCTION: 35,
  RESERVE: 36,
});
export type OPCODE = ValueOf<typeof OPCODE>;

export const KIND = freeze({
  ANY: 0,
  NUMBER: 1,
  SEQUENCE: 2,
  DIE: 3,
  COLLECTION: 4,
});
export type KIND = ValueOf<typeof KIND>;

export type Program = {
  code: number[];
  outputNames: string[][];
};
