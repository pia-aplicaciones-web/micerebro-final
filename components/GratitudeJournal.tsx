"use client";

import { useState, useEffect } from "react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GratitudeJournal() {
  const [value, setValue] = useState("");
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("gratitude_entries");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const handleAdd = () => {
    if (!value.trim()) return;
    const newEntry = {
      id: Date.now(),
      text: value,
      date: new Date().toLocaleDateString("es-CL"),
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    localStorage.setItem("gratitude_entries", JSON.stringify(updated));
    setValue("");
  };

  return (
    <div className="space-y-4 p-4 bg-white/70 backdrop-blur-md rounded-xl shadow-sm border">
      <h2 className="text-xl font-semibold text-slate-800">Diario de Gratitud</h2>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribe algo por lo que estés agradecida hoy..."
        className="resize-none"
        rows={4}
      />

      <Button onClick={handleAdd} className="w-full bg-indigo-600 text-white">
        Añadir
      </Button>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="border-indigo-100">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs text-indigo-600">{entry.date}</p>
              <p className="text-sm text-slate-700">{entry.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
