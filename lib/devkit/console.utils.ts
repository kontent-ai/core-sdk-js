import { styleText } from "node:util";

export type ConsoleColor = "red" | "green" | "yellow" | "blue" | "cyan" | "magenta" | "white" | "gray";

export function colorize(color: ConsoleColor, text: string): string {
	return styleText(color, text);
}
