# MongoDB relationships (M9.5)

Generate related resources inside your application directory:

```sh
tilcayo make:resource Author name:string
tilcayo make:resource Book title:string "year:number?" author:ref:Author
tilcayo make:resource Tag name:string
tilcayo make:resource Article title:string author:ref:Author tags:refs:Tag
```

Register each generated route module with `app.routes()`, as printed by the CLI.
Models retain singular PascalCase filenames (`src/models/Book.ts`); controllers,
validators, routes and services use the existing plural filenames.

| Field syntax | Meaning |
| --- | --- |
| `author:ref:Author` | Required Author ObjectId |
| `author:ref:Author?` | Optional Author ObjectId |
| `tags:refs:Tag` | Required array of Tag ObjectIds; an empty array is valid |
| `tags:refs:Tag?` | Optional array of Tag ObjectIds |

Quote fields containing `?` if your shell expands wildcards. Target names must
start with an uppercase ASCII letter and contain only letters and digits. Use the
registered model's exact singular name, such as `Tag`, not its collection name.
The generator does not discover, import or create target models for you.
`make:model` also accepts these relationship fields.

Primitive fields remain `field:string`, `field:number`, `field:boolean` and
`field:date`. Every primitive accepts a trailing `?`, such as `year:number?`;
the existing `year?:number` form also works.

## Generated schema and validation

The schema remains wrapped with Tilcayo's `mongoModel` helper. For example:

```ts
author: { type: mongoose.Schema.Types.ObjectId, ref: "Author", required: true },
tags: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  default: undefined,
  required: true,
},
```

Optional relations use `required: false`. Arrays use `default: undefined` to
preserve omission rather than silently adding an empty array.

Generated Zod validators share a small helper:

```ts
const objectIdValidator = (model: string) => z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  { message: `Invalid ${model} id` },
);
// Inside createBookSchema / createArticleSchema:
author: objectIdValidator("Author"),
tags: z.array(objectIdValidator("Tag")),
```

Optional fields append `.optional()`. Update schemas continue to use
`createBookSchema.partial()`. Invalid IDs receive HTTP 422 with the field path
(including the array index for an invalid member), before database writes.
Service write functions convert validated strings into ObjectIds, preserving the
model's inferred ObjectId types. Date fields still become JavaScript Dates.

These are **Mongoose references, not SQL foreign keys**. Validation checks ID
shape without database queries. A valid ObjectId pointing to a missing document
is accepted. Enforce existence explicitly in service/business logic when needed.
No cascade deletion or recursive population is generated.

## Explicit population

A resource with references also creates `src/services/books.service.ts` (or its
resource equivalent), and its controller delegates CRUD to standalone functions.
The fifth service target participates in the same collision preflight as the
other four files. Primitive-only resources retain their four-file output.

```ts
import { getBooks, getBookById } from "./services/books.service.js";

await getBooks(); // ObjectIds; no population
await getBooks({ populate: ["author"] });
await getBookById(id, { populate: ["author"] });
```

`BookRelation = "author"` and `BookQueryOptions` restrict population paths at
compile time. Article's union is `"author" | "tags"`. The services also export
`createBook`, `updateBook`, and `deleteBook`. Controllers retain `index`, `store`,
`show`, `update`, and `destroy` and do not populate by default.

Load the referenced models in application startup before using populate, for
example by registering the generated Author and Tag routes, which import their
models. Mongoose must have registered the referenced model names. No target-model
import is needed in Book's schema itself.

Population options are for developer-written service calls. HTTP query strings
such as `?populate=author` are not forwarded. Read result types retain Mongoose's
schema-inferred types; the relation union checks paths, not the populated target
document shape. Use Mongoose's typed raw query API when you need a typed target
projection.

## Verification

After building the workspace:

```sh
node --test tests/cli-generators.test.mjs tests/relationships.test.mjs
node --env-file=.env --test tests/relationships.test.mjs
```

The first command covers primitive regressions, malformed declarations, all four
relation forms, five-target collision protection, generated TypeScript
compilation, HTTP validation, ObjectId conversion and explicit population calls.
The second runs the live MongoDB test when `MONGODB_URI` is set: it creates a
uniquely named test database and removes only that database afterward. It checks
author/book and tag/article creation, optional relations, populated documents,
updates, missing target documents, invalid IDs and the absence of cascades.

M10 publishing/release work is outside this milestone.
