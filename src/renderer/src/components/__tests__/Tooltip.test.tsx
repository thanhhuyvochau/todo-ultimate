import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Tooltip } from "../ui/Tooltip";

describe("Tooltip", () => {
  it("renders its children", () => {
    const { container } = render(
      <Tooltip label="Edit task">
        <button aria-label="Edit task">Edit</button>
      </Tooltip>,
    );
    expect(container.textContent).toContain("Edit");
  });

  it("renders the tooltip label with a tooltip role", () => {
    const { getByRole, getByText } = render(
      <Tooltip label="Delete task">
        <button aria-label="Delete task">Delete</button>
      </Tooltip>,
    );
    expect(getByRole("tooltip").textContent).toBe("Delete task");
    expect(getByText("Delete task")).toBeTruthy();
  });

  it("applies the default top position", () => {
    const { getByRole } = render(
      <Tooltip label="Save changes">
        <button aria-label="Save changes">Save</button>
      </Tooltip>,
    );
    expect(getByRole("tooltip").className).toContain("bottom-full");
  });

  it("applies the requested side position", () => {
    const { getByRole } = render(
      <Tooltip label="Pause timer" side="bottom">
        <button aria-label="Pause timer">Pause</button>
      </Tooltip>,
    );
    expect(getByRole("tooltip").className).toContain("top-full");
  });
});
