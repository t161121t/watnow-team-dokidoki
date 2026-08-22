import Link from "next/link";

const auctionSteps = [
  {
    number: "01",
    title: "秘密を登録する",
    body: "恋愛、黒歴史、だれにも言ったことがないことなど、本人が公開してよい秘密を選択中のグループに登録します。登録しただけでは、まだオークションには出ません。",
  },
  {
    number: "02",
    title: "出品して、ディーラーを決める",
    body: "秘密を出品すると、出品者以外のメンバーからディーラーがランダムで選ばれます。ディーラーが承認すると、その秘密の競りが始まります。",
  },
  {
    number: "03",
    title: "ポイントで入札する",
    body: "入札者は、選択中のグループの残高を使って入札します。出品者は自分の秘密に入札できず、ディーラーもその競りには参加できません。",
  },
  {
    number: "04",
    title: "落札者だけが本文を読む",
    body: "競りが終わると、落札した人だけが秘密の本文を読めます。秘密の概要は競り中に見えても、本文は最後まで隠されたままです。",
  },
] as const;

const roles = [
  {
    title: "出品者",
    body: "秘密を登録・出品する人。自分が出品した秘密には入札できません。",
  },
  {
    title: "入札者",
    body: "ポイントを使って秘密に入札する人。落札すると、その秘密の本文を読めます。",
  },
  {
    title: "ディーラー",
    body: "出品者以外からランダムに選ばれる進行役。秘密の本文は見えず、その競りには入札できません。",
  },
] as const;

const challengeRules = [
  "チャレンジで獲得したポイントは、選択中のグループの財布にだけ加算",
  "所属している全グループへの一斉加算はしない",
  "承認は同じグループの他メンバー1人で完了",
  "自己承認は不可",
  "写真提出が必要なチャレンジは、提出写真を見て承認または却下",
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="rounded-md text-base font-bold tracking-[0.18em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            DOKIDOKI
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#c038ff]/90 bg-[#16041e]/75 px-5 text-sm font-bold text-white shadow-[0_0_14px_rgba(192,56,255,0.42)] transition hover:bg-[#2a0738] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            はじめる
          </Link>
        </div>
      </header>

      <section className="relative border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[440px] max-w-5xl bg-[radial-gradient(circle_at_center,rgba(192,56,255,0.22),transparent_66%)]" />
        <div className="relative mx-auto grid min-h-[720px] w-full max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-28">
          <div>
            <p className="mb-5 text-sm font-bold tracking-[0.18em] text-[#d966ff]">
              仲のいい友達だからこそ、まだ知らない一面がある。
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.06] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              秘密を競って、
              <br />
              いつもの友達に
              <br />
              もう一度ドキドキする。
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              ドキドキ秘密オークションは、仲のいい友達グループ向けのコミュニケーションゲームです。
              チャレンジでポイントを集め、友達の秘密をオークションで落札。本文を読めるのは、落札した人だけです。
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex min-h-[58px] items-center justify-center rounded-full border-2 border-[#c038ff] bg-black/80 px-8 text-base font-bold text-white shadow-[0_0_50px_rgba(138,43,226,0.32),0_0_16px_2px_rgba(192,56,255,0.72)] transition hover:bg-[#22052d] hover:shadow-[0_0_42px_rgba(138,43,226,0.48),0_0_20px_3px_rgba(192,56,255,0.82)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                グループで遊びはじめる
              </Link>
              <a
                href="#how-it-works"
                className="rounded-md px-2 py-2 text-sm font-bold text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff]"
              >
                遊び方を見る
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[430px] rounded-[30px] border border-[#b72dff]/80 bg-black/70 p-5 shadow-[0_0_28px_rgba(192,56,255,0.24),inset_0_0_24px_rgba(82,18,110,0.13)] backdrop-blur-sm">
            <div className="border-b border-white/10 pb-5">
              <p className="text-xs font-bold tracking-[0.18em] text-white/45">AUCTION PREVIEW</p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-white/55">カテゴリ</p>
                  <p className="mt-1 text-2xl font-black">恋愛</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/55">現在価格</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    1,240
                    <span className="ml-1 text-base text-[#d953ff]">pt</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="py-6">
              <p className="text-sm font-bold text-[#d966ff]">この秘密の概要</p>
              <p className="mt-3 text-2xl font-bold leading-relaxed">
                友達には一度も話していない、初恋のときの話。
              </p>
              <div className="mt-6 rounded-[22px] border border-white/12 bg-white/[0.04] p-5">
                <p className="text-xs font-bold tracking-[0.14em] text-white/45">SECRET BODY</p>
                <p className="mt-3 text-sm leading-7 text-white/44">
                  本文は落札するまで表示されません。
                  <br />
                  知れるのは、この競りを勝ち取った人だけ。
                </p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">残り時間</span>
                <span className="font-bold">03:18:42</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-[#d966ff]">WHY DOKIDOKI</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                仲が良くても、
                <br />
                話すきっかけがないことはある。
              </h2>
            </div>
            <div className="max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              <p>
                友達の知らなかった過去、隠していた面白いエピソード、意外な一面。知ったらもっと話したくなることがあっても、自分から突然切り出すのは難しいことがあります。
              </p>
              <p className="mt-5">
                そこで、秘密をただ公開するのではなく、ポイントとオークションというゲームに変える。どの秘密に使うか、今入札するか、どこまで出すか。その駆け引きが、会話のきっかけとドキドキをつくります。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/10 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-bold tracking-[0.18em] text-[#d966ff]">HOW IT WORKS</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              秘密オークションの流れ
            </h2>
            <p className="mt-5 text-base leading-8 text-white/62 sm:text-lg">
              秘密は選択中のグループの中だけで扱われます。ポイント、秘密、オークションは他のグループと混ざりません。
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 md:grid-cols-2">
            {auctionSteps.map((step) => (
              <article key={step.number} className="bg-black p-7 sm:p-9">
                <p className="text-sm font-black tracking-[0.14em] text-[#d966ff]">{step.number}</p>
                <h3 className="mt-4 text-2xl font-black">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/62 sm:text-base">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-[#d966ff]">THREE ROLES</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                1つの競りに、3つの役割。
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
                役割を分けることで、秘密を売る人、競る人、場を進める人が同じ立場にならないようにします。
              </p>
            </div>
            <div className="space-y-4">
              {roles.map((role) => (
                <article
                  key={role.title}
                  className="rounded-[24px] border border-[#b72dff]/55 bg-black/70 p-6 shadow-[0_0_18px_rgba(192,56,255,0.12)]"
                >
                  <h3 className="text-xl font-black">{role.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/62 sm:text-base">{role.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10">
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-[#d966ff]">CHALLENGE</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              ポイントは、チャレンジで増やす。
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/62 sm:text-lg">
              特定のチャレンジに挑戦し、同じグループの他メンバー1人が承認するとポイントを獲得できます。写真提出が必要なら、提出された写真を見て承認するか却下します。
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-7 sm:p-8">
            <p className="text-xs font-bold tracking-[0.16em] text-white/45">CHALLENGE RULES</p>
            <ul className="mt-6 divide-y divide-white/10">
              {challengeRules.map((rule, index) => (
                <li key={rule} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                  <span className="min-w-7 text-sm font-black text-[#d966ff]">0{index + 1}</span>
                  <span className="text-sm leading-7 text-white/72 sm:text-base">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-[34px] border border-[#b72dff]/70 bg-[#100316] px-6 py-14 text-center shadow-[0_0_32px_rgba(192,56,255,0.18)] sm:px-10 sm:py-18">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center_top,rgba(192,56,255,0.18),transparent_58%)]" />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-sm font-bold tracking-[0.18em] text-[#d966ff]">START</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                次に知る秘密は、誰のものだろう。
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/62">
                グループを作って、チャレンジでポイントを集めて、友達の秘密を競る。いつもの関係に、少しだけ新しい緊張感を加えます。
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex min-h-[58px] items-center justify-center rounded-full border-2 border-[#c038ff] bg-black/80 px-8 text-base font-bold text-white shadow-[0_0_50px_rgba(138,43,226,0.32),0_0_16px_2px_rgba(192,56,255,0.72)] transition hover:bg-[#22052d] hover:shadow-[0_0_42px_rgba(138,43,226,0.48),0_0_20px_3px_rgba(192,56,255,0.82)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                はじめる
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-white/38 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>DOKIDOKI SECRET AUCTION</p>
          <p>本人が公開してよい秘密だけを扱ってください。</p>
        </div>
      </footer>
    </main>
  );
}
