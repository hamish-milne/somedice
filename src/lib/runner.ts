/// <reference lib="webworker" />
import { BaseError, type DebugInfo, type Output } from "./common";
import { parseProgram } from "./parser";
import { execute, getDebugInfo, type ProgramState } from "./vm";

export type InputMessage = { type: "run"; programText: string };

export type OutputMessage =
  | {
      type: "error";
      errorType: "syntax" | "compiler" | "runtime" | "unknown";
      message: string;
      debugInfo: DebugInfo[];
    }
  | { type: "progress"; opCount: number; pcMax: number; programSize: number }
  | { type: "result"; outputs: Output[]; opCount: number };

const OPS_PER_PROGRESS_UPDATE = 1000;

class RuntimeError extends BaseError {
  constructor(message: string, debugInfo: DebugInfo[]) {
    super(message, debugInfo);
  }

  override errorType() {
    return "runtime" as const;
  }
}

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

    try {
      while (!execute(state, outputs, state.opCount + OPS_PER_PROGRESS_UPDATE)) {
        yield {
          type: "progress",
          opCount: state.opCount,
          pcMax: state.pcMax,
          programSize: state.program.code.length,
        };
      }
    } catch (e) {
      console.error(e);
      let debugInfo: DebugInfo[];
      let message: string;
      try {
        debugInfo = getDebugInfo(state);
        message = e instanceof Error ? e.message : String(e);
      } catch (e1) {
        console.error(e1);
        throw e;
      }
      throw new RuntimeError(message, debugInfo);
    }
    yield { type: "result", outputs, opCount: state.opCount };
  } catch (e) {
    if (e instanceof BaseError) {
      yield { type: "error", errorType: e.errorType(), message: e.message, debugInfo: e.debugInfo };
    } else {
      console.error(e);
      yield { type: "error", errorType: "unknown", message: String(e), debugInfo: [] };
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
