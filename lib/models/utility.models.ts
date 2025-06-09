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
