interface SaveCancelButtonsProps {
  onCancel: () => void
  onSubmit: () => void
  saving: boolean
  disabled: boolean
}

export default function SaveCancelButtons({ onCancel, onSubmit, saving, disabled }: SaveCancelButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
      >
        Abbrechen
      </button>
      <button
        onClick={onSubmit}
        disabled={saving || disabled}
        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </div>
  )
}
