"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NeonButton } from "@/components/ui/neon-button";
import { approveChallenge } from "@/features/challenges/actions";

export function ChallengeApprovalActions({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const decide = async (decision: "approved" | "rejected") => {
    setIsSubmitting(true);
    setMessage("");
    try {
      await approveChallenge({ attemptId, decision });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NeonButton
          variant="danger"
          size="sm"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => decide("rejected")}
        >
          却下
        </NeonButton>
        <NeonButton
          size="sm"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={() => decide("approved")}
        >
          承認
        </NeonButton>
      </div>
      {message ? (
        <p role="alert" className="mt-2 text-[11px] font-bold text-[#ffb4c9]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
