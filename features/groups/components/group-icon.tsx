import { isUploadedIconPath, publicAvatarUrl } from "@/features/groups/icon";
import { cn } from "@/lib/utils";

/**
 * グループアイコン表示。絵文字（iconPathに絵文字そのものが入る）と
 * アップロード画像（Storage path）の両方に対応する（issue #71）。
 * classNameで円のサイズ・枠線等を指定する想定
 * （例: "size-14 rounded-full border border-[#c038ff] ..."）。
 */
export function GroupIcon({
  iconPath,
  className,
}: {
  iconPath: string | null;
  className?: string;
}) {
  const containerClassName = cn(
    "flex shrink-0 items-center justify-center overflow-hidden",
    className,
  );

  if (iconPath && isUploadedIconPath(iconPath)) {
    return (
      <span className={containerClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAvatarUrl(iconPath)}
          alt=""
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={containerClassName} aria-hidden="true">
      {iconPath ?? "🌟"}
    </span>
  );
}
