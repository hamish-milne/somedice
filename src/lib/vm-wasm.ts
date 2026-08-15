import { newProgram, runProgram, getProgramOutputs } from "../../build/debug.js";
import { KIND, OPCODE } from "./common.js";

type Die = Array<[number, number]>;

function die(entries: Array<[number, number]>): Die {
  return entries;
}

if (import.meta.vitest) {
  const { suite, test, expect } = import.meta.vitest;

  function runCode(code: number[], expectedOutput: Die | number) {
    newProgram(code);
    const finished = runProgram(1000);
    if (!finished) {
      throw new Error("Program did not finish executing");
    }
    const outputs = getProgramOutputs();
    const converted = outputs.map((die) =>
      die.map((entry) => [entry.value, entry.frequency] as [number, number]),
    );
    const expected = typeof expectedOutput === "number" ? [[expectedOutput, 1]] : expectedOutput;
    expect(converted[0]).toEqual(expected);
  }

  const {
    IMMEDIATE,
    OUTPUT,
    // OUTPUT_NAMED,
    ADD,
    SUBTRACT,
    MULTIPLY,
    DIVIDE,
    EXPONENT,
    EQUAL,
    NOT_EQUAL,
    LESS_THAN,
    GREATER_THAN,
    LESS_THAN_EQUAL,
    GREATER_THAN_EQUAL,
    AND,
    OR,
    NOT,
    D,
    SEQUENCE,
    LENGTH,
    AT,
    RANGE,
    UNARY_D,
    LOOP_INIT,
    LOOP_START,
    G_LOAD,
    G_STORE,
    JUMP,
    JUMP_IF_FALSE,
    UNARY_MINUS,
    RESERVE,
    L_LOAD,
    L_STORE,
    FUNCTION_INIT,
    FUNCTION_LOOP,
    CALL,
    RETURN,
  } = OPCODE;

  suite("opcodes", () => {
    test("ADD", () => {
      runCode([IMMEDIATE, 2, IMMEDIATE, 3, ADD, OUTPUT], 5);
    });

    test("ADD number,die", () => {
      runCode(
        [IMMEDIATE, 2, IMMEDIATE, 3, UNARY_D, ADD, OUTPUT],
        die([
          [3, 1],
          [4, 1],
          [5, 1],
        ]),
      );
    });

    test("ADD die,number", () => {
      runCode(
        [IMMEDIATE, 3, UNARY_D, IMMEDIATE, 2, ADD, OUTPUT],
        die([
          [3, 1],
          [4, 1],
          [5, 1],
        ]),
      );
    });

    test("ADD die,die", () => {
      runCode(
        [IMMEDIATE, 2, UNARY_D, IMMEDIATE, 3, UNARY_D, ADD, OUTPUT],
        die([
          [2, 1],
          [3, 2],
          [4, 2],
          [5, 1],
        ]),
      );
    });

    test("SUBTRACT", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, SUBTRACT, OUTPUT], 2);
    });

    test("MULTIPLY", () => {
      runCode([IMMEDIATE, 4, IMMEDIATE, 3, MULTIPLY, OUTPUT], 12);
    });

    test("DIVIDE", () => {
      runCode([IMMEDIATE, 10, IMMEDIATE, 3, DIVIDE, OUTPUT], 3);
    });

    test("EXPONENT", () => {
      runCode([IMMEDIATE, 2, IMMEDIATE, 3, EXPONENT, OUTPUT], 8);
    });

    test("EQUAL", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 5, EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, EQUAL, OUTPUT], 0);
    });

    test("EQUAL number,sequence", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 5, SEQUENCE, 1, EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, SEQUENCE, 1, EQUAL, OUTPUT], 0);
    });

    test("EQUAL sequence,sequence", () => {
      runCode(
        [
          IMMEDIATE,
          1,
          IMMEDIATE,
          2,
          SEQUENCE,
          2,
          IMMEDIATE,
          1,
          IMMEDIATE,
          2,
          SEQUENCE,
          2,
          EQUAL,
          OUTPUT,
        ],
        2,
      );
      runCode(
        [
          IMMEDIATE,
          1,
          IMMEDIATE,
          2,
          SEQUENCE,
          2,
          IMMEDIATE,
          2,
          IMMEDIATE,
          1,
          SEQUENCE,
          2,
          EQUAL,
          OUTPUT,
        ],
        0,
      );
    });

    test("NOT_EQUAL", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, NOT_EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 5, NOT_EQUAL, OUTPUT], 0);
    });

    test("LESS_THAN", () => {
      runCode([IMMEDIATE, 3, IMMEDIATE, 5, LESS_THAN, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, LESS_THAN, OUTPUT], 0);
    });

    test("GREATER_THAN", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, GREATER_THAN, OUTPUT], 1);
      runCode([IMMEDIATE, 3, IMMEDIATE, 5, GREATER_THAN, OUTPUT], 0);
    });

    test("LESS_THAN_EQUAL", () => {
      runCode([IMMEDIATE, 3, IMMEDIATE, 5, LESS_THAN_EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 5, LESS_THAN_EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, LESS_THAN_EQUAL, OUTPUT], 0);
    });

    test("GREATER_THAN_EQUAL", () => {
      runCode([IMMEDIATE, 5, IMMEDIATE, 3, GREATER_THAN_EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 5, IMMEDIATE, 5, GREATER_THAN_EQUAL, OUTPUT], 1);
      runCode([IMMEDIATE, 3, IMMEDIATE, 5, GREATER_THAN_EQUAL, OUTPUT], 0);
    });

    test("AND", () => {
      runCode([IMMEDIATE, 1, IMMEDIATE, 1, AND, OUTPUT], 1);
      runCode([IMMEDIATE, 1, IMMEDIATE, 0, AND, OUTPUT], 0);
      runCode([IMMEDIATE, 0, IMMEDIATE, 1, AND, OUTPUT], 0);
      runCode([IMMEDIATE, 0, IMMEDIATE, 0, AND, OUTPUT], 0);
    });

    test("OR", () => {
      runCode([IMMEDIATE, 1, IMMEDIATE, 1, OR, OUTPUT], 1);
      runCode([IMMEDIATE, 1, IMMEDIATE, 0, OR, OUTPUT], 1);
      runCode([IMMEDIATE, 0, IMMEDIATE, 1, OR, OUTPUT], 1);
      runCode([IMMEDIATE, 0, IMMEDIATE, 0, OR, OUTPUT], 0);
    });

    test("SEQUENCE", () => {
      runCode([IMMEDIATE, 1, IMMEDIATE, 2, IMMEDIATE, 3, SEQUENCE, 3, OUTPUT], 6);
      runCode([IMMEDIATE, 3, UNARY_D, SEQUENCE, 1, OUTPUT], 6);
    });

    test("RANGE", () => {
      runCode([IMMEDIATE, 1, IMMEDIATE, 3, RANGE, OUTPUT], 6);
      runCode([IMMEDIATE, 4, IMMEDIATE, 7, RANGE, LENGTH, OUTPUT], 4);
    });

    test("LENGTH", () => {
      runCode([IMMEDIATE, 1, IMMEDIATE, 2, IMMEDIATE, 3, SEQUENCE, 3, LENGTH, OUTPUT], 3);
      runCode([IMMEDIATE, 3, IMMEDIATE, 6, D, LENGTH, OUTPUT], 3);
    });

    test("D number,number", () => {
      runCode(
        [IMMEDIATE, 2, IMMEDIATE, 4, D, OUTPUT],
        die([
          [2, 1],
          [3, 2],
          [4, 3],
          [5, 4],
          [6, 3],
          [7, 2],
          [8, 1],
        ]),
      );
    });

    test("D number,sequence", () => {
      runCode(
        [IMMEDIATE, 2, IMMEDIATE, 3, IMMEDIATE, 5, SEQUENCE, 2, D, OUTPUT],
        die([
          [6, 1],
          [8, 2],
          [10, 1],
        ]),
      );
    });

    test("D die,die", () => {
      runCode(
        [IMMEDIATE, 0, IMMEDIATE, 0, IMMEDIATE, 1, SEQUENCE, 3, UNARY_D, IMMEDIATE, 2, D, OUTPUT],
        die([
          [0, 4],
          [1, 1],
          [2, 1],
        ]),
      );

      runCode(
        [IMMEDIATE, 2, IMMEDIATE, 2, D, IMMEDIATE, 2, D, OUTPUT],
        die([
          [2, 4],
          [3, 12],
          [4, 17],
          [5, 16],
          [6, 10],
          [7, 4],
          [8, 1],
        ]),
      );
    });

    test("UNARY_D", () => {
      runCode(
        [IMMEDIATE, 3, UNARY_D, OUTPUT],
        die([
          [1, 1],
          [2, 1],
          [3, 1],
        ]),
      );
    });

    test("NOT", () => {
      runCode([IMMEDIATE, 1, NOT, OUTPUT], 0);
      runCode([IMMEDIATE, 0, NOT, OUTPUT], 1);
    });

    test("UNARY_MINUS", () => {
      runCode([IMMEDIATE, 5, UNARY_MINUS, OUTPUT], -5);
      runCode(
        [IMMEDIATE, 3, UNARY_D, UNARY_MINUS, OUTPUT],
        die([
          [-3, 1],
          [-2, 1],
          [-1, 1],
        ]),
      );
    });

    test("AT sequence", () => {
      runCode([IMMEDIATE, 2, IMMEDIATE, 1, IMMEDIATE, 2, IMMEDIATE, 3, SEQUENCE, 3, AT, OUTPUT], 2);
      runCode([IMMEDIATE, 4, IMMEDIATE, 1, IMMEDIATE, 2, IMMEDIATE, 3, SEQUENCE, 3, AT, OUTPUT], 0);
    });

    test("AT collection", () => {
      runCode(
        [IMMEDIATE, 1, IMMEDIATE, 2, IMMEDIATE, 3, D, AT, OUTPUT],
        die([
          [1, 1],
          [2, 3],
          [3, 5],
        ]),
      );
    });

    test("AT number", () => {
      runCode([IMMEDIATE, 2, IMMEDIATE, 123, AT, OUTPUT], 2);
    });

    test("AT sequence,collection", () => {
      runCode(
        [IMMEDIATE, 1, IMMEDIATE, 2, SEQUENCE, 2, IMMEDIATE, 3, IMMEDIATE, 4, D, AT, OUTPUT],
        die([
          [2, 1],
          [3, 3],
          [4, 7],
          [5, 12],
          [6, 16],
          [7, 15],
          [8, 10],
        ]),
      );
    });

    test("L_STORE, L_LOAD", () => {
      runCode([RESERVE, 1, IMMEDIATE, 5, L_STORE, 0, L_LOAD, 0, OUTPUT], 5);
    });
  });

  test("loop", () => {
    runCode(
      [
        IMMEDIATE,
        0,
        G_STORE,
        0,
        IMMEDIATE,
        1,
        IMMEDIATE,
        2,
        IMMEDIATE,
        3,
        SEQUENCE,
        3,
        LOOP_INIT,
        LOOP_START,
        7,
        G_LOAD,
        0,
        ADD,
        G_STORE,
        0,
        JUMP,
        -9,
        G_LOAD,
        0,
        OUTPUT,
      ],
      6,
    );
  });

  test("simple function", () => {
    runCode(
      [
        IMMEDIATE,
        5,
        IMMEDIATE,
        3,
        CALL,
        2,
        9,
        JUMP,
        7,
        FUNCTION_INIT,
        2,
        KIND.NUMBER,
        KIND.NUMBER,
        FUNCTION_LOOP,
        ADD,
        RETURN,
        OUTPUT,
      ],
      8,
    );
  });

  test("function with permutations", () => {
    runCode(
      [
        // arguments: d2, 3, 2d2
        IMMEDIATE,
        2,
        UNARY_D,
        IMMEDIATE,
        3,
        IMMEDIATE,
        2,
        IMMEDIATE,
        2,
        D,
        CALL,
        3,
        15,
        JUMP,
        9,
        FUNCTION_INIT,
        3,
        KIND.NUMBER,
        KIND.DIE,
        KIND.SEQUENCE,
        FUNCTION_LOOP,
        ADD,
        ADD,
        RETURN,
        OUTPUT,
      ],
      die([
        [6, 1],
        [7, 3],
        [8, 3],
        [9, 1],
      ]),
    );
  });

  // test("named output", () => {
  //   const code = [
  //     IMMEDIATE,
  //     2,
  //     IMMEDIATE,
  //     1,
  //     OUTPUT_NAMED,
  //     1,
  //     0,
  //     IMMEDIATE,
  //     3,
  //     IMMEDIATE,
  //     2,
  //     OUTPUT_NAMED,
  //     1,
  //     0,
  //   ];
  //   const program: Program = {
  //     code,
  //     debugLocations: [],
  //     debugFrames: [],
  //     outputNames: [["Result ", ":"]],
  //   };
  //   const state = newState(program);
  //   const finished = execute(state, 1000);
  //   if (!finished) {
  //     throw new Error("Program did not finish executing");
  //   }
  //   expect(state.outputs).toEqual([
  //     ["Result 1", die([[2, 1]])],
  //     ["Result 2", die([[3, 1]])],
  //   ]);
  // });

  test("conditional", () => {
    runCode(
      [
        IMMEDIATE,
        5,
        IMMEDIATE,
        3,
        LESS_THAN,
        JUMP_IF_FALSE,
        4,
        IMMEDIATE,
        1,
        JUMP,
        3,
        IMMEDIATE,
        7,
        OUTPUT,
      ],
      7,
    );
  });
}
