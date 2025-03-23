import { render, screen } from "@testing-library/react";

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
