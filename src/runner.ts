import { parseProgram } from "./parser";
import { execute, type Output, type ProgramState } from "./vm";

type Message =
  | { type: "error"; message: string }
  | { type: "progress"; opCount: number }
  | { type: "result"; outputs: Output[] };

const OPS_PER_PROGRESS_UPDATE = 1000;

export function* runProgram(programText: string): Generator<Message, void, unknown> {
  const program = parseProgram(programText);
  if (!program) {
    yield { type: "error", message: "Failed to parse program." };
    return;
  }

  const outputs: Output[] = [];
  const state: ProgramState = {
    program,
    stack: [],
    ip: 0,
    fp: 0,
  };
  let opCount = 0;

  try {
    execute(state, outputs, OPS_PER_PROGRESS_UPDATE);
    opCount += OPS_PER_PROGRESS_UPDATE;
    yield { type: "progress", opCount };
  } catch (e) {
    if (e instanceof Error) {
      yield { type: "error", message: e.message };
    } else {
      yield { type: "error", message: "An unknown error occurred." };
    }
    return;
  }

  yield { type: "result", outputs };
}
