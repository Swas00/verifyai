import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useScreening } from "../hooks/useScreening";
import { listCases } from "../services/api";
import UploadPanel from "../components/UploadPanel";
import RiskCard from "../components/RiskCard";
import CaseHistory from "../components/CaseHistory";
import AlertFeed from "../components/AlertFeed";

export default function Dashboard() {
  const { officer, logout } = useAuth();
  const { result, loading, error, screen } = useScreening();
  const [cases, setCases] = useState([]);

  const refreshCases = useCallback(() => {
    listCases().then((data) => setCases(data.cases));
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const handleSubmit = async (documentFile, selfieFile) => {
    try {
      await screen(documentFile, selfieFile);
      refreshCases();
    } catch {
      // error state is already surfaced via useScreening
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">VerifyAI</h1>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{officer?.name}</span>
          <button onClick={logout} className="text-slate-500 hover:text-slate-800">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <AlertFeed cases={cases} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UploadPanel onSubmit={handleSubmit} loading={loading} />
          {error ? (
            <div className="rounded-xl bg-red-50 p-6 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          ) : (
            <RiskCard analysis={result?.analysis} />
          )}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Case history</h2>
          <CaseHistory cases={cases} />
        </section>
      </main>
    </div>
  );
}
