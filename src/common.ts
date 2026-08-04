const { freeze } = Object;

export const OPCODE = freeze({
  NOP: 0,
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
  SEQUENCE: 19,
  L_LOAD: 20,
  L_STORE: 21,
  RETURN: 22,
  UNARY_MINUS: 23,
  UNARY_D: 24,
  JUMP: 25,
  JUMP_IF_FALSE: 27,
  CALL: 28,
  G_LOAD: 29,
  G_STORE: 30,
  LOOP_INIT: 31,
  LOOP_START: 32,
  OUTPUT: 33,
  IMMEDIATE: 34,
  RESERVE: 35,
});

export const KIND = freeze({
  NUMBER: 0,
  SEQUENCE: 1,
  DIE: 2,
  COLLECTION: 3,
});
export type KIND = (typeof KIND)[keyof typeof KIND];

export type Program = {
  code: number[];
  functions: [params: (KIND | null)[], ptr: number][];
  outputNames: string[][];
};
