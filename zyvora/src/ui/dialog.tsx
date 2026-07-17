/**
 * Application dialogs — replaces browser-native confirm()/alert()/prompt() with
 * one consistent, accessible modal (role=alertdialog, focus captured on open and
 * restored on close, Esc cancels, destructive actions styled as danger and never
 * visually competing with safe ones).
 *
 * Promise-based singleton, callable from anywhere:
 *   if (await appConfirm({ title, body, confirmLabel, danger })) …
 *   const v = await appPrompt({ title, body, label, initial });
 *   await appAlert({ title, body });
 */
import { useEffect, useRef, useState } from "react";

interface DialogSpec {
  kind: "confirm" | "alert" | "prompt";
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  label?: string;       // prompt input label
  placeholder?: string; // prompt input placeholder
  initial?: string;     // prompt initial value
}

type Resolver = (v: boolean | string | null) => void;
let openDialog: ((spec: DialogSpec, resolve: Resolver) => void) | null = null;

function show(spec: DialogSpec): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    if (openDialog) openDialog(spec, resolve as Resolver);
    else resolve(spec.kind === "confirm" ? false : spec.kind === "prompt" ? null : true);
  });
}

export const appConfirm = (s: Omit<DialogSpec, "kind">) =>
  show({ ...s, kind: "confirm" }) as Promise<boolean>;
export const appAlert = (s: Omit<DialogSpec, "kind">): Promise<void> =>
  show({ ...s, kind: "alert" }).then(() => undefined);
export const appPrompt = (s: Omit<DialogSpec, "kind">) =>
  show({ ...s, kind: "prompt" }) as Promise<string | null>;

export function DialogHost() {
  const [spec, setSpec] = useState<DialogSpec | null>(null);
  const [value, setValue] = useState("");
  const resolveRef = useRef<Resolver | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    openDialog = (s, resolve) => {
      restoreRef.current = document.activeElement as HTMLElement | null;
      resolveRef.current = resolve;
      setValue(s.initial ?? "");
      setSpec(s);
    };
    return () => { openDialog = null; };
  }, []);

  useEffect(() => {
    if (spec) requestAnimationFrame(() => (spec.kind === "prompt" ? inputRef.current : confirmRef.current)?.focus());
  }, [spec]);

  if (!spec) return null;

  const finish = (v: boolean | string | null) => {
    setSpec(null);
    resolveRef.current?.(v);
    resolveRef.current = null;
    restoreRef.current?.focus?.();
  };
  const cancel = () => finish(spec.kind === "confirm" ? false : spec.kind === "prompt" ? null : true);
  const ok = () => finish(spec.kind === "prompt" ? value : true);

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); cancel(); }
        if (e.key === "Enter" && spec.kind !== "alert") { e.preventDefault(); ok(); }
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h3 id="dlg-title">{spec.title}</h3>
        {spec.body && <p>{spec.body}</p>}
        {spec.kind === "prompt" && (
          <div className="form-row" style={{ marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              {spec.label && <label htmlFor="dlg-input">{spec.label}</label>}
              <input
                id="dlg-input"
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={spec.placeholder}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        )}
        <div className="dialog-actions">
          {spec.kind !== "alert" && (
            <button className="btn subtle" onClick={cancel}>{spec.cancelLabel ?? "Cancel"}</button>
          )}
          <button
            ref={confirmRef}
            className={`btn${spec.danger ? " danger-solid" : ""}`}
            onClick={ok}
          >
            {spec.confirmLabel ?? (spec.kind === "alert" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
