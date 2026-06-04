interface EmptyStateProps {
  icon?: string
  message: string
  secondaryMessage?: string
  ctaText?: string
  onCtaClick?: () => void
}

export default function EmptyState({
  icon,
  message,
  secondaryMessage,
  ctaText,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl p-8 text-center shadow-sm">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <p className="text-gray-500">{message}</p>
      {secondaryMessage && (
        <p className="text-sm text-gray-400 mt-2">{secondaryMessage}</p>
      )}
      {ctaText && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-4 text-blue-600 font-medium hover:underline"
        >
          {ctaText}
        </button>
      )}
    </div>
  )
}
