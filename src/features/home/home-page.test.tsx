import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/features/home/home-page";

describe("HomePage", () => {
  it("renders the environment-ready placeholder", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "watnow-team-dokidoki" })).toBeInTheDocument();
  });
});
