"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export type AuthField = { name: string; label: string; type: string; placeholder?: string };

export function AuthCard({
  title,
  subtitle,
  action,
  submitLabel,
  fields,
}: {
  title: string;
  subtitle: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  fields: AuthField[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🏠</div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <form
          action={formAction}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {fields.map((f) => (
            <div key={f.name}>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={f.name}>
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                required
                placeholder={f.placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ))}
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
