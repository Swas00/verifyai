const LEVEL_STYLES = {
  HIGH: "bg-red-50 text-red-700 ring-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-green-50 text-green-700 ring-green-200",
};

export default function RiskCard({ analysis }) {
  if (!analysis) return null;

  const { risk, mrz, viz, face_match: face, blacklist } = analysis;
  const style = LEVEL_STYLES[risk.level] || LEVEL_STYLES.LOW;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Result</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${style}`}>
          {risk.level} · {risk.score}
        </span>
      </div>

      {(viz?.surname || viz?.given_names) && (
        <p className="mt-3 text-sm text-slate-700">
          {viz.given_names || ""} {viz.surname || ""}
          {mrz?.nationality && <span className="text-slate-400"> · {mrz.nationality}</span>}
        </p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Face match</dt>
          <dd className="font-medium text-slate-800">
            {face?.found ? `${(face.score * 100).toFixed(0)}% ${face.match ? "(match)" : "(mismatch)"}` : "unverifiable"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Blacklist</dt>
          <dd className={`font-medium ${blacklist?.hit ? "text-red-600" : "text-slate-800"}`}>
            {blacklist?.checked ? (blacklist.hit ? "HIT" : "clear") : "not checked"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Why</p>
        <ul className="space-y-1 text-sm text-slate-600">
          {risk.reasons.length === 0 ? (
            <li>No risk factors found.</li>
          ) : (
            risk.reasons.map((reason, i) => <li key={i}>{reason}</li>)
          )}
        </ul>
      </div>
    </div>
  );
}
