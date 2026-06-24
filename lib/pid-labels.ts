/** P-ID（promptTypeId）の自然言語ラベル定義。llms.txt / Entity ページ等で共用する */
export const PID_LABELS: Record<string, string> = {
  'P-01': '選定・相談',
  'P-02': '比較・違い',
  'P-03': 'ランキング・候補',
  'P-04': '課題解決',
  'P-05': '出典・引用',
  'P-06': '推薦理由',
};

export const PID_COLORS: Record<string, string> = {
  'P-01': 'bg-violet-50 text-violet-700 border-violet-200',
  'P-02': 'bg-blue-50 text-blue-700 border-blue-200',
  'P-03': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'P-04': 'bg-amber-50 text-amber-700 border-amber-200',
  'P-05': 'bg-green-50 text-green-700 border-green-200',
  'P-06': 'bg-rose-50 text-rose-700 border-rose-200',
};
