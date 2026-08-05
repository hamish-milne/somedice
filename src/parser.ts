import { BINARY_OPERATOR, KIND, OPCODE, UNARY_OPERATOR, type Program } from "./common";

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

const TOKEN_NAME_MAP: { readonly [key: number]: string } = freeze(
  fromEntries(entries(TOKEN).map(([key, value]) => [value, key])),
);

const TOKEN_STRING_MAP: readonly [number, string][] = freeze(
  (
    [
      [TOKEN.OUTPUT, "output"],
      [TOKEN.FUNCTION, "function"],
      [TOKEN.NAMED, "named"],
      [TOKEN.LOOP, "loop"],
      [TOKEN.OVER, "over"],
      [TOKEN.RESULT, "result"],
      [TOKEN.IF, "if"],
      [TOKEN.ELSE, "else"],
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
      [TOKEN.D, "d"],
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

const TOKEN_PATTERN_MAP: readonly [number, RegExp][] = freeze([
  [TOKEN.VARIABLE, /[A-Z_]+/y],
  [TOKEN.NUMBER, /[1-9][0-9]*/y],
  [TOKEN.KEYWORD, /[a-z]+/y],
  [TOKEN.STRING, /"[^"]*"/y],
]);

const PATTERN_SPACE = /\s+/y;
const PATTERN_COMMENT = /\\[^\\]*\\/y;

type ParserState = {
  input: string;
  position: number;
  globals: string[];
  locals: string[] | undefined;
  functions: [name: (string | KIND)[], ptr: number][];
  outputNames: string[][];
  code: number[];
};

function nextToken(state: ParserState): [token: number, value: string, newPosition: number] {
  const { input } = state;
  while (state.position < input.length) {
    let prevPosition = state.position;
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
  // Check for end of input
  if (state.position >= input.length) {
    return [TOKEN.EOF, "", state.position];
  }
  // Check for keywords and symbols
  for (const [token, str] of TOKEN_STRING_MAP) {
    if (input.startsWith(str, state.position)) {
      return [token, str, state.position + str.length];
    }
  }
  // Check for patterns
  for (const [token, pattern] of TOKEN_PATTERN_MAP) {
    pattern.lastIndex = state.position;
    const match = pattern.exec(input);
    if (match) {
      return [token, match[0], pattern.lastIndex];
    }
  }
  throw new Error(`Unexpected token ${input[state.position]} at position ${state.position}`);
}

function advance(state: ParserState, newPosition: number) {
  state.position = newPosition;
}

function expectToken(state: ParserState, expectedToken: number): string {
  const [token, value, newPosition] = nextToken(state);
  if (token !== expectedToken) {
    throw new Error(
      `Expected token ${TOKEN_NAME_MAP[expectedToken]} but found ${TOKEN_NAME_MAP[token]} at position ${state.position}`,
    );
  }
  advance(state, newPosition);
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

  [OPCODE.EXPONENT]: 1,

  [OPCODE.MULTIPLY]: 2,
  [OPCODE.DIVIDE]: 2,

  [OPCODE.ADD]: 3,
  [OPCODE.SUBTRACT]: 3,

  [OPCODE.RANGE]: 4,
  [OPCODE.AT]: 4,

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
  const { code } = state;
  const localIdx = state.locals?.indexOf(value) ?? -1;
  if (localIdx !== -1) {
    code.push(OPCODE.L_LOAD, localIdx);
    return;
  }
  const globalIdx = state.globals.indexOf(value);
  if (globalIdx !== -1) {
    code.push(OPCODE.G_LOAD, globalIdx);
    return;
  }
  state.globals.push(value);
  code.push(OPCODE.G_LOAD, state.globals.length - 1);
}

function parseTerm(state: ParserState): void {
  const { code } = state;
  const [token, value, newPosition] = nextToken(state);
  switch (token) {
    case TOKEN.NUMBER:
      advance(state, newPosition);
      code.push(OPCODE.IMMEDIATE, parseInt(value, 10));
      break;
    case TOKEN.VARIABLE: {
      advance(state, newPosition);
      loadVar(state, value);
      break;
    }
    case TOKEN.LPAREN: {
      advance(state, newPosition);
      parseExpression(state);
      expectToken(state, TOKEN.RPAREN);
      break;
    }
    case TOKEN.LBRACE: {
      advance(state, newPosition);
      let count = 0;
      if (nextToken(state)[0] !== TOKEN.RBRACE) {
        while (true) {
          parseExpression(state);
          count++;
          if (nextToken(state)[0] === TOKEN.RBRACE) {
            break;
          }
          expectToken(state, TOKEN.COMMA);
        }
      }
      code.push(OPCODE.SEQUENCE, count);
      expectToken(state, TOKEN.RBRACE);
      break;
    }
    case TOKEN.LBRACKET: {
      advance(state, newPosition);
      const args: (string | null)[] = [];
      let argCount = 0;
      while (true) {
        const [paramToken, paramValue, paramNewPosition] = nextToken(state);
        if (paramToken === TOKEN.RBRACKET) {
          advance(state, paramNewPosition);
          break;
        }
        switch (paramToken) {
          case TOKEN.KEYWORD:
            advance(state, paramNewPosition);
            args.push(paramValue);
            break;
          default: {
            parseExpression(state);
            args.push(null);
            argCount++;
            break;
          }
        }
      }
      if (args.length === 0) {
        throw new Error(`Empty function call at position ${state.position}`);
      }
      let functionIdx = -1;
      for (let i = 0; i < state.functions.length; i++) {
        const [functionName] = state.functions[i];
        if (functionName.length !== args.length) {
          continue;
        }
        let match = true;
        for (let j = 0; j < functionName.length; j++) {
          if (typeof functionName[j] === "string" && functionName[j] !== args[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          functionIdx = i;
          break;
        }
      }
      if (functionIdx === -1) {
        throw new Error(`Function not found for call at position ${state.position}`);
      }
      code.push(OPCODE.CALL, argCount, functionIdx);
      break;
    }
    default:
      throw new Error(`Unexpected token ${TOKEN_NAME_MAP[token]} at position ${state.position}`);
  }
}

function pushOperator(state: ParserState, ops: Operator[], op: Operator): void {
  while (ops.length > 0 && operatorPrecedence[ops[ops.length - 1]] <= operatorPrecedence[op]) {
    state.code.push(ops.pop()!);
  }
  ops.push(op);
}

function parseExpression(state: ParserState): void {
  const ops: Operator[] = [];
  while (true) {
    while (true) {
      const [token1, , newPosition1] = nextToken(state);
      if (token1 in unaryTokens) {
        advance(state, newPosition1);
        pushOperator(state, ops, unaryTokens[token1 as keyof typeof unaryTokens]);
      } else {
        break;
      }
    }
    parseTerm(state);
    const [token2, , newPosition2] = nextToken(state);
    if (binaryTokens.includes(token2)) {
      advance(state, newPosition2);
      pushOperator(state, ops, token2 as Operator);
    } else {
      break;
    }
  }
  while (ops.length > 0) {
    state.code.push(ops.pop()!);
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
  const { code, locals, globals } = state;
  const vars = locals ?? globals;
  const opcode = locals ? OPCODE.L_STORE : OPCODE.G_STORE;
  const idx = getOrAddVariable(vars, name);
  code.push(opcode, idx);
}

function parseAssignment(state: ParserState, value: string): void {
  expectToken(state, TOKEN.COLON);
  parseExpression(state);
  storeVariable(state, value);
}

function branch(state: ParserState, opcode: number, inner: (state: ParserState) => void) {
  const { code } = state;
  code.push(opcode, PLACEHOLDER);
  const jumpOffsetIndex = code.length - 1;
  inner(state);
  const jumpOffset = code.length - jumpOffsetIndex - 1;
  code[jumpOffsetIndex] = jumpOffset;
  return jumpOffsetIndex;
}

function parseConditional(state: ParserState) {
  parseExpression(state);
  const jumpIfFalseIndex = branch(state, OPCODE.JUMP_IF_FALSE, parseBlock);
  const [token, , newPosition] = nextToken(state);
  if (token === TOKEN.ELSE) {
    state.code[jumpIfFalseIndex] += 2; // Skip over the jump instruction for the else block
    advance(state, newPosition);
    const [token1, , newPosition1] = nextToken(state);
    if (token1 === TOKEN.IF) {
      advance(state, newPosition1);
      branch(state, OPCODE.JUMP, parseConditional);
    } else {
      branch(state, OPCODE.JUMP, parseBlock);
    }
  }
}

function parseLoop(state: ParserState) {
  const { code } = state;
  const loopVar = expectToken(state, TOKEN.VARIABLE);
  expectToken(state, TOKEN.OVER);
  parseExpression(state);
  code.push(OPCODE.LOOP_INIT);
  const loopStartIdx = code.length;
  branch(state, OPCODE.LOOP_START, () => {
    storeVariable(state, loopVar);
    parseBlock(state);
    code.push(OPCODE.JUMP, loopStartIdx - code.length - 2); // Jump back to loop start
  });
}

function parseFunction(state: ParserState) {
  if (state.locals) {
    throw new Error("Nested functions are not supported");
  }
  expectToken(state, TOKEN.COLON);
  const functionName: (string | KIND)[] = [];
  const parameterNames: string[] = [];
  while (true) {
    const [paramToken, paramValue, paramNewPosition] = nextToken(state);
    if (paramToken === TOKEN.LBRACE) {
      break;
    }
    switch (paramToken) {
      case TOKEN.KEYWORD:
        advance(state, paramNewPosition);
        functionName.push(paramValue);
        break;
      case TOKEN.VARIABLE: {
        advance(state, paramNewPosition);
        if (parameterNames.includes(paramValue)) {
          throw new Error(
            `Duplicate parameter name ${paramValue} in function definition at position ${state.position}`,
          );
        }
        parameterNames.push(paramValue);
        const paramColon = nextToken(state);
        if (paramColon[0] === TOKEN.COLON) {
          advance(state, paramColon[2]);
          const paramType = expectToken(state, TOKEN.KEYWORD);
          switch (paramType) {
            case "n":
              functionName.push(KIND.NUMBER);
              break;
            case "s":
              functionName.push(KIND.SEQUENCE);
              break;
            case "d":
              functionName.push(KIND.DIE);
              break;
            default:
              throw new Error(
                `Unknown parameter type ${paramType} for parameter ${paramValue} at position ${state.position}`,
              );
          }
        } else {
          functionName.push(KIND.ANY);
        }
        break;
      }
      default:
        throw new Error(
          `Unexpected token ${TOKEN_NAME_MAP[paramToken]} in function parameter list at position ${state.position}`,
        );
    }
  }
  state.locals = parameterNames;
  const { code, locals } = state;
  branch(state, OPCODE.JUMP, () => {
    state.functions.push([functionName, code.length]);
    code.push(OPCODE.RESERVE, PLACEHOLDER); // Reserve space for local variables
    const reserveIdx = code.length - 1;
    parseBlock(state);
    state.code[reserveIdx] = locals.length - parameterNames.length; // Update reserved space for local variables
    state.code.push(OPCODE.SEQUENCE, 0, OPCODE.RETURN); // Ensure function always returns a value
  });
  state.locals = undefined;
}

function tokenizeOutputName(str: string): string[] {
  // "foo [BAR][BAZ] bat [invalid thing] [" => ["foo ", "BAR", "", "BAZ", " bat [invalid thing] ["]
  const result: string[] = [];
  let current = "";
  let i = 0;

  while (i < str.length) {
    if (str[i] === "[") {
      const closeIdx = str.indexOf("]", i);
      if (closeIdx === -1) {
        // No closing bracket, treat as regular text
        current += str.substring(i);
        break;
      }

      const bracketed = str.substring(i + 1, closeIdx);
      // Check if bracketed token is all uppercase letters
      if (bracketed.length > 0 && /^[A-Z]+$/.test(bracketed)) {
        // Valid token: push current text and the token
        result.push(current);
        result.push(bracketed);
        current = "";
        i = closeIdx + 1;
      } else {
        // Invalid token: treat as regular text
        current += str.substring(i, closeIdx + 1);
        i = closeIdx + 1;
      }
    } else {
      current += str[i];
      i++;
    }
  }

  result.push(current);
  return result;
}

function parseOutput(state: ParserState) {
  if (state.locals) {
    throw new Error("Output statements are not allowed inside functions");
  }
  parseExpression(state);
  const [token, , newPosition] = nextToken(state);
  if (token === TOKEN.NAMED) {
    advance(state, newPosition);
    const outputName = expectToken(state, TOKEN.STRING);
    const tokenizedName = tokenizeOutputName(outputName.slice(1, -1)); // Remove surrounding quotes
    const stringParts: string[] = [];
    let varCount = 0;
    for (let i = 0; i < tokenizedName.length; i++) {
      if (i % 2 === 0) {
        stringParts.push(tokenizedName[i]);
      } else {
        loadVar(state, tokenizedName[i]);
        varCount++;
      }
    }
    state.code.push(OPCODE.OUTPUT, varCount, state.outputNames.length);
    state.outputNames.push(stringParts);
  } else {
    state.code.push(OPCODE.OUTPUT, -1);
  }
}

function parseBlock(state: ParserState) {
  expectToken(state, TOKEN.LBRACE);
  parseStatements(state);
  expectToken(state, TOKEN.RBRACE);
}

function parseStatements(state: ParserState) {
  const { code } = state;
  let advanceFlag = true;
  while (advanceFlag) {
    const [token, value, newPosition] = nextToken(state);
    switch (token) {
      case TOKEN.VARIABLE:
        advance(state, newPosition);
        parseAssignment(state, value);
        break;
      case TOKEN.IF:
        advance(state, newPosition);
        parseConditional(state);
        break;
      case TOKEN.LOOP:
        advance(state, newPosition);
        parseLoop(state);
        break;
      case TOKEN.FUNCTION:
        advance(state, newPosition);
        parseFunction(state);
        break;
      case TOKEN.OUTPUT:
        advance(state, newPosition);
        parseOutput(state);
        break;
      case TOKEN.RESULT: {
        if (!state.locals) {
          throw new Error("Result statements are only allowed inside functions");
        }
        advance(state, newPosition);
        expectToken(state, TOKEN.COLON);
        parseExpression(state);
        code.push(OPCODE.RETURN);
        break;
      }
      default:
        advanceFlag = false;
        break;
    }
  }
}

export function parseProgram(input: string): Program {
  const state: ParserState = {
    input,
    position: 0,
    globals: [],
    locals: undefined,
    functions: [],
    outputNames: [],
    code: [OPCODE.RESERVE, PLACEHOLDER], // Reserve space for global variables
  };
  parseStatements(state);
  const [token] = nextToken(state);
  if (token !== TOKEN.EOF) {
    throw new Error(`Unexpected token ${TOKEN_NAME_MAP[token]} at position ${state.position}`);
  }
  state.code[1] = state.globals.length; // Update reserved space for global variables
  return {
    code: state.code,
    functions: state.functions.map(([params, ptr]) => {
      return [params.filter((p) => typeof p !== "string"), ptr];
    }),
    outputNames: state.outputNames,
  };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("tokenizeOutputName", () => {
    it("should tokenize output names correctly", () => {
      expect(tokenizeOutputName("foo [BAR][BAZ] bat [invalid thing] [")).toEqual([
        "foo ",
        "BAR",
        "",
        "BAZ",
        " bat [invalid thing] [",
      ]);
      expect(tokenizeOutputName("[FOO][BAR]")).toEqual(["", "FOO", "", "BAR", ""]);
      expect(tokenizeOutputName("no brackets")).toEqual(["no brackets"]);
      expect(tokenizeOutputName("[VALID][123]")).toEqual(["", "VALID", "[123]"]);
      expect(tokenizeOutputName("[A][B][C]")).toEqual(["", "A", "", "B", "", "C", ""]);
    });
  });

  describe("parseProgram", () => {
    it("should parse a simple program", () => {
      const program = parseProgram("X: 5 Y: 10 output X + Y");
      expect(program.code).toEqual([
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
        -1,
      ]);
      expect(program.functions).toEqual([]);
      expect(program.outputNames).toEqual([]);
    });

    it("should parse a program with a function and output", () => {
      const program = parseProgram(`
        function: foo X:n {
          result: X + 1
        }
        BAR: 3
        output [foo 5] named "Output [BAR]"
      `);
      expect(program.code).toEqual([
        OPCODE.RESERVE,
        1,
        OPCODE.JUMP,
        11,
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
        OPCODE.CALL,
        1,
        0,
        OPCODE.G_LOAD,
        0,
        OPCODE.OUTPUT,
        1,
        0,
      ]);
      expect(program.functions).toEqual([[[KIND.NUMBER], 4]]);
      expect(program.outputNames).toEqual([["Output ", ""]]);
    });

    it("should handle operator precedence correctly", () => {
      const program = parseProgram("output !2d(6+3)^2");
      expect(program.code).toEqual([
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
        -1,
      ]);
      expect(program.functions).toEqual([]);
      expect(program.outputNames).toEqual([]);
    });

    it("should parse loops correctly", () => {
      const program = parseProgram(`
        loop I over {1..5} {
          output I
        }
      `);
      expect(program.code).toEqual([
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
        8,
        OPCODE.G_STORE,
        0,
        OPCODE.G_LOAD,
        0,
        OPCODE.OUTPUT,
        -1,
        OPCODE.JUMP,
        -10,
      ]);
      expect(program.functions).toEqual([]);
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
      expect(program.code).toEqual([
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
        6,
        OPCODE.IMMEDIATE,
        1,
        OPCODE.OUTPUT,
        -1,
        OPCODE.JUMP,
        17,
        OPCODE.G_LOAD,
        0,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.LESS_THAN,
        OPCODE.JUMP_IF_FALSE,
        6,
        OPCODE.IMMEDIATE,
        2,
        OPCODE.OUTPUT,
        -1,
        OPCODE.JUMP,
        4,
        OPCODE.IMMEDIATE,
        3,
        OPCODE.OUTPUT,
        -1,
      ]);
      expect(program.functions).toEqual([]);
      expect(program.outputNames).toEqual([]);
    });
  });
}
