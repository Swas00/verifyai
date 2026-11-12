import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCase } from "../services/api";
import RiskCard from "../components/RiskCard";

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCase(id)
      .then(setCaseData)
      .catch((err) => setError(err.response?.data?.error || "Could not load case"));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {caseData && (
          <>
            <h1 className="mb-4 text-xl font-bold text-slate-900">Case {caseData._id}</h1>
            <RiskCard analysis={caseData.checkResults} />

            <div className="mt-4 rounded-xl bg-white p-4 text-xs text-slate-500 ring-1 ring-slate-200">
              <p>Audit hash: <span className="font-mono">{caseData.auditHash}</span></p>
              <p>Previous hash: <span className="font-mono">{caseData.auditPrevHash}</span></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
