'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  GripVertical,
  ListChecks,
  Shuffle,
  SortAsc,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { CommonElementProps, IrregularVerbRow, IrregularVerbsContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import irregularVerbsJson from '@/data/irregular-verbs-en.json';

const VERBS = irregularVerbsJson as IrregularVerbRow[];
const CALIPSO = '#28c4d8';

const VERB_BY_ID = new Map(VERBS.map((v) => [v.id, v]));

type QuizRowResult = { pastOk: boolean; partOk: boolean; meanOk: boolean; checked: boolean };

/** Normaliza para comparar respuestas (minúsculas, espacios, sin acentos) */
function folds(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Primer segmento antes de / (referencia para pista) */
function primarySegment(s: string): string {
  return (s.split('/')[0] || s).trim();
}

/** Pista: dos primeras letras visibles + longitud (caracteres sin espacios) */
function hintTwoLettersAndLength(canonical: string): string {
  const seg = primarySegment(canonical);
  const compact = seg.replace(/\s+/g, '');
  const len = compact.length || folds(seg).length;
  const two = compact.slice(0, 2).padEnd(2, '·');
  return `${two} · ${len} letras`;
}

/** Variantes aceptadas en campos EN (slash u opción con |) */
function engVariants(canonical: string): Set<string> {
  const set = new Set<string>();
  for (const chunk of canonical.split('/')) {
    for (const piece of chunk.split('|')) {
      const f = folds(piece);
      if (f) set.add(f);
    }
  }
  return set;
}

function matchesEnglishForm(user: string, canonical: string): boolean {
  const u = folds(user);
  if (!u) return false;
  return engVariants(canonical).has(u);
}

function matchesSpanishMeaning(user: string, canonical: string): boolean {
  const u = folds(user);
  if (!u) return false;
  for (const part of canonical.split(/[/;]/)) {
    const p = folds(part);
    if (p && u === p) return true;
  }
  return folds(canonical) === u;
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

function speakEnglish(text: string) {
  const t = text.replace(/\s*\/\s*/g, ' ').trim();
  if (!t || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  const voice = pickEnglishVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'en-US';
  u.rate = 0.88;
  window.speechSynthesis.speak(u);
}

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortIdsAlphabetical(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ra = VERB_BY_ID.get(a);
    const rb = VERB_BY_ID.get(b);
    return (ra?.base || '').localeCompare(rb?.base || '', 'en', { sensitivity: 'base' });
  });
}

function sortIdsByTableOrder(ids: string[], filteredOrdered: IrregularVerbRow[]): string[] {
  const pos = new Map(filteredOrdered.map((v, i) => [v.id, i]));
  return [...ids].sort((a, b) => (pos.get(a) ?? 9999) - (pos.get(b) ?? 9999));
}

function FieldHintBubble({ canonical, enabled }: { canonical: string; enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div
      className="pointer-events-none absolute right-0 bottom-full z-20 mb-1 max-w-[min(100%,11rem)] rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] font-medium leading-tight text-zinc-100 shadow-lg"
      style={{ fontFamily: "'Poppins', sans-serif" }}
      aria-hidden
    >
      {hintTwoLettersAndLength(canonical)}
    </div>
  );
}

export default function IrregularVerbsElement(props: CommonElementProps) {
  const { id, content, onUpdate, deleteElement, isSelected } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const base = (content || {}) as IrregularVerbsContent;
  const phase =
    base.phase === 'practice' ? 'practice' : base.phase === 'quiz' ? 'quiz' : 'browse';
  const selectedSet = useMemo(() => new Set(base.selectedIds ?? []), [base.selectedIds]);
  const practiceVerbIds = base.practiceVerbIds ?? [];
  const shuffleOnGenerate = !!base.shuffleOnGenerate;
  const orderPracticeBy = base.orderPracticeBy === 'table' ? 'table' : 'alphabetical';
  const quizStepIndex = typeof base.quizStepIndex === 'number' ? base.quizStepIndex : 0;

  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const [search, setSearch] = useState('');
  const [quizPast, setQuizPast] = useState('');
  const [quizPart, setQuizPart] = useState('');
  const [quizMean, setQuizMean] = useState('');
  const [quizChecked, setQuizChecked] = useState<{
    pastOk: boolean;
    partOk: boolean;
    meanOk: boolean;
  } | null>(null);
  const [quizSubView, setQuizSubView] = useState<'play' | 'summary'>('play');
  const [sessionResults, setSessionResults] = useState<Record<string, QuizRowResult>>({});
  const [hintsEnabled, setHintsEnabled] = useState(false);

  useEffect(() => {
    if (phase !== 'quiz') {
      setQuizSubView('play');
      setSessionResults({});
      setHintsEnabled(false);
    }
  }, [phase]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    load();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const filteredVerbs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return VERBS;
    return VERBS.filter((v) => {
      const blob = `${v.base} ${v.past} ${v.participle} ${v.meaningEs}`.toLowerCase();
      return blob.includes(q);
    });
  }, [search]);

  const persist = useCallback(
    (patch: Partial<IrregularVerbsContent>) => {
      const prev = (contentRef.current || {}) as IrregularVerbsContent;
      const next: IrregularVerbsContent = {
        title: (patch.title !== undefined ? patch.title : prev.title) || 'Verbos irregulares',
        phase: patch.phase !== undefined ? patch.phase : prev.phase ?? 'browse',
        selectedIds: patch.selectedIds !== undefined ? patch.selectedIds : prev.selectedIds ?? [],
        practiceVerbIds: patch.practiceVerbIds !== undefined ? patch.practiceVerbIds : prev.practiceVerbIds ?? [],
        quizStepIndex:
          patch.quizStepIndex !== undefined ? patch.quizStepIndex : prev.quizStepIndex ?? 0,
        shuffleOnGenerate:
          patch.shuffleOnGenerate !== undefined ? patch.shuffleOnGenerate : !!prev.shuffleOnGenerate,
        orderPracticeBy:
          patch.orderPracticeBy !== undefined
            ? patch.orderPracticeBy
            : prev.orderPracticeBy === 'table'
              ? 'table'
              : 'alphabetical',
      };
      onUpdate(id, { content: next });
    },
    [id, onUpdate]
  );

  const nPractice = practiceVerbIds.length;
  const safeQuizIdx = nPractice > 0 ? Math.min(Math.max(0, quizStepIndex), nPractice - 1) : 0;
  const currentQuizId = nPractice > 0 ? practiceVerbIds[safeQuizIdx] : undefined;
  const currentQuizVerb = currentQuizId ? VERB_BY_ID.get(currentQuizId) : undefined;
  const isLastQuizCard = nPractice > 0 && safeQuizIdx >= nPractice - 1;

  useEffect(() => {
    if (phase !== 'quiz' || quizSubView !== 'play') return;
    setQuizPast('');
    setQuizPart('');
    setQuizMean('');
    setQuizChecked(null);
  }, [phase, quizSubView, safeQuizIdx, currentQuizId]);

  const advanceQuiz = useCallback(() => {
    if (phase !== 'quiz' || quizSubView !== 'play' || nPractice === 0) return;
    if (safeQuizIdx >= nPractice - 1) {
      setQuizSubView('summary');
      return;
    }
    persist({ quizStepIndex: safeQuizIdx + 1 });
  }, [phase, quizSubView, nPractice, safeQuizIdx, persist]);

  useEffect(() => {
    if (phase !== 'quiz' || quizSubView !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'ArrowRight') return;
      if (!rootRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      advanceQuiz();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [phase, quizSubView, advanceQuiz]);

  const toggleSelected = (verbId: string, checked: boolean) => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const cur = new Set(prev.selectedIds ?? []);
    if (checked) cur.add(verbId);
    else cur.delete(verbId);
    persist({ selectedIds: Array.from(cur) });
  };

  const selectAllVisible = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const cur = new Set(prev.selectedIds ?? []);
    filteredVerbs.forEach((v) => cur.add(v.id));
    persist({ selectedIds: Array.from(cur) });
  };

  const clearVisible = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const cur = new Set(prev.selectedIds ?? []);
    filteredVerbs.forEach((v) => cur.delete(v.id));
    persist({ selectedIds: Array.from(cur) });
  };

  const startPractice = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    let ids = [...(prev.selectedIds ?? [])].filter((i) => VERB_BY_ID.has(i));
    if (ids.length === 0) return;
    const order = (prev.orderPracticeBy ?? 'alphabetical') === 'table' ? 'table' : 'alphabetical';
    ids = order === 'alphabetical' ? sortIdsAlphabetical(ids) : sortIdsByTableOrder(ids, VERBS);
    if (prev.shuffleOnGenerate) ids = shuffleIds(ids);
    persist({
      phase: 'practice',
      practiceVerbIds: ids,
      quizStepIndex: 0,
    });
  };

  const reorderPracticeDeck = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const ids = [...(prev.practiceVerbIds ?? [])].filter((i) => VERB_BY_ID.has(i));
    if (ids.length === 0) return;
    const order = (prev.orderPracticeBy ?? 'alphabetical') === 'table' ? 'table' : 'alphabetical';
    const ordered =
      order === 'alphabetical' ? sortIdsAlphabetical(ids) : sortIdsByTableOrder(ids, VERBS);
    persist({ practiceVerbIds: ordered, quizStepIndex: 0 });
    if (phase === 'quiz') {
      setSessionResults({});
      setQuizSubView('play');
    }
  };

  const shufflePracticeDeck = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const ids = [...(prev.practiceVerbIds ?? [])].filter((i) => VERB_BY_ID.has(i));
    if (ids.length === 0) return;
    persist({ practiceVerbIds: shuffleIds(ids), quizStepIndex: 0 });
    if (phase === 'quiz') {
      setSessionResults({});
      setQuizSubView('play');
    }
  };

  const startQuiz = () => {
    const prev = (contentRef.current || {}) as IrregularVerbsContent;
    const ids = [...(prev.practiceVerbIds ?? [])].filter((i) => VERB_BY_ID.has(i));
    if (ids.length === 0) return;
    setSessionResults({});
    setQuizSubView('play');
    persist({ phase: 'quiz', practiceVerbIds: ids, quizStepIndex: 0 });
  };

  const checkQuiz = () => {
    if (!currentQuizVerb || !currentQuizId) return;
    const pastOk = matchesEnglishForm(quizPast, currentQuizVerb.past);
    const partOk = matchesEnglishForm(quizPart, currentQuizVerb.participle);
    const meanOk = matchesSpanishMeaning(quizMean, currentQuizVerb.meaningEs);
    setQuizChecked({ pastOk, partOk, meanOk });
    setSessionResults((prev) => ({
      ...prev,
      [currentQuizId]: { pastOk, partOk, meanOk, checked: true },
    }));
  };

  const goPracticeFromQuiz = () => {
    setQuizSubView('play');
    persist({ phase: 'practice', quizStepIndex: 0 });
  };

  const summaryStats = useMemo(() => {
    let verbsChecked = 0;
    let pastOk = 0;
    let partOk = 0;
    let meanOk = 0;
    for (const vid of practiceVerbIds) {
      const r = sessionResults[vid];
      if (!r?.checked) continue;
      verbsChecked += 1;
      if (r.pastOk) pastOk += 1;
      if (r.partOk) partOk += 1;
      if (r.meanOk) meanOk += 1;
    }
    const failedStrict = practiceVerbIds.filter((vid) => {
      const r = sessionResults[vid];
      if (!r?.checked) return true;
      return !r.pastOk || !r.partOk || !r.meanOk;
    });
    const totalAnswers = verbsChecked * 3;
    const totalCorrect = pastOk + partOk + meanOk;
    return {
      verbsChecked,
      pastOk,
      partOk,
      meanOk,
      totalAnswers,
      totalCorrect,
      failedStrict,
      deckSize: practiceVerbIds.length,
    };
  }, [practiceVerbIds, sessionResults]);

  const repeatFailedOnly = () => {
    const ids = summaryStats.failedStrict;
    if (ids.length === 0) return;
    setSessionResults({});
    setQuizSubView('play');
    persist({ practiceVerbIds: ids, quizStepIndex: 0, phase: 'quiz' });
  };

  const retryFullDeck = () => {
    setSessionResults({});
    setQuizSubView('play');
    persist({ quizStepIndex: 0, phase: 'quiz' });
  };

  const glossBase = (v: IrregularVerbRow) => v.esBase ?? v.meaningEs;
  const glossPast = (v: IrregularVerbRow) => v.esPast ?? v.meaningEs;
  const glossPart = (v: IrregularVerbRow) => v.esParticiple ?? v.meaningEs;

  const selectedCount = selectedSet.size;

  const headerSuffix =
    phase === 'browse'
      ? ` · ${selectedCount} marcados`
      : phase === 'practice'
        ? ` · práctica ${nPractice}`
        : quizSubView === 'summary'
          ? ` · resumen quiz`
          : ` · quiz ${nPractice > 0 ? safeQuizIdx + 1 : 0}/${nPractice}`;

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex h-full w-full flex-col rounded-lg border border-zinc-700 bg-black shadow-xl overflow-hidden text-zinc-100',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      data-element-id={id}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="drag-handle flex cursor-grab items-center gap-1 border-b border-zinc-700 bg-zinc-900 px-2 py-1.5 active:cursor-grabbing">
        <GripVertical className="size-4 shrink-0 text-zinc-400" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {base.title || 'Verbos irregulares'}
          {headerSuffix}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-red-300"
          title="Cerrar cuaderno"
          onClick={() => deleteElement(id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {phase === 'browse' ? (
        <>
          <div className="flex flex-col gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar verbo o significado…"
              className="h-8 max-w-[220px] border-zinc-600 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" className="h-7 text-[11px]" onClick={selectAllVisible}>
                Marcar visibles
              </Button>
              <Button type="button" variant="secondary" size="sm" className="h-7 text-[11px]" onClick={clearVisible}>
                Desmarcar visibles
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
              <Checkbox
                checked={shuffleOnGenerate}
                onCheckedChange={(v) => persist({ shuffleOnGenerate: v === true })}
                className="border-zinc-500"
              />
              Barajar al generar
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
              <Checkbox
                checked={orderPracticeBy === 'table'}
                onCheckedChange={(v) => persist({ orderPracticeBy: v === true ? 'table' : 'alphabetical' })}
                className="border-zinc-500"
              />
              Orden: filas del listado (si no, alfabético)
            </label>
            <Button
              type="button"
              size="sm"
              className="h-7 bg-emerald-700 text-[11px] text-white hover:bg-emerald-600"
              disabled={selectedCount === 0}
              onClick={startPractice}
            >
              Practicar
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[11px] sm:text-xs" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <thead className="sticky top-0 z-[1] bg-zinc-900 shadow-sm">
                <tr className="border-b border-zinc-600 text-zinc-300">
                  <th className="w-10 px-1 py-2 text-center font-semibold"> </th>
                  <th className="px-2 py-2 font-semibold text-white">Verb</th>
                  <th className="px-2 py-2 font-semibold text-white">Past simple</th>
                  <th className="px-2 py-2 font-semibold text-white">Past participle</th>
                  <th className="px-2 py-2 font-semibold text-white">Significado (ES)</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerbs.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-800 hover:bg-zinc-900/80">
                    <td className="px-1 py-1.5 text-center align-middle">
                      <Checkbox
                        checked={selectedSet.has(v.id)}
                        onCheckedChange={(c) => toggleSelected(v.id, c === true)}
                        className="border-zinc-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-semibold text-white">{v.base}</td>
                    <td className="px-2 py-1.5 text-zinc-200">{v.past}</td>
                    <td className="px-2 py-1.5 text-zinc-200">{v.participle}</td>
                    <td className="px-2 py-1.5" style={{ color: CALIPSO }}>
                      {v.meaningEs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : phase === 'practice' ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={() => persist({ phase: 'browse' })}
            >
              <ArrowLeft className="size-3.5" />
              Lista
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-7 gap-1 bg-amber-600 text-[11px] text-white hover:bg-amber-500"
              disabled={nPractice === 0}
              title="Escribir formas solo viendo el infinitivo"
              onClick={startQuiz}
            >
              <ListChecks className="size-3.5" />
              Quiz
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              title="Barajar tarjetas actuales"
              onClick={shufflePracticeDeck}
            >
              <Shuffle className="size-3.5" />
              Barajar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              title="Orden alfabético o según listado (sin barajar aleatorio)"
              onClick={reorderPracticeDeck}
            >
              <SortAsc className="size-3.5" />
              Volver a ordenar
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6 pb-4">
              {practiceVerbIds.map((vid) => {
                const v = VERB_BY_ID.get(vid);
                if (!v) return null;
                return (
                  <div
                    key={vid}
                    className="flex w-full shrink-0 flex-col rounded-xl border border-zinc-500 bg-white px-3 py-4 shadow-lg"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-x-1 gap-y-1 text-center text-sm font-semibold text-black sm:text-base">
                      <span className="min-w-0 break-words">{v.base}</span>
                      <span className="text-zinc-300 select-none">|</span>
                      <span className="min-w-0 break-words">{v.past}</span>
                      <span className="text-zinc-300 select-none">|</span>
                      <span className="min-w-0 break-words">{v.participle}</span>

                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-zinc-600 hover:text-black"
                          title="Escuchar infinitivo"
                          onClick={() => speakEnglish(v.base)}
                        >
                          <Volume2 className="size-3.5" />
                        </Button>
                      </div>
                      <span />
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-zinc-600 hover:text-black"
                          title="Escuchar past simple"
                          onClick={() => speakEnglish(v.past)}
                        >
                          <Volume2 className="size-3.5" />
                        </Button>
                      </div>
                      <span />
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-zinc-600 hover:text-black"
                          title="Escuchar past participle"
                          onClick={() => speakEnglish(v.participle)}
                        >
                          <Volume2 className="size-3.5" />
                        </Button>
                      </div>

                      <span className="text-[11px] font-medium leading-tight" style={{ color: CALIPSO }}>
                        {glossBase(v)}
                      </span>
                      <span />
                      <span className="text-[11px] font-medium leading-tight" style={{ color: CALIPSO }}>
                        {glossPast(v)}
                      </span>
                      <span />
                      <span className="text-[11px] font-medium leading-tight" style={{ color: CALIPSO }}>
                        {glossPart(v)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : quizSubView === 'summary' ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={goPracticeFromQuiz}
            >
              <ArrowLeft className="size-3.5" />
              Vuelve a Práctica
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={() => persist({ phase: 'browse', quizStepIndex: 0 })}
            >
              Lista
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                setSessionResults({});
                setQuizSubView('play');
                persist({ quizStepIndex: 0 });
              }}
            >
              Volver al quiz
            </Button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-3 py-4 text-sm"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <div className="mx-auto max-w-md space-y-4 rounded-xl border border-zinc-600 bg-zinc-900/90 p-4 text-zinc-100">
              <h3 className="text-base font-semibold text-white">Resumen del quiz</h3>
              <p className="text-[12px] text-zinc-400">
                Verbos en el mazo: {summaryStats.deckSize}. Con “Comprobar” al menos una vez:{' '}
                {summaryStats.verbsChecked}.
              </p>
              <ul className="space-y-1 text-[13px]">
                <li>
                  Past simple acertados:{' '}
                  <span className="font-semibold text-emerald-400">{summaryStats.pastOk}</span> /{' '}
                  {summaryStats.verbsChecked}
                </li>
                <li>
                  Past participle acertados:{' '}
                  <span className="font-semibold text-emerald-400">{summaryStats.partOk}</span> /{' '}
                  {summaryStats.verbsChecked}
                </li>
                <li>
                  Significado acertados:{' '}
                  <span className="font-semibold text-emerald-400">{summaryStats.meanOk}</span> /{' '}
                  {summaryStats.verbsChecked}
                </li>
                <li className="pt-1 border-t border-zinc-700">
                  Total respuestas correctas:{' '}
                  <span className="font-semibold text-emerald-400">{summaryStats.totalCorrect}</span> /{' '}
                  {summaryStats.totalAnswers || '—'}
                </li>
              </ul>
              {summaryStats.failedStrict.length > 0 && (
                <p className="text-[11px] text-amber-200/90">
                  A repasar: {summaryStats.failedStrict.length} verbo(s) —{' '}
                  {summaryStats.failedStrict
                    .map((i) => VERB_BY_ID.get(i)?.base)
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-600 text-white hover:bg-amber-500"
                  disabled={summaryStats.failedStrict.length === 0}
                  onClick={repeatFailedOnly}
                >
                  Repetir solo fallidos
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={retryFullDeck}>
                  Reintentar todo el mazo
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-zinc-500" onClick={goPracticeFromQuiz}>
                  Vuelve a Práctica
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={goPracticeFromQuiz}
            >
              <ArrowLeft className="size-3.5" />
              Práctica
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={() => persist({ phase: 'browse', quizStepIndex: 0 })}
            >
              Lista
            </Button>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
              <Checkbox
                checked={hintsEnabled}
                onCheckedChange={(v) => setHintsEnabled(v === true)}
                className="border-zinc-500"
              />
              Pistas (2 letras + largo)
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              title="Barajar orden del quiz"
              onClick={shufflePracticeDeck}
            >
              <Shuffle className="size-3.5" />
              Barajar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-zinc-600 bg-zinc-900 text-[11px] text-zinc-200"
              onClick={reorderPracticeDeck}
            >
              <SortAsc className="size-3.5" />
              Volver a ordenar
            </Button>
            <span className="text-[10px] text-zinc-500">Ctrl/⌘ + → siguiente</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
            {!currentQuizVerb || nPractice === 0 ? (
              <p className="text-center text-sm text-zinc-400">No hay verbos en el mazo. Vuelve a Práctica o a la Lista.</p>
            ) : (
              <div
                data-quiz-card
                className="mx-auto w-full max-w-[400px] space-y-4 rounded-xl border border-zinc-500 bg-white p-4 shadow-lg"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                  <div className="text-center text-2xl font-bold text-black">{currentQuizVerb.base}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-zinc-600"
                    title="Escuchar infinitivo"
                    onClick={() => speakEnglish(currentQuizVerb.base)}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                </div>

                <div className="relative space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-zinc-600">Past simple</label>
                  <div className="relative">
                    <FieldHintBubble canonical={currentQuizVerb.past} enabled={hintsEnabled} />
                    <Input
                      value={quizPast}
                      onChange={(e) => {
                        setQuizPast(e.target.value);
                        setQuizChecked(null);
                      }}
                      className={cn(
                        'border-zinc-400 pr-2 text-black',
                        quizChecked && (quizChecked.pastOk ? 'border-emerald-500 bg-emerald-50' : 'border-red-400 bg-red-50')
                      )}
                      placeholder="Escribe el past simple"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {quizChecked && !quizChecked.pastOk && (
                    <p className="text-[11px] text-red-700">Correcto: {currentQuizVerb.past}</p>
                  )}
                </div>

                <div className="relative space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-zinc-600">Past participle</label>
                  <div className="relative">
                    <FieldHintBubble canonical={currentQuizVerb.participle} enabled={hintsEnabled} />
                    <Input
                      value={quizPart}
                      onChange={(e) => {
                        setQuizPart(e.target.value);
                        setQuizChecked(null);
                      }}
                      className={cn(
                        'border-zinc-400 text-black',
                        quizChecked && (quizChecked.partOk ? 'border-emerald-500 bg-emerald-50' : 'border-red-400 bg-red-50')
                      )}
                      placeholder="Escribe el past participle"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {quizChecked && !quizChecked.partOk && (
                    <p className="text-[11px] text-red-700">Correcto: {currentQuizVerb.participle}</p>
                  )}
                </div>

                <div className="relative space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-zinc-600">Significado (español)</label>
                  <div className="relative">
                    <FieldHintBubble canonical={currentQuizVerb.meaningEs} enabled={hintsEnabled} />
                    <Input
                      value={quizMean}
                      onChange={(e) => {
                        setQuizMean(e.target.value);
                        setQuizChecked(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          checkQuiz();
                        }
                      }}
                      className={cn(
                        'border-zinc-400 text-black',
                        quizChecked && (quizChecked.meanOk ? 'border-emerald-500 bg-emerald-50' : 'border-red-400 bg-red-50')
                      )}
                      placeholder="Escribe el significado en español"
                      autoComplete="off"
                      spellCheck
                      lang="es"
                    />
                  </div>
                  {quizChecked && !quizChecked.meanOk && (
                    <p className="text-[11px] text-red-700">Referencia: {currentQuizVerb.meaningEs}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" size="sm" variant="secondary" className="text-black" onClick={checkQuiz}>
                    Comprobar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-700 text-white hover:bg-emerald-600"
                    onClick={advanceQuiz}
                  >
                    {isLastQuizCard ? 'Ver resumen' : 'Siguiente'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-400 text-black hover:bg-zinc-100"
                    onClick={goPracticeFromQuiz}
                  >
                    Vuelve a Práctica
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
