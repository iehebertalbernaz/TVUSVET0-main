import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Textarea } from './ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Separator } from './ui/separator.jsx';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/database.js'; // Sobe um nível

const ORGANS = [
  'Estômago', 'Fígado', 'Baço', 'Rim Esquerdo', 'Rim Direito',
  'Vesícula Urinária', 'Adrenal Esquerda', 'Adrenal Direita',
  'Duodeno', 'Jejuno', 'Cólon', 'Ceco', 'Íleo', 'Linfonodos'
];

export function TemplatesManager({ templates, onUpdate }) {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [newTemplate, setNewTemplate] = useState({ organ: '', category: 'normal', text: '' });

  const createTemplate = async () => {
    try {
      await db.createTemplate(newTemplate);
      toast.success('Texto adicionado!');
      setShowNew(false);
      setNewTemplate({ organ: '', category: 'normal', text: '' });
      onUpdate();
    } catch (error) {
      toast.error('Erro ao adicionar texto');
    }
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setEditText(template.text);
  };

  const saveEdit = async (templateId) => {
    try {
      const template = templates.find(t => t.id === templateId);
      await db.updateTemplate(templateId, { ...template, text: editText });
      toast.success('Texto atualizado!');
      setEditingId(null);
      setEditText('');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar texto');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteTemplate = async (id) => {
    try {
      await db.deleteTemplate(id);
      toast.success('Texto removido!');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao remover texto');
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.organ]) {
      acc[template.organ] = [];
    }
    acc[template.organ].push(template);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Textos Padrão por Órgão</span>
          <Button onClick={() => setShowNew(!showNew)} size="sm" data-testid="add-template-button">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showNew && (
          <Card className="mb-4 p-4 bg-teal-50 border-teal-200">
            <div className="space-y-3">
              <Select value={newTemplate.organ} onValueChange={(value) => setNewTemplate({ ...newTemplate, organ: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o órgão" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANS.map(organ => (
                    <SelectItem key={organ} value={organ}>{organ}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Digite o texto padrão..."
                value={newTemplate.text}
                onChange={(e) => setNewTemplate({ ...newTemplate, text: e.target.value })}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={createTemplate} size="sm" disabled={!newTemplate.organ || !newTemplate.text}>
                  <Save className="mr-2 h-3 w-3" />
                  Salvar
                </Button>
                <Button onClick={() => setShowNew(false)} variant="outline" size="sm">
                  <X className="mr-2 h-3 w-3" />
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {Object.entries(groupedTemplates).map(([organ, organTemplates]) => (
              <div key={organ}>
                <h3 className="font-semibold text-lg mb-2 text-teal-700">{organ}</h3>
                <div className="space-y-2 ml-4">
                  {organTemplates.map(template => (
                    <div key={template.id} className="p-3 bg-gray-50 rounded-lg border">
                      {editingId === template.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full"
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => saveEdit(template.id)} size="sm" variant="default">
                              <Save className="mr-2 h-3 w-3" />
                              Salvar
                            </Button>
                            <Button onClick={cancelEdit} size="sm" variant="outline">
                              <X className="mr-2 h-3 w-3" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <p className="text-sm flex-1">{template.text}</p>
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={() => startEdit(template)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`edit-template-${template.id}`}
                            >
                              <Edit className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button
                              onClick={() => deleteTemplate(template.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`delete-template-${template.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
