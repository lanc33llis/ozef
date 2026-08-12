# Ozef Consumer Guide

This guidance applies to code using the installed `ozef` package.

## Golden Path

Create one form factory from a Zod object schema, then render its generated
components inside the form:

```tsx
import ozef from "ozef";
import { z } from "zod";

const LoginForm = ozef({
  schema: z.object({
    email: z.email(),
    rememberMe: z.boolean(),
  }),
});

export function Login() {
  return (
    <LoginForm onSubmit={(data) => authenticate(data)}>
      <LoginForm.Field name="email" />
      <LoginForm.Error name="email" />
      <LoginForm.Field name="rememberMe" />
      <LoginForm.Submit>Sign in</LoginForm.Submit>
    </LoginForm>
  );
}
```

Use `z.object()`, `z.strictObject()`, or `z.looseObject()` at the root. Ozef
derives field names, submitted data, defaults, and helpers from the schema.

## Fields

- Prefer `<Form.Field name="fieldName" />` and
  `<Form.Error name="fieldName" />`; these work with every schema key.
- PascalCase members such as `<Form.Field.Email />` and
  `<Form.Error.Email />` are convenience aliases for simple static keys.
- Use `z.enum()` for radio groups and a union of string literals for native
  selects. Render choices with `Form.Radio`/`Form.Option` or their generated
  PascalCase aliases.
- Use `Form.useField(name)` for composed field UIs and `Form.useForm()` for
  form-level controls. Keep these hooks inside descendants of the form.

Ozef infers these native input types from Zod 4 string formats:

| Zod schema                 | Native input             |
| -------------------------- | ------------------------ |
| `z.email()`                | `email`                  |
| `z.url()` or `z.httpUrl()` | `url`                    |
| `z.e164()`                 | `tel`                    |
| `z.iso.date()`             | `date`                   |
| `z.iso.time()`             | `time` with `step="any"` |

Equivalent chained `z.string()` validators and optional, nullable, or default
wrappers receive the same input type. UUIDs, GUIDs, template literals, and ISO
datetimes remain text inputs.

## Custom Components

Ozef owns form state and Zod validation; a custom component owns markup and
styling. Choose the slot that matches the control:

| Slot         | Scope                             | Typical integration                                            |
| ------------ | --------------------------------- | -------------------------------------------------------------- |
| `Input`      | Text, number, and checkbox fields | Native input, shadcn `Input`, or a branch to shadcn `Checkbox` |
| `InputRadio` | One generated radio item          | Native-style radio item                                        |
| `Select`     | The complete select control       | shadcn/Radix `Select`                                          |
| `Option`     | One native option                 | Native selects only                                            |
| `Error`      | Generated error output            | Alert or design-system field message                           |
| `Submit`     | Generated submit control          | shadcn or custom button                                        |

Field-like slots receive:

- `field`: `name`, `value`, `error`, `invalid`, `touched`, `required`,
  `setValue(nextValue)`, and `touch()`.
- `inputProps`: the native props Ozef would render, including its inferred
  `type`, current value or checked state, accessibility attributes, and wired
  `onChange`/`onBlur` handlers.

Use one of these adapter patterns:

- **Native-compatible:** remove custom-only props and spread `inputProps` onto
  the native element or shadcn `Input`. Its handlers already update, validate,
  and touch the Ozef field.
- **Controlled composite:** for shadcn `Checkbox`, `Select`, or `RadioGroup`,
  do not spread native event handlers. Map `field.value` into `checked` or
  `value`, call `field.setValue()` from the component's change callback, and
  call `field.touch()` after interaction.

A native-style adapter looks like this:

```tsx
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type AppInputProps = OzefInputProps & { label: string };

function AppInput({ label, field, inputProps }: AppInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};

  return (
    <div>
      <label htmlFor={nativeInputProps.id}>{label}</label>
      <input {...nativeInputProps} />
      {field?.error ? <p role="alert">{field.error}</p> : null}
    </div>
  );
}

const Form = ozef({
  schema: z.object({ email: z.email() }),
  Input: AppInput,
});

<Form>
  <Form.Field name="email" id="email" label="Email" />
  <Form.Submit>Save</Form.Submit>
</Form>;
```

Do not spread the custom component's complete props object onto the DOM. Ozef
metadata and custom props such as `label` would leak as invalid DOM attributes.
Custom props also appear inside `inputProps`, so remove them as shown above.

For shadcn:

- Spread `inputProps` onto `Input`.
- Adapt `Checkbox` with `checked={field.value === true}` and
  `onCheckedChange={(value) => field.setValue(value === true)}`.
- Replace the `Select` slot for a shadcn Select; map `field.value` and
  `onValueChange`, and render `SelectItem` inside the adapter instead of using
  `Form.Option`.
- Build a shadcn `RadioGroup` with `Form.useField(name)`; `InputRadio` is
  item-level and does not replace the group root.
- Use `Submit` for shadcn `Button`; it receives `submitting` and a disabled
  state.
- Render an error either inline with `field.error` or through
  `<Form.Error name="..." />`, not both.

When a controlled component changes, `field.setValue()` validates immediately,
while `field.touch()` makes validation feedback visible. Preserve `name`,
`id`, `disabled`, `required`, `aria-invalid`, and `aria-describedby`
when translating native props into a composite control.

## Constraints

- Install Zod `^4.4.3`, React/React DOM `^19.2.0`, and Jotai `^2.4.2` alongside
  Ozef.
- Ozef validates each field with its Zod schema before submission. Treat Zod as
  the source of truth rather than duplicating validation in event handlers.
- Import only from `ozef`; do not depend on internal files or `dist` paths.
- When changing a form, test successful submission, invalid input behavior, and
  any custom component adapter contract.
