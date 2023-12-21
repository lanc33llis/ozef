import React from "react";
import { z } from "zod";

import ozef from "./";

const Timeout = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

z.object({});

const TestForm = ozef({
  schema: z.object({
    something: z.string().min(0).max(10),
    else: z.string().min(0).max(10),
  }),
  Submit: (props) => {
    return (
      <button type="submit">
        Loading: {props.submitting ? "true" : "false"}
      </button>
    );
  },
  Error: ({ error }) => <p>{error}</p>,
});

const App = () => {
  const something = TestForm.Field.Something.useValue();

  return (
    <main>
      <TestForm
        onSubmit={(vals, utils) => {
          // await Timeout(2000);
          console.log(vals);
          console.log("Submitted");
          // utils.setError("submission", "Something went wrong");
        }}
      >
        {something}
        <TestForm.Field.Something />
        <TestForm.Field.Else />
        <TestForm.Error.Something />
        <TestForm.Event.Submit />
        <TestForm.Error.Submission />
        <button
          onClick={() => TestForm.Field.Something.setValue("123")}
          type="button"
        >
          hello 1
        </button>
        <button
          onClick={() => TestForm.Field.Else.setValue("1223")}
          type="button"
        >
          hello 2
        </button>
      </TestForm>
    </main>
  );
};

export default App;
