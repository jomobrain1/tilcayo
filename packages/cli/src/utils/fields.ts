const types = ["string", "number", "boolean", "date"] as const;
type FieldType = typeof types[number];

export interface PrimitiveResourceField {
  kind: "primitive";
  name: string;
  type: FieldType;
  optional: boolean;
}

export interface ReferenceResourceField {
  kind: "reference";
  name: string;
  model: string;
  many: boolean;
  optional: boolean;
}

export type ResourceField = PrimitiveResourceField | ReferenceResourceField;

export function parseFields(input: string, allowOptional = false): ResourceField[] {
  const names = new Set<string>();
  return input.split(",").map((entry) => {
    const parts = entry.trim().split(":");
    const field = parts[0]?.trim() ?? "";
    const suffix = parts.at(-1)?.trim() ?? "";
    const optional = allowOptional && (field.endsWith("?") || suffix.endsWith("?"));
    const name = allowOptional && field.endsWith("?") ? field.slice(0, -1) : field;
    const value = allowOptional && suffix.endsWith("?") ? suffix.slice(0, -1) : suffix;
    const relation = parts[1]?.trim();
    const isReference = relation === "ref" || relation === "refs";
    if (isReference || parts.length > 2) {
      if (!isReference || parts.length !== 3 || !/^[A-Z][A-Za-z0-9]*$/.test(value)) {
        throw new Error(`Invalid relation: ${entry.trim()}. Expected field:ref:Model or field:refs:Model (optional: Model?). Model must be a PascalCase identifier.`);
      }
    }
    const type = types.find((type) => type === value);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || (!isReference && (parts.length !== 2 || !type))) {
      throw new Error('Invalid field. Use --fields "name:string,age:number". Types: string, number, boolean, date.');
    }
    if (["constructor", "prototype", "createdAt", "updatedAt"].includes(name)) throw new Error(`Reserved field name: ${name}`);
    if (names.has(name)) throw new Error(`Duplicate field: ${name}`);
    names.add(name);
    if (isReference) return { kind: "reference", name, model: value, many: relation === "refs", optional };
    if (!type) throw new Error(`Invalid field type: ${value}`);
    return { kind: "primitive", name, type, optional };
  });
}
