import type { ExerciseCategory } from '../../../shared/types'

interface DateCategoryPickerProps {
  date: string
  onDateChange: (date: string) => void
  categories: ExerciseCategory[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
  disabled: boolean
}

export default function DateCategoryPicker({
  date,
  onDateChange,
  categories,
  selectedCategory,
  onCategoryChange,
  disabled,
}: DateCategoryPickerProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
