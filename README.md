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

The main replacement slots are `Input`, `InputRadio`, `Select`, `Option`,
`Error`, and `Submit`. `Input` handles text, number, and checkbox fields.

```tsx
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type TextInputProps = OzefInputProps & {
  label: string;
};

function TextInput({ label, field, inputProps }: TextInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};

  return (
    <label>
      {label}
      <input
        {...nativeInputProps}
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

For shadcn/ui text inputs and checkboxes, branch on Ozef's generated native
`type`:

```tsx
import type { ComponentProps } from "react";
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as UiInput } from "@/components/ui/input";

type FieldInputProps = OzefInputProps & ComponentProps<"input"> & {
  label?: string;
};

function FieldInput({ field, inputProps, label }: FieldInputProps) {
  const { label: _label, ...nativeInputProps } = inputProps ?? {};

  if (inputProps?.type === "checkbox") {
    return (
      <label>
        <Checkbox
          id={inputProps.id}
          name={inputProps.name}
          checked={Boolean(field?.value)}
          disabled={inputProps.disabled}
          required={field?.required}
          aria-invalid={field?.invalid}
          onCheckedChange={(checked) => {
            field?.setValue(checked === true);
            field?.touch();
          }}
          onBlur={() => field?.touch()}
        />
        {label}
      </label>
    );
  }

  return (
    <label>
      {label}
      <UiInput
        {...nativeInputProps}
        aria-invalid={field?.invalid}
      />
    </label>
  );
}

const PreferencesForm = ozef({
  schema: z.object({
    email: z.string().email(),
    marketing: z.boolean(),
  }),
  Input: FieldInput,
});

<PreferencesForm.Field name="email" label="Email" />;
<PreferencesForm.Field name="marketing" label="Email updates" />;
```

For shadcn/ui or Radix Select, map the Ozef field state into Radix's controlled
`value` and `onValueChange` props instead of spreading `inputProps` onto every
part:

```tsx
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

<TicketForm.Field
  name="priority"
  placeholder="Priority"
  options={[
    { label: "Low", value: "low" },
    { label: "Normal", value: "normal" },
    { label: "High", value: "high" },
  ]}
/>;
```

For shadcn/ui or Radix RadioGroup, control the whole group with
`Form.useField(name)`:

```tsx
import ozef from "ozef";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Frequency = "daily" | "weekly" | "never";

const NotificationForm = ozef({
  schema: z.object({
    frequency: z.enum(["daily", "weekly", "never"]),
  }),
});

function FrequencyField() {
  const frequency = NotificationForm.useField("frequency");

  return (
    <RadioGroup
      name={frequency.name}
      value={frequency.value ?? ""}
      required={frequency.required}
      aria-invalid={frequency.invalid}
      onValueChange={(value) => {
        frequency.setValue(value as Frequency);
        frequency.touch();
      }}
    >
      {[
        ["daily", "Daily"],
        ["weekly", "Weekly"],
        ["never", "Never"],
      ].map(([value, label]) => (
        <div key={value}>
          <RadioGroupItem id={`frequency-${value}`} value={value} />
          <Label htmlFor={`frequency-${value}`}>{label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

<NotificationForm>
  <FrequencyField />
  <NotificationForm.Error name="frequency" />
  <NotificationForm.Submit>Save</NotificationForm.Submit>
</NotificationForm>;
```

For native radio items, replace the `InputRadio` slot and keep using
`Form.Radio`:

```tsx
import type { ComponentProps } from "react";
import type { OzefInputProps } from "ozef";
import ozef from "ozef";
import { z } from "zod";

type RadioInputProps = OzefInputProps & ComponentProps<"input"> & {
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
