export const CATEGORY_CONFIG = {
  'BB Kurang': {
    colorClass: 'text-cyan-500',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    tip: 'Tambahkan asupan energi dan protein secara bertahap. Pantau berat badan rutin dan konsultasi gizi bila perlu.',
  },
  Kurus: {
    colorClass: 'text-sky-500',
    badgeClass: 'bg-sky-100 text-sky-700',
    tip: 'Tingkatkan asupan kalori sehat dan protein. Pertimbangkan konsultasi gizi untuk rencana makan yang aman.',
  },
  Normal: {
    colorClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    tip: 'Pertahankan pola makan seimbang, tetap aktif bergerak, dan lakukan pemantauan berat badan secara berkala.',
  },
  'BB Berlebih': {
    colorClass: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700',
    tip: 'Kurangi gula serta makanan ultra-proses, tambah aktivitas fisik rutin, dan atur porsi makan harian.',
  },
  Obesitas: {
    colorClass: 'text-rose-500',
    badgeClass: 'bg-rose-100 text-rose-700',
    tip: 'Mulai perubahan bertahap pada pola makan dan aktivitas. Konsultasi dengan tenaga medis sangat dianjurkan.',
  },
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function classifyBMI(bmi) {
  if (bmi < 17) return 'BB Kurang'
  if (bmi <= 18.4) return 'Kurus'
  if (bmi <= 25) return 'Normal'
  if (bmi <= 27) return 'BB Berlebih'
  return 'Obesitas'
}
