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
    }),
    Submit: (props) => {
      console.log(props.submitting);
      return (
        <button type="submit">
          Loading: {props.submitting ? "true" : "false"}
        </button>
      );
    },
  });

  return (
    <main>
      <TestForm
        onSubmit={() => {
          // await Timeout(2000);
          console.log("Submitted");
        }}
      >
        <TestForm.Field.Something />
        <TestForm.Error.Something />
        <TestForm.Event.Submit />
        <TestForm.Error.Submission />
      </TestForm>
    </main>
  );
};

export default App;
