# Opinionated Zod-empowered forms

## Introduction

Ozef is an opinionated library that aims to guarantee type-safe, declarative forms with minimal boilerplate. It is built on top of [Zod](
  https://github.com/colinhacks/zod
) which provides a powerful type system for validating data.

Features Ozef supports:
- Guaranteed type-safety in `onSubmit`
- async `onSubmit`
- Declarative forms
- Validation checking
- Input types like radio and select

Ozef is not a component library. It does not provide any pre-built components. Instead, plug in existing components to build forms.

Ozef lets you build forms like:
```tsx
import Input from "./CustomInput";

const NewFlowForm = ozef({
  schema: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    // for radios
    favoriteColor: z.enum(["Red", "Blue"]),
    // for selects
    favoriteColor: z.union([z.literal("Red"), z.literal("Blue")]),
  }),
  // Plug in your own input components
  Input,
  // Define components for each type
  InputRadio: ({ radioValue, ...props }) => (
    <div>
      {radioValue}
      <input type="radio" {...props} />
    </div>
  ),
  // Error labels
  Error: ({ error }) => <span className="text-red-500">{error}</span>,
  Submit: ({ submitting }) => (
    <RoundedButton type="submit" loading={submitting}>
      Submit
    </RoundedButton>
  ),
});

<NewFlowForm
  className="flex flex-col gap-2"
  onSubmit={async (vals) => {
    /** vals has the type { name: string, email: string, favoriteColor: "Red" | "Blue" } */
    ...
  }}
>
  <NewFlowForm.Field.Name prefixIcon="icon_1" />
  <NewFlowForm.Error.Name />

  <NewFlowForm.Field.Email />
  <NewFlowForm.Error.Email />

  <NewFlowForm.Error.FavoriteColor />
  <NewFlowForm.Field.FavoriteColor>
    <NewFlowForm.Field.FavoriteColor.Blue />
    <NewFlowForm.Field.FavoriteColor.Red />
  </NewFlowForm.Field.FavoriteColor>

  <NewFlowForm.Event.Submit />
  <NewFlowForm.Error.Submission error="Please fill out the form" />
</NewFlowForm>
```
with full type-script support!

## Installation

Ozef has minimal dependencies (just Zod and [Jotai](https://github.com/pmndrs/jotai)) and is easy to install. 

```bash
npm i ozef
```

## Usage

### Basic usage
```tsx
import ozef from "ozef";

const Form = ozef({
  schema: z.object({
    name: z.string().min(3),
    email: z.string().email(),
  }),
});

const SomeComponent = () => {
  return (
    <Form
      onSubmit={async (vals) => {
        // vals is guaranteed to be of type { name: string, email: string }
        ...
      }}
    >
      // Use `Field` components to render inputs for the form
      <Form.Field.Name />
      <Form.Field.Email />

      // Use `Error` components to render error labels
      <Form.Error.Name />

      // Use `Event` components to render special user events components
      <Form.Event.Submit />
    </Form>
  );
};
```

### Ozef Input Components
Components need to modified before being able to be used with Ozef. This is because Ozef needs to be able to pass certain props to the components. 

```tsx
import { type OzefInputProps } from "ozef";

type InputProps = OzefInputProps & {
  // Add your own props
  prefixIcon?: string;
};

const Input = ({ prefixIcon, hasError, ...props }: InputProps) => {
  return (
    <div
      className={`${
        props.className
      } ${hasError ? "focus-within:ring-red-500" : ""}`}
    >
      {prefixIcon && (
        <MaterialsIcon className="!text-xl text-zinc-500" icon={prefixIcon} />
      )}
      <input
        {/* This is the important part. Ozef needs to pass props to the native input component. */}
        {...props}
        className="..."}
      />
    </div>
  );
};
