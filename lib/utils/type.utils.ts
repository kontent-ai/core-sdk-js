import { z } from "zod";

export function getCodenameSchema<const TCodenames extends string>(codenames: readonly TCodenames[] | undefined): z.ZodType<TCodenames> {
	return (codenames && codenames.length > 0 ? z.literal(codenames) : z.string()) as z.ZodType<TCodenames>;
}
