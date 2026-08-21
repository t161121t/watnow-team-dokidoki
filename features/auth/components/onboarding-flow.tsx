"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-field";
import { Label } from "@/components/ui/label";
import type { LoginInput } from "@/features/auth/validation";
import { loginSchema } from "@/features/auth/validation";

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

export function LoginScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const submitLogin = () => {
    setIsSubmitting(true);
    window.setTimeout(() => router.push("/groups"), 450);
  };

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[520px] -translate-x-1/2 bg-[url('/onboarding-background.png')] bg-[length:auto_120%] bg-bottom bg-no-repeat shadow-[0_0_90px_rgba(93,22,136,0.16)]">
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <section
        className="relative mx-auto h-[max(880px,100svh)] w-[402px] max-w-full overflow-hidden bg-transparent"
        data-node-id="178:39"
        aria-labelledby="login-title"
      >
        <h1
          id="login-title"
          className="absolute top-[133px] left-1/2 w-[min(324px,calc(100%-60px))] -translate-x-1/2 whitespace-nowrap text-center text-[clamp(31px,8.95vw,36px)] leading-normal font-bold [font-family:var(--font-noto-sans-jp)] [text-shadow:0_0_14px_rgba(208,66,255,0.9),0_0_50px_rgba(138,43,226,0.5)]"
        >
          秘密オークションへ
        </h1>
        <p className="absolute top-[193px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[clamp(31px,8.95vw,36px)] leading-normal font-bold [font-family:var(--font-noto-sans-jp)] [text-shadow:0_0_14px_rgba(208,66,255,0.9),0_0_50px_rgba(138,43,226,0.5)]">
          ようこそ
        </p>

        <form
          id="login-form"
          className="absolute top-[278px] left-[30px] w-[calc(100%-60px)] max-w-[342px]"
          onSubmit={form.handleSubmit(submitLogin)}
          noValidate
        >
          <div className="ml-[7px] flex w-full flex-col gap-1.5">
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
              placeholder="••••••••"
              autoComplete="current-password"
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

          <button
            type="button"
            className="mt-6 ml-auto block bg-transparent p-0 text-[14px] leading-normal font-bold text-white [font-family:var(--font-noto-sans-jp)]"
          >
            パスワードを忘れた方はこちら
          </button>

          <NeonButton
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            size="lg"
            className="mt-[22px] h-[77px] min-h-[77px] w-full py-[15px] text-[20px] leading-normal"
          >
            {isSubmitting ? "ログイン中…" : "ログイン"}
          </NeonButton>

          <div
            className="mt-6 flex h-[47px] items-center gap-2.5 overflow-hidden text-[14px] leading-normal font-medium text-white [font-family:var(--font-noto-sans-jp)]"
            aria-hidden="true"
          >
            <span className="h-[1.5px] min-w-px flex-1 bg-[#b75ee3]" />
            または
            <span className="h-[1.5px] min-w-px flex-1 bg-[#b75ee3]" />
          </div>

          <p className="mt-3 flex items-start justify-center gap-1.5 overflow-hidden whitespace-nowrap text-[14px] leading-normal text-white [font-family:var(--font-noto-sans-jp)]">
            <span className="font-medium">アカウントをお持ちでない方は</span>
            <button
              type="button"
              className="bg-transparent p-0 font-bold text-white"
            >
              新規登録
            </button>
          </p>
        </form>

      </section>
    </main>
  );
}
