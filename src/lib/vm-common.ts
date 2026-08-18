import { KIND, type DieItem } from "./common";
import type { ResultItem } from "./vm";

const { freeze, assign } = Object;
const { from: arrayFrom } = Array;

const KIND_DIE = freeze({ kind: KIND.DIE });
const KIND_SEQUENCE = freeze({ kind: KIND.SEQUENCE });
const KIND_COLLECTION = freeze({ kind: KIND.COLLECTION });
const KIND_NUMBER_LIST = freeze({ kind: KIND.NUMBER_LIST });
const KIND_SEQUENCE_LIST = freeze({ kind: KIND.SEQUENCE_LIST });

export type Sequence = readonly number[] & {
  readonly kind: typeof KIND.SEQUENCE;
};
export type Die = readonly DieItem[] & { readonly kind: typeof KIND.DIE };
export type Collection = readonly [count: number, die: Die] & {
  readonly kind: typeof KIND.COLLECTION;
};
export type NumberList = readonly DieItem[] & {
  readonly kind: typeof KIND.NUMBER_LIST;
};
export type SequenceListItem = readonly [
  sequence: Sequence,
  probability: number,
];
export type SequenceList = readonly SequenceListItem[] & {
  readonly kind: typeof KIND.SEQUENCE_LIST;
};
export type Frame = {
  readonly pc: number;
  readonly fp: number;
  readonly loopIndex: number;
  readonly currentFrequency: number;
  readonly results: ResultItem[];
  readonly kind: typeof KIND.FRAME;
};
export type ProgramValue =
  | number
  | Sequence
  | Die
  | Collection
  | Frame
  | NumberList
  | SequenceList;
const DIE_ASCENDING = (a: DieItem, b: DieItem) => a[0] - b[0];
export function die(items: DieItem[]): Die {
  for (const item of items) {
    freeze(item);
  }
  return freeze(assign(items.sort(DIE_ASCENDING), KIND_DIE));
}
export function sequence(items: number[]): Sequence {
  return freeze(assign(items, KIND_SEQUENCE));
}
export function collection(count: number, die: Die): Collection {
  return freeze(assign([count, die] as const, KIND_COLLECTION));
}
export function numberList(items: DieItem[]): NumberList {
  for (const item of items) {
    freeze(item);
  }
  return freeze(assign(items, KIND_NUMBER_LIST));
}
export function sequenceList(items: SequenceListItem[]): SequenceList {
  for (const item of items) {
    freeze(item);
  }
  return freeze(assign(items, KIND_SEQUENCE_LIST));
}
export function dieMap() {
  return new Map<number, number>();
}
export function dieMapAdd(
  map: Map<number, number>,
  value: number,
  count: number,
) {
  map.set(value, (map.get(value) || 0) + count);
}
export const MIN_PROBABILITY = 1e-6;
export function dieMapFinish(map: Map<number, number>): DieItem[] {
  return arrayFrom(map.entries()).filter(
    ([_, count]) => count > MIN_PROBABILITY,
  );
}
export function dNumber(d: number): Die {
  return die(arrayFrom({ length: d }, (_, i) => [i + 1, 1 / d]));
}
