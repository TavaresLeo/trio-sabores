'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function PixCopyBox({ pixCode }: { pixCode: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[#dfd0b8] bg-[#fffdf9] p-4 text-left">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-sm text-wine">PIX Copia e Cola</b>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg border border-[#dfd0b8] bg-white px-3 py-1 text-xs font-semibold text-wine hover:bg-[#f1e7d7]"
        >
          {copied ? <Check size={14} className="text-green-700" /> : <Copy size={14} />}
          <span>{copied ? 'Copiado!' : 'Copiar código'}</span>
        </button>
      </div>
      <input
        readOnly
        value={pixCode}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className="w-full rounded border border-[#dfd0b8] bg-[#fbf8f2] p-2 font-mono text-xs text-brown/80 focus:outline-none"
      />
    </div>
  );
}
