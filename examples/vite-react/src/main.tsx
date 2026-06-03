import { createRoot } from "react-dom/client";
import ozef, { type OzefInputProps } from "ozef";
import { z } from "zod";
import "./styles.css";

type TextInputProps = OzefInputProps & {
  label: string;
};

function TextInput({ label, field, inputProps }: TextInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...inputProps}
        className={field?.invalid ? "control control-error" : "control"}
      />
      {field?.error ? <span className="error">{field.error}</span> : null}
    </label>
  );
}

const ExampleForm = ozef({
  schema: z.object({
    name: z.string().min(2, "Name is too short"),
    age: z.number().min(1, "Age is required"),
    plan: z.enum(["starter", "pro"]),
    color: z.union([z.literal("red"), z.literal("blue")]),
    terms: z.boolean(),
  }),
  defaults: {
    name: "Ada",
    age: 36,
    plan: "starter",
    color: "red",
    terms: false,
  },
  Input: TextInput,
  Error: ({ error }) => <span className="error">{error}</span>,
});

function Toolbar() {
  const form = ExampleForm.useForm();
  const name = ExampleForm.useField("name");

  return (
    <div className="toolbar">
      <button type="button" onClick={() => name.setValue("Grace")}>
        Use Grace
      </button>
      <button type="button" onClick={form.reset}>
        Reset
      </button>
      <span>{form.submitting ? "Saving" : "Ready"}</span>
    </div>
  );
}

function App() {
  return (
    <main>
      <h1>Ozef example</h1>
      <ExampleForm
        onSubmit={async (data, utils) => {
          if (!data.terms) {
            utils.setError("terms", "Accept the terms to continue");
            utils.setError("submission", "Please fix the form");
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
          window.alert(JSON.stringify(data, null, 2));
        }}
      >
        <ExampleForm.Field name="name" label="Name" />
        <ExampleForm.Field name="age" label="Age" />

        <fieldset>
          <legend>Plan</legend>
          <label>
            <ExampleForm.Radio name="plan" value="starter" />
            Starter
          </label>
          <label>
            <ExampleForm.Radio name="plan" value="pro" />
            Pro
          </label>
          <ExampleForm.Error name="plan" />
        </fieldset>

        <label className="field">
          <span>Theme color</span>
          <ExampleForm.Field name="color" className="control">
            <ExampleForm.Option name="color" value="red" />
            <ExampleForm.Option name="color" value="blue" />
          </ExampleForm.Field>
        </label>

        <label className="check">
          <ExampleForm.Field name="terms" />
          I accept the terms
        </label>
        <ExampleForm.Error name="terms" />

        <ExampleForm.Error name="submission" />
        <Toolbar />
        <ExampleForm.Submit>Save</ExampleForm.Submit>
      </ExampleForm>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(<App />);
