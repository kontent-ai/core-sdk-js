import z from "zod";

export const nilUuid = "00000000-0000-0000-0000-000000000000";

export const kontentUuidSchema = z.union([z.uuid({ version: "v4" }), z.literal(nilUuid)]);

export const codenameSchema = z.string().regex(/^[a-z][a-z0-9_]*$/, {
	message: "Codename must start with a lowercase letter and contain only lowercase letters, digits, and underscores",
});

export function codenameOf<const TCodenames extends z.infer<typeof codenameSchema>>(
	codenames: readonly TCodenames[] | undefined,
): z.ZodType<TCodenames> {
	return (codenames && codenames.length > 0 ? z.literal(codenames) : codenameSchema) as z.ZodType<TCodenames>;
}
