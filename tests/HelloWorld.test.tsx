import { act } from "react";
import { render } from "vitest-browser-react";
import HelloWorld from "../src/HelloWorld.tsx";

test("renders name", async () => {
  const { getByText, getByRole } = render(<HelloWorld name="Vitest" />);

  expect.element(getByText("Hello Vitest x1!")).toBeInTheDocument();

  act(() => {
    getByRole("button", { name: "Increment" }).click();
  });

  expect.element(getByText("Hello Vitest x2!")).toBeInTheDocument();
});
