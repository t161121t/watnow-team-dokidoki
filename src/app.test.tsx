import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "@/app";

describe("App", () => {
  it("renders the environment-ready placeholder", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "watnow-team-dokidoki" })).toBeInTheDocument();
  });
});
