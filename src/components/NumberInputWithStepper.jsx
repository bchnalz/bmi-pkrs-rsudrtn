import { clamp } from '../lib/bmi'
import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

function NumberInputWithStepper({ id, label, value, onChange, min, max, step = 1, unit, error }) {
  const numericValue = Number(value) || 0

  const handleAdjust = (delta) => {
    const nextValue = clamp(numericValue + delta, min, max)
    onChange(String(nextValue))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block text-center">
        {label}
      </Label>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <motion.div whileTap={{ scale: 0.9, y: 1 }}>
          <Button type="button" variant="outline" size="icon" onClick={() => handleAdjust(-step)} aria-label={`Kurangi ${label}`}>
            -
          </Button>
        </motion.div>
        <div className="flex min-h-12 items-center rounded-xl px-1">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(event) => onChange(event.target.value)}
            className="no-spinner h-12 border-[color:color-mix(in_oklab,var(--foreground)_22%,transparent)] bg-[var(--card)] text-center text-base font-medium md:text-sm"
            placeholder={`Masukkan ${label.toLowerCase()}`}
          />
          {unit ? <div className="pl-1 text-sm text-[var(--muted-foreground)]">{unit}</div> : null}
        </div>
        <motion.div whileTap={{ scale: 0.84, y: 1, boxShadow: '0 0 0 4px rgba(59,130,246,0.22)' }}>
          <Button type="button" variant="outline" size="icon" onClick={() => handleAdjust(step)} aria-label={`Tambah ${label}`}>
            +
          </Button>
        </motion.div>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}

export default NumberInputWithStepper
