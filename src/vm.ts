import { KIND, OPCODE, type Program } from "./common";

const { freeze, assign } = Object;
const { from: arrayFrom } = Array;

const KIND_DIE = freeze({ kind: KIND.DIE });
const KIND_SEQUENCE = freeze({ kind: KIND.SEQUENCE });
const KIND_COLLECTION = freeze({ kind: KIND.COLLECTION });

type Sequence = readonly number[] & { readonly kind: typeof KIND.SEQUENCE };
type DieItem = readonly [value: number, count: number];
type Die = readonly DieItem[] & { readonly kind: typeof KIND.DIE };
type CollectionItem = readonly [sequence: Sequence, count: number];
type Collection = readonly CollectionItem[] & { readonly kind: typeof KIND.COLLECTION };

function dieItem(value: number, count: number): DieItem {
  return freeze([value, count]);
}

function collectionItem(sequence: Sequence, count: number): CollectionItem {
  return freeze([sequence, count]);
}

function die(items: DieItem[]): Die {
  return freeze(
    assign(
      items.sort((a, b) => a[0] - b[0]),
      KIND_DIE,
    ),
  );
}

function sequence(items: number[]): Sequence {
  return freeze(assign(items, KIND_SEQUENCE));
}

function collection(items: CollectionItem[]): Collection {
  return freeze(assign(items, KIND_COLLECTION));
}

type ProgramValue = number | Sequence | Die | Collection;

function numberOperation(op: number, a: number, b: number): number {
  switch (op) {
    case OPCODE.ADD:
      return a + b;
    case OPCODE.SUBTRACT:
      return a - b;
    case OPCODE.MULTIPLY:
      return a * b;
    case OPCODE.DIVIDE:
      return Math.floor(a / b);
    case OPCODE.EXPONENT:
      return Math.pow(a, b);
    case OPCODE.EQUAL:
      return a === b ? 1 : 0;
    case OPCODE.LESS_THAN:
      return a < b ? 1 : 0;
    case OPCODE.GREATER_THAN:
      return a > b ? 1 : 0;
    case OPCODE.LESS_THAN_EQUAL:
      return a <= b ? 1 : 0;
    case OPCODE.GREATER_THAN_EQUAL:
      return a >= b ? 1 : 0;
    case OPCODE.AND:
      return a && b ? 1 : 0;
    case OPCODE.OR:
      return a || b ? 1 : 0;
    default:
      throw new Error();
  }
}

function sequenceKey(s: readonly number[]): string {
  return s.join(",");
}

function dieMap() {
  return new Map<number, number>();
}

function dieMapAdd(map: Map<number, number>, value: number, count: number) {
  map.set(value, (map.get(value) || 0) + count);
}

function dieMapFinish(map: Map<number, number>): DieItem[] {
  return arrayFrom(map.entries()).map(([value, count]) => dieItem(value, count));
}

function collectionMap() {
  return new Map<string, [Sequence, number]>();
}

function collectionMapAdd(map: Map<string, [Sequence, number]>, seq: Sequence, count: number) {
  const key = sequenceKey(seq);
  const existing = map.get(key);
  if (existing) {
    existing[1] += count;
  } else {
    map.set(key, [seq, count]);
  }
}

function collectionMapFinish(map: Map<string, [Sequence, number]>): CollectionItem[] {
  return arrayFrom(map.values()).map(([seq, count]) => collectionItem(seq, count));
}

function collectionToDie(c: Collection): Die {
  const combinedMap = dieMap();
  for (const [seq, count] of c) {
    const value = sum(seq);
    dieMapAdd(combinedMap, value, count);
  }
  return die(dieMapFinish(combinedMap));
}

function dNumber(d: number): Die {
  return die(arrayFrom({ length: d }, (_, i) => dieItem(i + 1, 1)));
}

function valueToDie(x: ProgramValue): Die {
  if (typeof x === "number") {
    return die([[x, 1]]);
  }
  switch (x.kind) {
    case KIND.DIE:
      return x;
    case KIND.SEQUENCE:
      return die([[sum(x), 1]]);
    case KIND.COLLECTION:
      return collectionToDie(x);
  }
  throw new Error("Invalid ProgramValue");
}

function valueToNewDie(x: ProgramValue): Die {
  if (typeof x === "number") {
    return dNumber(x);
  }
  switch (x.kind) {
    case KIND.DIE:
      return x;
    case KIND.SEQUENCE: {
      const map = dieMap();
      for (const value of x) {
        dieMapAdd(map, value, 1);
      }
      return die(dieMapFinish(map));
    }
    case KIND.COLLECTION:
      return collectionToDie(x);
  }
  throw new Error("Invalid ProgramValue");
}

function valueToNewSequence(x: ProgramValue): Sequence {
  if (typeof x === "number") {
    return sequence([x]);
  }
  switch (x.kind) {
    case KIND.SEQUENCE:
      return x;
    default: {
      const die = x.kind === KIND.DIE ? x : collectionToDie(x);
      // Conversion of a die to a sequence normalizes the odds of each value
      return sequence(die.map(([value]) => value));
    }
  }
}

function valueToNumber(x: ProgramValue): number {
  if (typeof x === "number") {
    return x;
  }
  switch (x.kind) {
    case KIND.SEQUENCE:
      return sum(x);
  }
  throw new Error("Expected a number or sequence, but got a die or collection");
}

function valueToNumberOrDie(x: ProgramValue): number | Die {
  return typeof x === "number" ? x : x.kind === KIND.SEQUENCE ? sum(x) : valueToDie(x);
}

function valueToCollection(x: Collection | Die): Collection {
  if (x.kind === KIND.COLLECTION) {
    return x;
  }
  return collection(x.map(([value, count]) => collectionItem(sequence([value]), count)));
}

function sum(n: readonly number[]): number {
  return n.reduce((acc, val) => acc + val, 0);
}

function product(n: readonly number[]): number {
  return n.reduce((acc, val) => acc * val, 1);
}

function dNumberDie(n: number, d: Die): Collection {
  const result = collectionMap();
  const totalCount = Math.pow(d.length, n);
  const seq: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < totalCount; i++) {
    let index = i;
    for (let j = 0; j < n; j++) {
      const dieIndex = index % d.length;
      const [value, count] = d[dieIndex];
      seq.push(value);
      counts.push(count);
      index = Math.floor(index / d.length);
    }
    const combinedCount = product(counts);
    seq.sort((a, b) => b - a); // Sequences within collections are always in descending order
    collectionMapAdd(result, sequence(seq), combinedCount);
    seq.length = 0;
    counts.length = 0;
  }
  return collection(collectionMapFinish(result));
}

function dDieDie(n: Die, d: Die): Collection {
  const result = collectionMap();
  for (const [value, count] of n) {
    const permuted = dNumberDie(value, d);
    for (const [seq, permCount] of permuted) {
      const combinedCount = count * permCount;
      // No need to sort here because dNumberDie already sorts sequences
      collectionMapAdd(result, seq, combinedCount);
    }
  }
  return collection(collectionMapFinish(result));
}

function numberDieOperation(op: number, a: number, b: Die, reverse: boolean): Die {
  const resultMap = dieMap();
  for (const [value, count] of b) {
    const newValue = reverse ? numberOperation(op, value, a) : numberOperation(op, a, value);
    dieMapAdd(resultMap, newValue, count);
  }
  return die(dieMapFinish(resultMap));
}

function collectionLength(c: Collection): number | Die {
  const resultMap = dieMap();
  for (const [seq, count] of c) {
    const length = seq.length;
    dieMapAdd(resultMap, length, count);
  }
  if (resultMap.size === 1) {
    const [[length]] = resultMap.entries();
    return length;
  }
  return die(dieMapFinish(resultMap));
}

function pop(stack: ProgramValue[]): ProgramValue {
  const value = stack.pop();
  if (value == null) {
    throw new Error("Stack underflow");
  }
  return value;
}

function popNumber(stack: ProgramValue[]): number {
  const value = pop(stack);
  if (typeof value !== "number") {
    throw new Error("Expected a number on the stack");
  }
  return value;
}

function sequenceIndex(seq: Sequence, index: number): number {
  if (index < 1 || index > seq.length) {
    return 0;
  }
  return seq[index - 1];
}

function functionCall(stack: ProgramValue[], fp: number, parameters: KIND[]) {
  const dieCall: boolean[] = Array(parameters.length).fill(false);
  for (let i = parameters.length - 1; i >= 0; i--) {
    const paramKind = parameters[i];
    const arg = pop(stack);
    switch (paramKind) {
      case KIND.NUMBER:
        if (typeof arg !== "number" && arg.kind !== KIND.SEQUENCE) {
          dieCall[i] = true;
          stack[fp + i] = valueToDie(arg);
        } else {
          stack[fp + i] = valueToNumber(arg);
        }
        break;
      case KIND.SEQUENCE:
        if (typeof arg === "number") {
          stack[fp + i] = sequence([arg]);
        } else if (arg.kind === KIND.SEQUENCE) {
          stack[fp + i] = arg;
        } else {
          dieCall[i] = true;
          stack[fp + i] = valueToCollection(arg);
        }
        break;
      case KIND.DIE:
        stack[fp + i] = valueToDie(arg);
        break;
      case KIND.ANY:
        stack[fp + i] = arg;
        break;
    }
  }
  if (dieCall.some((isDie) => isDie)) {
    throw new Error("Not implemented");
  }
}

export type ProgramState = {
  program: Program;
  stack: ProgramValue[];
  ip: number;
  fp: number;
};

const MAX_STRING_ITEMS = 10;

function valueToString(value: ProgramValue): string {
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
      return `<${value
        .slice(0, MAX_STRING_ITEMS)
        .map(([seq, c]) => `${valueToString(seq)}:${c}`)
        .join(",")}${ellipsis}>`;
  }
}

const MAX_STACK_SIZE = 10000;

export type Output = [name: string, value: Die];

export function execute(state: ProgramState, outputs: Output[], opCount: number): boolean {
  const { program, stack } = state;
  const { code, functions } = program;
  let { ip, fp } = state;
  for (let executedOps = 0; executedOps < opCount; executedOps++) {
    if (ip >= code.length) {
      return true;
    }
    if (stack.length > MAX_STACK_SIZE) {
      throw new Error("Stack overflow");
    }
    const opcode = code[ip++];
    switch (opcode) {
      case OPCODE.IMMEDIATE: {
        const value = code[ip++];
        stack.push(value);
        break;
      }
      case OPCODE.ADD:
      case OPCODE.SUBTRACT:
      case OPCODE.MULTIPLY:
      case OPCODE.DIVIDE:
      case OPCODE.EXPONENT:
      case OPCODE.EQUAL:
      case OPCODE.LESS_THAN:
      case OPCODE.GREATER_THAN:
      case OPCODE.AND:
      case OPCODE.OR: {
        const b = valueToNumberOrDie(pop(stack));
        const a = valueToNumberOrDie(pop(stack));
        if (typeof a === "number" && typeof b === "number") {
          stack.push(numberOperation(opcode, a, b));
        } else if (typeof a === "number") {
          stack.push(numberDieOperation(opcode, a, b as Die, false));
        } else if (typeof b === "number") {
          stack.push(numberDieOperation(opcode, b, a, true));
        }
        break;
      }
      case OPCODE.D: {
        const b = valueToNewDie(pop(stack));
        const a = valueToNumberOrDie(pop(stack));
        if (typeof a === "number") {
          stack.push(dNumberDie(a, b));
        } else {
          const collection = dDieDie(a, b);
          // {die}d{die} always returns a die, not a collection
          stack.push(collectionToDie(collection));
        }
        break;
      }
      case OPCODE.LENGTH: {
        const a = pop(stack);
        if (typeof a === "number" || a.kind === KIND.DIE) {
          stack.push(1);
        } else if (a.kind === KIND.SEQUENCE) {
          stack.push(a.length);
        } else {
          stack.push(collectionLength(a));
        }
        break;
      }
      case OPCODE.AT: {
        const index = valueToNumber(pop(stack));
        const a = pop(stack);
        if (typeof a === "number") {
          throw new Error("Cannot index into a number");
        }
        switch (a.kind) {
          case KIND.SEQUENCE: {
            stack.push(sequenceIndex(a, index));
            break;
          }
          case KIND.DIE: {
            stack.push(index === 1 ? a : 0);
            break;
          }
          case KIND.COLLECTION: {
            // Create a new die that represents the indexed values of each sequence in the collection
            const resultMap = dieMap();
            for (const [seq, count] of a) {
              const value = sequenceIndex(seq, index);
              dieMapAdd(resultMap, value, count);
            }
            stack.push(die(dieMapFinish(resultMap)));
            break;
          }
        }
        break;
      }
      case OPCODE.RANGE: {
        const b = valueToNumber(pop(stack));
        const a = valueToNumber(pop(stack));
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        const seq = arrayFrom({ length: end - start + 1 }, (_, i) => start + i);
        stack.push(sequence(seq));
        break;
      }
      case OPCODE.SEQUENCE: {
        const count = code[ip++];
        const seq: number[] = [];
        for (let i = 0; i < count; i++) {
          const entry = valueToNewSequence(pop(stack));
          seq.push(...entry);
        }
        stack.push(sequence(seq));
        break;
      }
      case OPCODE.G_LOAD: {
        const index = code[ip++];
        stack.push(stack[index]);
        break;
      }
      case OPCODE.G_STORE: {
        const index = code[ip++];
        stack[index] = pop(stack);
        break;
      }
      case OPCODE.L_LOAD: {
        const index = code[ip++];
        stack.push(stack[fp + index]);
        break;
      }
      case OPCODE.L_STORE: {
        const index = code[ip++];
        stack[fp + index] = pop(stack);
        break;
      }
      case OPCODE.JUMP: {
        const target = code[ip++];
        ip += target;
        break;
      }
      case OPCODE.JUMP_IF_FALSE: {
        const target = code[ip++];
        const condition = valueToNumber(pop(stack));
        if (!condition) {
          ip += target;
        }
        break;
      }
      case OPCODE.CALL: {
        const argCount = code[ip++];
        const functionIndex = code[ip++];
        const [params, ptr] = functions[functionIndex];
        stack.splice(stack.length - argCount, 0, ip, fp); // Push return address and frame pointer
        fp = stack.length - argCount; // Update frame pointer to the start of the arguments
        ip = ptr; // Jump to function code
        functionCall(stack, fp, params);
        break;
      }
      case OPCODE.RETURN: {
        const value = pop(stack);
        stack.length = fp; // Clear the stack to the frame pointer
        fp = popNumber(stack); // Restore the previous frame pointer
        ip = popNumber(stack); // Restore the instruction pointer
        stack.push(value); // Push the return value onto the stack
        break;
      }
      case OPCODE.LOOP_INIT: {
        const sequence = stack[stack.length - 1];
        if (typeof sequence === "number" || sequence.kind !== KIND.SEQUENCE) {
          throw new Error("Expected a sequence for loop");
        }
        stack.push(0); // Initialize loop index
        break;
      }
      case OPCODE.LOOP_START: {
        const loopEnd = code[ip++];
        const loopIndex = popNumber(stack);
        const sequence = stack[stack.length - 1];
        if (typeof sequence === "number" || sequence.kind !== KIND.SEQUENCE) {
          throw new Error();
        }
        if (loopIndex < sequence.length) {
          stack.push(loopIndex + 1); // Increment loop index
          stack.push(sequence[loopIndex]); // Push current value
        } else {
          stack.pop(); // Pop the sequence
          ip += loopEnd; // Jump to loop end
        }
        break;
      }
      case OPCODE.RESERVE: {
        const count = code[ip++];
        for (let i = 0; i < count; i++) {
          stack.push(0);
        }
        break;
      }
      case OPCODE.OUTPUT: {
        const varCount = code[ip++];
        const outputNames = varCount === -1 ? null : [...program.outputNames[code[ip++]]];

        let finalName = "";
        if (outputNames) {
          const outputValues: ProgramValue[] = [];
          for (let i = 0; i < varCount; i++) {
            outputValues.push(pop(stack));
          }
          do {
            const namePart = outputNames.shift();
            if (namePart != null) {
              finalName += namePart;
            }
            const valuePart = outputValues.shift();
            if (valuePart != null) {
              finalName += valueToString(valuePart);
            }
          } while (outputNames.length > 0 && outputValues.length > 0);
        }
        const outputValue = valueToDie(pop(stack));
        outputs.push([finalName, outputValue]);
        break;
      }
      default:
        throw new Error(`Unknown opcode ${opcode} at instruction pointer ${ip - 1}`);
    }
  }
  state.ip = ip;
  state.fp = fp;
  return false;
}
