import { Button } from './Button';
import { StatusBanner } from './StatusBanner';

interface ConfirmBarProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmBar({ message, confirmLabel, onConfirm, onCancel }: ConfirmBarProps) {
  return (
    <StatusBanner
      tone="warn"
      actions={
        <>
          <Button size="sm" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      {message}
    </StatusBanner>
  );
}
