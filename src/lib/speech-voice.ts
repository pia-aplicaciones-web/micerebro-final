/**
 * Voz por defecto para síntesis de voz: femenina, amable, acento neutro (es-ES).
 * Se usa en Timer Lista, Time List, Dictado y como fallback en Notepad.
 */
export function getDefaultSpeechVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const esFemale = voices.filter(
    (v) =>
      v.lang.startsWith('es') &&
      (/female|mujer|woman|femenina|helena|paulina|monica|sabina|lupe|agustina|autonoe/i.test(v.name) ||
        v.name.includes('Google') ||
        v.name.includes('Microsoft'))
  );
  return esFemale[0] ?? voices.find((v) => v.lang.startsWith('es')) ?? null;
}
