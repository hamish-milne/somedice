import { matchSysCall } from "./builtin";
import {
  BINARY_OPERATOR,
  KIND,
  OPCODE,
  UNARY_OPERATOR,
  type Program,
  type Location,
  BaseError,
  type DebugFrame,
  OUTPUT_NAME_VARIABLES,
} from "./common";

const { freeze, values, entries, fromEntries } = Object;

const TOKEN = freeze({
  ...BINARY_OPERATOR,
  OUTPUT: 101,
  FUNCTION: 102,
  NAMED: 103,
  VARIABLE: 104,
  KEYWORD: 105,
  LOOP: 106,
  OVER: 107,
  RESULT: 108,
  IF: 109,
  ELSE: 110,
  TYPE_N: 111,
  TYPE_S: 112,
  TYPE_D: BINARY_OPERATOR.D,
  STRING: 201,
  NUMBER: 202,
  LPAREN: 301,
  RPAREN: 302,
  LBRACKET: 303,
  RBRACKET: 304,
  LBRACE: 305,
  RBRACE: 306,
  COMMA: 307,
  COLON: 308,
  EOF: 400,
});

const PLACEHOLDER = -6666;

const TOKEN_STRING_MAP: readonly [number, string][] = freeze(
  (
    [
      [TOKEN.ADD, "+"],
      [TOKEN.SUBTRACT, "-"],
      [TOKEN.MULTIPLY, "*"],
      [TOKEN.DIVIDE, "/"],
      [TOKEN.EXPONENT, "^"],
      [TOKEN.EQUAL, "="],
      [TOKEN.NOT_EQUAL, "!="],
      [TOKEN.GREATER_THAN, ">"],
      [TOKEN.LESS_THAN, "<"],
      [TOKEN.GREATER_THAN_EQUAL, ">="],
      [TOKEN.LESS_THAN_EQUAL, "<="],
      [TOKEN.AND, "&"],
      [TOKEN.OR, "|"],
      [TOKEN.NOT, "!"],
      [TOKEN.AT, "@"],
      [TOKEN.RANGE, ".."],
      [TOKEN.LENGTH, "#"],
      [TOKEN.LPAREN, "("],
      [TOKEN.RPAREN, ")"],
      [TOKEN.LBRACKET, "["],
      [TOKEN.RBRACKET, "]"],
      [TOKEN.LBRACE, "{"],
      [TOKEN.RBRACE, "}"],
      [TOKEN.COMMA, ","],
      [TOKEN.COLON, ":"],
    ] as [number, string][]
  ).sort((a, b) => b[1].length - a[1].length),
);

const TOKEN_KEYWORD_MAP = freeze<Record<string, number>>({
  output: TOKEN.OUTPUT,
  function: TOKEN.FUNCTION,
  named: TOKEN.NAMED,
  loop: TOKEN.LOOP,
  over: TOKEN.OVER,
  result: TOKEN.RESULT,
  if: TOKEN.IF,
  else: TOKEN.ELSE,
  n: TOKEN.TYPE_N,
  s: TOKEN.TYPE_S,
  d: TOKEN.TYPE_D,
});

const TOKEN_NAME_MAP = freeze(
  fromEntries(
    entries<number>(TOKEN)
      .map(([key, value]) => [value, key] as const)
      .concat(
        Object.entries(TOKEN_KEYWORD_MAP).map(([key, value]) => [value, key] as const),
      )
      .concat(TOKEN_STRING_MAP.map(([token, str]) => [token, `'${str}'`] as const)),
  ),
);

const TOKEN_PATTERN_MAP: readonly [number, RegExp][] = freeze([
  [TOKEN.VARIABLE, /[A-Z_]+/uy],
  [TOKEN.NUMBER, /0|(?:[1-9][0-9]*)/uy],
  [TOKEN.KEYWORD, /[a-z]+/uy],
  [TOKEN.STRING, /"[^"]*"/uy],
]);

// Match whitespace but not newline:
const PATTERN_SPACE = /[ \t]+/uy;
const PATTERN_COMMENT = /\\[^\\]*\\/uy;

type Token = readonly [token: number, value: string, location: Location];

type ParserState = {
  input: string;
  position: number;
  line: number;
  lineStart: number;
  location: Location;
  backtrack: Token[];
  globals: string[];
  locals: string[] | undefined;
  functions: [name: (string | null)[], ptr: number][];
  outputNames: string[];
  code: number[];
  trampolineCache: Map<string, number>;
  debugLocations: Location[];
  debugFrames: DebugFrame[];
};

function pushCode(state: ParserState, ...args: number[]): void {
  state.code.push(...args);
  for (let i = 0; i < args.length; i++) {
    state.debugLocations.push(state.location);
  }
}

class SyntaxError extends BaseError {
  constructor(token: Token, context: string) {
    const [, value, location] = token;
    super(`'${value}' was unexpected ${context}`, [
      { location, variables: [], functionName: "" },
    ]);
  }

  override errorType() {
    return "syntax" as const;
  }
}

class CompilerError extends BaseError {
  constructor(state: ParserState, message: string) {
    super(message, [{ location: state.location, variables: [], functionName: "" }]);
  }

  override errorType() {
    return "compiler" as const;
  }
}

function nextToken(state: ParserState): Token {
  const { input } = state;
  if (state.backtrack.length > 0) {
    const token = state.backtrack.pop()!;
    state.location = token[2];
    return token;
  }
  while (state.position < input.length) {
    let prevPosition = state.position;
    if (input.startsWith("\n", state.position)) {
      state.position++;
      state.line++;
      state.lineStart = state.position;
    }
    // Skip whitespace
    PATTERN_SPACE.lastIndex = state.position;
    const spaceMatch = PATTERN_SPACE.exec(input);
    if (spaceMatch) {
      state.position = PATTERN_SPACE.lastIndex;
    }
    // Skip comments
    PATTERN_COMMENT.lastIndex = state.position;
    const commentMatch = PATTERN_COMMENT.exec(input);
    if (commentMatch) {
      state.position = PATTERN_COMMENT.lastIndex;
    }
    // If no progress was made, break
    if (state.position === prevPosition) {
      break;
    }
  }
  let nTabs = 0;
  for (let i = state.lineStart; i < state.position; i++) {
    if (input.charCodeAt(i) === 9) {
      nTabs++;
    }
  }
  const location: Location = freeze([
    state.line,
    state.position - state.lineStart + nTabs * 3, // Count tabs as 4 spaces
    state.position,
  ]);
  state.location = location;
  // Check for end of input
  if (state.position >= input.length) {
    return [TOKEN.EOF, "", location];
  }
  // Check for keywords and symbols
  for (const [token, str] of TOKEN_STRING_MAP) {
    if (input.startsWith(str, state.position)) {
      state.position += str.length;
      return [token, str, location];
    }
  }
  // Check for patterns
  for (const [token, pattern] of TOKEN_PATTERN_MAP) {
    pattern.lastIndex = state.position;
    const match = pattern.exec(input);
    if (match) {
      state.position = pattern.lastIndex;
      if (token === TOKEN.KEYWORD && match[0] in TOKEN_KEYWORD_MAP) {
        return [TOKEN_KEYWORD_MAP[match[0]], match[0], location];
      }
      return [token, match[0], location];
    }
  }
  throw new SyntaxError(
    [-1, input[state.position], location],
    "because it's an invalid token",
  );
}

function backtrack(state: ParserState, token: Token): void {
  state.backtrack.push(token);
}

function expectToken(state: ParserState, expectedToken: number): string {
  const token = nextToken(state);
  const [tokenType, value] = token;
  if (tokenType !== expectedToken) {
    throw new SyntaxError(token, `because we expected ${TOKEN_NAME_MAP[expectedToken]}`);
  }
  return value;
}

const unaryTokens = freeze({
  [TOKEN.SUBTRACT]: OPCODE.UNARY_MINUS,
  [TOKEN.D]: OPCODE.UNARY_D,
  [TOKEN.NOT]: OPCODE.NOT,
  [TOKEN.LENGTH]: OPCODE.LENGTH,
  [TOKEN.ADD]: OPCODE.UNARY_PLUS,
});
const binaryTokens = freeze(values<number>(BINARY_OPERATOR));

type Operator = BINARY_OPERATOR | UNARY_OPERATOR;
const operatorPrecedence: Record<Operator, number> = freeze({
  [OPCODE.D]: -1,
  [OPCODE.UNARY_D]: -1,

  [OPCODE.UNARY_PLUS]: 0,
  [OPCODE.UNARY_MINUS]: 0,
  [OPCODE.NOT]: 0,
  [OPCODE.LENGTH]: 0,

  [OPCODE.RANGE]: 1,
  [OPCODE.AT]: 1,

  [OPCODE.EXPONENT]: 2,

  [OPCODE.MULTIPLY]: 3,
  [OPCODE.DIVIDE]: 3,

  [OPCODE.ADD]: 4,
  [OPCODE.SUBTRACT]: 4,

  [OPCODE.EQUAL]: 5,
  [OPCODE.NOT_EQUAL]: 5,
  [OPCODE.LESS_THAN]: 5,
  [OPCODE.GREATER_THAN]: 5,
  [OPCODE.LESS_THAN_EQUAL]: 5,
  [OPCODE.GREATER_THAN_EQUAL]: 5,

  [OPCODE.AND]: 6,
  [OPCODE.OR]: 7,
});

function loadVar(state: ParserState, value: string): void {
  const localIdx = state.locals?.indexOf(value) ?? -1;
  if (localIdx !== -1) {
    pushCode(state, OPCODE.L_LOAD, localIdx);
    return;
  }
  const globalIdx = state.globals.indexOf(value);
  if (globalIdx !== -1) {
    pushCode(state, OPCODE.G_LOAD, globalIdx);
    return;
  }
  state.globals.push(value);
  pushCode(state, OPCODE.G_LOAD, state.globals.length - 1);
}

type FunctionName = readonly (string | null)[];

function nameToKey(name: FunctionName): string {
  return name.map((x) => x ?? "?").join(" ");
}

function parseSyscall(state: ParserState, args: (string | null)[]): number {
  const key = nameToKey(args);
  const found = state.trampolineCache.get(key);
  if (found !== undefined) {
    return found;
  }
  const matched = matchSysCall(args);
  if (!matched) {
    state.trampolineCache.set(key, -1);
    return -1;
  }
  const [num, kinds] = matched;
  const trampolinePtr = state.code.length + 2;
  // Why the trampoline instead of SYSCALL directly? So we can use the same infrastructure for looping over dice values as for user-defined functions.
  // This also handles variadic functions, since we need a different trampoline for each number of arguments.
  branch(state, OPCODE.JUMP, (state) => {
    pushCode(
      state,
      OPCODE.FUNCTION_INIT,
      kinds.length,
      ...kinds,
      OPCODE.FUNCTION_LOOP,
      OPCODE.SYSCALL,
      kinds.length,
      num,
      OPCODE.RETURN,
    );
  });
  state.trampolineCache.set(key, trampolinePtr);
  return trampolinePtr;
}

function parseTerm(state: ParserState): void {
  const token = nextToken(state);
  const [tokenType, value] = token;
  switch (tokenType) {
    case TOKEN.NUMBER: {
      const imm = parseInt(value, 10);
      if (imm > 0x7fffffff) {
        throw new SyntaxError(
          token,
          "because it is too large to fit in a 32-bit signed integer",
        );
      }
      pushCode(state, OPCODE.IMMEDIATE, imm);
      break;
    }
    case TOKEN.VARIABLE: {
      loadVar(state, value);
      break;
    }
    case TOKEN.LPAREN: {
      parseExpression(state);
      expectToken(state, TOKEN.RPAREN);
      break;
    }
    case TOKEN.LBRACE: {
      let count = 0;
      while (true) {
        const token1 = nextToken(state);
        if (token1[0] === TOKEN.RBRACE) {
          break;
        }
        backtrack(state, token1);
        if (count > 0) {
          expectToken(state, TOKEN.COMMA);
        }
        parseExpression(state);
        count++;
      }
      pushCode(state, OPCODE.SEQUENCE, count);
      break;
    }
    case TOKEN.LBRACKET: {
      const args: (string | null)[] = [];
      let argCount = 0;
      while (true) {
        const token = nextToken(state);
        const [paramToken, paramValue] = token;
        if (paramToken === TOKEN.RBRACKET) {
          if (args.length === 0) {
            throw new SyntaxError(
              token,
              "because function calls must have at least one argument",
            );
          }
          break;
        }
        switch (paramToken) {
          case TOKEN.KEYWORD:
            args.push(paramValue);
            break;
          default: {
            backtrack(state, token);
            parseExpression(state);
            args.push(null);
            argCount++;
            break;
          }
        }
      }
      let foundPtr = -1;
      for (let i = 0; i < state.functions.length; i++) {
        const [functionName, functionPtr] = state.functions[i];
        if (functionName.length !== args.length) {
          continue;
        }
        let match = true;
        for (let j = 0; j < functionName.length; j++) {
          if (functionName[j] && functionName[j] !== args[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          foundPtr = functionPtr;
          break;
        }
      }
      if (foundPtr === -1) {
        foundPtr = parseSyscall(state, args);
      }
      if (foundPtr === -1) {
        throw new CompilerError(
          state,
          `no function matches the call [${nameToKey(args)}]`,
        );
      }
      pushCode(state, OPCODE.CALL, argCount, foundPtr);
      break;
    }
    default:
      throw new SyntaxError(token, "in expression");
  }
}

function pushOperator(
  state: ParserState,
  ops: [Operator, Location][],
  op: Operator,
): void {
  while (
    ops.length > 0 &&
    operatorPrecedence[ops[ops.length - 1][0]] <= operatorPrecedence[op]
  ) {
    const [op, location] = ops.pop()!;
    state.code.push(op);
    state.debugLocations.push(location);
  }
  ops.push([op, state.location]);
}

function parseExpression(state: ParserState): void {
  const ops: [Operator, Location][] = [];
  while (true) {
    while (true) {
      const token1 = nextToken(state);
      if (token1[0] in unaryTokens) {
        pushOperator(state, ops, unaryTokens[token1[0] as keyof typeof unaryTokens]);
      } else {
        backtrack(state, token1);
        break;
      }
    }
    parseTerm(state);
    const token2 = nextToken(state);
    if (binaryTokens.includes(token2[0])) {
      pushOperator(state, ops, token2[0] as Operator);
    } else {
      backtrack(state, token2);
      break;
    }
  }
  while (ops.length > 0) {
    const [op, location] = ops.pop()!;
    state.code.push(op);
    state.debugLocations.push(location);
  }
}

function getOrAddVariable(vars: string[], name: string): number {
  const idx = vars.indexOf(name);
  if (idx !== -1) {
    return idx;
  }
  vars.push(name);
  return vars.length - 1;
}

function storeVariable(state: ParserState, name: string): void {
  const { locals, globals } = state;
  const vars = locals ?? globals;
  const opcode = locals ? OPCODE.L_STORE : OPCODE.G_STORE;
  const idx = getOrAddVariable(vars, name);
  pushCode(state, opcode, idx);
}

function parseAssignment(state: ParserState, value: string): void {
  expectToken(state, TOKEN.COLON);
  parseExpression(state);
  storeVariable(state, value);
}

function branch(state: ParserState, opcode: number, inner: (state: ParserState) => void) {
  const { code } = state;
  pushCode(state, opcode, PLACEHOLDER);
  const jumpOffsetIndex = code.length - 1;
  inner(state);
  const jumpOffset = code.length - jumpOffsetIndex - 1;
  code[jumpOffsetIndex] = jumpOffset;
  return jumpOffsetIndex;
}

function parseConditional(state: ParserState) {
  parseExpression(state);
  const jumpIfFalseIndex = branch(state, OPCODE.JUMP_IF_FALSE, parseBlock);
  const token = nextToken(state);
  if (token[0] === TOKEN.ELSE) {
    state.code[jumpIfFalseIndex] += 2; // Skip over the jump instruction for the else block
    const token1 = nextToken(state);
    if (token1[0] === TOKEN.IF) {
      branch(state, OPCODE.JUMP, parseConditional);
    } else {
      backtrack(state, token1);
      branch(state, OPCODE.JUMP, parseBlock);
    }
  }
}

function parseLoop(state: ParserState) {
  const { code } = state;
  const loopVar = expectToken(state, TOKEN.VARIABLE);
  expectToken(state, TOKEN.OVER);
  parseExpression(state);
  pushCode(state, OPCODE.LOOP_INIT);
  const loopStartIdx = code.length;
  branch(state, OPCODE.LOOP_START, () => {
    storeVariable(state, loopVar);
    parseBlock(state);
    pushCode(state, OPCODE.JUMP, loopStartIdx - code.length - 2); // Jump back to loop start
  });
}

function pushDebugFrame(
  state: ParserState,
  functionName: string,
  fromPc: number,
  variables: string[],
): void {
  state.debugFrames.push([fromPc, state.code.length, functionName, variables]);
}

function parseFunction(state: ParserState) {
  if (state.locals) {
    throw new CompilerError(state, "because functions cannot be nested");
  }
  expectToken(state, TOKEN.COLON);
  const functionName: (string | null)[] = [];
  const parameterNames: string[] = [];

  const { code } = state;
  branch(state, OPCODE.JUMP, () => {
    const functionPtr = code.length;
    pushCode(state, OPCODE.FUNCTION_INIT, PLACEHOLDER); // Placeholder for number of arguments
    const nArgsIndex = code.length - 1;
    while (true) {
      const token = nextToken(state);
      const [paramToken, paramValue] = token;
      if (paramToken === TOKEN.LBRACE) {
        backtrack(state, token);
        break;
      }
      switch (paramToken) {
        case TOKEN.KEYWORD:
          functionName.push(paramValue);
          break;
        case TOKEN.VARIABLE: {
          if (parameterNames.includes(paramValue)) {
            throw new SyntaxError(
              token,
              "because function parameters must have unique names",
            );
          }
          parameterNames.push(paramValue);
          functionName.push(null);
          const paramColon = nextToken(state);
          if (paramColon[0] === TOKEN.COLON) {
            const paramToken = nextToken(state);
            switch (paramToken[0]) {
              case TOKEN.TYPE_N:
                pushCode(state, KIND.NUMBER);
                break;
              case TOKEN.TYPE_S:
                pushCode(state, KIND.SEQUENCE);
                break;
              case TOKEN.TYPE_D:
                pushCode(state, KIND.DIE);
                break;
              default:
                throw new SyntaxError(
                  paramToken,
                  `because we expected a valid parameter type (n, s, or d)`,
                );
            }
          } else {
            backtrack(state, paramColon);
            pushCode(state, KIND.ANY);
          }
          break;
        }
        default:
          throw new SyntaxError(token, "in function parameter list");
      }
    }
    state.functions.push([functionName, functionPtr]);
    code[nArgsIndex] = parameterNames.length; // Update number of arguments
    state.locals = parameterNames.slice();
    pushCode(state, OPCODE.FUNCTION_LOOP);
    const loopStart = code.length + 1;
    pushCode(state, OPCODE.RESERVE, PLACEHOLDER); // Reserve space for local variables
    const reserveIdx = code.length - 1;
    parseBlock(state);
    state.code[reserveIdx] = state.locals.length - parameterNames.length; // Update reserved space for local variables
    pushCode(state, OPCODE.SEQUENCE, 0, OPCODE.RETURN); // Ensure function always returns a value
    const functionNameStr = functionName.map((x) => x ?? "?").join(" ");
    pushDebugFrame(state, functionNameStr, loopStart, state.locals);
    pushDebugFrame(state, functionNameStr + " (loop)", functionPtr, parameterNames);
  });
  state.locals = undefined;
}

function getOutputVariables(str: string): string[] {
  return Array.from(str.matchAll(OUTPUT_NAME_VARIABLES), (m) => m[1]);
}

function parseOutput(state: ParserState) {
  if (state.locals) {
    throw new CompilerError(
      state,
      "because output statements are not allowed inside functions",
    );
  }
  parseExpression(state);
  const token = nextToken(state);
  if (token[0] === TOKEN.NAMED) {
    const outputName = expectToken(state, TOKEN.STRING).slice(1, -1); // Remove surrounding quotes
    const variables = getOutputVariables(outputName);
    for (const variable of variables) {
      loadVar(state, variable);
    }
    pushCode(state, OPCODE.OUTPUT_NAMED, variables.length, state.outputNames.length);
    state.outputNames.push(outputName);
  } else {
    backtrack(state, token);
    pushCode(state, OPCODE.OUTPUT);
  }
}

function parseBlock(state: ParserState) {
  expectToken(state, TOKEN.LBRACE);
  parseStatements(state);
  expectToken(state, TOKEN.RBRACE);
}

function parseStatements(state: ParserState) {
  let advanceFlag = true;
  while (advanceFlag) {
    const token = nextToken(state);
    const [tokenType, value] = token;
    switch (tokenType) {
      case TOKEN.VARIABLE:
        parseAssignment(state, value);
        break;
      case TOKEN.IF:
        parseConditional(state);
        break;
      case TOKEN.LOOP:
        parseLoop(state);
        break;
      case TOKEN.FUNCTION:
        parseFunction(state);
        break;
      case TOKEN.OUTPUT:
        parseOutput(state);
        break;
      case TOKEN.RESULT: {
        if (!state.locals) {
          throw new CompilerError(
            state,
            "because result statements are only allowed inside functions",
          );
        }
        expectToken(state, TOKEN.COLON);
        parseExpression(state);
        pushCode(state, OPCODE.RETURN);
        break;
      }
      default:
        backtrack(state, token);
        advanceFlag = false;
        break;
    }
  }
}

export function parseProgram(input: string): Program {
  const state: ParserState = {
    input,
    position: 0,
    line: 0,
    lineStart: 0,
    location: [0, 0, 0],
    globals: [],
    locals: undefined,
    functions: [],
    outputNames: [],
    code: [],
    trampolineCache: new Map(),
    debugLocations: [],
    debugFrames: [],
    backtrack: [],
  };
  pushCode(state, OPCODE.RESERVE, PLACEHOLDER); // Reserve space for global variables
  parseStatements(state);
  const token = nextToken(state);
  if (token[0] !== TOKEN.EOF) {
    throw new SyntaxError(token, "in the main program body");
  }
  state.code[1] = state.globals.length; // Update reserved space for global variables
  pushDebugFrame(state, "(globals)", 0, state.globals);
  return {
    code: new Int32Array(state.code),
    outputNames: state.outputNames,
    debugLocations: state.debugLocations,
    debugFrames: state.debugFrames,
  };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("tokenizeOutputName", () => {
    it("should tokenize output names correctly", () => {
      expect(getOutputVariables("foo [BAR][BAZ] bat [invalid thing] [")).toEqual([
        "BAR",
        "BAZ",
      ]);
      expect(getOutputVariables("[FOO][BAR]")).toEqual(["FOO", "BAR"]);
      expect(getOutputVariables("no brackets")).toEqual([]);
      expect(getOutputVariables("[VALID][123]")).toEqual(["VALID"]);
      expect(getOutputVariables("[A][B][C]")).toEqual(["A", "B", "C"]);
    });
  });

  describe("parseProgram", () => {
    it("should parse a simple program", () => {
      const program = parseProgram("X: 5 Y: 10 \\a comment\\ output X + Y");
      expect([...program.code]).toEqual([
        OPCODE.RESERVE,
        2,
        OPCODE.IMMEDIATE,
        5,
        OPCODE.G_STORE,
        0,
        OPCODE.IMMEDIATE,
        10,
        OPCODE.G_STORE,
        1,
        OPCODE.G_LOAD,
        0,
        OPCODE.G_LOAD,
        1,
        OPCODE.ADD,
        OPCODE.OUTPUT,
      ]);
      expect(program.outputNames).toEqual([]);
    });

    it("should parse a program with a function and output", () => {
      const program = parseProgram(`
        function: dfoo X:n Y:s Z:d W {
          result: X + 1
        }
        BAR: 3
        output [dfoo 5 4 3 2] named "Output [BAR]"
      `);
      expect([...program.code]).toEqual([
        OPCODE.RESERVE,
        1,
        OPCODE.JUMP,
        18,
        OPCODE.FUNCTION_INIT,
        4,
        KIND.NUMBER,
        KIND.SEQUENCE,
        KIND.DIE,
        KIND.ANY,
        OPCODE.FUNCTION_LOOP,
        OPCODE.RESERVE,
        0,
        OPCODE.L_LOAD,
        0,
        OPCODE.IMMEDIATE,
        1,
        OPCODE.ADD,
        OPCODE.RETURN,
        OPCODE.SEQUENCE,
        0,
        OPCODE.RETURN,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.G_STORE,
        0,
        OPCODE.IMMEDIATE,
        5,
        OPCODE.IMMEDIATE,
        4,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.CALL,
        4,
        4,
        OPCODE.G_LOAD,
        0,
        OPCODE.OUTPUT_NAMED,
        1,
        0,
      ]);
      expect(program.outputNames).toEqual(["Output [BAR]"]);
    });

    it("should handle operator precedence correctly", () => {
      const program = parseProgram("output !2d(6+3)^2");
      expect([...program.code]).toEqual([
        OPCODE.RESERVE,
        0,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.IMMEDIATE,
        6,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.ADD,
        OPCODE.D,
        OPCODE.NOT,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.EXPONENT,
        OPCODE.OUTPUT,
      ]);
      expect(program.outputNames).toEqual([]);
    });

    it("should parse loops correctly", () => {
      const program = parseProgram(`
        loop I over {1..5} {
          output I
        }
      `);
      expect([...program.code]).toEqual([
        OPCODE.RESERVE,
        1,
        OPCODE.IMMEDIATE,
        1,
        OPCODE.IMMEDIATE,
        5,
        OPCODE.RANGE,
        OPCODE.SEQUENCE,
        1,
        OPCODE.LOOP_INIT,
        OPCODE.LOOP_START,
        7,
        OPCODE.G_STORE,
        0,
        OPCODE.G_LOAD,
        0,
        OPCODE.OUTPUT,
        OPCODE.JUMP,
        -9,
      ]);
      expect(program.outputNames).toEqual([]);
    });

    it("should parse nested conditionals correctly", () => {
      const program = parseProgram(`
        X: 5
        if X > 3 {
          output 1
        } else if X < 2 {
          output 2
        } else {
          output 3
        }
      `);
      expect([...program.code]).toEqual([
        OPCODE.RESERVE,
        1,
        OPCODE.IMMEDIATE,
        5,
        OPCODE.G_STORE,
        0,
        OPCODE.G_LOAD,
        0,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.GREATER_THAN,
        OPCODE.JUMP_IF_FALSE,
        5,
        OPCODE.IMMEDIATE,
        1,
        OPCODE.OUTPUT,
        OPCODE.JUMP,
        15,
        OPCODE.G_LOAD,
        0,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.LESS_THAN,
        OPCODE.JUMP_IF_FALSE,
        5,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.OUTPUT,
        OPCODE.JUMP,
        3,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.OUTPUT,
      ]);
      expect(program.outputNames).toEqual([]);
    });
  });

  it("should parse syscalls correctly", () => {
    const program = parseProgram("output [highest of 3 and 5]");
    expect([...program.code]).toEqual([
      OPCODE.RESERVE,
      0,
      OPCODE.IMMEDIATE,
      3,
      OPCODE.IMMEDIATE,
      5,
      OPCODE.JUMP,
      9,
      OPCODE.FUNCTION_INIT,
      2,
      KIND.NUMBER,
      KIND.NUMBER,
      OPCODE.FUNCTION_LOOP,
      OPCODE.SYSCALL,
      2,
      7,
      OPCODE.RETURN,
      OPCODE.CALL,
      2,
      8,
      OPCODE.OUTPUT,
    ]);
    expect(program.outputNames).toEqual([]);
  });

  describe("error handling", () => {
    it("should throw a SyntaxError for invalid tokens", () => {
      expect(() => parseProgram("X: 5 $")).toThrow(SyntaxError);
    });

    it("should throw a SyntaxError for unexpected tokens", () => {
      expect(() => parseProgram("X: 5 output")).toThrow(SyntaxError);
    });

    it("should throw a CompilerError for nested functions", () => {
      expect(() => parseProgram("function: foo { function: bar {} }")).toThrow(
        CompilerError,
      );
    });

    it("should throw a CompilerError for result outside function", () => {
      expect(() => parseProgram("result: 5")).toThrow(CompilerError);
    });

    it("should throw a CompilerError for output inside function", () => {
      expect(() => parseProgram("function: foo { output 5 }")).toThrow(CompilerError);
    });

    it("should throw a SyntaxError for duplicate function parameters", () => {
      expect(() => parseProgram("function: foo X X {}")).toThrow(SyntaxError);
    });

    it("should throw a SyntaxError for invalid parameter type", () => {
      expect(() => parseProgram("function: foo X:q {}")).toThrow(SyntaxError);
    });

    it("should throw a SyntaxError for unexpected tokens in function parameter list", () => {
      expect(() => parseProgram("function: foo 5 {}")).toThrow(SyntaxError);
    });

    it("should throw a SyntaxError for unexpected tokens in program body", () => {
      expect(() => parseProgram("X: 5 output 1 2")).toThrow(SyntaxError);
    });

    it("should throw a CompilerError for function call with no matching function", () => {
      expect(() => parseProgram("output [bar]")).toThrow(CompilerError);
    });

    it("should throw a SyntaxError for function call with no arguments", () => {
      expect(() => parseProgram("output []")).toThrow(SyntaxError);
    });

    it("should throw a SyntaxError for missing comma in sequence", () => {
      expect(() => parseProgram("output {1 2}")).toThrow(SyntaxError);
    });
  });
}
