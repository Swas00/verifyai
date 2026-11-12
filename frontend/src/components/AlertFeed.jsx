export default function AlertFeed({ cases }) {
  const highRisk = (cases || []).filter((c) => c.riskLevel === "HIGH").slice(0, 5);

  if (highRisk.length === 0) return null;

  return (
    <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <p className="mb-2 text-sm font-semibold text-red-800">
        {highRisk.length} high-risk case{highRisk.length > 1 ? "s" : ""} recently flagged
      </p>
      <ul className="space-y-1 text-sm text-red-700">
        {highRisk.map((c) => (
          <li key={c._id}>
            Score {c.riskScore} — {new Date(c.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
