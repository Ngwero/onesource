type Props = {
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
};

export function Toast({ message, dismissLabel, onDismiss }: Props) {
  return (
    <div className="app-toast-container" role="status" aria-live="polite">
      <div className="app-toast">
        <svg
          className="app-toast-icon"
          viewBox="0 0 24 24"
          width={20}
          height={20}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
        <span className="app-toast-message">{message}</span>
        <button
          type="button"
          className="app-toast-dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
