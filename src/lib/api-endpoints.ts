export type Param = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
};

export type Endpoint = {
  id: string;
  group: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  scope: string;
  pathParams?: Param[];
  bodyParams?: Param[];
  bodyExample?: string;
  responseStatus: number;
  responseExample: string;
};

export const API_ENDPOINTS: Endpoint[] = [
  // ── Collections ──────────────────────────────────────────────
  {
    id: 'collections-list',
    group: 'Collections',
    method: 'GET',
    path: '/api/collections',
    title: 'List collections',
    description: 'Returns every collection schema visible to the caller, including its field definitions and AI opt-in flag.',
    scope: 'read:collections',
    responseStatus: 200,
    responseExample: `[
  {
    "id": "cmo...",
    "name": "customers",
    "label": "Customers",
    "description": "B2B customers",
    "aiOptIn": false,
    "schema": {
      "fields": [
        { "name": "email", "type": "string", "required": true }
      ]
    }
  }
]`
  },
  {
    id: 'collections-create',
    group: 'Collections',
    method: 'POST',
    path: '/api/collections',
    title: 'Create a collection',
    description: 'Defines a new collection. Schema changes take effect live — no deploy, no migration for tenant data.',
    scope: 'write:collections',
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: 'Lowercase identifier, kebab or snake case, must start with a letter.' },
      { name: 'label', type: 'string', required: true, description: 'Human-readable display name.' },
      { name: 'description', type: 'string', description: 'Optional description shown in the admin UI.' },
      { name: 'schema', type: 'object', required: true, description: 'Field definitions — matches the Collection schema JSON.' }
    ],
    bodyExample: `{
  "name": "customers",
  "label": "Customers",
  "schema": {
    "fields": [
      { "name": "email", "type": "string", "required": true }
    ]
  }
}`,
    responseStatus: 201,
    responseExample: `{
  "id": "cmo...",
  "name": "customers"
}`
  },
  {
    id: 'collections-get',
    group: 'Collections',
    method: 'GET',
    path: '/api/collections/{name}',
    title: 'Get a collection',
    description: 'Returns a single collection by name.',
    scope: 'read:collections',
    pathParams: [{ name: 'name', type: 'string', required: true, description: 'Collection name.' }],
    responseStatus: 200,
    responseExample: `{
  "id": "cmo...",
  "name": "customers",
  "label": "Customers",
  "aiOptIn": false,
  "schema": { "fields": [ ... ] }
}`
  },
  {
    id: 'collections-update',
    group: 'Collections',
    method: 'PATCH',
    path: '/api/collections/{name}',
    title: 'Update a collection',
    description: 'Patch a collection schema, label, or AI opt-in. AI opt-in changes are audit-logged per POPIA policy.',
    scope: 'write:collections',
    pathParams: [{ name: 'name', type: 'string', required: true, description: 'Collection name.' }],
    bodyParams: [
      { name: 'label', type: 'string', description: 'New label.' },
      { name: 'description', type: 'string', description: 'New description.' },
      { name: 'aiOptIn', type: 'boolean', description: 'Enable AI for this collection (audit-logged).' },
      { name: 'schema', type: 'object', description: 'Full replacement schema.' }
    ],
    bodyExample: `{
  "label": "Customers (B2B)",
  "aiOptIn": true
}`,
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },

  // ── Records ──────────────────────────────────────────────────
  {
    id: 'records-list',
    group: 'Records',
    method: 'GET',
    path: '/api/collections/{name}/records',
    title: 'List records',
    description: 'Returns every record in the collection. Fields are merged onto the top level with `_createdAt` / `_updatedAt` metadata.',
    scope: 'read:records',
    pathParams: [{ name: 'name', type: 'string', required: true, description: 'Collection name.' }],
    responseStatus: 200,
    responseExample: `[
  {
    "id": "cmo...",
    "email": "alice@acme.com",
    "name": "Alice",
    "_createdAt": "2026-04-20T08:02:11.000Z",
    "_updatedAt": "2026-04-20T08:02:11.000Z"
  }
]`
  },
  {
    id: 'records-create',
    group: 'Records',
    method: 'POST',
    path: '/api/collections/{name}/records',
    title: 'Create a record',
    description: 'Insert a record. Body is validated against the collection schema — unknown or missing required fields return 400.',
    scope: 'write:records',
    pathParams: [{ name: 'name', type: 'string', required: true, description: 'Collection name.' }],
    bodyParams: [
      { name: '<field>', type: 'any', description: 'Any field defined on the collection schema. Body shape is dynamic per collection.' }
    ],
    bodyExample: `{
  "email": "alice@acme.com",
  "name": "Alice"
}`,
    responseStatus: 201,
    responseExample: `{ "id": "cmo..." }`
  },
  {
    id: 'records-get',
    group: 'Records',
    method: 'GET',
    path: '/api/collections/{name}/records/{id}',
    title: 'Get a record',
    description: 'Fetch a single record by id.',
    scope: 'read:records',
    pathParams: [
      { name: 'name', type: 'string', required: true, description: 'Collection name.' },
      { name: 'id', type: 'string', required: true, description: 'Record id.' }
    ],
    responseStatus: 200,
    responseExample: `{
  "id": "cmo...",
  "email": "alice@acme.com",
  "_createdAt": "2026-04-20T08:02:11.000Z",
  "_updatedAt": "2026-04-20T08:02:11.000Z"
}`
  },
  {
    id: 'records-update',
    group: 'Records',
    method: 'PATCH',
    path: '/api/collections/{name}/records/{id}',
    title: 'Update a record',
    description: 'Partial update of a record — only provided fields are written.',
    scope: 'write:records',
    pathParams: [
      { name: 'name', type: 'string', required: true, description: 'Collection name.' },
      { name: 'id', type: 'string', required: true, description: 'Record id.' }
    ],
    bodyParams: [{ name: '<field>', type: 'any', description: 'Subset of collection fields to update.' }],
    bodyExample: `{ "name": "Alice Alex" }`,
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },
  {
    id: 'records-delete',
    group: 'Records',
    method: 'DELETE',
    path: '/api/collections/{name}/records/{id}',
    title: 'Delete a record',
    description: 'Hard-delete a record. Not recoverable.',
    scope: 'write:records',
    pathParams: [
      { name: 'name', type: 'string', required: true, description: 'Collection name.' },
      { name: 'id', type: 'string', required: true, description: 'Record id.' }
    ],
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },

  // ── Pages ────────────────────────────────────────────────────
  {
    id: 'pages-list',
    group: 'Pages',
    method: 'GET',
    path: '/api/pages',
    title: 'List pages',
    description: 'Returns page metadata (excluding tree) ordered by last update.',
    scope: 'read:pages',
    responseStatus: 200,
    responseExample: `[
  { "id": "cmo...", "slug": "home", "title": "Home", "published": true, "updatedAt": "..." }
]`
  },
  {
    id: 'pages-create',
    group: 'Pages',
    method: 'POST',
    path: '/api/pages',
    title: 'Create a page',
    description: 'Creates a new page. `tree` defaults to an empty block list if omitted.',
    scope: 'write:pages',
    bodyParams: [
      { name: 'slug', type: 'string', required: true, description: 'URL-safe slug (lowercase, digits, dashes, slashes).' },
      { name: 'title', type: 'string', required: true, description: 'Page title.' },
      { name: 'tree', type: 'object', description: 'Block tree JSON.' },
      { name: 'published', type: 'boolean', description: 'Publish immediately (default: false).' }
    ],
    bodyExample: `{
  "slug": "pricing",
  "title": "Pricing",
  "published": false
}`,
    responseStatus: 201,
    responseExample: `{ "id": "cmo..." }`
  },
  {
    id: 'pages-get',
    group: 'Pages',
    method: 'GET',
    path: '/api/pages/{id}',
    title: 'Get a page',
    description: 'Full page payload including block tree.',
    scope: 'read:pages',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Page id.' }],
    responseStatus: 200,
    responseExample: `{
  "id": "cmo...",
  "slug": "home",
  "title": "Home",
  "tree": { "blocks": [] },
  "published": true
}`
  },
  {
    id: 'pages-update',
    group: 'Pages',
    method: 'PATCH',
    path: '/api/pages/{id}',
    title: 'Update a page',
    description: 'Patch any subset of page fields.',
    scope: 'write:pages',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Page id.' }],
    bodyParams: [
      { name: 'title', type: 'string', description: 'New title.' },
      { name: 'tree', type: 'object', description: 'Replacement block tree.' },
      { name: 'published', type: 'boolean', description: 'Publish flag.' }
    ],
    bodyExample: `{ "published": true }`,
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },
  {
    id: 'pages-delete',
    group: 'Pages',
    method: 'DELETE',
    path: '/api/pages/{id}',
    title: 'Delete a page',
    description: 'Removes the page and its block tree.',
    scope: 'write:pages',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Page id.' }],
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },

  // ── Blocks ───────────────────────────────────────────────────
  {
    id: 'blocks-list',
    group: 'Blocks',
    method: 'GET',
    path: '/api/blocks',
    title: 'List blocks',
    description: 'Returns custom block definitions ordered by name.',
    scope: 'read:blocks',
    responseStatus: 200,
    responseExample: `[
  { "id": "cmo...", "name": "hero", "label": "Hero" }
]`
  },
  {
    id: 'blocks-create',
    group: 'Blocks',
    method: 'POST',
    path: '/api/blocks',
    title: 'Create a block',
    description: 'Register a new custom block with its props schema and template.',
    scope: 'write:blocks',
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: 'Unique block identifier.' },
      { name: 'label', type: 'string', required: true, description: 'Display name in the block studio.' },
      { name: 'props', type: 'object', description: 'JSON schema of props accepted by the block.' },
      { name: 'template', type: 'string', description: 'Template source.' }
    ],
    bodyExample: `{
  "name": "hero",
  "label": "Hero",
  "props": {}
}`,
    responseStatus: 201,
    responseExample: `{ "id": "cmo..." }`
  },
  {
    id: 'blocks-get',
    group: 'Blocks',
    method: 'GET',
    path: '/api/blocks/{id}',
    title: 'Get a block',
    description: 'Returns full definition including props schema and template.',
    scope: 'read:blocks',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Block id.' }],
    responseStatus: 200,
    responseExample: `{ "id": "cmo...", "name": "hero", "label": "Hero", "props": {}, "template": "..." }`
  },
  {
    id: 'blocks-update',
    group: 'Blocks',
    method: 'PATCH',
    path: '/api/blocks/{id}',
    title: 'Update a block',
    description: 'Patch block definition.',
    scope: 'write:blocks',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Block id.' }],
    bodyParams: [
      { name: 'label', type: 'string', description: 'New label.' },
      { name: 'props', type: 'object', description: 'Replacement props schema.' },
      { name: 'template', type: 'string', description: 'Replacement template.' }
    ],
    bodyExample: `{ "label": "Hero (v2)" }`,
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },
  {
    id: 'blocks-delete',
    group: 'Blocks',
    method: 'DELETE',
    path: '/api/blocks/{id}',
    title: 'Delete a block',
    description: 'Remove the block definition.',
    scope: 'write:blocks',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Block id.' }],
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },

  // ── Themes ───────────────────────────────────────────────────
  {
    id: 'themes-list',
    group: 'Themes',
    method: 'GET',
    path: '/api/themes',
    title: 'List themes',
    description: 'Returns theme tokens (palette, typography, radii) for every theme.',
    scope: 'read:themes',
    responseStatus: 200,
    responseExample: `[
  { "id": "cmo...", "name": "FDL-Create default", "tokens": { "colors": { ... } } }
]`
  },
  {
    id: 'themes-create',
    group: 'Themes',
    method: 'POST',
    path: '/api/themes',
    title: 'Create a theme',
    description: 'Create a new theme preset. Tokens map to the shared design system.',
    scope: 'write:themes',
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: 'Display name.' },
      { name: 'tokens', type: 'object', required: true, description: 'Design-token object (colors, typography, radii, shadows).' }
    ],
    bodyExample: `{
  "name": "Midnight",
  "tokens": { "colors": { "accent": "#7c3aed" } }
}`,
    responseStatus: 201,
    responseExample: `{ "id": "cmo..." }`
  },
  {
    id: 'themes-get',
    group: 'Themes',
    method: 'GET',
    path: '/api/themes/{id}',
    title: 'Get a theme',
    description: 'Full theme payload including token tree.',
    scope: 'read:themes',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Theme id.' }],
    responseStatus: 200,
    responseExample: `{ "id": "cmo...", "name": "FDL-Create default", "tokens": { ... } }`
  },
  {
    id: 'themes-update',
    group: 'Themes',
    method: 'PATCH',
    path: '/api/themes/{id}',
    title: 'Update a theme',
    description: 'Patch theme name or token tree.',
    scope: 'write:themes',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Theme id.' }],
    bodyParams: [
      { name: 'name', type: 'string', description: 'New display name.' },
      { name: 'tokens', type: 'object', description: 'Replacement token tree.' }
    ],
    bodyExample: `{ "name": "Midnight (v2)" }`,
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },
  {
    id: 'themes-delete',
    group: 'Themes',
    method: 'DELETE',
    path: '/api/themes/{id}',
    title: 'Delete a theme',
    description: 'Remove the theme preset.',
    scope: 'write:themes',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Theme id.' }],
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  },

  // ── Management / Tokens ──────────────────────────────────────
  {
    id: 'tokens-list',
    group: 'Management',
    method: 'GET',
    path: '/api/v1/tokens',
    title: 'List personal access tokens',
    description: 'Returns tokens owned by the calling user. Full token string and hash are never returned — only the 12-char prefix.',
    scope: 'admin',
    responseStatus: 200,
    responseExample: `[
  {
    "id": "cmo...",
    "name": "CI deploy key",
    "prefix": "lat_AbCd1234",
    "scopes": ["read:collections", "write:records"],
    "lastUsedAt": "2026-04-20T07:30:11.000Z",
    "expiresAt": null,
    "revokedAt": null,
    "createdAt": "2026-04-19T09:15:00.000Z"
  }
]`
  },
  {
    id: 'tokens-create',
    group: 'Management',
    method: 'POST',
    path: '/api/v1/tokens',
    title: 'Create a personal access token',
    description: 'Issues a new token. The full token is returned once in the response body and never shown again — store it immediately.',
    scope: 'admin',
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: 'Label for the token (used in audit logs).' },
      { name: 'scopes', type: 'string[]', required: true, description: 'Scope list, e.g. `["read:collections","write:records"]`. `admin` grants every scope.' },
      { name: 'expiresInDays', type: 'number | null', description: 'Expiry in days. Omit or null for a token that never expires.' }
    ],
    bodyExample: `{
  "name": "CI deploy key",
  "scopes": ["read:collections", "write:records"],
  "expiresInDays": 90
}`,
    responseStatus: 201,
    responseExample: `{
  "id": "cmo...",
  "prefix": "lat_AbCd1234",
  "token": "lat_AbCd1234EfGh5678IjKl..."
}`
  },
  {
    id: 'tokens-revoke',
    group: 'Management',
    method: 'DELETE',
    path: '/api/v1/tokens/{id}',
    title: 'Revoke a token',
    description: 'Soft-revokes a token by setting `revokedAt`. The token remains in the database so historical log entries can still resolve its name.',
    scope: 'admin',
    pathParams: [{ name: 'id', type: 'string', required: true, description: 'Token id.' }],
    responseStatus: 200,
    responseExample: `{ "ok": true }`
  }
];

export const API_GROUPS = [
  'Collections',
  'Records',
  'Pages',
  'Blocks',
  'Themes',
  'Management'
] as const;

export function findEndpoint(id: string | undefined): Endpoint {
  if (!id) return API_ENDPOINTS[0];
  return API_ENDPOINTS.find((e) => e.id === id) ?? API_ENDPOINTS[0];
}
