# @tilcayo/ui

Small React primitives with native HTML props and Tilcayo classes. Import
`@tilcayo/styles` once in your application. No Redux or visual framework is needed.

```tsx
import '@tilcayo/styles';
import { Button, FormField, Input } from '@tilcayo/ui';

<FormField label="Title" hint="Choose a short title">
  {props => <Input {...props} name="title" required />}
</FormField>
<Button type="submit">Save</Button>
```

Exports: Button, Input, Select, Textarea, Card, Alert, Badge, Table, Spinner,
FormField, Modal and Pagination. Buttons default to `type="button"`; inputs
forward refs. Table accepts semantic caption/thead/tbody children. FormField
connects label, hint and errors through its render callback. Alert defaults to
`role="alert"`; use `role="status"` for nonurgent messages.

Modal uses the native dialog API for keyboard focus containment and restoration.
Control `open` and set it false in `onClose`. Pagination uses one-based pages
and accepts zero total pages for an empty result. Neither component owns API state.

The interactive Elements library includes 36 reusable React/TypeScript examples
across actions, inputs, choices, forms, feedback, cards, navigation, overlays and
tables. Each preview runs the same source shown by its independent code toggle.
Copied examples include their imports and the `@tilcayo/styles/index.css` import;
install `react`, `react-dom`, `@tilcayo/ui` and `@tilcayo/styles` in the consuming app.

Additional exports: IconButton, LoadingButton, PasswordInput, Checkbox,
RadioGroup, Switch, EmptyState, StatCard, Divider, Tabs, Breadcrumbs,
DropdownMenu, ConfirmDialog, ToastProvider and useToast. Wrap toast consumers in
ToastProvider. Tabs and DropdownMenu support keyboard navigation; ConfirmDialog
uses Modal for focus containment and restoration. Examples use local state and
demonstrate form validation without sending account or API mutations.


Reusable loading components: `Skeleton`, `SkeletonGroup`, `TableSkeleton`,
`CardsSkeleton`, `ListSkeleton`, `FormSkeleton` and `PageSkeleton`. Import
`@tilcayo/styles/index.css` once. Each composed pattern has an accessible loading
label; visual placeholders are hidden from screen readers and respect reduced
motion. `PageSkeleton` supports `admin`, `page`, `auth` and `content` layouts.

```tsx
import { TableSkeleton } from '@tilcayo/ui';

// Preserve existing rows during background refreshes.
return !data && isFetching
  ? <TableSkeleton rows={5} columns={4} label="Loading products" />
  : <ProductTable products={data?.items ?? []} />;
```

## File uploads

`FileUpload` is a single-file drag-and-drop and keyboard-accessible picker. Set `accept`, `maxBytes`, `label`, `description`, and `onUpload(file, { signal, onProgress })`. It provides image previews, progress, cancellation, retry and validation feedback. Always validate again on the backend. In an auth app, pass `useAuth().uploadAvatar` for the built-in Cloudinary avatar flow; Elements uses explicitly labelled local simulations.
