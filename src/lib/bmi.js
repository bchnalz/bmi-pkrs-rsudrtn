export const CATEGORY_CONFIG = {
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
  Gemuk: {
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
  if (bmi < 18.5) return 'Kurus'
  if (bmi <= 22.9) return 'Normal'
  if (bmi <= 27.4) return 'Gemuk'
  return 'Obesitas'
}
