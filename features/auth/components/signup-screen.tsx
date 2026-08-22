"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-field";
import { Label } from "@/components/ui/label";
import { GoogleContinueButton } from "@/features/auth/components/google-continue-button";
import { signUpWithPassword } from "@/features/auth/actions";
import type { SignupInput } from "@/features/auth/validation";
import { signupSchema } from "@/features/auth/validation";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p
      id={id}
      className="mt-1.5 text-[13px] leading-normal font-bold text-[#ffb4c9]"
      role="alert"
    >
      {message}
    </p>
  );
}

export function SignupScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", nickname: "" },
    mode: "onTouched",
  });

  const submitSignup = async (values: SignupInput) => {
    setSubmitError(null);
    setIsSubmitting(true);
    // メール確認不要な場合はsignUpWithPassword内でredirect()する
    // （このPromiseは解決せずブラウザが遷移する）。確認が必要な場合のみ
    // confirmationRequiredがtrueで返り、ここで完了メッセージに切り替える。
    try {
      const result = await signUpWithPassword({
        email: values.email,
        password: values.password,
        nickname: values.nickname,
        redirectTo: "/groups",
      });
      if (result.confirmationRequired) {
        setConfirmationSent(true);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "登録に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-svh bg-black text-white">
      <section
        className="relative mx-auto min-h-[max(880px,100svh)] w-[402px] max-w-full overflow-hidden bg-black"
        aria-labelledby="signup-title"
      >
        <Image
          src="/onboarding-background.png"
          alt=""
          fill
          priority
          sizes="(max-width: 402px) 100vw, 402px"
          className="pointer-events-none object-cover object-bottom"
        />

        <h1
          id="signup-title"
          className="absolute top-[88px] left-1/2 w-[min(324px,calc(100%-60px))] -translate-x-1/2 text-center text-[clamp(31px,8.95vw,36px)] leading-normal font-bold [font-family:var(--font-noto-sans-jp)] [text-shadow:0_0_14px_rgba(208,66,255,0.9),0_0_50px_rgba(138,43,226,0.5)]"
        >
          新規登録
        </h1>

        {confirmationSent ? (
          <div
            role="status"
            className="absolute top-[188px] left-[30px] w-[calc(100%-60px)] max-w-[342px] rounded-2xl border-[1.5px] border-[#c038ff] bg-black/60 p-6 text-[14px] leading-relaxed font-medium text-white shadow-[0_0_16px_0_#d042ff] [font-family:var(--font-noto-sans-jp)]"
          >
            確認メールを送信しました。メール内のリンクを開いて登録を完了してください。
          </div>
        ) : (
        <form
          className="absolute top-[188px] left-[30px] w-[calc(100%-60px)] max-w-[342px]"
          onSubmit={form.handleSubmit(submitSignup)}
          noValidate
        >
          <div className="ml-[7px] flex w-full flex-col gap-1.5">
            <Label
              htmlFor="nickname"
              className="text-[14px] leading-normal font-bold text-white [font-family:var(--font-noto-sans-jp)]"
            >
              ニックネーム
            </Label>
            <NeonInput
              {...form.register("nickname")}
              id="nickname"
              type="text"
              maxLength={20}
              placeholder="表示名を入力"
              autoComplete="nickname"
              aria-invalid={Boolean(form.formState.errors.nickname)}
              aria-describedby={
                form.formState.errors.nickname ? "nickname-error" : undefined
              }
              className="h-14 py-[13px] text-[13.5px] leading-normal font-normal"
            />
            <FieldError
              id="nickname-error"
              message={form.formState.errors.nickname?.message}
            />
          </div>

          <div className="mt-6 ml-[7px] flex w-full flex-col gap-1.5">
            <Label
              htmlFor="email"
              className="text-[14px] leading-normal font-bold text-white [font-family:var(--font-noto-sans-jp)]"
            >
              メールアドレス
            </Label>
            <NeonInput
              {...form.register("email")}
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              className="h-14 py-[13px] text-[13.5px] leading-normal font-normal"
            />
            <FieldError id="email-error" message={form.formState.errors.email?.message} />
          </div>

          <div className="mt-6 ml-[7px] flex w-full flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-[14px] leading-normal font-bold text-white [font-family:var(--font-noto-sans-jp)]"
            >
              パスワード
            </Label>
            <NeonInput
              {...form.register("password")}
              id="password"
              type="password"
              placeholder="8文字以上"
              autoComplete="new-password"
              aria-invalid={Boolean(form.formState.errors.password)}
              aria-describedby={
                form.formState.errors.password ? "password-error" : undefined
              }
              className="h-14 py-[13px] text-[13.5px] leading-normal font-normal"
            />
            <FieldError
              id="password-error"
              message={form.formState.errors.password?.message}
            />
          </div>

          <FieldError id="signup-error" message={submitError ?? undefined} />

          <NeonButton
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            size="lg"
            className="mt-[28px] h-[77px] min-h-[77px] w-full py-[15px] text-[20px] leading-normal"
          >
            {isSubmitting ? "登録中…" : "登録する"}
          </NeonButton>

          <div
            className="mt-6 flex h-[47px] items-center gap-2.5 overflow-hidden text-[14px] leading-normal font-medium text-white [font-family:var(--font-noto-sans-jp)]"
            aria-hidden="true"
          >
            <span className="h-[1.5px] min-w-px flex-1 bg-[#b75ee3]" />
            または
            <span className="h-[1.5px] min-w-px flex-1 bg-[#b75ee3]" />
          </div>

          <GoogleContinueButton />

          <p className="mt-6 flex items-start justify-center gap-1.5 overflow-hidden whitespace-nowrap text-[14px] leading-normal text-white [font-family:var(--font-noto-sans-jp)]">
            <span className="font-medium">アカウントをお持ちの方は</span>
            <Link href="/login" className="bg-transparent p-0 font-bold text-white">
              ログイン
            </Link>
          </p>
        </form>
        )}
      </section>
    </main>
  );
}
