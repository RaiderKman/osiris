'use client';

/** Token analyzer iframe is not part of this local build. */
export default function DonBotScan(_props: {
  initial?: string | null;
  onScan?: (query: string | null) => void;
} = {}) {
  return (
    <p className="p-3 text-[12px] text-[var(--text-muted)]">
      Token and wallet tools are disabled in this local build.
    </p>
  );
}
