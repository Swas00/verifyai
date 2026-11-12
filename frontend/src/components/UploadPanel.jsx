import { useState, useRef } from "react";

function DropZone({ label, file, onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {file ? (
        <>
          <span className="text-sm font-medium text-slate-800">{file.name}</span>
          <span className="mt-1 text-xs text-slate-500">Click or drop to replace</span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="mt-1 text-xs text-slate-400">Drag & drop or click to browse</span>
        </>
      )}
    </div>
  );
}

export default function UploadPanel({ onSubmit, loading }) {
  const [documentFile, setDocumentFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const canSubmit = documentFile && selfieFile && !loading;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Screen a document</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DropZone label="Document scan" file={documentFile} onFile={setDocumentFile} />
        <DropZone label="Selfie" file={selfieFile} onFile={setSelfieFile} />
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(documentFile, selfieFile)}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Screening…" : "Screen document"}
      </button>
    </div>
  );
}
