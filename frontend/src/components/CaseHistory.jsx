import { Link } from "react-router-dom";

const BADGE_STYLES = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
};

export default function CaseHistory({ cases }) {
  if (!cases || cases.length === 0) {
    return <p className="text-sm text-slate-500">No cases screened yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Officer</th>
            <th className="px-4 py-3">Risk</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.map((c) => (
            <tr key={c._id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600">
                {new Date(c.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-slate-600">{c.officer?.name || "—"}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${BADGE_STYLES[c.riskLevel]}`}>
                  {c.riskLevel} · {c.riskScore}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link to={`/cases/${c._id}`} className="text-blue-600 hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
