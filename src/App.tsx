import React from "react";
import { z } from "zod";

import ozef from "./";

const Timeout = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const TestForm = ozef({
  schema: z.object({
    something: z.boolean(),
    else: z.string().min(0).max(10),
  }),
  Submit: (props) => {
    return <button type="submit">submit</button>;
  },
  Error: ({ error }) => <p>{error}</p>,
  defaults: {
    something: true,
    else: "123",
  },
});

const App = () => {
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
        <TestForm.Field.Something />
        <TestForm.Error.Something />
        <TestForm.Field.Else />
        <TestForm.Error.Else />
        <TestForm.Event.Submit />
        <TestForm.Error.Submission />
      </TestForm>
    </main>
  );
};

export default App;
