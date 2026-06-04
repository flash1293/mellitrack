interface ErrorBannerProps {
  message: string | null
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null
  return (
    <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      {message}
    </p>
  )
}
