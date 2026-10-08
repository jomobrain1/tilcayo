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
