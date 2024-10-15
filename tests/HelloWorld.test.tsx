import { render } from "@testing-library/react";
import { act } from "react";
import HelloWorld from "../src/HelloWorld.tsx";

test("renders name", async () => {
  const { getByText, getByRole } = render(<HelloWorld name="Vitest" />);

  expect(getByText("Hello Vitest x1!")).toBeInTheDocument();

  act(() => {
    getByRole("button", { name: "Increment" }).click();
  });

  expect(getByText("Hello Vitest x2!")).toBeInTheDocument();
});
