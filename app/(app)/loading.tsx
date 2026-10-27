// Shown while a server-rendered screen loads. Skeleton rows match the table shape used across the app.
export default function Loading() {
  return (
    <div className="max-w-[1400px]" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-48 rounded-sm bg-line animate-pulse" />
      <div className="mt-4 grid grid-cols-5 divide-x divide-line border border-line bg-surface rounded">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-4 py-3"><div className="h-2.5 w-24 rounded-sm bg-line animate-pulse" /><div className="mt-2 h-6 w-16 rounded-sm bg-line animate-pulse" /></div>)}</div>
      <div className="mt-4 border border-line bg-surface rounded"><table className="w-full"><tbody>{Array.from({ length: 9 }).map((_, i) => <tr key={i}>{[140, 200, 90, 120, 70, 160].map((w, j) => <td key={j} className="td"><div className="h-3 rounded-sm bg-line animate-pulse" style={{ width: w }} /></td>)}</tr>)}</tbody></table></div>
    </div>
  );
}
