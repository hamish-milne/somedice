// oxlint-disable typescript/no-duplicate-enum-values unicorn/no-new-array

function arrayFromPtr<T>(ptr: usize, length: i32): StaticArray<T> {
  const arr = new StaticArray<T>(length);
  memory.copy(changetype<usize>(arr), ptr, length * sizeof<T>());
  return arr;
}

abstract class AnyValue {
  abstract toString(): string;
  abstract get typeName(): string;
  toNumber(): i64 {
    throw new Error(`Cannot convert ${this.typeName} to number`);
  }
  toSequence(): SequenceValue {
    throw new Error(`Cannot convert ${this.typeName} to sequence`);
  }
  toNewSequence(): SequenceValue {
    return this.toSequence();
  }
  toNumberOrDie(): AnyValue {
    throw new Error(`Cannot convert ${this.typeName} to number or die`);
  }
  toNumberOrSequence(): AnyValue {
    return new NumberValue(this.toNumber());
  }
  toDie(): DieValue {
    throw new Error(`Cannot convert ${this.typeName} to die`);
  }
  toNewDie(): DieValue {
    return this.toDie();
  }
  toCollection(): CollectionValue {
    return new CollectionValue(1, this.toDie().data);
  }
  lengthOperation(): i64 {
    throw new Error(`Cannot get length of ${this.typeName}`);
  }
  indexOperation(_index: StaticArray<i64>): AnyValue {
    throw new Error(`Cannot index ${this.typeName}`);
  }
}

@final
class NumberValue extends AnyValue {
  readonly value: i64;

  constructor(value: i64) {
    super();
    this.value = value;
  }

  get typeName(): string {
    return "Number";
  }

  toString(): string {
    return this.value.toString();
  }

  override toNumber(): i64 {
    return this.value;
  }

  override toSequence(): SequenceValue {
    const arr = new StaticArray<i64>(1);
    arr[0] = this.value;
    return new SequenceValue(arr);
  }

  override toNumberOrDie(): AnyValue {
    return this;
  }

  override toNumberOrSequence(): AnyValue {
    return this;
  }

  override toDie(): DieValue {
    return DieValue.fromNumber(this.value);
  }

  override toNewDie(): DieValue {
    const arr = new StaticArray<DieEntry>(this.value as i32);
    for (let i = 0; i < this.value; i++) {
      arr[i] = new DieEntry(i + 1, 1);
    }
    return new DieValue(arr);
  }

  override lengthOperation(): i64 {
    return 1;
  }

  override indexOperation(index: StaticArray<i64>): AnyValue {
    const value = this.value as f64;
    // Index by the digit position of the number (1-based)
    const nDigits = Math.floor(Math.log10(Math.abs(value))) + 1;
    let result: i64 = 0;
    for (let i = 0; i < index.length; i++) {
      const idx = index[i] as f64;
      if (idx >= 1 && idx <= nDigits) {
        result += (Math.trunc(value / Math.pow(10, nDigits - idx)) % 10) as i64;
      }
    }
    return new NumberValue(result);
  }
}

@final
class SequenceValue extends AnyValue {
  readonly data: StaticArray<i64>;

  constructor(data: StaticArray<i64>) {
    super();
    this.data = data;
  }

  get typeName(): string {
    return "Sequence";
  }

  toString(): string {
    return `[${this.data.join(", ")}]`;
  }

  override toNumber(): i64 {
    return this.data.reduce(SUM, 0);
  }

  override toNumberOrDie(): AnyValue {
    return new NumberValue(this.toNumber());
  }

  override toSequence(): SequenceValue {
    return this;
  }

  override toNumberOrSequence(): AnyValue {
    return this;
  }

  override toDie(): DieValue {
    return DieValue.fromNumber(this.toNumber());
  }

  override toNewDie(): DieValue {
    const builder = new DieBuilder();
    for (let i = 0; i < this.data.length; i++) {
      builder.addEntry(this.data[i], 1);
    }
    return builder.build();
  }

  override lengthOperation(): i64 {
    return this.data.length;
  }

  override indexOperation(index: StaticArray<i64>): AnyValue {
    let result: i64 = 0;
    for (let i = 0; i < index.length; i++) {
      const idx = index[i];
      result += sequenceIndexNumber(this, idx);
    }
    return new NumberValue(result);
  }
}

const EMPTY_SEQUENCE = new SequenceValue(new StaticArray<i64>(0));

@final
class SequenceBuilder extends Array<i64> {
  build(): SequenceValue {
    return new SequenceValue(arrayFromPtr<i64>(this.dataStart, this.length));
  }
}

@final
class DieValue extends AnyValue {
  readonly data: StaticArray<DieEntry>;

  constructor(data: StaticArray<DieEntry>) {
    super();
    this.data = data;
  }

  get typeName(): string {
    return "Die";
  }

  static fromNumber(value: i64): DieValue {
    const data = new StaticArray<DieEntry>(1);
    data[0] = new DieEntry(value, 1);
    return new DieValue(data);
  }

  toString(): string {
    return `{${this.data.map<string>((entry) => `${entry.value}:${entry.frequency}`).join(", ")}}`;
  }

  override toDie(): DieValue {
    return this;
  }

  override toNumberOrDie(): AnyValue {
    return this;
  }

  override toNewSequence(): SequenceValue {
    const arr = new StaticArray<i64>(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      arr[i] = this.data[i].value;
    }
    return new SequenceValue(arr);
  }

  override lengthOperation(): i64 {
    return 1;
  }

  override indexOperation(index: StaticArray<i64>): AnyValue {
    return this.toCollection().indexOperation(index);
  }
}

@final
class DieBuilder extends Array<DieEntry> {
  totalFrequency: i64 = 0;

  addEntry(value: i64, frequency: i64): void {
    this.totalFrequency += frequency;
    // Binary search to find the correct insertion point for the new entry
    let left = 0;
    let right = this.length - 1;
    while (left <= right) {
      const mid = (left + right) >> 1;
      if (this[mid].value === value) {
        this[mid] = new DieEntry(value, this[mid].frequency + frequency);
        return;
      }
      if (this[mid].value < value) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    // Insert the new entry at the correct position to maintain sorted order
    this.length++;
    this.copyWithin(left + 1, left, this.length - 1);
    this[left] = new DieEntry(value, frequency);
  }

  build(): DieValue {
    return new DieValue(arrayFromPtr<DieEntry>(this.dataStart, this.length));
  }
}

@unmanaged
@final
class DieEntry {
  readonly value: i64;
  readonly frequency: i64;

  constructor(value: i64, frequency: i64) {
    this.value = value;
    this.frequency = frequency;
  }
}

@final
class CollectionValue extends AnyValue {
  readonly count: i64;
  readonly die: StaticArray<DieEntry>;

  constructor(count: i64, die: StaticArray<DieEntry>) {
    super();
    this.count = count;
    this.die = die;
  }

  get typeName(): string {
    return "Collection";
  }

  toString(): string {
    return `(${this.count}){${this.die.map<string>((entry) => `${entry.value}:${entry.frequency}`).join(", ")}}`;
  }

  override toCollection(): CollectionValue {
    return this;
  }

  override toDie(): DieValue {
    return collectionToDie(this);
  }

  override toNumberOrDie(): AnyValue {
    return this.toDie();
  }

  override toNewSequence(): SequenceValue {
    return this.toDie().toNewSequence();
  }

  override lengthOperation(): i64 {
    return this.count;
  }

  override indexOperation(index: StaticArray<i64>): AnyValue {
    // Create a new die that represents the indexed values of each sequence in the collection
    const result = new DieBuilder();
    const sequences = getAllSequences(this.count as i32, this.die);
    const sequenceCount = sequences.sequenceCount;
    for (let i = 0; i < sequenceCount; i++) {
      let value: i64 = 0;
      for (let j = 0; j < index.length; j++) {
        const idx = index[j];
        if (idx >= 1 && idx <= sequences.span) {
          value += sequences.getValue(i, (idx as i32) - 1);
        }
      }
      result.addEntry(value, sequences.getFrequency(i));
    }
    return result.build();
  }
}

const I64_DESCENDING = (a: i64, b: i64): i32 => (a > b ? -1 : a < b ? 1 : 0);

@final
class SequenceListBuilder extends Array<i64> {
  readonly span: i32;

  constructor(span: i32) {
    super();
    this.span = span;
  }

  addSequence(sequence: Array<i64>, frequency: i64): void {
    if (sequence.length !== this.span) {
      throw new Error("Sequence length does not match span");
    }
    const sorted = arrayFromPtr<i64>(sequence.dataStart, sequence.length);
    sorted.sort(I64_DESCENDING);
    this.push(frequency);
    for (let i = 0; i < sorted.length; i++) {
      this.push(sorted[i]);
    }
  }

  get sequenceCount(): i32 {
    return this.length / (this.span + 1);
  }

  getFrequency(index: i32): i64 {
    return this[index * (this.span + 1)];
  }

  getValue(index: i32, position: i32): i64 {
    if (position < 0 || position >= this.span) {
      throw new RangeError("Position out of bounds");
    }
    return this[index * (this.span + 1) + 1 + position];
  }

  build(): SequenceList {
    return new SequenceList(this.span, arrayFromPtr<i64>(this.dataStart, this.length));
  }
}

@final
class SequenceList extends AnyValue {
  readonly span: i32;
  readonly data: StaticArray<i64>;

  get length(): i32 {
    return this.data.length / (this.span + 1);
  }

  get sequenceCount(): i32 {
    return this.data.length / (this.span + 1);
  }

  constructor(span: i32, data: StaticArray<i64>) {
    super();
    this.span = span;
    this.data = data;
  }

  get typeName(): string {
    return "SequenceList";
  }

  sequenceAt(index: i32): SequenceValue {
    if (index < 0 || index >= this.sequenceCount) {
      throw new RangeError("Index out of bounds");
    }
    const basePtr = changetype<usize>(this.data) + index * (this.span + 1) * sizeof<i64>();
    const sequencePtr = basePtr + sizeof<i64>();
    return new SequenceValue(arrayFromPtr<i64>(sequencePtr, this.span));
  }

  frequencyAt(index: i32): i64 {
    if (index < 0 || index >= this.sequenceCount) {
      throw new RangeError("Index out of bounds");
    }
    return this.data[index * (this.span + 1)];
  }

  toString(): string {
    return `${this.data.length} sequences`;
  }
}

@final
class ResultItem {
  readonly value: StaticArray<DieEntry>;
  readonly frequency: i64;

  constructor(value: StaticArray<DieEntry>, frequency: i64) {
    this.value = value;
    this.frequency = frequency;
  }
}

@final
class ResultsBuilder extends Array<ResultItem> {
  addResult(value: DieValue, frequency: i64): void {
    this.push(new ResultItem(value.data, frequency));
  }

  build(): DieValue {
    const result = new DieBuilder();
    const allWeights = new StaticArray<i64>(this.length);
    for (let i = 0; i < this.length; i++) {
      allWeights[i] = this[i].value.reduce(TOTAL_WEIGHT, 0);
    }
    const totalResultWeight = allWeights.reduce(PRODUCT, 1) < MAX_PRODUCT ? lcm(allWeights) : 1;
    for (let i = 0; i < this.length; i++) {
      const die = this[i].value;
      const frequency = this[i].frequency;
      const weight = allWeights[i];
      for (let j = 0; j < die.length; j++) {
        const combinedCount = frequency * die[j].frequency * (totalResultWeight / weight);
        result.addEntry(die[j].value, combinedCount);
      }
    }
    return result.build();
  }
}

@final
class ProgramState {
  readonly code: StaticArray<i32>;
  readonly stack: Array<AnyValue> = new Array<AnyValue>();
  readonly outputs: Array<DieValue> = new Array<DieValue>();
  pc: i32 = 0;
  fp: i32 = 0;
  loopIndex: i32 = 0;
  currentFrequency: i64 = 0;
  results: ResultsBuilder = new ResultsBuilder();
  pcMax: i32 = 0;
  opCount: i32 = 0;

  constructor(code: StaticArray<i32>) {
    this.code = code;
  }
}

@final
class StackFrame extends AnyValue {
  readonly pc: i32;
  readonly fp: i32;
  readonly loopIndex: i32;
  currentFrequency: i64;
  readonly results: ResultsBuilder;

  constructor(state: ProgramState, pcMod: i32) {
    super();
    this.pc = state.pc + pcMod;
    this.fp = state.fp;
    this.loopIndex = state.loopIndex;
    this.currentFrequency = state.currentFrequency;
    this.results = state.results;
  }

  get typeName(): string {
    return "StackFrame";
  }

  restore(state: ProgramState): void {
    state.pc = this.pc;
    state.fp = this.fp;
    state.loopIndex = this.loopIndex;
    state.currentFrequency = this.currentFrequency;
    state.results = this.results;
  }

  toString(): string {
    return `StackFrame(pc=${this.pc}, fp=${this.fp}, loopIndex=${this.loopIndex}, currentFrequency=${this.currentFrequency})`;
  }
}

enum OPCODE {
  NOP = 0,
  UNARY_PLUS = 0, // Same as NOP
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
  AT,
  RANGE,
  LENGTH,
  UNARY_MINUS,
  UNARY_D,
  SEQUENCE,
  L_LOAD,
  L_STORE,
  RETURN,
  JUMP,
  JUMP_IF_FALSE,
  CALL,
  G_LOAD,
  G_STORE,
  LOOP_INIT,
  LOOP_START,
  OUTPUT,
  OUTPUT_NAMED,
  IMMEDIATE,
  FUNCTION_INIT,
  FUNCTION_LOOP,
  RESERVE,
}

function numberOperation(op: OPCODE, a: i64, b: i64): i64 {
  switch (op) {
    case OPCODE.ADD:
      return a + b;
    case OPCODE.SUBTRACT:
      return a - b;
    case OPCODE.MULTIPLY:
      return a * b;
    case OPCODE.DIVIDE:
      if (b === 0) {
        throw new Error("Division by zero");
      }
      return a / b;
    case OPCODE.EXPONENT:
      return Mathf.pow(a as f32, b as f32) as i64;
    case OPCODE.EQUAL:
      return a == b ? 1 : 0;
    case OPCODE.NOT_EQUAL:
      return a != b ? 1 : 0;
    case OPCODE.LESS_THAN:
      return a < b ? 1 : 0;
    case OPCODE.GREATER_THAN:
      return a > b ? 1 : 0;
    case OPCODE.LESS_THAN_EQUAL:
      return a <= b ? 1 : 0;
    case OPCODE.GREATER_THAN_EQUAL:
      return a >= b ? 1 : 0;
    case OPCODE.AND:
      return a & b ? 1 : 0;
    case OPCODE.OR:
      return a | b ? 1 : 0;
    default:
      throw new Error("Unsupported operation");
  }
}

const SUM = (a: i64, b: i64, _: i32, __: StaticArray<i64>): i64 => a + b;

// Polynomial coefficients indexed from `offset` (the exponent of coeffs[0]).
class Poly {
  readonly offset: i64;
  readonly coeffs: StaticArray<i64>;

  constructor(offset: i64, length: i32) {
    this.offset = offset;
    this.coeffs = new StaticArray<i64>(length);
  }
}

function multiplyPoly(a: Poly, b: Poly): Poly {
  const result = new Poly(a.offset + b.offset, a.coeffs.length + b.coeffs.length - 1);
  for (let i = 0; i < a.coeffs.length; i++) {
    if (a.coeffs[i] === 0) continue;
    for (let j = 0; j < b.coeffs.length; j++) {
      const sum = result.coeffs[i + j] + a.coeffs[i] * b.coeffs[j];
      result.coeffs[i + j] = sum;
    }
  }
  return result;
}

function collectionToDie(collection: CollectionValue): DieValue {
  const n = collection.count;
  const faces = collection.die;
  if (n === 0 || faces.length === 0) {
    return DieValue.fromNumber(0);
  }

  const minVal = faces[0].value;
  const maxVal = faces[faces.length - 1].value;
  const base = new Poly(minVal, (maxVal - minVal + 1) as i32);
  for (let i = 0; i < faces.length; i++) {
    base.coeffs[(faces[i].value - minVal) as i32] = faces[i].frequency;
  }

  // Exponentiation by squaring: O(log n) multiplications instead of O(n).
  let result = new Poly(0, 1);
  result.coeffs[0] = 1;
  let power = base;
  let exp = n;
  while (exp > 0) {
    if (exp & 1) result = multiplyPoly(result, power);
    exp >>= 1;
    if (exp > 0) power = multiplyPoly(power, power);
  }

  let outputLength = 0;
  for (let i = 0; i < result.coeffs.length; i++) {
    if (result.coeffs[i] > 0) outputLength++;
  }

  const output = new StaticArray<DieEntry>(outputLength);
  for (let i = 0, j = 0; i < result.coeffs.length; i++) {
    if (result.coeffs[i] > 0) {
      output[j++] = new DieEntry(result.offset + i, result.coeffs[i]);
    }
  }
  return new DieValue(output);
}

function gcd(a: i64, b: i64): i64 {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

const LCM = (a: i64, b: i64, _: i32, __: StaticArray<i64>): i64 => (a * b) / gcd(a, b);

function lcm(values: StaticArray<i64>): i64 {
  return values.reduce<i64>(LCM, 1);
}

const TOTAL_WEIGHT = (a: i64, b: DieEntry, _: i32, __: StaticArray<DieEntry>): i64 =>
  a + b.frequency;
const PRODUCT = (a: i64, b: i64, _: i32, __: StaticArray<i64>): i64 => a * b;

const MAX_PRODUCT: i64 = 0x1fffffffffffff; // 2^53 - 1, max safe integer in JavaScript

const MAX_ARRAY_LENGTH: i64 = 500_000_000;

class getAllSequences_state {
  readonly n: i32;
  readonly d: StaticArray<DieEntry>;
  readonly result: SequenceListBuilder;
  readonly k: i32;
  readonly fact: StaticArray<i64>;
  readonly vals: StaticArray<i64>;
  readonly faceCounts: StaticArray<i64>;
  readonly seq: Array<i64>;

  rCount: i64;

  constructor(
    n: i32,
    d: StaticArray<DieEntry>,
    result: SequenceListBuilder,
    k: i32,
    fact: StaticArray<i64>,
    vals: StaticArray<i64>,
    faceCounts: StaticArray<i64>,
    seq: Array<i64>,
    rCount: i64,
  ) {
    this.n = n;
    this.d = d;
    this.result = result;
    this.k = k;
    this.fact = fact;
    this.vals = vals;
    this.faceCounts = faceCounts;
    this.seq = seq;
    this.rCount = rCount;
  }

  // Distributes `remaining` dice across faces [idx..k-1]; denom/pow accumulate
  // the multinomial denominator and the count^exponent product as we go.
  recurse(idx: i32, remaining: i32, denom: i64, pow: i64): void {
    if (idx === this.k - 1) {
      for (let j = 0; j < remaining; j++) this.seq.push(this.vals[idx]);
      const total =
        (this.fact[this.n] / (denom * this.fact[remaining])) *
        pow *
        this.faceCounts[idx] ** remaining;
      this.rCount += this.seq.length;
      if (this.rCount > MAX_PRODUCT) {
        throw new Error(
          `getAllSequences: n=${this.n} is too large - more than ${MAX_ARRAY_LENGTH} values generated`,
        );
      }
      this.result.addSequence(this.seq, total);
      for (let j = 0; j < remaining; j++) this.seq.pop();
      return;
    }
    let facePow: i64 = 1;
    for (let c = 0; c <= remaining; c++) {
      for (let j = 0; j < c; j++) this.seq.push(this.vals[idx]);
      this.recurse(idx + 1, remaining - c, denom * this.fact[c], pow * facePow);
      for (let j = 0; j < c; j++) this.seq.pop();
      facePow *= this.faceCounts[idx];
    }
  }
}

function getAllSequences(n: i32, d: StaticArray<DieEntry>): SequenceListBuilder {
  const result = new SequenceListBuilder(n);
  const k = d.length;

  if (k === 0 || n === 0) {
    return result;
  }

  const fact = new StaticArray<i64>(n + 1);
  fact[0] = 1;
  for (let i = 1; i <= n; i++) {
    fact[i] = fact[i - 1] * i;
    if (fact[i] < 0) {
      throw new Error(`getAllSequences: n=${n} is too large`);
    }
  }

  const vals = new StaticArray<i64>(k);
  const faceCounts = new StaticArray<i64>(k);
  for (let i = 0; i < k; i++) {
    vals[i] = d[i].value;
    faceCounts[i] = d[i].frequency;
  }

  const seq = new Array<i64>();
  let rCount: i64 = 0;

  const state = new getAllSequences_state(n, d, result, k, fact, vals, faceCounts, seq, rCount);

  state.recurse(0, n, 1, 1);
  return result;
}

@final
class DiePermutation {
  readonly value: i64;
  readonly frequency: i64;
  readonly permuted: DieValue;
  readonly weight: i64;

  constructor(value: i64, frequency: i64, die: DieValue) {
    this.value = value;
    this.frequency = frequency;
    this.permuted = collectionToDie(new CollectionValue(value, die.data));
    this.weight = this.permuted.data.reduce(TOTAL_WEIGHT, 0);
  }
}

function dDieDie(dn: DieValue, d: DieValue): DieValue {
  const n = dn.data;
  const result = new DieBuilder();
  const allPermuted = new StaticArray<DiePermutation>(n.length);
  for (let i = 0; i < n.length; i++) {
    allPermuted[i] = new DiePermutation(n[i].value, n[i].frequency, d);
  }
  const allPermutedWeights = new StaticArray<i64>(allPermuted.length);
  for (let i = 0; i < allPermuted.length; i++) {
    allPermutedWeights[i] = allPermuted[i].weight;
  }
  const totalCollectionWeight =
    allPermutedWeights.reduce(PRODUCT, 1) < MAX_PRODUCT ? lcm(allPermutedWeights) : 1;

  for (let i = 0; i < allPermuted.length; i++) {
    const frequency = allPermuted[i].frequency;
    const permuted = allPermuted[i].permuted;
    const weight = allPermuted[i].weight;
    for (let j = 0; j < permuted.data.length; j++) {
      const entry = permuted.data[j];
      const combinedCount = frequency * entry.frequency * (totalCollectionWeight / weight);
      result.addEntry(entry.value, combinedCount);
    }
  }
  return result.build();
}

function numberUnaryOperation(op: OPCODE, a: i64): i64 {
  switch (op) {
    case OPCODE.UNARY_MINUS:
      return -a;
    case OPCODE.NOT:
      return a == 0 ? 1 : 0;
    default:
      throw new Error("Unsupported unary operation");
  }
}

function numberDieOperation(op: OPCODE, a: i64, b: DieValue, reverse: boolean): DieValue {
  const bd = b.data;
  const result = new DieBuilder();
  for (let i = 0; i < bd.length; i++) {
    const value = bd[i].value;
    const newValue = reverse ? numberOperation(op, value, a) : numberOperation(op, a, value);
    result.addEntry(newValue, bd[i].frequency);
  }
  return result.build();
}

function dieDieOperation(op: OPCODE, a: DieValue, b: DieValue): DieValue {
  const ad = a.data;
  const bd = b.data;
  const result = new DieBuilder();
  for (let i = 0; i < ad.length; i++) {
    const aValue = ad[i].value;
    const aFreq = ad[i].frequency;
    for (let j = 0; j < bd.length; j++) {
      const newValue = numberOperation(op, aValue, bd[j].value);
      result.addEntry(newValue, aFreq * bd[j].frequency);
    }
  }
  return result.build();
}

function dieUnaryOperation(op: OPCODE, a: DieValue): DieValue {
  const ad = a.data;
  const result = new DieBuilder();
  for (let i = 0; i < ad.length; i++) {
    const newValue = numberUnaryOperation(op, ad[i].value);
    result.addEntry(newValue, ad[i].frequency);
  }
  return result.build();
}

function binaryOperation(op: OPCODE, a: AnyValue, b: AnyValue): AnyValue {
  if (a instanceof NumberValue && b instanceof NumberValue) {
    return new NumberValue(numberOperation(op, a.toNumber(), b.toNumber()));
  }
  if (a instanceof NumberValue && b instanceof DieValue) {
    return numberDieOperation(op, a.toNumber(), b.toDie(), false);
  }
  if (a instanceof DieValue && b instanceof NumberValue) {
    return numberDieOperation(op, b.toNumber(), a.toDie(), true);
  }
  return dieDieOperation(op, a.toDie(), b.toDie());
}

function unaryOperation(op: OPCODE, a: AnyValue): AnyValue {
  if (a instanceof NumberValue) {
    return new NumberValue(numberUnaryOperation(op, a.toNumber()));
  }
  return dieUnaryOperation(op, a.toDie());
}

function sequenceNumberOperation(
  op: OPCODE,
  a: SequenceValue,
  b: NumberValue,
  reverse: boolean,
): NumberValue {
  const ad = a.data;
  let result: i64 = 0;
  for (let i = 0; i < ad.length; i++) {
    result += reverse ? numberOperation(op, b.value, ad[i]) : numberOperation(op, ad[i], b.value);
  }
  return new NumberValue(result);
}

function sequenceSequenceOperation(op: OPCODE, a: SequenceValue, b: SequenceValue): NumberValue {
  const ad = a.data;
  const bd = b.data;
  const n = min(ad.length, bd.length);
  let result: i64 = 0;
  for (let i = 0; i < n; i++) {
    result += numberOperation(op, ad[i], bd[i]);
  }
  return new NumberValue(result);
}

function compareOperation(op: OPCODE, a: AnyValue, b: AnyValue): AnyValue {
  if (a instanceof SequenceValue && b instanceof NumberValue) {
    return sequenceNumberOperation(op, a as SequenceValue, b as NumberValue, false);
  }
  if (a instanceof NumberValue && b instanceof SequenceValue) {
    return sequenceNumberOperation(op, b as SequenceValue, a as NumberValue, true);
  }
  if (a instanceof SequenceValue && b instanceof SequenceValue) {
    return sequenceSequenceOperation(op, a as SequenceValue, b as SequenceValue);
  }
  return binaryOperation(op, a.toNumberOrDie(), b.toNumberOrDie());
}

function sequenceIndexNumber(seq: SequenceValue, index: i64): i64 {
  if (index < 1 || index > seq.data.length) {
    return 0;
  }
  return seq.data[(index as i32) - 1];
}

enum KIND {
  ANY = 0,
  NUMBER = 1,
  SEQUENCE = 2,
  DIE = 3,
}

@final
class NumberList extends AnyValue {
  readonly data: StaticArray<DieEntry>;

  constructor(data: StaticArray<DieEntry>) {
    super();
    this.data = data;
  }

  override get typeName(): string {
    return "NumberList";
  }

  toString(): string {
    return `${this.data.length} numbers`;
  }
}

function popFrame(state: ProgramState): void {
  const stack = state.stack;
  stack.length = state.fp; // Discard local variables and arguments
  const frame = stack.pop();
  if (!(frame instanceof StackFrame)) {
    throw new Error("Invalid frame on stack");
  }
  (frame as StackFrame).restore(state);
}

function getPermutationsCount(state: ProgramState): i32 {
  const stack = state.stack;
  const fp = state.fp;
  const paramCount = stack.length - fp;
  let permutationCount = 1;
  for (let i = 0; i < paramCount; i++) {
    const arg = stack[fp + i];
    if (arg instanceof NumberList) {
      permutationCount *= (arg as NumberList).data.length;
    } else if (arg instanceof SequenceList) {
      permutationCount *= (arg as SequenceList).sequenceCount;
    }
  }
  return permutationCount;
}

function functionInit(state: ProgramState): void {
  const code = state.code;
  const stack = state.stack;
  const fp = state.fp;
  const paramCount = code[state.pc++];
  if (paramCount !== stack.length - fp) {
    throw new Error(
      `Function expected ${paramCount} parameters, but got ${stack.length - state.fp}`,
    );
  }
  for (let i = 0; i < paramCount; i++) {
    const paramKind = code[state.pc++] as KIND;
    const arg = stack[fp + i];
    switch (paramKind) {
      case KIND.NUMBER:
        if (arg instanceof DieValue || arg instanceof CollectionValue) {
          stack[fp + i] = new NumberList(arg.toDie().data);
        } else if (!(arg instanceof NumberValue)) {
          stack[fp + i] = new NumberValue(arg.toNumber());
        }
        break;
      case KIND.SEQUENCE:
        const collection = arg.toCollection();
        stack[fp + i] = getAllSequences(collection.count as i32, collection.die).build();
        break;
      case KIND.DIE:
        if (!(arg instanceof CollectionValue)) {
          stack[fp + i] = arg.toDie();
        }
        break;
      default:
        break;
    }
  }
  const permutationCount = getPermutationsCount(state);
  switch (permutationCount) {
    case 0:
      popFrame(state);
      stack.push(EMPTY_SEQUENCE);
      break;
    case 1:
      // Convert any NumberList or SequenceList to a single value
      for (let i = 0; i < paramCount; i++) {
        const arg = stack[fp + i];
        if (arg instanceof NumberList) {
          stack[fp + i] = new NumberValue((arg as NumberList).data[0].value);
        } else if (arg instanceof SequenceList) {
          stack[fp + i] = (arg as SequenceList).sequenceAt(0);
        }
      }
      state.pc++; // Skip the function loop
      break;
    default:
      state.loopIndex = 0;
      state.results = new ResultsBuilder();
      break;
  }
}

function functionLoop(state: ProgramState): void {
  const stack = state.stack;
  const fp = state.fp;
  const loopIndex = state.loopIndex;
  if (loopIndex > 0) {
    const value = stack.pop().toDie();
    state.results.addResult(value, state.currentFrequency);
  }
  const paramCount = stack.length - fp;
  const permutationCount = getPermutationsCount(state);
  if (loopIndex >= permutationCount) {
    const result = state.results.build();
    popFrame(state);
    stack.push(result);
  } else {
    state.loopIndex++;
    // Ensure we return back to this instruction
    const frame = new StackFrame(state, -1);
    stack.push(frame);
    const newFp = stack.length;
    stack.length += paramCount; // Reserve space for the next set of parameters
    let remainingIndex = loopIndex;
    let currentFrequency: i64 = 1;
    for (let i = 0; i < paramCount; i++) {
      const arg = stack[fp + i];
      if (arg instanceof NumberList) {
        const list = (arg as NumberList).data;
        const item = list[remainingIndex % list.length];
        currentFrequency *= item.frequency;
        stack[newFp + i] = new NumberValue(item.value);
        remainingIndex = remainingIndex / list.length;
      } else if (arg instanceof SequenceList) {
        const list = arg as SequenceList;
        const listIdx = remainingIndex % list.length;
        currentFrequency *= list.frequencyAt(listIdx);
        stack[newFp + i] = list.sequenceAt(listIdx);
        remainingIndex = remainingIndex / list.sequenceCount;
      } else {
        stack[newFp + i] = arg;
      }
    }
    state.fp = newFp;
    frame.currentFrequency = currentFrequency;
  }
}

const MAX_STACK_SIZE = 500_000_000;

function execute(state: ProgramState, maxOps: i32): boolean {
  const code = state.code;
  const stack = state.stack;

  for (; state.opCount < maxOps; state.opCount++) {
    if (state.pc > state.pcMax) {
      state.pcMax = state.pc;
    }

    if (state.pc >= code.length) {
      return true; // Program completed successfully
    }

    if (stack.length > MAX_STACK_SIZE) {
      throw new Error("Stack overflow");
    }

    const opcode = code[state.pc++];
    switch (opcode) {
      case OPCODE.NOP:
        break;
      case OPCODE.IMMEDIATE: {
        stack.push(new NumberValue(code[state.pc++]));
        break;
      }
      case OPCODE.ADD:
      case OPCODE.SUBTRACT:
      case OPCODE.MULTIPLY:
      case OPCODE.DIVIDE:
      case OPCODE.EXPONENT:
      case OPCODE.AND:
      case OPCODE.OR: {
        const b = stack.pop().toNumberOrDie();
        const a = stack.pop().toNumberOrDie();
        const result = binaryOperation(opcode, a, b);
        stack.push(result);
        break;
      }
      case OPCODE.EQUAL:
      case OPCODE.NOT_EQUAL:
      case OPCODE.LESS_THAN:
      case OPCODE.GREATER_THAN:
      case OPCODE.LESS_THAN_EQUAL:
      case OPCODE.GREATER_THAN_EQUAL: {
        const b = stack.pop();
        const a = stack.pop();
        const result = compareOperation(opcode, a, b);
        stack.push(result);
        break;
      }
      case OPCODE.UNARY_MINUS:
      case OPCODE.NOT: {
        const a = stack.pop().toNumberOrDie();
        const result = unaryOperation(opcode, a);
        stack.push(result);
        break;
      }
      case OPCODE.D: {
        const b = stack.pop().toNewDie();
        const a = stack.pop().toNumberOrDie();
        if (a instanceof NumberValue) {
          stack.push(new CollectionValue((a as NumberValue).value, b.data));
        } else if (a instanceof DieValue) {
          stack.push(dDieDie(a as DieValue, b));
        }
        break;
      }
      case OPCODE.UNARY_D: {
        const a = stack.pop();
        const result = a.toNewDie();
        stack.push(result);
        break;
      }
      case OPCODE.LENGTH: {
        const a = stack.pop();
        const result = a.lengthOperation();
        stack.push(new NumberValue(result));
        break;
      }
      case OPCODE.AT: {
        const a = stack.pop();
        const b = stack.pop();
        let index: StaticArray<i64>;
        if (b instanceof SequenceValue) {
          index = (b as SequenceValue).data;
        } else if (b instanceof NumberValue) {
          index = new StaticArray<i64>(1);
          index[0] = (b as NumberValue).value;
        } else {
          throw new Error("Index must be a number or sequence");
        }
        const result = a.indexOperation(index);
        stack.push(result);
        break;
      }
      case OPCODE.RANGE: {
        const b = stack.pop().toNumber();
        const a = stack.pop().toNumber();
        const start = min(a, b);
        const end = max(a, b);
        const length = end - start + 1;
        const arr = new StaticArray<i64>(length as i32);
        for (let i = 0; i < length; i++) {
          arr[i] = start + i;
        }
        stack.push(new SequenceValue(arr));
        break;
      }
      case OPCODE.SEQUENCE: {
        const count = code[state.pc++];
        const seq = new SequenceBuilder();
        for (let i = 0; i < count; i++) {
          const entry = stack[stack.length - count + i].toNewSequence().data;
          const s = seq.length;
          seq.length += entry.length;
          for (let j = 0; j < entry.length; j++) {
            seq[s + j] = entry[j];
          }
        }
        stack.length -= count;
        stack.push(seq.build());
        break;
      }
      case OPCODE.G_LOAD: {
        const index = code[state.pc++];
        stack.push(stack[index]);
        break;
      }
      case OPCODE.G_STORE: {
        const index = code[state.pc++];
        stack[index] = stack.pop();
        break;
      }
      case OPCODE.L_LOAD: {
        const index = code[state.pc++];
        stack.push(stack[state.fp + index]);
        break;
      }
      case OPCODE.L_STORE: {
        const index = code[state.pc++];
        stack[state.fp + index] = stack.pop();
        break;
      }
      case OPCODE.JUMP: {
        const target = code[state.pc++];
        state.pc += target;
        break;
      }
      case OPCODE.JUMP_IF_FALSE: {
        const target = code[state.pc++];
        const condition = stack.pop().toNumber();
        if (condition === 0) {
          state.pc += target;
        }
        break;
      }
      case OPCODE.FUNCTION_INIT:
        functionInit(state);
        break;
      case OPCODE.FUNCTION_LOOP:
        functionLoop(state);
        break;
      case OPCODE.CALL: {
        const argCount = code[state.pc++];
        const functionPtr = code[state.pc++];
        // Save the frame pointer, return address, and loop index
        stack.length++;
        const newFp = stack.length - argCount;
        stack.copyWithin(newFp, newFp - 1);
        stack[newFp - 1] = new StackFrame(state, 0);
        state.fp = newFp;
        state.pc = functionPtr;
        break;
      }
      case OPCODE.RETURN: {
        const value = stack.pop();
        popFrame(state);
        stack.push(value);
        break;
      }
      case OPCODE.LOOP_INIT: {
        const sequence = stack[stack.length - 1];
        if (!(sequence instanceof SequenceValue)) {
          throw new Error("Expected a sequence to loop over");
        }
        stack.push(new StackFrame(state, 0));
        state.loopIndex = 0;
        break;
      }
      case OPCODE.LOOP_START: {
        const loopEnd = code[state.pc++];
        const it = stack[stack.length - 2];
        if (!(it instanceof SequenceValue)) {
          throw new Error("Expected a sequence to loop over");
        }
        const sequence = it as SequenceValue;
        if (state.loopIndex < sequence.data.length) {
          stack.push(new NumberValue(sequence.data[state.loopIndex]));
          state.loopIndex++;
        } else {
          // Exit the loop
          const frame = stack.pop();
          if (!(frame instanceof StackFrame)) {
            throw new Error("Invalid frame on stack");
          }
          state.loopIndex = (frame as StackFrame).loopIndex;
          stack.pop(); // Remove the sequence from the stack
          state.pc += loopEnd; // Jump to the instruction after the loop
        }
        break;
      }
      case OPCODE.RESERVE: {
        const reserveCount = code[state.pc++];
        stack.length += reserveCount;
        break;
      }
      case OPCODE.OUTPUT: {
        const value = stack.pop().toDie();
        state.outputs.push(value);
        break;
      }
      default:
        throw new Error(`Unknown opcode: ${opcode}`);
    }
  }
  return false; // Max operations reached, not completed
}

let gState: ProgramState | null = null;

export function newProgram(code: StaticArray<i32>): void {
  gState = new ProgramState(code);
}

export function runProgram(maxOps: i32): boolean {
  if (gState === null) {
    throw new Error("No program loaded");
  }
  return execute(gState!, maxOps);
}

@unmanaged
class OutputEntry {
  value: f64 = 0;
  frequency: f64 = 0;
}

export function getProgramOutputs(): Array<Array<OutputEntry>> {
  if (gState === null) {
    throw new Error("No program loaded");
  }
  const outputs = gState!.outputs;
  const result = new Array<Array<OutputEntry>>(outputs.length);
  for (let i = 0; i < outputs.length; i++) {
    const die = outputs[i];
    const entries = new Array<OutputEntry>(die.data.length);
    for (let j = 0; j < die.data.length; j++) {
      const entry = die.data[j];
      const outputEntry = new OutputEntry();
      outputEntry.value = entry.value as f64;
      outputEntry.frequency = entry.frequency as f64;
      entries[j] = outputEntry;
    }
    result[i] = entries;
  }
  return result;
}
