import FormButton from '../ui/FormButton'

interface SaveCancelButtonsProps {
  onCancel: () => void
  onSubmit: () => void
  saving: boolean
  disabled: boolean
}

export default function SaveCancelButtons({ onCancel, onSubmit, saving, disabled }: SaveCancelButtonsProps) {
  return (
    <div className="flex gap-3">
      <FormButton variant="secondary" onClick={onCancel} className="flex-1">
        Abbrechen
      </FormButton>
      <FormButton onClick={onSubmit} loading={saving} disabled={disabled} className="flex-1">
        Speichern
      </FormButton>
    </div>
  )
}
