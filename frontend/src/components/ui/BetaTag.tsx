export default function BetaTag({ label = 'BETA V0.1' }: { label?: string }) {
  return <span className="mono-tag">{label}</span>;
}
