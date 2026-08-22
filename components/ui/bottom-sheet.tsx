"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/**
 * モバイル縦画面向けの汎用ボトムシート。@base-ui/react/dialog ベース。
 * 下からスライドイン、オーバーレイ、閉じるボタン付き。
 *
 * 使い方:
 *   <BottomSheet open={open} onOpenChange={...}>
 *     <BottomSheetContent>
 *       <BottomSheetHeader>
 *         <BottomSheetTitle>タイトル</BottomSheetTitle>
 *         <BottomSheetClose />
 *       </BottomSheetHeader>
 *       <BottomSheetBody>…スクロールする中身…</BottomSheetBody>
 *     </BottomSheetContent>
 *   </BottomSheet>
 */
function BottomSheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function BottomSheetTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger {...props} />;
}

function BottomSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88svh] w-full max-w-[402px] flex-col rounded-t-[26px] border-x border-t border-[#c038ff]/70 bg-[#0b0312]/95 text-white shadow-[0_-6px_40px_rgba(138,43,226,0.4)] backdrop-blur-md transition-transform duration-300 ease-out outline-none data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-11 shrink-0 rounded-full bg-white/25"
        />
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function BottomSheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 px-[30px] pt-3 pb-2",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "truncate text-xl leading-tight font-bold [font-family:var(--font-noto-sans-jp)] [text-shadow:0_0_12px_rgba(208,66,255,0.9),0_0_36px_rgba(138,43,226,0.55)]",
        className,
      )}
      {...props}
    />
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function BottomSheetClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      aria-label="閉じる"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center text-[#c038ff] transition hover:text-[#d966ff] focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none active:translate-y-px",
        className,
      )}
      {...props}
    >
      {children ?? <CloseIcon />}
    </DialogPrimitive.Close>
  );
}

function BottomSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-[30px] pt-2 pb-[max(env(safe-area-inset-bottom),28px)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetClose,
  BottomSheetBody,
};
