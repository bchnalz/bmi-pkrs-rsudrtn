import { clamp } from '../lib/bmi'

function NumberInputWithStepper({ id, label, value, onChange, min, max, step = 1, unit, error }) {
  const numericValue = Number(value) || 0

  const handleAdjust = (delta) => {
    const nextValue = clamp(numericValue + delta, min, max)
    onChange(String(nextValue))
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#1A2E44]">
        {label}
      </label>
      <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => handleAdjust(-step)}
          className="flex h-12 w-12 items-center justify-center rounded-l-2xl bg-slate-50 text-xl font-bold text-[#1A2E44] active:scale-95"
          aria-label={`Kurangi ${label}`}
        >
          -
        </button>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(event.target.value)}
          className="no-spinner h-12 w-full border-0 px-3 text-center text-base font-semibold text-[#1A2E44] focus:outline-none"
          placeholder={`Masukkan ${label.toLowerCase()}`}
        />
        <div className="pr-2 text-sm text-slate-500">{unit}</div>
        <button
          type="button"
          onClick={() => handleAdjust(step)}
          className="flex h-12 w-12 items-center justify-center rounded-r-2xl bg-slate-50 text-xl font-bold text-[#1A2E44] active:scale-95"
          aria-label={`Tambah ${label}`}
        >
          +
        </button>
      </div>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}

export default NumberInputWithStepper
