import type { ResourceNames } from "../utils/naming.js";
import type { ResourceField } from "../utils/fields.js";
import { frontendTypesTemplate } from "./frontendTypes.js";

export interface GeneratedSource { folder: string; name: string; source: string }

function formField(field: ResourceField): string {
  const label = field.name.replace(/([A-Z])/g, " $1");
  const required = field.optional ? "" : " required";
  if (field.kind === "primitive" && field.type === "boolean") {
    return `      <label><input name="${field.name}" type="checkbox" defaultChecked={initial?.${field.name} ?? false} /> ${label}</label>`;
  }
  const type = field.kind === "primitive" && field.type === "number" ? "number" : field.kind === "primitive" && field.type === "date" ? "datetime-local" : "text";
  const value = field.kind === "reference" && field.many ? `initial?.${field.name}?.join(', ') ?? ''` : type === "datetime-local" ? `localDate(initial?.${field.name})` : `initial?.${field.name} ?? ''`;
  return `      <FormField id="${field.name}" label="${label}${field.kind === "reference" && field.many ? " (comma-separated IDs)" : ""}">
        {props => <Input {...props} name="${field.name}" type="${type}"${type === "number" ? ' step="any"' : ""}${required} defaultValue={${value}} />}
      </FormField>`;
}

function formValue(field: ResourceField): string {
  const raw = `String(form.get('${field.name}') ?? '').trim()`;
  const expression = field.kind === "reference" ? field.many ? `${raw}.split(',').map(value => value.trim()).filter(Boolean)` : raw : field.type === "boolean" ? `form.has('${field.name}')` : field.type === "number" ? `Number(${raw})` : field.type === "date" ? `new Date(${raw}).toISOString()` : raw;
  const assignment = `input.${field.name} = ${expression};`;
  return field.optional && !(field.kind === "primitive" && field.type === "boolean") ? `    if (${raw}) ${assignment}` : `    ${assignment}`;
}

export function frontendFiles(names: ResourceNames, fields: ResourceField[]): GeneratedSource[] {
  const entity = names.model;
  const plural = names.pluralPascal;
  const slug = names.plural.toLowerCase();
  const singular = names.singular.toLowerCase();
  const folder = `features/${slug}`;
  const file = (subfolder: string, name: string, source: string): GeneratedSource => ({ folder: subfolder ? `${folder}/${subfolder}` : folder, name, source });
  return [
    file('', `${slug}.types.ts`, frontendTypesTemplate(names, fields)),
    file('', `${slug}.api.ts`, `import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';
import type { ${entity}, Create${entity}Input, Update${entity}Input } from './${slug}.types';

export const ${singular}Api = tilcayoApi.enhanceEndpoints({ addTagTypes: ['${entity}'] }).injectEndpoints({
  endpoints: builder => ({
    get${plural}: builder.query<TilcayoResponse<${entity}[]>, void>({
      query: () => ({ url: '/${slug}' }),
      providesTags: result => [{ type: '${entity}', id: 'LIST' }, ...(result?.data ?? []).map(item => ({ type: '${entity}' as const, id: item._id }))],
    }),
    get${entity}: builder.query<TilcayoResponse<${entity}>, string>({
      query: id => ({ url: '/${slug}/' + encodeURIComponent(id) }),
      providesTags: (_result, _error, id) => [{ type: '${entity}', id }],
    }),
    create${entity}: builder.mutation<TilcayoResponse<${entity}>, Create${entity}Input>({
      query: body => ({ url: '/${slug}', method: 'POST', body }),
      invalidatesTags: [{ type: '${entity}', id: 'LIST' }],
    }),
    update${entity}: builder.mutation<TilcayoResponse<${entity}>, { id: string; changes: Update${entity}Input }>({
      query: ({ id, changes }) => ({ url: '/${slug}/' + encodeURIComponent(id), method: 'PUT', body: changes }),
      invalidatesTags: (_result, _error, { id }) => [{ type: '${entity}', id }, { type: '${entity}', id: 'LIST' }],
    }),
    delete${entity}: builder.mutation<null, string>({
      query: id => ({ url: '/${slug}/' + encodeURIComponent(id), method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: '${entity}', id }, { type: '${entity}', id: 'LIST' }],
    }),
  }),
});

export const { useGet${plural}Query, useGet${entity}Query, useCreate${entity}Mutation, useUpdate${entity}Mutation, useDelete${entity}Mutation } = ${singular}Api;
`),
    file('components', `${singular}-form.tsx`, `import { useState, type FormEvent } from 'react';
import { Button${fields.some(field => !(field.kind === "primitive" && field.type === "boolean")) ? ', FormField, Input' : ''} } from '@tilcayo/ui';
import type { Create${entity}Input } from '../${slug}.types';
import { errorMessage } from '../${slug}.feedback';

interface Props {
  initial?: Create${entity}Input;
  busy: boolean;
  onSave: (input: Create${entity}Input) => Promise<void>;
}
${fields.some(field => field.kind === "primitive" && field.type === "date") ? `
function localDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
` : ''}

export function ${entity}Form({ initial, busy, onSave }: Props) {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const input = {} as Create${entity}Input;
${fields.map(formValue).join('\n')}
      await onSave(input);
    } catch (cause) { setError(errorMessage(cause)); }
  }
  return <form className="tl-stack" onSubmit={submit}>
    {error && <p className="tl-alert tl-alert-danger" role="alert">{error}</p>}
    <fieldset className="tl-stack" disabled={busy}>
      <legend>${entity} details</legend>
${fields.map(formField).join('\n')}
      <Button type="submit">{busy ? 'Saving...' : 'Save'}</Button>
    </fieldset>
  </form>;
}
`),
    file('', `${slug}.feedback.ts`, `export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Unable to complete the request. Please try again.';
}
`),
    file('pages', `${slug}.page.tsx`, `import { Link } from 'react-router';
import { Table } from '@tilcayo/ui';
import { useGet${plural}Query } from '../${slug}.api';
import { errorMessage } from '../${slug}.feedback';

export function ${plural}Page({ basePath = '/${slug}' }: { basePath?: string }) {
  const { data, isLoading, error, refetch } = useGet${plural}Query();
  if (isLoading) return <p role="status">Loading ${slug}...</p>;
  if (error) return <section><p role="alert">{errorMessage(error)}</p><button className="tl-btn" onClick={() => void refetch()}>Retry</button></section>;
  return <section className="tl-stack">
    <h1>${plural}</h1>
    <Link className="tl-btn tl-btn-primary" to={basePath + '/new'}>Create ${singular}</Link>
    {!data?.data.length ? <p>No ${slug} yet.</p> : <Table>
      <caption>${plural}</caption>
      <thead><tr><th scope="col">ID</th>${fields.map(field => `<th scope="col">${field.name}</th>`).join('')}<th scope="col">Actions</th></tr></thead>
      <tbody>{data.data.map(item => <tr key={item._id}><td>{item._id}</td>${fields.map(field => `<td>{String(item.${field.name} ?? '')}</td>`).join('')}<td><Link to={basePath + '/' + encodeURIComponent(item._id)}>View</Link></td></tr>)}</tbody>
    </Table>}
  </section>;
}
`),
    file('pages', `${singular}.page.tsx`, `import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useGet${entity}Query, useDelete${entity}Mutation } from '../${slug}.api';
import { errorMessage } from '../${slug}.feedback';

export function ${entity}Page({ basePath = '/${slug}' }: { basePath?: string }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGet${entity}Query(id, { skip: !id });
  const [remove, { isLoading: deleting }] = useDelete${entity}Mutation();
  const [deleteError, setDeleteError] = useState('');
  async function destroy() {
    if (!window.confirm('Delete this ${singular}?')) return;
    try { await remove(id).unwrap(); navigate(basePath); }
    catch (cause) { setDeleteError(errorMessage(cause)); }
  }
  if (isLoading) return <p role="status">Loading ${singular}...</p>;
  if (error) return <p role="alert">{errorMessage(error)}</p>;
  if (!data) return <p>${entity} not found.</p>;
  const item = data.data;
  return <section className="tl-stack">
    <h1>${entity}</h1>
    <dl>${fields.map(field => `<dt>${field.name}</dt><dd>{String(item.${field.name} ?? '')}</dd>`).join('')}</dl>
    {deleteError && <p role="alert">{deleteError}</p>}
    <Link to={basePath}>Back to ${slug}</Link>
    <Link to={basePath + '/' + encodeURIComponent(id) + '/edit'}>Edit</Link>
    <button className="tl-btn tl-btn-danger" disabled={deleting} onClick={() => void destroy()}>{deleting ? 'Deleting...' : 'Delete'}</button>
  </section>;
}
`),
    file('pages', `create-${singular}.page.tsx`, `import { useNavigate } from 'react-router';
import { useCreate${entity}Mutation } from '../${slug}.api';
import { ${entity}Form } from '../components/${singular}-form';

export function Create${entity}Page({ basePath = '/${slug}' }: { basePath?: string }) {
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreate${entity}Mutation();
  return <section className="tl-stack"><h1>Create ${singular}</h1>
    <${entity}Form busy={isLoading} onSave={async input => {
      const result = await create(input).unwrap();
      navigate(basePath + '/' + encodeURIComponent(result.data._id));
    }} />
  </section>;
}
`),
    file('pages', `edit-${singular}.page.tsx`, `import { useNavigate, useParams } from 'react-router';
import { useGet${entity}Query, useUpdate${entity}Mutation } from '../${slug}.api';
import { ${entity}Form } from '../components/${singular}-form';
import { errorMessage } from '../${slug}.feedback';

export function Edit${entity}Page({ basePath = '/${slug}' }: { basePath?: string }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGet${entity}Query(id, { skip: !id });
  const [update, { isLoading: saving }] = useUpdate${entity}Mutation();
  if (isLoading) return <p role="status">Loading ${singular}...</p>;
  if (error) return <p role="alert">{errorMessage(error)}</p>;
  if (!data) return <p>${entity} not found.</p>;
  return <section className="tl-stack"><h1>Edit ${singular}</h1>
    <${entity}Form key={id} initial={data.data} busy={saving} onSave={async changes => {
      await update({ id, changes }).unwrap();
      navigate(basePath + '/' + encodeURIComponent(id));
    }} />
  </section>;
}
`),
    file('', `${slug}.routes.tsx`, `import type { RouteObject } from 'react-router';
import { ${plural}Page } from './pages/${slug}.page';
import { ${entity}Page } from './pages/${singular}.page';
import { Create${entity}Page } from './pages/create-${singular}.page';
import { Edit${entity}Page } from './pages/edit-${singular}.page';

// Pass ('books', '/admin/books') when nesting under the admin layout.
export function create${plural}Routes(path = '${slug}', basePath = '/${slug}'): RouteObject[] {
  return [{ path, children: [
    { index: true, element: <${plural}Page basePath={basePath} /> },
    { path: 'new', element: <Create${entity}Page basePath={basePath} /> },
    { path: ':id', element: <${entity}Page basePath={basePath} /> },
    { path: ':id/edit', element: <Edit${entity}Page basePath={basePath} /> },
  ] }];
}

export const ${slug}Routes = create${plural}Routes();
`),
  ];
}
