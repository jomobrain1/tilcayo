const types = ["string", "number", "boolean", "date"] as const;
type FieldType = typeof types[number];

export function parseFields(input: string, allowOptional = false): { name: string; type: FieldType; optional: boolean }[] {
  const names = new Set<string>();
  return input.split(",").map((entry) => {
    const parts = entry.trim().split(":");
    const field = parts[0]?.trim() ?? "";
    const optional = allowOptional && field.endsWith("?");
    const name = optional ? field.slice(0, -1) : field;
    const type = types.find((type) => type === parts[1]?.trim());
    if (parts.length !== 2 || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || !type) {
      throw new Error('Invalid field. Use --fields "name:string,age:number". Types: string, number, boolean, date.');
    }
    if (["constructor", "prototype", "createdAt", "updatedAt"].includes(name)) throw new Error(`Reserved field name: ${name}`);
    if (names.has(name)) throw new Error(`Duplicate field: ${name}`);
    names.add(name);
    return { name, type, optional };
  });
}
