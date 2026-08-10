"use client";

import { useEffect, useState } from "react";
import { lookupWord, type DictionaryDefinition } from "@/lib/dictionary";
import { Loader2, BookA, X } from "lucide-react";

interface DictionaryPopoverProps {
  word: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function DictionaryPopover({ word, x, y, onClose }: DictionaryPopoverProps) {
  const [definition, setDefinition] = useState<DictionaryDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    lookupWord(word).then((res) => {
      setDefinition(res);
      setLoading(false);
    });
  }, [word]);

  return (
    <div
      className="fixed z-50 bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-72 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: Math.max(10, y + 10),
        left: Math.max(10, Math.min(window.innerWidth - 300, x - 144)),
      }}
    >
      <div className="sticky top-0 bg-white/90 dark:bg-[#1a1a2e]/90 backdrop-blur-sm p-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookA className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold capitalize text-sm">{word.trim().replace(/[^a-zA-Z-]/g, "")}</h3>
          {definition?.phonetic && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {definition.phonetic}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            <span className="text-xs">Looking up...</span>
          </div>
        ) : definition ? (
          <div className="space-y-4">
            {definition.meanings.slice(0, 2).map((meaning, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  {meaning.partOfSpeech}
                </span>
                <ul className="space-y-2">
                  {meaning.definitions.slice(0, 2).map((def, dIdx) => (
                    <li key={dIdx} className="text-sm">
                      <p className="text-slate-700 dark:text-slate-200">
                        {dIdx + 1}. {def.definition}
                      </p>
                      {def.example && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          "{def.example}"
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-slate-500">
            No definition found for this word.
          </div>
        )}
      </div>
    </div>
  );
}
