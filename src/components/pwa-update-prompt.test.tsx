import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";

const pwaMock = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [pwaMock.needRefresh, pwaMock.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: pwaMock.updateServiceWorker,
  }),
}));

describe("PwaUpdatePrompt", () => {
  beforeEach(() => {
    pwaMock.needRefresh = false;
    pwaMock.setNeedRefresh.mockReset();
    pwaMock.updateServiceWorker.mockReset().mockResolvedValue(undefined);
  });

  it("stays hidden when an update is not waiting", () => {
    render(<PwaUpdatePrompt />);

    expect(screen.queryByText("新しいバージョンがあります")).not.toBeInTheDocument();
  });

  it("updates the service worker after user confirmation", async () => {
    pwaMock.needRefresh = true;
    const user = userEvent.setup();
    render(<PwaUpdatePrompt />);

    await user.click(screen.getByRole("button", { name: "今すぐ更新" }));

    expect(pwaMock.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("dismisses the update for later", async () => {
    pwaMock.needRefresh = true;
    const user = userEvent.setup();
    render(<PwaUpdatePrompt />);

    await user.click(screen.getByRole("button", { name: "あとで" }));

    expect(pwaMock.setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it("shows a retryable message when updating fails", async () => {
    pwaMock.needRefresh = true;
    pwaMock.updateServiceWorker.mockRejectedValueOnce(new Error("update failed"));
    const user = userEvent.setup();
    render(<PwaUpdatePrompt />);

    await user.click(screen.getByRole("button", { name: "今すぐ更新" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("更新できませんでした");
    expect(screen.getByRole("button", { name: "今すぐ更新" })).toBeEnabled();
  });
});
