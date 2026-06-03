# Ozef

Opinionated Zod-empowered forms for React.

Ozef builds a typed form component from a Zod object schema. It owns form state,
validation state, submit state, and field wiring while letting you bring your own
inputs, buttons, labels, and layout.

## Install

```bash
npm i ozef zod jotai
```

Ozef expects React, React DOM, Jotai, and Zod to be installed by the app. The
current peer range targets Zod 4.

## Supported Schemas

Ozef currently supports this practical Zod subset:

- `z.string()`
- `z.number()`
- `z.boolean()`
- `z.enum(["a", "b"])` for radio groups
- `z.union([z.literal("a"), z.literal("b")])` for native selects
- `.optional()`, `.nullable()`, and `.default()` wrappers around the above

Other Zod types may work only if they behave like one of those primitives, but
they are not part of the supported API yet.

## Basic Usage

```tsx
import ozef from "ozef";
import { z } from "zod";

const ProfileForm = ozef({
  schema: z.object({
    name: z.string().min(2, "Name is too short"),
    age: z.number().min(1),
    newsletter: z.boolean(),
  }),
  defaults: {
    name: "Ada",
    age: 36,
    newsletter: true,
  },
});

export function Profile() {
  return (
    <ProfileForm
      onSubmit={async (data) => {
        // data is typed as { name: string; age: number; newsletter: boolean }
        await saveProfile(data);
      }}
    >
      <ProfileForm.Field name="name" />
      <ProfileForm.Error name="name" />

      <ProfileForm.Field name="age" />
      <ProfileForm.Error name="age" />

      <ProfileForm.Field name="newsletter" />

      <ProfileForm.Submit>Save</ProfileForm.Submit>
    </ProfileForm>
  );
}
```

The `name`-based API works with any schema key, including keys like
`first_name`, `billing.email`, or keys you only know dynamically.

## PascalCase Sugar

Ozef also generates PascalCase components for simple schemas:

```tsx
<ProfileForm.Field.Name />
<ProfileForm.Error.Name />
<ProfileForm.Field.Age />
```

Use this when the schema keys are friendly component names. Use
`<Form.Field name="...">` when keys are dynamic or not valid component-looking
identifiers.

## Radio And Select Fields

Use `z.enum` for radio values:

```tsx
const SettingsForm = ozef({
  schema: z.object({
    size: z.enum(["small", "large"]),
  }),
});

<SettingsForm.Field name="size">
  <SettingsForm.Radio name="size" value="small" />
  <SettingsForm.Radio name="size" value="large" />
</SettingsForm.Field>;
```

Use a union of string literals for native selects:

```tsx
const ColorForm = ozef({
  schema: z.object({
    color: z.union([z.literal("red"), z.literal("blue")]),
  }),
});

<ColorForm.Field name="color">
  <ColorForm.Option name="color" value="red" />
  <ColorForm.Option name="color" value="blue" />
</ColorForm.Field>;
```

The generated PascalCase version still works:

```tsx
<ColorForm.Field.Color>
  <ColorForm.Field.Color.Red />
  <ColorForm.Field.Color.Blue />
</ColorForm.Field.Color>
```

## Custom Inputs

Ozef passes two useful props to custom components:

- `field`: typed field state and helpers
- `inputProps`: safe props to spread onto the native input/select/radio

```tsx
import type { OzefInputProps } from "ozef";

type TextInputProps = OzefInputProps & {
  label: string;
};

function TextInput({ label, field, inputProps }: TextInputProps) {
  return (
    <label>
      {label}
      <input
        {...inputProps}
        aria-invalid={field?.invalid}
        className={field?.invalid ? "input input-error" : "input"}
      />
      {field?.error ? <span>{field.error}</span> : null}
    </label>
  );
}

const LoginForm = ozef({
  schema: z.object({
    email: z.string().email(),
  }),
  Input: TextInput,
});

<LoginForm.Field name="email" label="Email" />;
```

Legacy metadata props like `errorful` and `radioValue` are still passed for
existing custom inputs, but new components should prefer `field.invalid`,
`field.error`, and `inputProps`.

## Hooks

Use `Form.useField(name)` when composing custom field UI:

```tsx
function EmailPreview() {
  const email = LoginForm.useField("email");

  return (
    <button type="button" onClick={() => email.setValue("ada@example.com")}>
      Use {email.value || "default email"}
    </button>
  );
}
```

Use `Form.useForm()` for form-level controls:

```tsx
function FormToolbar() {
  const form = LoginForm.useForm();

  return (
    <>
      <button type="button" onClick={form.reset}>
        Reset
      </button>
      <button
        type="button"
        onClick={() => form.setError("email", "Email is already taken")}
      >
        Set server error
      </button>
      {form.submitting ? "Saving..." : null}
    </>
  );
}
```

## Submit Errors

`onSubmit` receives utility helpers. Use `setError` for server-side errors:

```tsx
const AccountForm = ozef({
  schema: z.object({
    email: z.string().email(),
  }),
});

<AccountForm
  onSubmit={async (data, utils) => {
    const result = await createAccount(data);

    if (!result.ok) {
      utils.setError("email", "Email is already taken");
      utils.setError("submission", "Please fix the highlighted fields");
    }
  }}
>
  <AccountForm.Field name="email" />
  <AccountForm.Error name="email" />
  <AccountForm.Error name="submission" />
  <AccountForm.Submit>Create account</AccountForm.Submit>
</AccountForm>;
```

Render every visible error with:

```tsx
<AccountForm.Errors />
```

## Examples

See `examples/vite-react` for a minimal Vite app using the current recommended
API with custom inputs, hooks, field errors, and submit errors.
