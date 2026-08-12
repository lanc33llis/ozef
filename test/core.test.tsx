import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";

import "@testing-library/jest-dom";

import { axe, toHaveNoViolations } from "jest-axe";
import { z } from "zod";

import ozef, { type OzefInputProps } from "../src";

expect.extend(toHaveNoViolations);

test("renders", async () => {
  const Form = ozef({
    schema: z.object({}),
  });

  render(<Form data-testid="form" />);

  expect(screen.getByTestId("form")).toBeInTheDocument();
});

test("creates select option components without calling hooks outside components", () => {
  expect(() =>
    ozef({
      schema: z.object({
        color: z.union([z.literal("Red"), z.literal("Blue")]),
      }),
    }),
  ).not.toThrow();
});

test("submits parsed number values", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      age: z.number(),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Age data-testid="age" />
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("age")).toHaveAttribute("step", "any");

  fireEvent.change(screen.getByTestId("age"), { target: { value: "42" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0]).toEqual({ age: 42 });
});

test("submits string and number values from a rendered React form", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
      age: z.number().min(1),
    }),
    defaults: {
      name: "Ada",
      age: 36,
    },
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Name data-testid="name" />
      <Form.Field.Age data-testid="age" />
      <button type="submit">Submit</button>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "Grace" } });
  fireEvent.change(screen.getByTestId("age"), { target: { value: "41" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ name: "Grace", age: 41 });
});

test("infers native input types from Zod string formats", () => {
  const Form = ozef({
    schema: z.object({
      email: z.email(),
      legacyEmail: z.string().email(),
      optionalEmail: z.email().optional(),
      website: z.url(),
      legacyWebsite: z.string().url(),
      httpWebsite: z.httpUrl(),
      phone: z.e164(),
      legacyPhone: z.string().e164(),
      birthday: z.iso.date(),
      legacyBirthday: z.string().date(),
      appointment: z.iso.time(),
      legacyAppointment: z.string().time(),
      identifier: z.uuid(),
      guid: z.guid(),
      slug: z.templateLiteral(["user_", z.string()]),
      timestamp: z.iso.datetime(),
    }),
  });

  render(
    <Form>
      <Form.Field.Email data-testid="email" />
      <Form.Field.LegacyEmail data-testid="legacy-email" />
      <Form.Field.OptionalEmail data-testid="optional-email" />
      <Form.Field.Website data-testid="website" />
      <Form.Field.LegacyWebsite data-testid="legacy-website" />
      <Form.Field.HttpWebsite data-testid="http-website" />
      <Form.Field.Phone data-testid="phone" />
      <Form.Field.LegacyPhone data-testid="legacy-phone" />
      <Form.Field.Birthday data-testid="birthday" />
      <Form.Field.LegacyBirthday data-testid="legacy-birthday" />
      <Form.Field.Appointment data-testid="appointment" />
      <Form.Field.LegacyAppointment data-testid="legacy-appointment" />
      <Form.Field.Identifier data-testid="identifier" />
      <Form.Field.Guid data-testid="guid" />
      <Form.Field.Slug data-testid="slug" />
      <Form.Field.Timestamp data-testid="timestamp" />
    </Form>,
  );

  expect(screen.getByTestId("email")).toHaveAttribute("type", "email");
  expect(screen.getByTestId("legacy-email")).toHaveAttribute("type", "email");
  expect(screen.getByTestId("optional-email")).toHaveAttribute("type", "email");
  expect(screen.getByTestId("website")).toHaveAttribute("type", "url");
  expect(screen.getByTestId("legacy-website")).toHaveAttribute("type", "url");
  expect(screen.getByTestId("http-website")).toHaveAttribute("type", "url");
  expect(screen.getByTestId("phone")).toHaveAttribute("type", "tel");
  expect(screen.getByTestId("legacy-phone")).toHaveAttribute("type", "tel");
  expect(screen.getByTestId("birthday")).toHaveAttribute("type", "date");
  expect(screen.getByTestId("legacy-birthday")).toHaveAttribute("type", "date");
  expect(screen.getByTestId("appointment")).toHaveAttribute("type", "time");
  expect(screen.getByTestId("appointment")).toHaveAttribute("step", "any");
  expect(screen.getByTestId("legacy-appointment")).toHaveAttribute(
    "type",
    "time",
  );
  expect(screen.getByTestId("identifier")).toHaveAttribute("type", "text");
  expect(screen.getByTestId("guid")).toHaveAttribute("type", "text");
  expect(screen.getByTestId("slug")).toHaveAttribute("type", "text");
  expect(screen.getByTestId("timestamp")).toHaveAttribute("type", "text");
});

test("passes inferred input types to custom inputs", () => {
  const Form = ozef({
    schema: z.object({ email: z.email() }),
    Input: ({ inputProps }) => (
      <input data-testid="custom-email" data-inferred-type={inputProps?.type} />
    ),
  });

  render(
    <Form>
      <Form.Field.Email />
    </Form>,
  );

  expect(screen.getByTestId("custom-email")).toHaveAttribute(
    "data-inferred-type",
    "email",
  );
});

test("supports strict and loose Zod object schemas", () => {
  const StrictForm = ozef({
    schema: z.strictObject({ email: z.email() }),
  });
  const LooseForm = ozef({
    schema: z.looseObject({ website: z.url() }),
  });

  render(
    <>
      <StrictForm>
        <StrictForm.Field.Email data-testid="strict-email" />
      </StrictForm>
      <LooseForm>
        <LooseForm.Field.Website data-testid="loose-url" />
      </LooseForm>
    </>,
  );

  expect(screen.getByTestId("strict-email")).toHaveAttribute("type", "email");
  expect(screen.getByTestId("loose-url")).toHaveAttribute("type", "url");
});

test("renders union literal fields as select options and submits the selected value", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      color: z.union([z.literal("Red"), z.literal("Blue")]),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Color data-testid="color">
        <Form.Field.Color.Red />
        <Form.Field.Color.Blue />
      </Form.Field.Color>
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("color").tagName).toBe("SELECT");
  expect(screen.getByRole("combobox")).toBe(screen.getByTestId("color"));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Red" })).toHaveAttribute(
    "value",
    "Red",
  );
  expect(screen.getByRole("option", { name: "Blue" })).toHaveAttribute(
    "value",
    "Blue",
  );

  fireEvent.change(screen.getByTestId("color"), {
    target: { value: "Blue" },
  });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ color: "Blue" });
});

test("renders accessible native controls without axe violations", async () => {
  const Form = ozef({
    schema: z.object({
      email: z.email(),
      marketing: z.boolean(),
      plan: z.enum(["starter", "pro"]),
      color: z.union([z.literal("red"), z.literal("blue")]),
    }),
    ariaLabel: "Account preferences",
  });

  const { container } = render(
    <Form>
      <label htmlFor="email">Email</label>
      <Form.Field name="email" id="email" />

      <label htmlFor="marketing">Marketing emails</label>
      <Form.Field name="marketing" id="marketing" />

      <fieldset>
        <legend>Plan</legend>
        <Form.Field name="plan">
          <label>
            <Form.Radio name="plan" value="starter" />
            Starter
          </label>
          <label>
            <Form.Radio name="plan" value="pro" />
            Pro
          </label>
        </Form.Field>
      </fieldset>

      <label htmlFor="color">Color</label>
      <Form.Field name="color" id="color">
        <Form.Option name="color" value="red">
          Red
        </Form.Option>
        <Form.Option name="color" value="blue">
          Blue
        </Form.Option>
      </Form.Field>

      <Form.Submit>Save</Form.Submit>
    </Form>,
  );

  expect(await axe(container)).toHaveNoViolations();
});

test("applies generated ARIA state to native controls", () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
      enabled: z.boolean(),
      size: z.enum(["small", "large"]),
      color: z.union([z.literal("red"), z.literal("blue")]),
    }),
  });

  render(
    <Form>
      <Form.Field name="name" data-testid="name" disabled />
      <Form.Field name="enabled" data-testid="enabled" />
      <Form.Field name="size" data-testid="size-group">
        <Form.Radio name="size" value="small" data-testid="small" />
        <Form.Radio name="size" value="large" data-testid="large" />
      </Form.Field>
      <Form.Field name="color" data-testid="color">
        <Form.Option name="color" value="red" data-testid="red" />
        <Form.Option name="color" value="blue" data-testid="blue" />
      </Form.Field>
    </Form>,
  );

  expect(screen.getByTestId("name")).toHaveAttribute("aria-required", "true");
  expect(screen.getByTestId("name")).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByTestId("name")).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByTestId("enabled")).toHaveAttribute("aria-checked", "false");
  expect(screen.getByTestId("size-group")).toHaveAttribute(
    "role",
    "radiogroup",
  );
  expect(screen.getByTestId("small")).toHaveAttribute("aria-checked", "false");
  expect(screen.getByTestId("red")).not.toHaveAttribute("role");
  expect(screen.getByTestId("red")).toHaveAttribute("aria-selected", "true");
  expect((screen.getByTestId("red") as HTMLOptionElement).selected).toBe(true);

  fireEvent.click(screen.getByTestId("enabled"));
  fireEvent.click(screen.getByTestId("small"));

  expect(screen.getByTestId("enabled")).toHaveAttribute("aria-checked", "true");
  expect(screen.getByTestId("small")).toHaveAttribute("aria-checked", "true");
});

test("submits the initial native select value when the user does not change it", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      color: z.union([z.literal("Red"), z.literal("Blue")]),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Color data-testid="color">
        <Form.Field.Color.Red />
        <Form.Field.Color.Blue />
      </Form.Field.Color>
      <button type="submit">Submit</button>
    </Form>,
  );

  await waitFor(() => expect(screen.getByTestId("color")).toHaveValue("Red"));

  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ color: "Red" });
});

test("does not submit invalid values", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Name data-testid="name" />
      <button type="submit">Submit</button>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
});

test("submits checkbox values", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      enabled: z.boolean(),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Enabled data-testid="enabled" />
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("enabled")).not.toBeChecked();

  fireEvent.click(screen.getByTestId("enabled"));
  expect(screen.getByTestId("enabled")).toBeChecked();

  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ enabled: true });
});

test("does not coerce an empty required number field to zero", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      age: z.number(),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Age data-testid="age" />
      <button type="submit">Submit</button>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("age"), { target: { value: "" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
});

test("supports optional number fields", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      age: z.number().optional(),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Age data-testid="age" />
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("age")).toHaveAttribute("type", "number");

  fireEvent.submit(screen.getByTestId("form"));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ age: undefined });

  onSubmit.mockClear();
  fireEvent.change(screen.getByTestId("age"), { target: { value: "42" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ age: 42 });
});

test("submits enum radio values", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      color: z.enum(["Red", "Blue"]),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Color>
        <Form.Field.Color.Red data-testid="red" />
        <Form.Field.Color.Blue data-testid="blue" />
      </Form.Field.Color>
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("red")).toHaveAttribute("type", "radio");
  expect(screen.getByTestId("red")).toHaveAttribute("name", "color");
  expect(screen.getByTestId("red")).toHaveAttribute("value", "Red");
  expect(screen.getByTestId("blue")).toHaveAttribute("type", "radio");
  expect(screen.getByTestId("blue")).toHaveAttribute("name", "color");
  expect(screen.getByTestId("blue")).toHaveAttribute("value", "Blue");

  fireEvent.click(screen.getByTestId("blue"));
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ color: "Blue" });
  expect(screen.getByTestId("blue")).toBeChecked();
  expect(screen.getByTestId("red")).not.toBeChecked();
});

test("shows and clears field validation errors", async () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(2, "Name is too short"),
    }),
    Error: ({ error }) => <span data-testid="name-error">{error}</span>,
  });

  render(
    <Form data-testid="form">
      <Form.Field.Name data-testid="name" />
      <Form.Error.Name />
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "A" } });
  fireEvent.blur(screen.getByTestId("name"));

  expect(await screen.findByTestId("name-error")).toHaveTextContent(
    "Name is too short",
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "Ada" } });

  await waitFor(() =>
    expect(screen.queryByTestId("name-error")).not.toBeInTheDocument(),
  );
});

test("passes error metadata to custom input components", async () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(2),
    }),
    Input: ({ field, inputProps }) => (
      <input
        {...inputProps}
        data-errorful={field?.invalid ? "true" : "false"}
      />
    ),
  });

  render(
    <Form data-testid="form">
      <Form.Field.Name data-testid="name" errorClassName="invalid" />
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "A" } });
  fireEvent.blur(screen.getByTestId("name"));

  await waitFor(() =>
    expect(screen.getByTestId("name")).toHaveAttribute("data-errorful", "true"),
  );
  expect(screen.getByTestId("name")).toHaveClass("invalid");
});

test("passes radio metadata to custom radio components", () => {
  const Form = ozef({
    schema: z.object({
      color: z.enum(["Red", "Blue"]),
    }),
    InputRadio: ({ inputProps, radioValue }) => (
      <input {...inputProps} data-radio-value={radioValue} />
    ),
  });

  render(
    <Form>
      <Form.Field.Color>
        <Form.Field.Color.Red data-testid="red" />
        <Form.Field.Color.Blue data-testid="blue" />
      </Form.Field.Color>
    </Form>,
  );

  expect(screen.getByTestId("red")).toHaveAttribute("data-radio-value", "Red");
  expect(screen.getByTestId("blue")).toHaveAttribute("data-radio-value", "Blue");
});

test("renders custom Select and Option slots", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      color: z.union([z.literal("red"), z.literal("blue")]),
    }),
    Select: ({ field, inputProps, children }) => (
      <select
        {...inputProps}
        data-testid="custom-select"
        data-field-name={field?.name}
      >
        {children}
      </select>
    ),
    Option: ({ name, ...props }) => (
      <option {...props} data-testid={`custom-option-${props.value}`}>
        {props.children}
        {name ? ` (${name})` : ""}
      </option>
    ),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field name="color">
        <Form.Option name="color" value="red">
          Red
        </Form.Option>
        <Form.Option name="color" value="blue">
          Blue
        </Form.Option>
      </Form.Field>
      <button type="submit">Submit</button>
    </Form>,
  );

  expect(screen.getByTestId("custom-select")).toHaveAttribute(
    "data-field-name",
    "color",
  );
  expect(screen.getByTestId("custom-option-red")).toHaveTextContent(
    "Red (color)",
  );
  expect(screen.getByTestId("custom-option-blue")).toHaveTextContent(
    "Blue (color)",
  );

  fireEvent.change(screen.getByTestId("custom-select"), {
    target: { value: "blue" },
  });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ color: "blue" });
});

test("does not stay busy when a valid form has no submit handler", async () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
    }),
  });

  render(
    <Form data-testid="form">
      <Form.Field.Name data-testid="name" />
      <Form.Event.Submit data-testid="submit">Submit</Form.Event.Submit>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "Ada" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(screen.getByTestId("form")).not.toHaveAttribute("aria-busy", "true"));
  expect(screen.getByTestId("submit")).not.toBeDisabled();
});

test("sets submitting state while async submit is pending", async () => {
  let resolveSubmit!: () => void;
  const onSubmit = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      }),
  );
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Name data-testid="name" />
      <Form.Event.Submit data-testid="submit">Submit</Form.Event.Submit>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "Ada" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(screen.getByTestId("submit")).toBeDisabled());
  expect(screen.getByTestId("submit")).toHaveAttribute("aria-busy", "true");

  await act(async () => {
    resolveSubmit();
  });

  await waitFor(() => expect(screen.getByTestId("submit")).not.toBeDisabled());
  expect(screen.getByTestId("submit")).toHaveAttribute("aria-busy", "false");
});

test("renders custom Submit slot with submitting state", async () => {
  let resolveSubmit!: () => void;
  const onSubmit = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      }),
  );
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
    }),
    Submit: ({ submitting, ...props }) => (
      <button
        {...props}
        data-testid="custom-submit"
        data-submitting={submitting ? "true" : "false"}
      />
    ),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Name data-testid="name" />
      <Form.Submit>Save</Form.Submit>
    </Form>,
  );

  expect(screen.getByTestId("custom-submit")).toHaveTextContent("Save");
  expect(screen.getByTestId("custom-submit")).toHaveAttribute(
    "data-submitting",
    "false",
  );

  fireEvent.change(screen.getByTestId("name"), { target: { value: "Ada" } });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() =>
    expect(screen.getByTestId("custom-submit")).toHaveAttribute(
      "data-submitting",
      "true",
    ),
  );

  await act(async () => {
    resolveSubmit();
  });

  await waitFor(() =>
    expect(screen.getByTestId("custom-submit")).toHaveAttribute(
      "data-submitting",
      "false",
    ),
  );
});

test("reset utility clears form values and errors", async () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(2, "Name is too short"),
    }),
    defaults: {
      name: "Ada",
    },
    Error: ({ error }) => <span data-testid="name-error">{error}</span>,
  });

  const ResetButton = () => {
    const reset = Form.useReset();
    return (
      <button type="button" onClick={reset}>
        Reset
      </button>
    );
  };

  render(
    <Form>
      <Form.Field.Name data-testid="name" />
      <Form.Error.Name />
      <ResetButton />
    </Form>,
  );

  expect(screen.getByTestId("name")).toHaveValue("Ada");

  fireEvent.change(screen.getByTestId("name"), { target: { value: "A" } });
  fireEvent.blur(screen.getByTestId("name"));
  expect(await screen.findByTestId("name-error")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Reset"));

  expect(screen.getByTestId("name")).toHaveValue("");
  await waitFor(() =>
    expect(screen.queryByTestId("name-error")).not.toBeInTheDocument(),
  );
});

test("imperative field helpers set and read values after mount", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      name: z.string().min(1),
    }),
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field.Name data-testid="name" />
      <button type="button" onClick={() => Form.Field.Name.setValue("Grace")}>
        Set
      </button>
      <button
        type="button"
        onClick={() =>
          screen
            .getByTestId("read-value")
            .setAttribute("data-value", Form.Field.Name.getValue())
        }
      >
        Read
      </button>
      <span data-testid="read-value" />
      <button type="submit">Submit</button>
    </Form>,
  );

  fireEvent.click(screen.getByText("Set"));
  await waitFor(() => expect(screen.getByTestId("name")).toHaveValue("Grace"));

  fireEvent.click(screen.getByText("Read"));
  expect(screen.getByTestId("read-value")).toHaveAttribute(
    "data-value",
    "Grace",
  );

  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ name: "Grace" });
});

test("supports name-based Field and Error components", async () => {
  const onSubmit = jest.fn();
  const Form = ozef({
    schema: z.object({
      first_name: z.string().min(2, "First name is too short"),
    }),
    Error: ({ error, ...props }) => <span {...props}>{error}</span>,
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field name="first_name" data-testid="first-name" />
      <Form.Error name="first_name" data-testid="first-name-error" />
      <Form.Submit>Save</Form.Submit>
    </Form>,
  );

  fireEvent.change(screen.getByTestId("first-name"), {
    target: { value: "A" },
  });
  fireEvent.blur(screen.getByTestId("first-name"));

  expect(await screen.findByTestId("first-name-error")).toHaveTextContent(
    "First name is too short",
  );

  fireEvent.change(screen.getByTestId("first-name"), {
    target: { value: "Ada" },
  });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ first_name: "Ada" });
});

test("supports generic Radio and Option components", async () => {
  const onSubmit = jest.fn();
  type RadioInputProps = OzefInputProps & ComponentProps<"input"> & {
    label?: string;
  };
  const Form = ozef({
    schema: z.object({
      size: z.enum(["small", "large"]),
      color: z.union([z.literal("red"), z.literal("blue")]),
    }),
    InputRadio: ({ label, inputProps }: RadioInputProps) => {
      const { label: _label, ...nativeInputProps } = inputProps ?? {};

      return (
        <label>
          <input {...nativeInputProps} />
          <span>{label}</span>
        </label>
      );
    },
  });

  render(
    <Form data-testid="form" onSubmit={onSubmit}>
      <Form.Field name="size">
        <Form.Radio
          name="size"
          value="small"
          label="Small"
          data-testid="small"
        />
        <Form.Radio
          name="size"
          value="large"
          label="Large"
          data-testid="large"
        />
      </Form.Field>
      <Form.Field name="color" data-testid="color">
        <Form.Option name="color" value="red" />
        <Form.Option name="color" value="blue" />
      </Form.Field>
      <Form.Submit>Save</Form.Submit>
    </Form>,
  );

  expect(screen.getByText("Large")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("large"));
  fireEvent.change(screen.getByTestId("color"), {
    target: { value: "blue" },
  });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({
    size: "large",
    color: "blue",
  });
});

test("useField exposes value, error state, and setter", async () => {
  const Form = ozef({
    schema: z.object({
      name: z.string().min(2, "Name is too short"),
    }),
  });

  const FieldTools = () => {
    const name = Form.useField("name");

    return (
      <>
        <button type="button" onClick={() => name.setValue("Grace")}>
          Set hook value
        </button>
        <span data-testid="hook-value">{name.value ?? ""}</span>
        <span data-testid="hook-invalid">{String(name.invalid)}</span>
      </>
    );
  };

  render(
    <Form>
      <Form.Field name="name" data-testid="name" />
      <FieldTools />
    </Form>,
  );

  fireEvent.click(screen.getByText("Set hook value"));

  await waitFor(() => expect(screen.getByTestId("name")).toHaveValue("Grace"));
  expect(screen.getByTestId("hook-value")).toHaveTextContent("Grace");
  expect(screen.getByTestId("hook-invalid")).toHaveTextContent("false");
});

test("useForm exposes values, errors, reset, and setError", async () => {
  const Form = ozef({
    schema: z.object({
      email: z.string().email(),
    }),
    defaults: {
      email: "ada@example.com",
    },
    Error: ({ error }) => <span role="alert">{error}</span>,
  });

  const FormTools = () => {
    const form = Form.useForm();

    return (
      <>
        <span data-testid="form-value">{form.values.email ?? ""}</span>
        <span data-testid="form-error">{form.errors.email ?? ""}</span>
        <button
          type="button"
          onClick={() => form.setError("email", "Email is already taken")}
        >
          Set server error
        </button>
        <button type="button" onClick={form.reset}>
          Reset form
        </button>
      </>
    );
  };

  render(
    <Form>
      <Form.Field name="email" data-testid="email" />
      <Form.Errors />
      <FormTools />
    </Form>,
  );

  expect(screen.getByTestId("form-value")).toHaveTextContent(
    "ada@example.com",
  );

  fireEvent.click(screen.getByText("Set server error"));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email is already taken",
  );
  expect(screen.getByTestId("form-error")).toHaveTextContent(
    "Email is already taken",
  );

  fireEvent.click(screen.getByText("Reset form"));

  await waitFor(() => expect(screen.getByTestId("email")).toHaveValue(""));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("renders submission errors from submit utilities", async () => {
  const Form = ozef({
    schema: z.object({
      email: z.string().email(),
    }),
    defaults: {
      email: "ada@example.com",
    },
    Error: ({ error, ...props }) => <span {...props}>{error}</span>,
  });

  render(
    <Form
      data-testid="form"
      onSubmit={(_, utils) => {
        utils.setError("submission", "Server rejected the request");
      }}
    >
      <Form.Field name="email" data-testid="email" />
      <Form.Error name="submission" data-testid="submission-error" />
      <Form.Error.Submission data-testid="legacy-submission-error" />
      <Form.Submit>Submit</Form.Submit>
    </Form>,
  );

  fireEvent.submit(screen.getByTestId("form"));

  expect(await screen.findByTestId("submission-error")).toHaveTextContent(
    "Server rejected the request",
  );
  expect(screen.getByTestId("legacy-submission-error")).toHaveTextContent(
    "Server rejected the request",
  );
});
