# Ozef

Opinionated Zod-empowered forms for React.

Ozef builds a typed form component from a `z.object()`, `z.strictObject()`, or
`z.looseObject()` schema. It owns form state, validation state, submit state, and
field wiring while letting you bring your own inputs, buttons, labels, and
layout.

## Install

```bash
npm i ozef zod jotai
```

Ozef expects React, React DOM, Jotai, and Zod to be installed by the app. The
current peer range targets Zod 4.

## Supported Schemas

Ozef currently supports this practical Zod subset:

- `z.string()`
- `z.templateLiteral()`
- `z.number()`
- `z.boolean()`
- `z.enum(["a", "b"])` for radio groups
- `z.union([z.literal("a"), z.literal("b")])` for native selects
- `.optional()`, `.nullable()`, and `.default()` wrappers around the above

Ozef infers native input types from these Zod string formats, including their
equivalent chained `z.string()` validators:

| Zod format                  | Native input                    |
| --------------------------- | ------------------------------- |
| `z.email()`                 | `type="email"`                  |
| `z.url()` and `z.httpUrl()` | `type="url"`                    |
| `z.e164()`                  | `type="tel"`                    |
| `z.iso.date()`              | `type="date"`                   |
| `z.iso.time()`              | `type="time"` with `step="any"` |

Other string formats—including `z.uuid()`, `z.guid()`, and
`z.iso.datetime()`—render as `type="text"`. A native `datetime-local` input
does not accept the timezone suffix required by Zod's default ISO datetime
schema.

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

## Custom Components

Ozef owns form state and validation; your component owns the markup and visual
design. A custom component should use one of two integration patterns:

1. **Native-compatible controls**—such as a plain `<input>` or shadcn
   `Input`—spread Ozef's `inputProps`. Those props already contain the current
   value, inferred type, accessibility state, and wired `onChange`/`onBlur`
   handlers.
2. **Controlled composite controls**—such as shadcn `Checkbox`, `Select`, or
   `RadioGroup`—translate `field.value`, `field.setValue()`, and
   `field.touch()` into that component's API.

### Slots and responsibilities

| Ozef option  | Replaces                                         | Use it for                                                       |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| `Input`      | Every generated text, number, and checkbox field | Native inputs, shadcn `Input`, and a branch to shadcn `Checkbox` |
| `InputRadio` | Each generated radio item                        | A native-style radio item; not a `RadioGroup` root               |
| `Select`     | The complete generated native select             | shadcn/Radix `Select` or another controlled select               |
| `Option`     | Each native `<option>`                           | Styling/wrapping native selects only                             |
| `Error`      | `Form.Error` and `Form.Errors` output            | Design-system error text                                         |
| `Submit`     | `Form.Submit`                                    | Design-system buttons and loading states                         |

Every field-like slot receives two Ozef metadata props:

- `field`: `{ name, value, error, invalid, touched, required, setValue, touch }`
- `inputProps`: the native props Ozef would put on its default element,
  including `name`, `type`, `value` or `checked`, accessibility attributes,
  `onChange`, and `onBlur`

Keep these rules in mind:

- Spread `inputProps`, not the entire custom component props object, onto a DOM
  element. The latter also contains `field`, `inputProps`, and your custom props.
- Custom props passed to `<Form.Field>`, such as `label` or `hint`, also appear
  inside `inputProps`. Remove them before spreading onto a DOM element.
- With a native-compatible input, do not also call `field.setValue()`; the
  `inputProps.onChange` handler already does it.
- With a composite control, call `field.setValue(nextValue)` when it changes and
  `field.touch()` when the user has interacted or leaves the control.
- Render errors either inside the custom field with `field.error` or separately
  with `<Form.Error name="..." />`. Doing both displays the same error twice.

### Your own native-style input

This is the smallest complete adapter for a component that ends in a native
`<input>`:

```tsx
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type TextInputProps = OzefInputProps & {
  label: string;
};

function TextInput({ label, field, inputProps }: TextInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};
  const errorId = nativeInputProps.id
    ? `${nativeInputProps.id}-error`
    : undefined;

  return (
    <div>
      <label htmlFor={nativeInputProps.id}>{label}</label>
      <input
        {...nativeInputProps}
        aria-describedby={
          field?.error ? errorId : nativeInputProps["aria-describedby"]
        }
        className={
          field?.invalid
            ? `${nativeInputProps.className ?? ""} input-error`.trim()
            : nativeInputProps.className
        }
      />
      {field?.error ? (
        <p id={errorId} role="alert">
          {field.error}
        </p>
      ) : null}
    </div>
  );
}

const LoginForm = ozef({
  schema: z.object({
    email: z.email(),
  }),
  Input: TextInput,
});

<LoginForm>
  <LoginForm.Field name="email" id="email" label="Email" />
  <LoginForm.Submit>Sign in</LoginForm.Submit>
</LoginForm>;
```

Because this component renders `field.error` itself, do not also render
`<LoginForm.Error name="email" />` for this field.

### shadcn Input and Checkbox

shadcn components are source code in your application, so you can adapt them
directly. Add the primitives you need, for example:

```bash
bunx shadcn@latest add input checkbox label button select radio-group
```

shadcn `Input` is native-compatible, but shadcn `Checkbox` uses
`checked`/`onCheckedChange`. One `Input` slot can handle both by branching on
Ozef's generated `inputProps.type`:

```tsx
import type { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as UiInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type FieldInputProps = OzefInputProps &
  ComponentProps<"input"> & {
    label: string;
  };

function FieldInput({ field, inputProps, label }: FieldInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};
  const errorId = nativeInputProps.id
    ? `${nativeInputProps.id}-error`
    : undefined;

  if (nativeInputProps.type === "checkbox") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={nativeInputProps.id}
            name={nativeInputProps.name}
            checked={field?.value === true}
            disabled={nativeInputProps.disabled}
            required={field?.required}
            aria-invalid={field?.invalid}
            aria-describedby={field?.error ? errorId : undefined}
            onCheckedChange={(checked) => {
              field?.setValue(checked === true);
              field?.touch();
            }}
            onBlur={() => field?.touch()}
          />
          <Label htmlFor={nativeInputProps.id}>{label}</Label>
        </div>
        {field?.error ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {field.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={nativeInputProps.id}>{label}</Label>
      <UiInput
        {...nativeInputProps}
        aria-invalid={field?.invalid}
        aria-describedby={
          field?.error ? errorId : nativeInputProps["aria-describedby"]
        }
      />
      {field?.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {field.error}
        </p>
      ) : null}
    </div>
  );
}

const PreferencesForm = ozef({
  schema: z.object({
    email: z.email(),
    marketing: z.boolean(),
  }),
  Input: FieldInput,
});

<PreferencesForm>
  <PreferencesForm.Field name="email" id="email" label="Email" />
  <PreferencesForm.Field
    name="marketing"
    id="marketing"
    label="Email updates"
  />
  <PreferencesForm.Submit>Save</PreferencesForm.Submit>
</PreferencesForm>;
```

If your project uses shadcn's higher-level `Field` layout components, place the
same adapter logic inside that layout; Ozef should remain the owner of value and
validation state.

### shadcn Select

For shadcn/ui or Radix Select, map the Ozef field state into Radix's controlled
`value` and `onValueChange` props instead of spreading `inputProps` onto every
part:

```tsx
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select as UiSelect,
} from "@/components/ui/select";
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type SelectInputProps = OzefInputProps & {
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

function SelectInput({
  field,
  inputProps,
  placeholder = "Select an option",
  options = [],
}: SelectInputProps) {
  return (
    <UiSelect
      name={inputProps?.name}
      value={String(field?.value ?? "")}
      disabled={inputProps?.disabled}
      required={field?.required}
      onValueChange={(value) => {
        field?.setValue(value);
        field?.touch();
      }}
      onOpenChange={(open) => {
        if (!open) {
          field?.touch();
        }
      }}
    >
      <SelectTrigger
        id={inputProps?.id}
        aria-invalid={field?.invalid}
        aria-required={field?.required}
        onBlur={() => field?.touch()}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  );
}

const TicketForm = ozef({
  schema: z.object({
    priority: z.union([
      z.literal("low"),
      z.literal("normal"),
      z.literal("high"),
    ]),
  }),
  Select: SelectInput,
});

<TicketForm>
  <TicketForm.Field
    name="priority"
    id="priority"
    placeholder="Priority"
    options={[
      { label: "Low", value: "low" },
      { label: "Normal", value: "normal" },
      { label: "High", value: "high" },
    ]}
  />
  <TicketForm.Error name="priority" />
  <TicketForm.Submit>Create ticket</TicketForm.Submit>
</TicketForm>;
```

Because this replaces the entire native select, render `SelectItem` components
inside the adapter. Do not also render `TicketForm.Option` children.

### shadcn RadioGroup

For shadcn/ui or Radix RadioGroup, control the whole group with
`Form.useField(name)`. `InputRadio` replaces one radio item at a time, so it is
not the right abstraction for a composite `RadioGroup` root:

```tsx
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ozef from "ozef";
import { z } from "zod";

type Frequency = "daily" | "weekly" | "never";

const NotificationForm = ozef({
  schema: z.object({
    frequency: z.enum(["daily", "weekly", "never"]),
  }),
});

function FrequencyField() {
  const frequency = NotificationForm.useField("frequency");

  return (
    <fieldset>
      <legend>Notification frequency</legend>
      <RadioGroup
        name={frequency.name}
        value={frequency.value ?? ""}
        required={frequency.required}
        aria-invalid={frequency.invalid}
        aria-describedby={frequency.error ? "frequency-error" : undefined}
        onValueChange={(value) => {
          frequency.setValue(value as Frequency);
          frequency.touch();
        }}
        onBlur={() => frequency.touch()}
      >
        {[
          ["daily", "Daily"],
          ["weekly", "Weekly"],
          ["never", "Never"],
        ].map(([value, label]) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem id={`frequency-${value}`} value={value} />
            <Label htmlFor={`frequency-${value}`}>{label}</Label>
          </div>
        ))}
      </RadioGroup>
      {frequency.error ? (
        <p
          id="frequency-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {frequency.error}
        </p>
      ) : null}
    </fieldset>
  );
}

<NotificationForm>
  <FrequencyField />
  <NotificationForm.Submit>Save</NotificationForm.Submit>
</NotificationForm>;
```

This example renders `frequency.error` inline. Alternatively, remove that
paragraph and use `<NotificationForm.Error name="frequency" />`.

### Native radio and option slots

For native radio items, replace the `InputRadio` slot and keep using
`Form.Radio`:

```tsx
import type { ComponentProps } from "react";
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type RadioInputProps = OzefInputProps &
  ComponentProps<"input"> & {
    label: string;
  };

function RadioInput({ label, field, inputProps }: RadioInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};

  return (
    <label data-invalid={field?.invalid || undefined}>
      <input {...nativeInputProps} />
      {label}
    </label>
  );
}

const SizeForm = ozef({
  schema: z.object({
    size: z.enum(["small", "large"]),
  }),
  InputRadio: RadioInput,
});

<SizeForm.Field name="size">
  <SizeForm.Radio name="size" value="small" label="Small" />
  <SizeForm.Radio name="size" value="large" label="Large" />
</SizeForm.Field>;
```

The `Option` slot only applies to native select fields. With shadcn Select, put
`SelectItem` rendering inside your custom `Select` component instead.

```tsx
import type { ComponentProps } from "react";
import ozef from "ozef";
import { z } from "zod";

function NativeOption({
  name: _name,
  ...props
}: ComponentProps<"option"> & { name?: string }) {
  return <option {...props} />;
}

const NativeThemeForm = ozef({
  schema: z.object({
    theme: z.union([z.literal("system"), z.literal("dark")]),
  }),
  Option: NativeOption,
});

<NativeThemeForm.Field name="theme">
  <NativeThemeForm.Option name="theme" value="system">
    System
  </NativeThemeForm.Option>
  <NativeThemeForm.Option name="theme" value="dark">
    Dark
  </NativeThemeForm.Option>
</NativeThemeForm.Field>;
```

### Error and submit slots

Use `Error` and `Submit` for design-system error text and buttons:

```tsx
import type { ComponentProps } from "react";
import ozef from "ozef";
import { z } from "zod";
import { Button } from "@/components/ui/button";

function FieldError({
  error,
  ...props
}: ComponentProps<"span"> & { error?: string }) {
  return (
    <span {...props} role="alert" className="text-sm text-destructive">
      {error}
    </span>
  );
}

function SubmitButton({
  submitting,
  children,
  ...props
}: ComponentProps<typeof Button> & { submitting?: boolean }) {
  return (
    <Button {...props} type="submit" disabled={submitting || props.disabled}>
      {submitting ? "Saving..." : children}
    </Button>
  );
}

const AccountForm = ozef({
  schema: z.object({
    email: z.string().email(),
  }),
  Error: FieldError,
  Submit: SubmitButton,
});

<AccountForm.Field name="email" />
<AccountForm.Error name="email" />
<AccountForm.Submit>Save</AccountForm.Submit>;
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
