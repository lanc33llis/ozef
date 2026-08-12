import type { ZodError, ZodTypeAny } from "zod";

const getZodDef = (scheme: ZodTypeAny) =>
  ((scheme as any)._def ?? (scheme as any).def) as Record<string, any>;

const getZodKind = (scheme: ZodTypeAny) => {
  const def = getZodDef(scheme);
  const type = def.type ?? def.typeName;

  if (typeof type === "string" && type.startsWith("Zod")) {
    return type.slice(3).toLowerCase();
  }

  return type;
};

export const unwrapZodType = (scheme: ZodTypeAny): ZodTypeAny => {
  let current = scheme;

  while (
    getZodKind(current) === "optional" ||
    getZodKind(current) === "nullable" ||
    getZodKind(current) === "default"
  ) {
    const def = getZodDef(current);
    current = def.innerType ?? def.schema;
  }

  return current;
};

export const getZodTypeName = (scheme: ZodTypeAny) =>
  getZodKind(unwrapZodType(scheme));

const getZodStringFormat = (scheme: ZodTypeAny) => {
  const unwrapped = unwrapZodType(scheme);
  const def = getZodDef(unwrapped);

  if (typeof (unwrapped as any).format === "string") {
    return (unwrapped as any).format as string;
  }

  if (typeof def.format === "string") {
    return def.format;
  }

  for (const check of [...(def.checks ?? [])].reverse()) {
    const checkDef = (check as any)._zod?.def ?? getZodDef(check);

    if (typeof checkDef?.format === "string") {
      return checkDef.format;
    }
  }
};

export const getZodInputType = (scheme: ZodTypeAny) => {
  if (getZodTypeName(scheme) === "number") {
    return "number";
  }

  switch (getZodStringFormat(scheme)) {
    case "email":
      return "email";
    case "url":
      return "url";
    case "e164":
      return "tel";
    case "date":
      return "date";
    case "time":
      return "time";
    default:
      return "text";
  }
};

export const isRequired = (scheme: ZodTypeAny) => !scheme.isOptional();

export const parseFormValue = (scheme: ZodTypeAny, value: unknown) => {
  if (getZodTypeName(scheme) === "number") {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return Number(value);
  }

  return value;
};

export const getErrorMessage = (error: ZodError | string | undefined) => {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string" || error instanceof String) {
    return error as string;
  }

  return ((error as any).issues ?? (error as any).errors)
    .flatMap((e: { message: string }) => e.message)
    .join(", ");
};

export const getEnumOptions = (scheme: ZodTypeAny) => {
  const def = getZodDef(scheme);

  return ((scheme as any).options ?? Object.values(def.entries ?? {})) as string[];
};

export const getUnionOptions = (scheme: ZodTypeAny) =>
  (getZodDef(scheme).options ?? (scheme as any).options ?? []) as ZodTypeAny[];

export const getLiteralValue = (scheme: ZodTypeAny) => {
  const literal = scheme as any;
  const def = getZodDef(scheme);

  if ("value" in literal) {
    return literal.value;
  }

  if (literal.values instanceof Set) {
    return literal.values.values().next().value;
  }

  if (Array.isArray(def.values)) {
    return def.values[0];
  }

  return def.value;
};
