import {
  KIND,
  OPCODE,
  valueToString,
  type Collection,
  type ArgListItem,
  type DebugInfo,
  type Die,
  type DieItem,
  type Output,
  type Program,
  type Sequence,
  type ArgList,
  type ProgramValueAny,
} from "./common";

const { freeze, assign } = Object;
const { from: arrayFrom } = Array;

const KIND_DIE = freeze({ kind: KIND.DIE });
const KIND_SEQUENCE = freeze({ kind: KIND.SEQUENCE });
const KIND_COLLECTION = freeze({ kind: KIND.COLLECTION });
const KIND_ARG_LIST = freeze({ kind: KIND.ARGLIST });

function dieItem(value: number, count: number): DieItem {
  return freeze([value, count]);
}

const DIE_ASCENDING = (a: DieItem, b: DieItem) => a[0] - b[0];

function die(items: DieItem[]): Die {
  return freeze(assign(items.sort(DIE_ASCENDING), KIND_DIE));
}

function sequence(items: number[]): Sequence {
  return freeze(assign(items, KIND_SEQUENCE));
}

function collection(count: number, die: Die): Collection {
  return freeze(assign([count, die] as const, KIND_COLLECTION));
}

function argList(items: ArgListItem[]): ArgList {
  return freeze(assign(items, KIND_ARG_LIST));
}

function totalWeight(d: Die): number {
  return d.reduce((acc, [, count]) => acc + count, 0);
}

function checkResult(value: number) {
  if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
    throw new Error(`Math overflow: ${value} is outside the safe integer range`);
  }
  return value;
}

function numberOperation(op: number, a: number, b: number): number {
  switch (op) {
    case OPCODE.ADD:
      return checkResult(a + b);
    case OPCODE.SUBTRACT:
      return checkResult(a - b);
    case OPCODE.MULTIPLY:
      return checkResult(a * b);
    case OPCODE.DIVIDE:
      return checkResult(Math.trunc(a / b));
    case OPCODE.EXPONENT:
      if (b < 0) {
        throw new Error("Negative exponent not supported");
      }
      return checkResult(Math.pow(a, b));
    case OPCODE.EQUAL:
      return a === b ? 1 : 0;
    case OPCODE.NOT_EQUAL:
      return a !== b ? 1 : 0;
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
      throw new Error(`Unknown binary operator ${op}`);
  }
}

function numberUnaryOperation(op: number, a: number): number {
  switch (op) {
    case OPCODE.UNARY_MINUS:
      return -a;
    case OPCODE.NOT:
      return a ? 0 : 1;
    default:
      throw new Error(`Unknown unary operator ${op}`);
  }
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

function dNumber(d: number): Die {
  return die(arrayFrom({ length: d }, (_, i) => dieItem(i + 1, 1)));
}

function valueToDie(x: ProgramValueAny): Die {
  if (typeof x === "number") {
    return die([[x, 1]]);
  }
  switch (x.kind) {
    case KIND.DIE:
      return x;
    case KIND.SEQUENCE:
      return die([[sum(x), 1]]);
    case KIND.COLLECTION:
      return collectionSum(x);
  }
  throw new Error("Invalid ProgramValue");
}

function valueToNewDie(x: ProgramValueAny): Die {
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
      return collectionSum(x);
  }
  throw new Error("Invalid ProgramValue");
}

function valueToNewSequence(x: ProgramValueAny): Sequence {
  if (typeof x === "number") {
    return sequence([x]);
  }
  switch (x.kind) {
    case KIND.SEQUENCE:
      return x;
    case KIND.COLLECTION:
    case KIND.DIE: {
      const die = x.kind === KIND.DIE ? x : collectionSum(x);
      // Conversion of a die to a sequence normalizes the odds of each value
      return sequence(die.map(([value]) => value));
    }
    default:
      throw new Error("Invalid ProgramValue");
  }
}

function valueToNumber(x: ProgramValueAny): number {
  if (typeof x === "number") {
    return x;
  }
  switch (x.kind) {
    case KIND.SEQUENCE:
      return sum(x);
  }
  throw new Error("Expected a number or sequence, but got a die or collection");
}

function valueToNumberOrDie(x: ProgramValueAny): number | Die {
  return typeof x === "number" ? x : x.kind === KIND.SEQUENCE ? sum(x) : valueToDie(x);
}

function valueToCollection(x: Collection | Die): Collection {
  if (x.kind === KIND.COLLECTION) {
    return x;
  }
  return collection(1, valueToDie(x));
}

function sum(n: readonly number[]): number {
  return n.reduce((acc, val) => acc + val, 0);
}

function product(n: readonly number[]): number {
  return n.reduce((acc, val) => acc * val, 1);
}

const NUMBER_DESCENDING = (a: number, b: number) => b - a;

const MAX_SAFE_NUMBER = 1e300;
const MAX_ARRAY_LENGTH = 5e8;

function getAllSequences([n, d]: Collection): [Sequence, number][] {
  const vals = d.map((e) => e[0]);
  const faceCounts = d.map((e) => e[1]);
  const k = vals.length;

  if (k === 0) return n === 0 ? [[sequence([]), 1]] : [];

  const fact = Array.from<number>({ length: n + 1 });
  fact[0] = 1;
  for (let i = 1; i <= n; i++) {
    fact[i] = fact[i - 1] * i;
    if (fact[i] > MAX_SAFE_NUMBER) {
      throw new Error(`getAllSequences: n=${n} is too large - factorial exceeds MAX_SAFE_NUMBER`);
    }
  }

  const results: [Sequence, number][] = [];
  const seq: number[] = [];

  // Distributes `remaining` dice across faces [idx..k-1]; denom/pow accumulate
  // the multinomial denominator and the count^exponent product as we go.
  function recurse(idx: number, remaining: number, denom: number, pow: number): void {
    if (idx === k - 1) {
      for (let j = 0; j < remaining; j++) seq.push(vals[idx]);
      const total = (fact[n] / (denom * fact[remaining])) * pow * faceCounts[idx] ** remaining;
      if (results.length > MAX_ARRAY_LENGTH) {
        throw new Error(
          `getAllSequences: n=${n} is too large - more than ${MAX_ARRAY_LENGTH} unique sequences generated`,
        );
      }
      results.push([sequence(seq.slice().sort(NUMBER_DESCENDING)), total]);
      for (let j = 0; j < remaining; j++) seq.pop();
      return;
    }

    let facePow = 1;
    for (let c = 0; c <= remaining; c++) {
      for (let j = 0; j < c; j++) seq.push(vals[idx]);
      recurse(idx + 1, remaining - c, denom * fact[c], pow * facePow);
      for (let j = 0; j < c; j++) seq.pop();
      facePow *= faceCounts[idx];
    }
  }

  recurse(0, n, 1, 1);
  return results;
}

// Polynomial coefficients indexed from `offset` (the exponent of coeffs[0]).
type Poly = { offset: number; coeffs: number[] };
function multiplyPoly(a: Poly, b: Poly): Poly {
  const coeffs = Array.from<number>({ length: a.coeffs.length + b.coeffs.length - 1 }).fill(0);
  for (let i = 0; i < a.coeffs.length; i++) {
    if (a.coeffs[i] === 0) continue;
    for (let j = 0; j < b.coeffs.length; j++) {
      const sum = coeffs[i + j] + a.coeffs[i] * b.coeffs[j];
      if (sum > MAX_SAFE_NUMBER) {
        throw new Error(`multiplyPoly: coefficients exceed MAX_SAFE_NUMBER`);
      }
      coeffs[i + j] = sum;
    }
  }
  return { offset: a.offset + b.offset, coeffs };
}

function collectionSum([n, d]: readonly [number, Die]): Die {
  const faces = d;
  if (faces.length === 0) return die(n === 0 ? [[0, 1]] : []);
  if (n === 0) return die([[0, 1]]);

  const [minVal] = faces[0];
  const [maxVal] = faces[faces.length - 1];
  const base: Poly = {
    offset: minVal,
    coeffs: Array.from<number>({ length: maxVal - minVal + 1 }).fill(0),
  };
  for (const [value, count] of faces) base.coeffs[value - minVal] = count;

  // Exponentiation by squaring: O(log n) multiplications instead of O(n).
  let result: Poly = { offset: 0, coeffs: [1] };
  let power = base;
  let exp = n;
  while (exp > 0) {
    if (exp & 1) result = multiplyPoly(result, power);
    exp >>= 1;
    if (exp > 0) power = multiplyPoly(power, power);
  }

  const output: DieItem[] = [];
  for (let i = 0; i < result.coeffs.length; i++) {
    if (result.coeffs[i] > 0) {
      output.push([result.offset + i, result.coeffs[i]]);
      if (output.length > MAX_ARRAY_LENGTH) {
        throw new Error(
          `dNumberDie_sum: n=${n} is too large - more than ${MAX_ARRAY_LENGTH} unique sums generated`,
        );
      }
    }
  }
  return die(output);
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function lcm(values: number[]): number {
  return values.reduce((acc, val) => (acc * val) / gcd(acc, val), 1);
}

function dDieDie(n: Die, d: Die): Die {
  const result = dieMap();
  const allPermuted = n.map(([value, count]) => {
    const permuted = collectionSum([value, d]);
    return [value, count, permuted, totalWeight(permuted)] as const;
  });
  const allPermutedWeights = allPermuted.map(([, , , weight]) => weight);
  const totalCollectionWeight =
    product(allPermutedWeights) < Number.MAX_SAFE_INTEGER ? lcm(allPermutedWeights) : 1;

  for (const [, count, permuted, weight] of allPermuted) {
    for (const [seq, permCount] of permuted) {
      const combinedCount = count * permCount * (totalCollectionWeight / weight);
      dieMapAdd(result, seq, combinedCount);
    }
  }
  return die(dieMapFinish(result));
}

function combineArgList(argList: readonly ArgListItem[]): Die {
  const result = dieMap();
  const dice = argList.map(([arg, count]) => [valueToDie(arg), count] as const);
  const allWeights = dice.map(([die]) => totalWeight(die));
  const totalResultWeight = product(allWeights) < Number.MAX_SAFE_INTEGER ? lcm(allWeights) : 1;
  for (let i = 0; i < dice.length; i++) {
    const [die, count] = dice[i];
    const weight = allWeights[i];
    for (const [value, dieCount] of die) {
      const combinedCount = count * dieCount * (totalResultWeight / weight);
      dieMapAdd(result, value, combinedCount);
    }
  }
  return die(dieMapFinish(result));
}

function numberDieOperation(op: number, a: number, b: Die, reverse: boolean): Die {
  const resultMap = dieMap();
  for (const [value, count] of b) {
    const newValue = reverse ? numberOperation(op, value, a) : numberOperation(op, a, value);
    dieMapAdd(resultMap, newValue, count);
  }
  return die(dieMapFinish(resultMap));
}

function dieDieOperation(op: number, a: Die, b: Die): Die {
  const resultMap = dieMap();
  for (const [valueA, countA] of a) {
    for (const [valueB, countB] of b) {
      const newValue = numberOperation(op, valueA, valueB);
      dieMapAdd(resultMap, newValue, countA * countB);
    }
  }
  return die(dieMapFinish(resultMap));
}

function dieUnaryOperation(op: number, d: Die): Die {
  const resultMap = dieMap();
  for (const [value, count] of d) {
    const newValue = numberUnaryOperation(op, value);
    dieMapAdd(resultMap, newValue, count);
  }
  return die(dieMapFinish(resultMap));
}

function pop(stack: ProgramValueAny[]): ProgramValueAny {
  const value = stack.pop();
  if (value == null) {
    throw new Error("Stack underflow");
  }
  return value;
}

function popNumber(stack: ProgramValueAny[]): number {
  const value = pop(stack);
  if (typeof value !== "number") {
    throw new Error("Expected a number on the stack");
  }
  return value;
}

function sequenceIndexNumber(seq: Sequence, index: number): number {
  if (index < 1 || index > seq.length) {
    return 0;
  }
  return seq[index - 1];
}

function index(a: number | Sequence | Collection, index: Sequence) {
  if (typeof a === "number") {
    // Index by the digit position of the number (1-based)
    const nDigits = Math.floor(Math.log10(Math.abs(a))) + 1;
    let result = 0;
    for (const idx of index) {
      if (idx >= 1 && idx <= nDigits) {
        result += Math.trunc(a / 10 ** (nDigits - idx)) % 10;
      }
    }
    return result;
  }
  switch (a.kind) {
    case KIND.SEQUENCE: {
      let result = 0;
      for (const idx of index) {
        result = checkResult(result + sequenceIndexNumber(a, idx));
      }
      return result;
    }
    case KIND.COLLECTION: {
      // Create a new die that represents the indexed values of each sequence in the collection
      const resultMap = dieMap();
      for (const [seq, count] of getAllSequences(a)) {
        let value = 0;
        for (const idx of index) {
          value = checkResult(value + sequenceIndexNumber(seq, idx));
        }
        dieMapAdd(resultMap, value, count);
      }
      return die(dieMapFinish(resultMap));
    }
  }
}

function returnValue(state: ProgramState, value: ProgramValueAny): void {
  const { stack } = state;
  stack.length = state.fp; // Clear the stack to the frame pointer
  // Restore the previous state of the program from the stack
  state.loopIndex = popNumber(stack);
  state.fp = popNumber(stack);
  state.pc = popNumber(stack);
  stack.push(value); // Push the return value onto the stack
}

export type ProgramState = {
  program: Program;
  stack: ProgramValueAny[];
  pc: number;
  fp: number;
  loopIndex: number;
  pcMax: number;
  opCount: number;
  outputs: Output[];
};

export function newState(program: Program): ProgramState {
  return {
    program,
    stack: [],
    pc: 0,
    fp: 0,
    loopIndex: 0,
    pcMax: 0,
    opCount: 0,
    outputs: [],
  };
}

function* permutationArgs(
  args: readonly ProgramValueAny[],
  loopIndex: number,
): Generator<ArgListItem> {
  let remainingIndex = loopIndex;
  for (const arg of args) {
    if (typeof arg === "object" && arg.kind === KIND.ARGLIST) {
      const argListIndex = remainingIndex % arg.length;
      yield arg[argListIndex];
      remainingIndex = Math.floor(remainingIndex / arg.length);
    } else {
      yield [arg, 1];
    }
  }
}

function binaryOperation(a: number | Die, b: number | Die, opcode: number): ProgramValueAny {
  if (typeof a === "number" && typeof b === "number") {
    return numberOperation(opcode, a, b);
  } else if (typeof a === "number" && typeof b !== "number") {
    return numberDieOperation(opcode, a, b, false);
  } else if (typeof a !== "number" && typeof b === "number") {
    return numberDieOperation(opcode, b, a, true);
  } else if (typeof a !== "number" && typeof b !== "number") {
    return dieDieOperation(opcode, a, b);
  } else {
    throw new Error();
  }
}

function sequenceNumberOperation(a: Sequence, b: number, opcode: number): number {
  let result = 0;
  for (const value of a) {
    result = checkResult(result + numberOperation(opcode, value, b));
  }
  return result;
}

function sequenceSequenceOperation(a: Sequence, b: Sequence, opcode: number): number {
  const n = Math.min(a.length, b.length);
  let result = 0;
  for (let i = 0; i < n; i++) {
    result = checkResult(result + numberOperation(opcode, a[i], b[i]));
  }
  return result;
}

function compareOperation(a: ProgramValueAny, b: ProgramValueAny, opcode: number): ProgramValueAny {
  if (typeof a !== "number" && a.kind === KIND.SEQUENCE) {
    if (typeof b === "number") {
      return sequenceNumberOperation(a, b, opcode);
    } else if (b.kind === KIND.SEQUENCE) {
      return sequenceSequenceOperation(a, b, opcode);
    }
  } else if (typeof b !== "number" && b.kind === KIND.SEQUENCE && typeof a === "number") {
    return sequenceNumberOperation(b, a, opcode);
  }
  return binaryOperation(valueToNumberOrDie(a), valueToNumberOrDie(b), opcode);
}

const MAX_STACK_SIZE = MAX_ARRAY_LENGTH * 2;

export function execute(state: ProgramState, maxOps: number): boolean {
  const { program, stack, outputs } = state;
  const { code } = program;

  function readPc() {
    return code[state.pc++];
  }

  for (; state.opCount < maxOps; state.opCount++) {
    if (state.pc > state.pcMax) {
      state.pcMax = state.pc;
    }
    if (state.pc >= code.length) {
      return true;
    }
    if (stack.length > MAX_STACK_SIZE) {
      throw new Error("Stack overflow");
    }
    const opcode = readPc();
    switch (opcode) {
      case OPCODE.IMMEDIATE: {
        const value = readPc();
        stack.push(value);
        break;
      }
      case OPCODE.ADD:
      case OPCODE.SUBTRACT:
      case OPCODE.MULTIPLY:
      case OPCODE.DIVIDE:
      case OPCODE.EXPONENT:
      case OPCODE.AND:
      case OPCODE.OR: {
        const b = valueToNumberOrDie(pop(stack));
        const a = valueToNumberOrDie(pop(stack));
        stack.push(binaryOperation(a, b, opcode));
        break;
      }
      case OPCODE.EQUAL:
      case OPCODE.NOT_EQUAL:
      case OPCODE.LESS_THAN:
      case OPCODE.GREATER_THAN:
      case OPCODE.LESS_THAN_EQUAL:
      case OPCODE.GREATER_THAN_EQUAL: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(compareOperation(a, b, opcode));
        break;
      }
      case OPCODE.UNARY_MINUS:
      case OPCODE.NOT: {
        const a = valueToNumberOrDie(pop(stack));
        if (typeof a === "number") {
          stack.push(numberUnaryOperation(opcode, a));
        } else {
          stack.push(dieUnaryOperation(opcode, a));
        }
        break;
      }
      case OPCODE.D: {
        const b = valueToNewDie(pop(stack));
        const a = valueToNumberOrDie(pop(stack));
        if (typeof a === "number") {
          stack.push(collection(a, b));
        } else {
          stack.push(dDieDie(a, b));
        }
        break;
      }
      case OPCODE.UNARY_D: {
        const a = pop(stack);
        stack.push(valueToNewDie(a));
        break;
      }
      case OPCODE.LENGTH: {
        const a = pop(stack);
        if (typeof a === "number") {
          stack.push(1);
        } else {
          switch (a.kind) {
            case KIND.DIE:
              stack.push(1);
              break;
            case KIND.SEQUENCE:
              stack.push(a.length);
              break;
            case KIND.COLLECTION:
              stack.push(a[0]);
              break;
            default:
              throw new Error("Invalid ProgramValue");
          }
        }
        break;
      }
      case OPCODE.AT: {
        const a = pop(stack);
        const b = pop(stack);
        if (typeof b !== "number" && b.kind !== KIND.SEQUENCE) {
          throw new Error("Index must be a number or sequence");
        }
        let seq: number | Sequence | Collection;
        if (typeof a === "number" || a.kind === KIND.SEQUENCE || a.kind === KIND.COLLECTION) {
          seq = a;
        } else if (a.kind === KIND.DIE) {
          seq = collection(1, a);
        } else {
          throw new Error("Invalid ProgramValue");
        }
        const idx = typeof b === "number" ? sequence([b]) : b;
        stack.push(index(seq, idx));
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
        const count = readPc();
        const seq: number[] = [];
        for (let i = 0; i < count; i++) {
          const entry = valueToNewSequence(stack[stack.length - count + i]);
          // Efficiently append the entry to the sequence (avoiding stack overflow for large sequences)
          const j = seq.length;
          seq.length += entry.length;
          for (let k = 0; k < entry.length; k++) {
            seq[j + k] = entry[k];
          }
        }
        stack.length -= count; // Remove the original entries from the stack
        stack.push(sequence(seq));
        break;
      }
      case OPCODE.G_LOAD: {
        const index = readPc();
        stack.push(stack[index]);
        break;
      }
      case OPCODE.G_STORE: {
        const index = readPc();
        stack[index] = pop(stack);
        break;
      }
      case OPCODE.L_LOAD: {
        const index = readPc();
        stack.push(stack[state.fp + index]);
        break;
      }
      case OPCODE.L_STORE: {
        const index = readPc();
        stack[state.fp + index] = pop(stack);
        break;
      }
      case OPCODE.JUMP: {
        const target = readPc();
        state.pc += target;
        break;
      }
      case OPCODE.JUMP_IF_FALSE: {
        const target = readPc();
        const condition = valueToNumber(pop(stack));
        if (!condition) {
          state.pc += target;
        }
        break;
      }
      case OPCODE.FUNCTION_INIT: {
        const paramCount = readPc();
        if (paramCount != stack.length - state.fp) {
          throw new Error(
            `Function call parameter count mismatch: expected ${paramCount}, got ${stack.length - state.fp}`,
          );
        }
        for (let i = 0; i < paramCount; i++) {
          const paramKind = readPc() as KIND;
          const { fp } = state;
          const arg = stack[fp + i];
          switch (paramKind) {
            case KIND.NUMBER:
              if (typeof arg === "number" || arg.kind === KIND.SEQUENCE) {
                stack[fp + i] = valueToNumber(arg);
              } else {
                stack[fp + i] = argList([...valueToDie(arg)]);
              }
              break;
            case KIND.SEQUENCE:
              if (typeof arg === "number") {
                stack[fp + i] = sequence([arg]);
              } else if (arg.kind === KIND.COLLECTION || arg.kind === KIND.DIE) {
                stack[fp + i] = argList(getAllSequences(valueToCollection(arg)));
              } else {
                stack[fp + i] = arg;
              }
              break;
            case KIND.DIE:
              if (typeof arg === "number" || arg.kind !== KIND.COLLECTION) {
                stack[fp + i] = valueToDie(arg);
              }
              break;
            case KIND.ANY:
              break;
          }
        }
        const permutations = product(
          stack
            .slice(state.fp)
            .map((arg) => (typeof arg === "object" && arg.kind === KIND.ARGLIST ? arg.length : 1)),
        );
        switch (permutations) {
          case 0:
            returnValue(state, sequence([])); // Return an empty sequence if there are no permutations
            break;
          case 1:
            // Convert any ArgLists to their first value, since there's only one permutation
            for (let i = state.fp; i < stack.length; i++) {
              const arg = stack[i];
              if (typeof arg === "object" && arg.kind === KIND.ARGLIST) {
                stack[i] = arg[0][0];
              }
            }
            state.pc++; // Skip the function loop if there's only one permutation
            break;
          default:
            if (permutations > MAX_ARRAY_LENGTH) {
              throw new Error(
                `Too many permutations: ${permutations}, maximum allowed is ${MAX_ARRAY_LENGTH}`,
              );
            }
            state.loopIndex = 0;
            break;
        }
        break;
      }
      case OPCODE.FUNCTION_LOOP: {
        const args = stack.slice(state.fp, stack.length - state.loopIndex);
        const argLists = args.filter((arg) => typeof arg === "object" && arg.kind === KIND.ARGLIST);
        const totalPermutations = product(argLists.map((arg) => arg.length));
        if (state.loopIndex >= totalPermutations) {
          const resultList: ArgListItem[] = [];
          const resultStartIndex = state.fp + args.length;
          for (let i = 0; i < totalPermutations; i++) {
            let totalCount = 1;
            for (const [, count] of permutationArgs(args, i)) {
              totalCount *= count;
            }
            const resultValue = stack[resultStartIndex + i];
            if (typeof resultValue === "object" && resultValue.kind === KIND.ARGLIST) {
              throw new Error("Unexpected ArgList in function result");
            }
            resultList.push([resultValue, totalCount]);
          }
          const resultDie = combineArgList(resultList);
          returnValue(state, resultDie);
        } else {
          stack.push(state.pc - 1, state.fp, state.loopIndex + 1); // Save the current state for the next iteration
          for (const [arg] of permutationArgs(args, state.loopIndex)) {
            stack.push(arg);
          }
          state.loopIndex++;
          state.fp = stack.length - args.length; // Update frame pointer to the new arguments
        }
        break;
      }
      case OPCODE.CALL: {
        const argCount = readPc();
        const functionPtr = readPc();
        // Save the frame pointer and return address
        stack.splice(stack.length - argCount, 0, state.pc, state.fp, state.loopIndex);
        state.fp = stack.length - argCount;
        state.pc = functionPtr; // Jump to the function
        break;
      }
      case OPCODE.RETURN: {
        const value = pop(stack);
        returnValue(state, value);
        break;
      }
      case OPCODE.LOOP_INIT: {
        const sequence = stack[stack.length - 1];
        if (typeof sequence === "number" || sequence.kind !== KIND.SEQUENCE) {
          throw new Error("Expected a sequence for loop");
        }
        stack.push(state.loopIndex); // Save the current loop index
        state.loopIndex = 0; // Reset loop index for the new loop
        break;
      }
      case OPCODE.LOOP_START: {
        const loopEnd = readPc();
        const sequence = stack[stack.length - 2];
        if (typeof sequence === "number" || sequence.kind !== KIND.SEQUENCE) {
          throw new Error("Expected a sequence for loop");
        }
        if (state.loopIndex < sequence.length) {
          stack.push(sequence[state.loopIndex]); // Push current value
          state.loopIndex++; // Increment loop index for the next iteration
        } else {
          state.loopIndex = popNumber(stack); // Restore previous loop index
          stack.pop(); // Pop the sequence
          state.pc += loopEnd; // Jump to loop end
        }
        break;
      }
      case OPCODE.RESERVE: {
        const count = readPc();
        for (let i = 0; i < count; i++) {
          stack.push(0);
        }
        break;
      }
      case OPCODE.OUTPUT: {
        const outputValue = valueToDie(pop(stack));
        outputs.push(["", outputValue]);
        break;
      }
      case OPCODE.OUTPUT_NAMED: {
        const varCount = readPc();
        const outputNames = [...program.outputNames[readPc()]];

        let finalName = "";
        const outputValues: ProgramValueAny[] = [];
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
        const outputValue = valueToDie(pop(stack));
        outputs.push([finalName, outputValue]);
        break;
      }
      default:
        throw new Error(`Unknown opcode ${opcode}`);
    }
  }
  return false;
}

export function getDebugInfo(state: ProgramState): DebugInfo[] {
  const result: DebugInfo[] = [];
  let fp = state.fp;
  let pc = state.pc;
  while (true) {
    const [, , functionName, variables] = state.program.debugFrames.find(
      ([fromPc, toPc]) => pc >= fromPc && pc < toPc,
    ) ?? [0, 0, "(unknown)", []];
    const frameVariables = variables.map((name, index) => [name, state.stack[fp + index]] as const);
    result.push({
      location: state.program.debugLocations[pc - 1] ?? [-1],
      functionName,
      variables: frameVariables,
    });
    if (fp <= 0) {
      break;
    }
    pc = state.stack[fp - 3] as number;
    fp = state.stack[fp - 2] as number;
  }
  return result;
}

if (import.meta.vitest) {
  const { suite, test, expect } = import.meta.vitest;

  function runCode(code: number[], expectedOutput: Die | number) {
    const program: Program = {
      code,
      debugLocations: [],
      debugFrames: [],
      outputNames: [],
    };
    const state = newState(program);
    const finished = execute(state, 1000);
    if (!finished) {
      throw new Error("Program did not finish executing");
    }
    expect(state.outputs[0][1]).toEqual(valueToDie(expectedOutput));
  }

  const {
    IMMEDIATE,
    OUTPUT,
    OUTPUT_NAMED,
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

  test("named output", () => {
    const code = [
      IMMEDIATE,
      2,
      IMMEDIATE,
      1,
      OUTPUT_NAMED,
      1,
      0,
      IMMEDIATE,
      3,
      IMMEDIATE,
      2,
      OUTPUT_NAMED,
      1,
      0,
    ];
    const program: Program = {
      code,
      debugLocations: [],
      debugFrames: [],
      outputNames: [["Result ", ":"]],
    };
    const state = newState(program);
    const finished = execute(state, 1000);
    if (!finished) {
      throw new Error("Program did not finish executing");
    }
    expect(state.outputs).toEqual([
      ["Result 1", die([[2, 1]])],
      ["Result 2", die([[3, 1]])],
    ]);
  });

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
