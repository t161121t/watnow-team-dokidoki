import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);

  if (!needRefresh) {
    return null;
  }

  async function handleUpdate() {
    setIsUpdating(true);
    setUpdateFailed(false);

    try {
      await updateServiceWorker(true);
    } catch {
      setUpdateFailed(true);
      setIsUpdating(false);
    }
  }

  return (
    <aside
      aria-labelledby="pwa-update-title"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border bg-background p-4 text-foreground shadow-lg"
    >
      <p id="pwa-update-title" className="font-semibold">
        新しいバージョンがあります
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        入力中の内容を保存してから更新してください。
      </p>
      {updateFailed ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          更新できませんでした。通信状態を確認して、もう一度お試しください。
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
          disabled={isUpdating}
          onClick={() => setNeedRefresh(false)}
          type="button"
        >
          あとで
        </button>
        <button
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={isUpdating}
          onClick={() => void handleUpdate()}
          type="button"
        >
          {isUpdating ? "更新中…" : "今すぐ更新"}
        </button>
      </div>
    </aside>
  );
}
