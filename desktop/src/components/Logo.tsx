export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark-wrap">
      <div className="brand-mark" aria-hidden="true">
        <span className="brand-mark-dot" />
        <span className="brand-mark-wave wave-one" />
        <span className="brand-mark-wave wave-two" />
      </div>
      {!compact && (
        <div>
          <div className="brand-name">Attendly</div>
          <div className="brand-subtitle">School Operations</div>
        </div>
      )}
    </div>
  );
}
