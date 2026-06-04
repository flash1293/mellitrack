import FormButton from '../ui/FormButton'

interface DraftRestoreBannerProps {
  date: string
  onDiscard: () => void
}

export default function DraftRestoreBanner({ date, onDiscard }: DraftRestoreBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <p className="text-sm text-amber-800">
        ✨ Entwurf vom {new Date(date).toLocaleDateString('de-DE')} wurde wiederhergestellt.
        Deine Eingaben sind sicher und werden fortlaufend gespeichert.
      </p>
      <div className="flex gap-2">
        <FormButton variant="secondary" onClick={onDiscard} className="px-4 py-2 text-sm border-amber-300 text-amber-700 hover:bg-amber-100">
          Entwurf verwerfen
        </FormButton>
      </div>
    </div>
  )
}
