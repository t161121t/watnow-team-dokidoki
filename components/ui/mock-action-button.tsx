"use client";

import { useEffect, useState } from "react";

import { NeonButton } from "@/components/ui/neon-button";

type Props = Omit<React.ComponentProps<typeof NeonButton>, "onClick"> & {
  feedback: string;
};

export function MockActionButton({ children, feedback, ...props }: Props) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => setMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <>
      <NeonButton onClick={() => setMessage(feedback)} {...props}>
        {children}
      </NeonButton>
      {message ? (
        <div
          role="status"
          className="fixed bottom-[104px] left-1/2 z-50 w-[calc(100%-48px)] max-w-[354px] -translate-x-1/2 rounded-2xl border border-[#c038ff] bg-[#14031c]/95 px-4 py-3 text-center text-sm font-bold text-white shadow-[0_0_24px_rgba(192,56,255,0.55)]"
        >
          {message}
        </div>
      ) : null}
    </>
  );
}

