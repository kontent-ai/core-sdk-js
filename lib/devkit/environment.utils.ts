import { colorize } from "./console.utils.js";

export function getEnvironmentRequiredValue(variableName: string): string {
	const value = getEnvironmentOptionalValue(variableName);

	if (!value || value.trim() === "") {
		throw new Error(`Missing environment variable '${colorize("red", variableName)}'`);
	}

	return value;
}

export function getEnvironmentOptionalValue(variableName: string): string | undefined {
	return process.env[variableName];
}
