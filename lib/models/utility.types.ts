/**
 * Represents an empty object type.
 */
export type EmptyObject = Record<string, never>;

/**
 * Picks a string literal type from a union type.
 */
export type PickStringLiteral<T extends string, U extends T> = U;

/**
 * Adds intellisense for string union type, but also allows any string
 */
export type LiteralUnion<T extends string | undefined> = T | (string & NonNullable<unknown>);

/**
 * Adds intellisense for number union type, but also allows any number
 */
export type LiteralUnionNumber<T extends number | undefined> = T | (number & NonNullable<unknown>);
