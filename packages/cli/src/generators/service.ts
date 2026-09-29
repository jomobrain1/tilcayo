import type { ResourceNames } from "../utils/naming.js";

export const serviceTemplate = ({ plural }: ResourceNames): string => `export const ${plural}Service = {
  // Add service functions here.
};
`;
