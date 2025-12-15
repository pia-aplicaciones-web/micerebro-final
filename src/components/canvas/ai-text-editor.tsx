'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Wand2,
  FileText,
  Lightbulb,
  CheckSquare,
  Target,
  Copy,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AITextEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
}

const AI_PROMPTS = {
  mejorar: { icon: Wand2, label: 'Mejorar', prompt: 'Reescribe de manera más clara y profesional:' },
  resumir: { icon: FileText, label: 'Resumir', prompt: 'Resume en 3-5 frases:' },
  expandir: { icon: Sparkles, label: 'Expandir', prompt: 'Desarrolla con más detalles:' },
  estructurar: { icon: Target, label: 'Estructurar', prompt: 'Organiza en secciones claras:' },
  brainstorm: { icon: Lightbulb, label: 'Ideas', prompt: 'Genera 5 ideas relacionadas:' },
  checklist: { icon: CheckSquare, label: 'Checklist', prompt: 'Convierte en lista de tareas:' }
};

export default function AITextEditor({ initialContent, onSave }: AITextEditorProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState(initialContent);
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processWithAI = async (promptType: keyof typeof AI_PROMPTS) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular procesamiento

    let result = '';
    switch (promptType) {
      case 'mejorar': result = inputText.replace(/(^\w|\.\s*\w)/g, l => l.toUpperCase()); break;
      case 'resumir': result = inputText.split(/[.!?]+/).slice(0, 3).join('. ') + '.'; break;
      case 'expandir': result = inputText + '\n\n[Desarrollo adicional simulado]'; break;
      case 'estructurar': result = '# ' + inputText.split('\n')[0] + '\n\n## Detalles\n\n' + inputText; break;
      case 'brainstorm': result = '1. Idea relacionada 1\n2. Idea relacionada 2\n3. Idea relacionada 3'; break;
      case 'checklist': result = inputText.split('\n').map(line => '☐ ' + line).join('\n'); break;
    }

    setOutputText(result);
    setIsProcessing(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(outputText);
    toast({ title: 'Copiado', description: 'Texto copiado al portapapeles.' });
  };

  return (
    <Tabs defaultValue="editar" className="h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="editar">Editar</TabsTrigger>
        <TabsTrigger value="resultado">Resultado</TabsTrigger>
      </TabsList>

      <TabsContent value="editar" className="space-y-4 mt-4">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Pega o escribe tu texto aquí..."
          className="min-h-[200px]"
        />

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(AI_PROMPTS).map(([key, prompt]) => {
            const Icon = prompt.icon;
            return (
              <Button
                key={key}
                variant="outline"
                onClick={() => processWithAI(key as keyof typeof AI_PROMPTS)}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {prompt.label}
              </Button>
            );
          })}
        </div>

        {isProcessing && <div className="text-center py-4">Procesando...</div>}
      </TabsContent>

      <TabsContent value="resultado" className="space-y-4 mt-4">
        <Textarea value={outputText} readOnly className="min-h-[200px]" />

        <div className="flex gap-2">
          <Button onClick={() => onSave(outputText)} className="flex-1">
            Aplicar Cambios
          </Button>
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}