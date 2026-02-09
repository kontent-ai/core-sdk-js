/**
 * Improves the type readability by flattening the type.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Override selected properties of a type. Uses Omit to remove the properties and then adds the new properties.
 */
export type Override<Type, NewType extends { [key in keyof Type]?: NewType[key] }> = Omit<Type, keyof NewType> & NewType;

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
