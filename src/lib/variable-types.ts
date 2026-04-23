import { z } from 'zod';

export type VariableType = 'color' | 'number' | 'string' | 'boolean' | 'dimension';

export type VariableValue =
  | string // single mode: "#FF0000" or "16px" or "true" or "{colors/primary}"
  | { light: string; dark: string }; // multi mode

export type Variable = {
  id: string;
  collectionId: string;
  name: string; // "colors/primary/base"
  path: string[]; // ["colors", "primary", "base"]
  type: VariableType;
  value: VariableValue;
  description?: string;
  order: number;
};

export type VariableCollection = {
  id: string;
  name: string;
  label: string;
  mode: 'single' | 'multi';
  order: number;
  variables: Variable[];
};

export type VariableGroup = {
  path: string[]; // ["colors", "primary"]
  label: string;
  variables: Variable[];
  children: VariableGroup[];
};

// Zod Schemas

export const CreateVariableCollectionSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'Only lowercase letters, numbers, hyphens, underscores'),
  label: z.string().min(1),
  mode: z.enum(['single', 'multi']).default('single'),
});

export type CreateVariableCollection = z.infer<typeof CreateVariableCollectionSchema>;

export const UpdateVariableCollectionSchema = z.object({
  label: z.string().min(1).optional(),
  mode: z.enum(['single', 'multi']).optional(),
  order: z.number().int().optional(),
});

export type UpdateVariableCollection = z.infer<typeof UpdateVariableCollectionSchema>;

const VariableValueSchema = z.union([
  z.string(),
  z.object({ light: z.string(), dark: z.string() }),
]);

export const CreateVariableSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/, 'Invalid variable name format'),
  type: z.enum(['color', 'number', 'string', 'boolean', 'dimension']),
  value: VariableValueSchema,
  description: z.string().optional(),
});

export type CreateVariable = z.infer<typeof CreateVariableSchema>;

export const UpdateVariableSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/).optional(),
  type: z.enum(['color', 'number', 'string', 'boolean', 'dimension']).optional(),
  value: VariableValueSchema.optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

export type UpdateVariable = z.infer<typeof UpdateVariableSchema>;

// Utility functions

export function parseVariablePath(name: string): string[] {
  return name.split('/').filter(Boolean);
}

export function getGroupPath(variablePath: string[]): string[] {
  return variablePath.slice(0, -1);
}

export function buildVariableTree(variables: Variable[]): VariableGroup {
  const root: VariableGroup = {
    path: [],
    label: 'Root',
    variables: [],
    children: [],
  };

  const groupMap = new Map<string, VariableGroup>();
  groupMap.set('', root);

  for (const variable of variables) {
    const groupPath = getGroupPath(variable.path);
    const groupKey = groupPath.join('/');

    if (!groupMap.has(groupKey)) {
      const parent = groupPath.length > 0 ? groupPath.slice(0, -1).join('/') : '';
      const parentGroup = groupMap.get(parent) || root;
      const newGroup: VariableGroup = {
        path: groupPath,
        label: groupPath[groupPath.length - 1] || 'Root',
        variables: [],
        children: [],
      };
      groupMap.set(groupKey, newGroup);
      parentGroup.children.push(newGroup);
    }

    const group = groupMap.get(groupKey)!;
    group.variables.push(variable);
  }

  root.variables = variables.filter((v) => v.path.length === 1);

  return root;
}

export function flattenVariableTree(group: VariableGroup): Variable[] {
  const variables = [...group.variables];
  for (const child of group.children) {
    variables.push(...flattenVariableTree(child));
  }
  return variables;
}
