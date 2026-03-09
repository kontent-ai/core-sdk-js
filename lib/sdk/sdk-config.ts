import z from "zod";

export const nilUuid = "00000000-0000-0000-0000-000000000000";

export const kontentUuidSchema = z.union([z.uuid({ version: "v4" }), z.literal(nilUuid)]);
