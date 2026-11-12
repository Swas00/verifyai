import { useState, useCallback } from "react";
import { screenDocument } from "../services/api";

export function useScreening() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const screen = useCallback(async (documentFile, selfieFile) => {
    setLoading(true);
    setError(null);
    try {
      const data = await screenDocument(documentFile, selfieFile);
      setResult(data);
      return data;
    } catch (err) {
      const message = err.response?.data?.error || err.message || "Screening failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, screen, reset };
}
