export interface ResourceNames {
  model: string;
  singular: string;
  plural: string;
  pluralPascal: string;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function resourceNames(input: string): ResourceNames {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(input)) {
    throw new Error("Use a resource name such as Book, books, or Category (letters and digits only).");
  }
  const word = input.charAt(0).toLowerCase() + input.slice(1);
  let singular = word;
  if (/[^aeiou]ies$/i.test(word)) singular = word.slice(0, -3) + "y";
  else if (/(ches|shes|sses|xes|zes|statuses|buses)$/i.test(word)) singular = word.slice(0, -2);
  else if (/s$/i.test(word) && !/(ss|us|is)$/i.test(word)) singular = word.slice(0, -1);

  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(singular)) {
    throw new Error("Choose a resource name that is not a reserved filename.");
  }

  let plural: string;
  if (/[^aeiou]y$/i.test(singular)) plural = singular.slice(0, -1) + "ies";
  else if (/(s|x|z|ch|sh)$/i.test(singular)) plural = singular + "es";
  else plural = singular + "s";

  return { model: capitalize(singular), singular, plural, pluralPascal: capitalize(plural) };
}
