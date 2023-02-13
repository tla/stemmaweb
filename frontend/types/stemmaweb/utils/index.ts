/**
 * <pre>
 * interface Foo {
 *   a: string;
 *   b: string;
 *   c: string;
 * }
 *
 * type FooBar = Overwrite<Foo, 'b', number[]>; // { a: string; b: number[]; c: string[]; }
 * type FooBar2 = Overwrite<Foo, 'b', object[]>; // { a: string; b: object[]; c: string[]; }
 * type FooBar3 = Overwrite<Foo, 'c', number[]>; // { a: string; b: string[]; c: number[]; }
 * type FooBar4 = Overwrite<Foo, 'c', object[]>; // { a: string; b: string[]; c: object[]; }
 * type FooBar5 = Overwrite<Foo, 'b' | 'c', number[]>; // { a: string; b: number[]; c: number[]; }
 * type FooBar6 = Overwrite<Foo, 'b' | 'c', object[]>; // { a: string; b: object[]; c: object[]; }
 * </pre>
 */
export type Overwrite<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

export type KeyOf<T> = keyof T;
