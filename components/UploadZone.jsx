"use client";

import { useCallback, useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".txt", ".pdf", ".docx"];

export default function UploadZone({ onSubmit, isLoading }) {
  const [mode, setMode] = useState("paste"); // "paste" | "file"
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const validateAndSetFile = useCallback((candidate) => {
    setError("");
    if (!candidate) return;
    const ext = "." + candidate.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(
        `"${candidate.name}" isn't a supported format. Please upload a .txt, .pdf, or .docx file.`
      );
      setFile(null);
      return;
    }
    setFile(candidate);
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  }

  function handleFileInputChange(e) {
    validateAndSetFile(e.target.files?.[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "paste") {
      if (text.trim().length < 30) {
        setError("Paste a bit more of the job description — that looked too short.");
        return;
      }
      onSubmit({ type: "text", value: text });
    } else {
      if (!file) {
        setError("Choose a file to upload, or switch to paste mode.");
        return;
      }
      onSubmit({ type: "file", value: file });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div 
        role="tablist" 
        aria-label="Job description input method" 
        className="flex gap-2 mb-4"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            const newMode = mode === "paste" ? "file" : "paste";
            setMode(newMode);
            // Small delay to allow React to render the new tabIndex before focusing
            setTimeout(() => {
              e.currentTarget.querySelector(`button[aria-selected="true"]`)?.focus();
            }, 0);
          }
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "paste"}
          tabIndex={mode === "paste" ? 0 : -1}
          onClick={() => setMode("paste")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus-ring ${
            mode === "paste"
              ? "bg-ink text-paper"
              : "bg-paper-alt text-ink/60 hover:text-ink"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "file"}
          tabIndex={mode === "file" ? 0 : -1}
          onClick={() => setMode("file")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus-ring ${
            mode === "file"
              ? "bg-ink text-paper"
              : "bg-paper-alt text-ink/60 hover:text-ink"
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === "paste" ? (
        <label className="block">
          <span className="sr-only">Job description text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={10}
            className="w-full rounded-xl border border-line bg-white p-4 text-sm text-ink placeholder:text-ink/40 focus-ring resize-y"
          />
        </label>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          aria-label="Drop a job description file here, or click to browse"
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors focus-ring ${
            isDragging ? "border-amber bg-amber/5" : "border-line bg-white hover:bg-paper-alt"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileInputChange}
            className="sr-only"
          />
          <span className="text-sm font-medium text-ink">
            {file ? file.name : "Drag and drop your file here"}
          </span>
          <span className="text-xs text-ink/50">
            or click to browse — .txt, .pdf, or .docx
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full md:w-auto inline-flex items-center justify-center rounded-full bg-amber-dark px-8 py-3 text-sm font-semibold text-paper hover:bg-amber transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Analyzing…" : "Generate interview questions"}
      </button>
    </form>
  );
}
