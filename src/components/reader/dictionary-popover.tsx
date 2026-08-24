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
      className="fixed z-50 bg-[#151517] text-zinc-100 rounded-xl shadow-2xl shadow-black/60 border border-zinc-800/60 w-72 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: Math.max(10, y + 10),
        left: Math.max(10, Math.min(window.innerWidth - 300, x - 144)),
      }}
    >
      <div className="sticky top-0 bg-[#151517]/95 backdrop-blur-sm p-3 border-b border-zinc-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookA className="w-4 h-4 text-gold-500" />
          <h3 className="font-semibold capitalize text-sm text-zinc-100">{word.trim().replace(/[^a-zA-Z-]/g, "")}</h3>
          {definition?.phonetic && (
            <span className="text-xs text-zinc-500 font-mono">
              {definition.phonetic}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800/60 rounded-lg cursor-pointer text-zinc-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
            <span className="text-xs">Looking up...</span>
          </div>
        ) : definition ? (
          <div className="space-y-4">
            {definition.meanings.slice(0, 2).map((meaning, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-[10px] font-semibold text-gold-500 uppercase tracking-wider">
                  {meaning.partOfSpeech}
                </span>
                <ul className="space-y-2">
                  {meaning.definitions.slice(0, 2).map((def, dIdx) => (
                    <li key={dIdx} className="text-sm">
                      <p className="text-zinc-300">
                        {dIdx + 1}. {def.definition}
                      </p>
                      {def.example && (
                        <p className="text-xs text-zinc-500 mt-1 italic">
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
          <div className="text-center py-4 text-sm text-zinc-600">
            No definition found for this word.
          </div>
        )}
      </div>
    </div>
  );
}
