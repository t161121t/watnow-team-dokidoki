/** UIの「8月10日」のような簡易日付ラベル表示用。 */
export function formatDateLabel(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** UIの「14:30」のような簡易時刻ラベル表示用。 */
export function formatTimeLabel(date: Date): string {
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}
