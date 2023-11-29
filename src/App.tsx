import React from "react";
import { z } from "zod";

import ozef from "./";

const Timeout = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const App = () => {
  const TestForm = ozef({
    schema: z.object({
      something: z.string().min(0).max(10),
      else: z.string().min(0).max(10),
    }),
    Submit: (props) => {
      console.log(props.submitting);
      return (
        <button type="submit">
          Loading: {props.submitting ? "true" : "false"}
        </button>
      );
    },
    Error: ({ error }) => <p>{error}</p>,
  });

  return (
    <main>
      <TestForm
        onSubmit={({}, utils) => {
          // await Timeout(2000);
          console.log("Submitted");
          // utils.setError("submission", "Something went wrong");
        }}
      >
        <TestForm.Field.Something />
        <TestForm.Field.Else />
        <TestForm.Error.Something />
        <TestForm.Event.Submit />
        <TestForm.Error.Submission />
        <button onClick={() => TestForm.Field.Something.setValue("123")}>
          hello 1
        </button>
        <button onClick={() => TestForm.Field.Else.setValue("1223")}>
          hello 2
        </button>
      </TestForm>
    </main>
  );
};

export default App;
