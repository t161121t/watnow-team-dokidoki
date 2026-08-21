import Link from "next/link";

import { NeonCard } from "@/components/ui/neon-card";
import type { Group } from "@/lib/types/group";

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link href={`/groups/${group.id}`} className="group block focus-visible:outline-none">
      <NeonCard className="p-4 transition group-hover:-translate-y-0.5 group-hover:border-[#dd62ff] group-focus-visible:ring-2 group-focus-visible:ring-[#c038ff]">
        <div className="flex items-center gap-3.5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#cf56ff]/75 bg-[#1c0525] text-[26px] shadow-[0_0_18px_rgba(192,56,255,0.4)]">
            {group.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-bold">{group.name}</h2>
              {group.role === "admin" ? (
                <span className="shrink-0 rounded-full bg-[#c038ff]/18 px-2 py-1 text-[9px] font-bold text-[#efb4ff]">
                  管理者
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-white/55">
              <span>{group.memberCount}人</span>
              <span className="font-bold text-white/80">
                {group.balance.toLocaleString()}pt
              </span>
            </div>
          </div>
        </div>
      </NeonCard>
    </Link>
  );
}
