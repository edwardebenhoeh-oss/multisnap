'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ProgressSteps — Full-screen loading overlay used during detection and
// listing-generation phases. Shows a dual-ring spinner, a dynamic title/
// subtitle, and a row of step pills.
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressStepsProps {
  title: string;
  subtitle: string;
  steps: string[];
  /** Index of the currently-active step (0-based). */
  currentStep: number;
}

export default function ProgressSteps({
  title,
  subtitle,
  steps,
  currentStep,
}: ProgressStepsProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        minHeight: '60vh',
        padding: '0 24px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Dual-ring spinner */}
      <div className="relative w-14 h-14 mb-7">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'ms-spin 0.9s linear infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            inset: 7,
            border: '2px solid transparent',
            borderTopColor: 'var(--accent2)',
            animation: 'ms-spin 0.6s linear infinite reverse',
          }}
        />
      </div>

      {/* Title + subtitle */}
      <div
        className="text-xl font-extrabold mb-2"
        style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}
      >
        {title}
      </div>
      <div
        className="text-sm mb-7 max-w-xs leading-relaxed"
        style={{ color: 'var(--muted)' }}
      >
        {subtitle}
      </div>

      {/* Step pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <span
              key={step}
              className="text-xs font-medium px-4 py-1.5 rounded-full transition-all"
              style={{
                background: isActive
                  ? 'rgba(108,99,255,0.12)'
                  : isDone
                  ? 'transparent'
                  : 'var(--surface2)',
                border: `1px solid ${
                  isActive
                    ? 'var(--accent)'
                    : isDone
                    ? 'var(--border)'
                    : 'var(--border)'
                }`,
                color: isActive
                  ? 'var(--accent)'
                  : isDone
                  ? 'var(--muted)'
                  : 'var(--muted)',
              }}
            >
              {isDone ? '✓ ' : ''}
              {step}
            </span>
          );
        })}
      </div>

      {/* Spin keyframes injected inline so no global CSS dependency */}
      <style>{`
        @keyframes ms-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
