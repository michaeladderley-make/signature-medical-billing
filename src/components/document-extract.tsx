"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Claim } from "@/lib/claims";
import {
  mockExtract,
  sampleFileName,
  type DocumentKind,
  type ExtractedField,
} from "@/lib/document-extract";

type Props = {
  claim: Claim;
  kind: DocumentKind;
  sampleName?: string;
  onConfirm: (fileName: string, fields: ExtractedField[], corrected: number) => void;
  onCancel: () => void;
};

type Row = ExtractedField & { wrong: boolean; fixed: string };

export function DocumentExtract({ claim, kind, sampleName, onConfirm, onCancel }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [reading, rows.length]);

  useEffect(() => {
    if (!reading) return;
    const timer = window.setTimeout(() => {
      setRows(mockExtract(claim, kind).map((field) => ({ ...field, wrong: false, fixed: field.value })));
      setReading(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [reading, claim, kind]);

  function start(name: string) {
    setFileName(name);
    setRows([]);
    setReading(true);
  }

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) start(file.name);
  }

  function update(label: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.label === label ? { ...row, ...patch } : row)));
  }

  function confirm() {
    if (!fileName) return;
    const corrected = rows.filter((row) => row.wrong && row.fixed.trim() && row.fixed !== row.value).length;
    const fields = rows.map((row) => ({
      ...row,
      value: row.wrong && row.fixed.trim() ? row.fixed.trim() : row.value,
    }));
    onConfirm(fileName, fields, corrected);
  }

  return (
    <div
      ref={boxRef}
      className="max-w-[640px] scroll-mb-6 space-y-4 rounded-[10px] border border-iron bg-pure-black px-4 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Read the {kind}</p>
        <button type="button" onClick={onCancel} className="text-caption text-ash hover:text-bone">
          Close
        </button>
      </div>

      {!fileName ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-3 rounded-[10px] border border-dashed px-4 py-6 text-center ${
            dragging ? "border-soft-indigo bg-graphite" : "border-slate-edge"
          }`}
        >
          <img src="/figma/attach.svg" alt="" width={20} height={20} />
          <p className="text-body-sm text-bone">Drop the {kind} PDF here</p>
          <p className="text-caption text-ash">
            The file is stored with the claim. Nobody opens a folder to find it later.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="h-10 rounded-[10px] px-3.5"
            >
              Choose a PDF
            </Button>
            <Button
              type="button"
              onClick={() => start(sampleName ?? sampleFileName(claim, kind))}
              className="h-10 rounded-[10px] px-3.5"
            >
              Use the sample {kind}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => pick(event.target.files)}
          />
        </div>
      ) : reading ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-body-sm text-bone">
            <img src="/figma/attach.svg" alt="" width={16} height={16} />
            {fileName}
          </p>
          <p className="text-body-sm text-ash">Reading the pages and finding this claim’s lines…</p>
          <div className="h-1 overflow-hidden rounded-full bg-iron">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-soft-indigo" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-body-sm text-bone">
            <img src="/figma/attach.svg" alt="" width={16} height={16} />
            {fileName}
          </p>
          <p className="text-body-sm text-ash">
            These are the fields staff copy by hand today. Check each one. Mark anything wrong and type
            the right value. Nothing goes on the claim until you add it.
          </p>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[9.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1"
              >
                <span className="text-body-sm text-ash">{row.label}</span>
                {row.wrong ? (
                  <Input
                    value={row.fixed}
                    onChange={(event) => update(row.label, { fixed: event.target.value })}
                    aria-label={`Correct ${row.label}`}
                    className="h-8 rounded-[8px] border-slate-edge bg-graphite text-sm"
                  />
                ) : (
                  <span className="text-body-sm text-bone">
                    {row.value}
                    <span className="text-caption text-mist"> · page {row.page}</span>
                    {row.check ? <span className="text-caption text-soft-indigo"> · check this</span> : null}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => update(row.label, { wrong: !row.wrong, fixed: row.value })}
                  className={`rounded-[8px] px-2 py-1 text-caption ${
                    row.wrong ? "bg-iron text-bone" : "text-ash hover:text-bone"
                  }`}
                >
                  {row.wrong ? "Undo" : "Wrong"}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={confirm} className="h-10 rounded-[10px] px-3.5">
              Add to the claim
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFileName(null);
                setRows([]);
              }}
              className="h-10 rounded-[10px] px-3.5"
            >
              Use a different file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
