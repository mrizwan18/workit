"use client";

interface AshamedModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const REPRIMAND = [
  "Two weekdays in a row with no workout. That’s not improvement — that’s giving up.",
  "You had one job: move. You didn’t. Own it.",
  "Rest days are for weekends. You skipped two weekdays. Reset and show up next time.",
];

export function AshamedModal({ open, onClose, onConfirm }: AshamedModalProps) {
  if (!open) return null;

  const message = REPRIMAND[Math.floor(Math.random() * REPRIMAND.length)];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ashamed-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-surface p-6 shadow-xl">
        <h2 id="ashamed-title" className="text-lg font-semibold text-red-400">
          I am ashamed
        </h2>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
        <p className="mt-2 text-xs text-slate-500">
          This reset will be recorded. Weekends are rest days; weekdays are not.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
