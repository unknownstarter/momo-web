interface PaidSectionCardProps {
  title: string;
  body: string;
}

export function PaidSectionCard({ title, body }: PaidSectionCardProps) {
  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] text-ink-muted leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
