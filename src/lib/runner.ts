/// <reference lib="webworker" />
import type { Output } from "./common";
import { parseProgram } from "./parser";
import { execute, type ProgramState } from "./vm";

export type InputMessage = { type: "run"; programText: string };

export type OutputMessage =
  | { type: "error"; message: string }
  | { type: "progress"; opCount: number; pcMax: number; programSize: number }
  | { type: "result"; outputs: Output[]; opCount: number };

const OPS_PER_PROGRESS_UPDATE = 1000;

export function* runProgram(programText: string): Generator<OutputMessage, void, unknown> {
  try {
    yield { type: "progress", opCount: 0, pcMax: 0, programSize: 1 };
    const program = parseProgram(programText);

    const outputs: Output[] = [];
    const state: ProgramState = {
      program,
      stack: [],
      pc: 0,
      fp: 0,
      pcMax: 0,
      opCount: 0,
    };

    while (!execute(state, outputs, state.opCount + OPS_PER_PROGRESS_UPDATE)) {
      yield {
        type: "progress",
        opCount: state.opCount,
        pcMax: state.pcMax,
        programSize: state.program.code.length,
      };
    }
    yield { type: "result", outputs, opCount: state.opCount };
  } catch (e) {
    if (e instanceof Error) {
      yield { type: "error", message: e.message };
    } else {
      yield { type: "error", message: "An unknown error occurred." };
    }
  }
}

self.onmessage = (event: MessageEvent<InputMessage>) => {
  const { type, programText } = event.data;
  switch (type) {
    case "run":
      const generator = runProgram(programText);
      while (true) {
        const { value, done } = generator.next();
        if (done) break;
        self.postMessage(value);
      }
      break;
  }
};
