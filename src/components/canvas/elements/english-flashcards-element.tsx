'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Circle,
  Download,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CommonElementProps, EnglishFlashcardCard, EnglishFlashcardsContent } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_CARDS = 30;
const CARD_W = 378;
const CARD_H = 567;
const CALIPSO = '#28c4d8';

type FlashCard = EnglishFlashcardCard;

async function translatePair(
  text: string,
  langpair: 'en|es' | 'es|en',
  signal?: AbortSignal
): Promise<string> {
  const q = text.trim();
  if (!q) return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${langpair}`;
    const r = await fetch(url, { signal });
    const data = await r.json();
    if (data.responseStatus === 200 && typeof data.responseData?.translatedText === 'string') {
      return data.responseData.translatedText as string;
    }
  } catch {
    /* cancel / red */
  }
  return '';
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('en') && /samantha|google us english|audrey|zira|karen/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    null
  );
}

function normalizeCards(content: unknown): FlashCard[] {
  const c = content as EnglishFlashcardsContent | undefined;
  if (c && Array.isArray(c.cards) && c.cards.length > 0) {
    return c.cards.slice(0, MAX_CARDS).map((x) => ({
      en: typeof x.en === 'string' ? x.en : '',
      es: typeof x.es === 'string' ? x.es : '',
      mastered: !!x.mastered,
    }));
  }
  return [{ en: '', es: '', mastered: false }];
}

type ImportPayload = {
  version?: number;
  title?: string;
  studyDirection?: string;
  cardMode?: string;
  reviewHideMastered?: boolean;
  cards?: { en?: string; es?: string; mastered?: boolean }[];
  content?: { cards?: { en?: string; es?: string; mastered?: boolean }[] };
};

export default function EnglishFlashcardsElement(props: CommonElementProps) {
  const { id, content, onUpdate, deleteElement, isSelected } = props;
  const baseContent = (content || {}) as EnglishFlashcardsContent;
  const direction = baseContent.studyDirection === 'reverse' ? 'reverse' : 'forward';
  const cardMode = baseContent.cardMode === 'phrase' ? 'phrase' : 'word';
  const reviewHide = !!baseContent.reviewHideMastered;

  const [cards, setCards] = useState<FlashCard[]>(() => normalizeCards(content));
  const translateAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const contentRef = useRef(content);
  const cardsRef = useRef(cards);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    setCards(normalizeCards(content));
  }, [content, id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    load();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const persistFull = useCallback(
    (nextCards: FlashCard[], meta?: Partial<EnglishFlashcardsContent>) => {
      setCards(nextCards);
      const prev = (contentRef.current || {}) as EnglishFlashcardsContent;
      onUpdate(id, {
        content: {
          ...prev,
          ...meta,
          title: (meta?.title ?? prev.title) || 'Estudio EN',
          studyDirection: meta?.studyDirection ?? prev.studyDirection ?? 'forward',
          cardMode: meta?.cardMode ?? prev.cardMode ?? 'word',
          reviewHideMastered: meta?.reviewHideMastered ?? prev.reviewHideMastered ?? false,
          cards: nextCards,
        },
      });
    },
    [id, onUpdate]
  );

  const persistMeta = useCallback(
    (meta: Partial<EnglishFlashcardsContent>) => {
      const prev = (contentRef.current || {}) as EnglishFlashcardsContent;
      const cur = cardsRef.current;
      onUpdate(id, {
        content: {
          ...prev,
          ...meta,
          title: (meta.title ?? prev.title) || 'Estudio EN',
          studyDirection: meta.studyDirection ?? prev.studyDirection ?? 'forward',
          cardMode: meta.cardMode ?? prev.cardMode ?? 'word',
          reviewHideMastered: meta.reviewHideMastered ?? prev.reviewHideMastered ?? false,
          cards: meta.cards ?? cur,
        },
      });
    },
    [id, onUpdate]
  );

  const maxTranslateLen = cardMode === 'phrase' ? 450 : 200;

  const scheduleTranslate = useCallback(
    (index: number, srcText: string, dir: 'forward' | 'reverse') => {
      if (debounceRef.current[index]) clearTimeout(debounceRef.current[index]);
      debounceRef.current[index] = setTimeout(async () => {
        const trimmed = srcText.trim().slice(0, maxTranslateLen);
        if (!trimmed) return;
        translateAbortRef.current?.abort();
        const ctrl = new AbortController();
        translateAbortRef.current = ctrl;
        const pair = dir === 'forward' ? 'en|es' : 'es|en';
        const out = await translatePair(trimmed, pair, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setCards((prev) => {
          const next = prev.map((c, i) => {
            if (i !== index) return c;
            return dir === 'forward' ? { ...c, es: out } : { ...c, en: out };
          });
          const prevContent = (contentRef.current || {}) as EnglishFlashcardsContent;
          onUpdate(id, {
            content: {
              ...prevContent,
              title: prevContent.title || 'Estudio EN',
              studyDirection: prevContent.studyDirection ?? 'forward',
              cardMode: prevContent.cardMode ?? 'word',
              reviewHideMastered: !!prevContent.reviewHideMastered,
              cards: next,
            },
          });
          return next;
        });
      }, 650);
    },
    [id, onUpdate, maxTranslateLen]
  );

  const speakEnglish = useCallback((text: string) => {
    const t = text.trim();
    if (!t || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    const voice = pickEnglishVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang || 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, []);

  const addCard = () => {
    if (cards.length >= MAX_CARDS) return;
    persistFull([...cards, { en: '', es: '', mastered: false }]);
  };

  const removeCard = (index: number) => {
    if (cards.length <= 1) return;
    persistFull(cards.filter((_, i) => i !== index));
  };

  const updateForwardEn = (index: number, en: string) => {
    const next = cards.map((c, i) => {
      if (i !== index) return c;
      return { ...c, en, es: en.trim() === '' ? '' : c.es };
    });
    persistFull(next);
    if (en.trim()) scheduleTranslate(index, en, 'forward');
  };

  const updateReverseEs = (index: number, es: string) => {
    const next = cards.map((c, i) => {
      if (i !== index) return c;
      return { ...c, es, en: es.trim() === '' ? '' : c.en };
    });
    persistFull(next);
    if (es.trim()) scheduleTranslate(index, es, 'reverse');
  };

  const toggleMastered = (index: number) => {
    const next = cards.map((c, i) => (i === index ? { ...c, mastered: !c.mastered } : c));
    persistFull(next);
  };

  const handleExportJson = useCallback(() => {
    const payload = {
      version: 1,
      type: 'english-flashcards',
      exportedAt: new Date().toISOString(),
      title: baseContent.title || 'Estudio EN',
      studyDirection: direction,
      cardMode,
      reviewHideMastered: reviewHide,
      cards: cards.map((c) => ({
        en: c.en,
        es: c.es,
        mastered: !!c.mastered,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (baseContent.title || 'mazo').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 48);
    a.href = url;
    a.download = `estudio-en-${slug || 'mazo'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [baseContent.title, cardMode, cards, direction, reviewHide]);

  const handleImportJson = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result)) as ImportPayload;
          const raw = data.cards ?? data.content?.cards;
          if (!Array.isArray(raw)) return;
          const next: FlashCard[] = raw.slice(0, MAX_CARDS).map((r) => ({
            en: typeof r.en === 'string' ? r.en : '',
            es: typeof r.es === 'string' ? r.es : '',
            mastered: !!r.mastered,
          }));
          if (next.length === 0) next.push({ en: '', es: '', mastered: false });
          persistFull(next, {
            title: typeof data.title === 'string' ? data.title.slice(0, 200) : undefined,
            studyDirection: data.studyDirection === 'reverse' ? 'reverse' : 'forward',
            cardMode: data.cardMode === 'phrase' ? 'phrase' : 'word',
            reviewHideMastered: !!data.reviewHideMastered,
          });
        } catch {
          /* JSON inválido */
        }
      };
      reader.readAsText(file);
    },
    [persistFull]
  );

  const visibleEntries = useMemo(
    () =>
      cards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => !(reviewHide && card.mastered)),
    [cards, reviewHide]
  );

  const hiddenByReview = reviewHide ? cards.filter((c) => c.mastered).length : 0;
  const textareaRows = cardMode === 'phrase' ? 8 : 3;
  const primaryTextClass =
    cardMode === 'phrase' ? 'text-base font-semibold' : 'text-xl font-semibold';

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col rounded-lg border border-zinc-700 bg-black shadow-xl overflow-hidden',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      data-element-id={id}
      onMouseDown={(ev) => ev.stopPropagation()}
    >
      <div className="drag-handle flex cursor-grab items-center gap-1 border-b border-zinc-700 bg-zinc-900 px-2 py-1.5 active:cursor-grabbing">
        <GripVertical className="size-4 shrink-0 text-zinc-400" />
        <span
          className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {baseContent.title || 'Estudio EN'} · {cards.length}/{MAX_CARDS}
          {hiddenByReview > 0 ? ` · ${hiddenByReview} ocultas` : ''}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          title="Exportar mazo (JSON)"
          onClick={handleExportJson}
        >
          <Download className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          title="Importar mazo (JSON)"
          onClick={() => importInputRef.current?.click()}
        >
          <Upload className="size-4" />
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-hidden
          onChange={handleImportJson}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          title="Añadir tarjeta"
          onClick={addCard}
          disabled={cards.length >= MAX_CARDS}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-red-300"
          title="Eliminar cuaderno"
          onClick={() => deleteElement(id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-xs text-zinc-200"
          title="Alternar sentido de estudio"
          onClick={() =>
            persistMeta({ studyDirection: direction === 'forward' ? 'reverse' : 'forward' })
          }
        >
          <ArrowLeftRight className="size-3.5" />
          {direction === 'forward' ? 'EN → ES' : 'ES → EN'}
        </Button>
        <div className="flex rounded-md border border-zinc-600 p-0.5">
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium',
              cardMode === 'word' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => persistMeta({ cardMode: 'word' })}
          >
            Palabra
          </button>
          <button
            type="button"
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium',
              cardMode === 'phrase' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => persistMeta({ cardMode: 'phrase' })}
          >
            Frase
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
          <Checkbox
            checked={reviewHide}
            onCheckedChange={(v) => persistMeta({ reviewHideMastered: v === true })}
            className="border-zinc-500"
          />
          Repaso (ocultar dominadas)
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {visibleEntries.length === 0 && cards.length > 0 ? (
          <div
            className="mx-auto max-w-sm px-4 py-10 text-center text-sm leading-relaxed text-zinc-400"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            No quedan tarjetas visibles: todas están marcadas como dominadas o el mazo está vacío.
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => persistMeta({ reviewHideMastered: false })}
              >
                Ver todas las tarjetas
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-8 pb-4">
            {visibleEntries.map(({ card, index }) => (
              <div
                key={index}
                className="relative flex shrink-0 flex-col rounded-xl border border-zinc-500 bg-white shadow-lg"
                style={{ width: CARD_W, height: CARD_H, maxWidth: '100%' }}
              >
                <div className="flex items-center justify-between gap-1 border-b border-zinc-200 px-1 py-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 gap-1 px-2 text-[11px]',
                      card.mastered ? 'text-emerald-600' : 'text-zinc-500'
                    )}
                    title={card.mastered ? 'Quitar dominada' : 'Marcar como dominada'}
                    onClick={() => toggleMastered(index)}
                  >
                    {card.mastered ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <Circle className="size-3.5 shrink-0" />
                    )}
                    Dominada
                  </Button>
                  {cards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-zinc-500"
                      title="Quitar tarjeta"
                      onClick={() => removeCard(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div
                  className="flex flex-1 flex-col items-center px-4 pb-4 pt-6"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {direction === 'forward' ? (
                    <>
                      <textarea
                        value={card.en}
                        onChange={(e) => updateForwardEn(index, e.target.value)}
                        placeholder="Palabra o frase en inglés"
                        className={cn(
                          'w-full resize-none border-0 bg-transparent text-center text-black placeholder:text-zinc-400 outline-none',
                          primaryTextClass
                        )}
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                        rows={textareaRows}
                        spellCheck
                        lang="en"
                      />
                      {card.en.trim().length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1 border-zinc-400 text-black"
                          title="Leer en inglés"
                          onClick={() => speakEnglish(card.en)}
                        >
                          <Volume2 className="size-3.5" />
                          Leer en inglés
                        </Button>
                      )}
                      <p
                        className="mt-auto w-full px-1 text-center text-lg leading-snug font-medium"
                        style={{ fontFamily: "'Poppins', sans-serif", color: CALIPSO }}
                      >
                        {card.es || (card.en.trim() ? '…' : '\u00a0')}
                      </p>
                    </>
                  ) : (
                    <>
                      <textarea
                        value={card.es}
                        onChange={(e) => updateReverseEs(index, e.target.value)}
                        placeholder="Palabra o frase en español"
                        className={cn(
                          'w-full resize-none border-0 bg-transparent text-center placeholder:text-zinc-400 outline-none',
                          primaryTextClass
                        )}
                        style={{ fontFamily: "'Poppins', sans-serif", color: CALIPSO }}
                        rows={textareaRows}
                        spellCheck
                        lang="es"
                      />
                      {card.en.trim().length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1 border-zinc-400 text-black"
                          title="Leer en inglés"
                          onClick={() => speakEnglish(card.en)}
                        >
                          <Volume2 className="size-3.5" />
                          Leer en inglés
                        </Button>
                      )}
                      <p
                        className="mt-auto w-full px-1 text-center text-lg leading-snug font-medium text-black"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {card.en || (card.es.trim() ? '…' : '\u00a0')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
