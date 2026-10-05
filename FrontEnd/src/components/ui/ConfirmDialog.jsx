import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Confirmation dialog used before destructive actions
 * such as deleting a lead, contact, task, or other record.
 *
 * Responsive behavior:
 * - Icon remains fixed-size.
 * - Message can wrap naturally on smaller screens.
 * - Footer buttons remain usable on mobile.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
}) {
  function handleConfirm() {
    onConfirm?.()
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>

          <Button
            variant={tone}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-red-50
            text-red-600
          "
          aria-hidden="true"
        >
          <AlertTriangle className="h-5 w-5" />
        </span>

        <p className="min-w-0 flex-1 pt-1 text-sm leading-5 text-slate-600">
          {message}
        </p>
      </div>
    </Modal>
  )
}