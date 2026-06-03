import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import "@testing-library/jest-dom";

import { z } from "zod";

import ozef from "../src";

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

  fireEvent.change(screen.getByTestId("color"), {
    target: { value: "Blue" },
  });
  fireEvent.submit(screen.getByTestId("form"));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ color: "Blue" });
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

  fireEvent.click(screen.getByTestId("enabled"));
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
    Input: ({ errorful, errorClassName, radioValue, ...props }) => (
      <input {...props} data-errorful={errorful ? "true" : "false"} />
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
    InputRadio: ({ radioValue, errorful, errorClassName, ...props }) => (
      <input {...props} data-radio-value={radioValue} />
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
