import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { Textarea } from './ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';
import { Plus, Trash2, Edit } from 'lucide-react';
import { db } from '../services/database.js';
import { toast } from 'sonner';

// --- ORGAN CONSTANTS (Centralized) ---
// (Moved from ExamPage and database.js to be the single source of truth for the UI)

const ORGANS_BASE = [
  'Estômago', 'Fígado', 'Baço', 'Rim Esquerdo', 'Rim Direito',
  'Vesícula Urinária', 'Adrenal Esquerda', 'Adrenal Direita',
  'Duodeno', 'Jejuno', 'Cólon', 'Ceco', 'Íleo', 'Linfonodos'
];
const REPRODUCTIVE_ORGANS_MALE = ['Próstata', 'Testículo Direito', 'Testículo Esquerdo'];
const REPRODUCTIVE_ORGANS_MALE_NEUTERED = ['Próstata'];
const REPRODUCTIVE_ORGANS_FEMALE = ['Corpo Uterino', 'Corno Uterino Direito', 'Corno Uterino Esquerdo', 'Ovário Direito', 'Ovário Esquerdo'];
const REPRODUCTIVE_ORGANS_FEMALE_NEUTERED = [];

// Full Ultrasound list
const ORGANS_ULTRASOUND = [
  ...new Set([
    ...ORGANS_BASE, 
    ...REPRODUCTIVE_ORGANS_MALE, 
    ...REPRODUCTIVE_ORGANS_FEMALE
  ])
].sort();

// Echocardiography list
const ORGANS_ECHO = [
  'Valva Mitral', 'Valva Aórtica', 'Valva Pulmonar', 'Valva Tricúspide',
  'Ventrículo Esquerdo', 'Átrio Esquerdo', 'Ventrículo Direito', 'Átrio Direito',
  'Saepto Interventricular', 'Pericárdio', 'Análise Doppler', 'Medidas (Modo-M)', 'Medidas (Modo-B)'
].sort();

// Electrocardiography list
const ORGANS_ECG = [
  'Ritmo e Frequência', 'Eixo Elétrico', 'Onda P', 'Complexo QRS',
  'Segmento ST', 'Onda T', 'Intervalos (PR, QT)', 'Conclusão ECG'
].sort();

// Grouped object for filtering
const ALL_ORGAN_LISTS = {
  'ultrasound': ORGANS_ULTRASOUND,
  'echo': ORGANS_ECHO,
  'ecg': ORGANS_ECG,
};

// A single, flat list of ALL possible organs for the form dropdown
const ALL_ORGANS_FLAT = [
  ...new Set([
    ...ORGANS_ULTRASOUND, 
    ...ORGANS_ECHO, 
    ...ORGANS_ECG
  ])
].sort();
// --- END ORGAN CONSTANTS ---


export default function TemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [examTypeFilter, setExamTypeFilter] = useState('ultrasound');
  const [organFilter, setOrganFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Memoized list of organs for the *organ filter* dropdown
  const organsForFilterDropdown = useMemo(() => {
    return ALL_ORGAN_LISTS[examTypeFilter] || [];
  }, [examTypeFilter]);

  // Memoized list of *templates* to display
  const filteredTemplates = useMemo(() => {
    // 1. Filter by Exam Type
    const organsInType = ALL_ORGAN_LISTS[examTypeFilter] || [];
    const examTypeTemplates = templates.filter(t => organsInType.includes(t.organ));

    // 2. Filter by Organ
    if (organFilter === 'all') {
      return examTypeTemplates;
    }
    return examTypeTemplates.filter(t => t.organ === organFilter);

  }, [organFilter, examTypeFilter, templates]);

  // Reset organ filter when exam type changes
  useEffect(() => {
    setOrganFilter('all');
  }, [examTypeFilter]);


  const loadTemplates = async () => {
    try {
      const allTemplates = await db.getTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      toast.error('Erro ao carregar textos padrão');
      console.error('Erro DB (getTemplates):', error);
    }
  };

  const openDialog = (template = null) => {
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setEditingTemplate(null);
    setShowDialog(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este texto padrão?')) {
      try {
        await db.deleteTemplate(id);
        toast.success('Texto padrão excluído!');
        loadTemplates(); // Recarrega a lista
      } catch (error) {
        toast.error('Erro ao excluir texto padrão.');
        console.error('Erro DB (deleteTemplate):', error);
      }
    }
  };

  const handleSuccess = () => {
    loadTemplates();
    closeDialog();
  };

  // Helper to display bilingual text, falling back to old string format
  const getDisplayTitle = (title) => {
    if (typeof title === 'object' && title !== null) {
      return title['pt-BR'] || title['en-US'] || 'Sem Título';
    }
    return title || 'Sem Título'; // Backward compatibility
  };

  const getDisplayText = (text) => {
    if (typeof text === 'object' && text !== null) {
      return text['pt-BR'] || text['en-US'] || '...';
    }
    return text || '...'; // Backward compatibility
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <CardTitle>Gerenciar Textos Padrão (Templates)</CardTitle>
        <div className="flex flex-col md:flex-row gap-2">
          {/* --- NEW: Exam Type Filter --- */}
          <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultrasound">Ultrassonografia</SelectItem>
              <SelectItem value="echo">Ecocardiografia</SelectItem>
              <SelectItem value="ecg">Eletrocardiografia</SelectItem>
            </SelectContent>
          </Select>

          {/* --- MODIFIED: Organ Filter (now dynamic) --- */}
          <Select value={organFilter} onValueChange={setOrganFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por órgão..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Órgãos ({organsForFilterDropdown.length})</SelectItem>
              {organsForFilterDropdown.map(organ => (
                <SelectItem key={organ} value={organ}>{organ}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => openDialog()} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Texto
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredTemplates.map(template => (
            <div key={template.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                {/* --- MODIFIED: Display bilingual text --- */}
                <p className="font-medium">{template.organ} - {getDisplayTitle(template.title)}</p>
                <p className="text-sm text-gray-600 truncate max-w-lg">{getDisplayText(template.text)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openDialog(template)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              {organFilter === 'all' ? 'Nenhum texto padrão para este tipo de exame.' : 'Nenhum texto padrão para este órgão.'}
            </p>
          )}
        </div>
      </CardContent>

      <TemplateForm
        open={showDialog}
        onOpenChange={setShowDialog}
        template={editingTemplate}
        onSuccess={handleSuccess}
        onCancel={closeDialog}
      />
    </Card>
  );
}

// --- MODIFIED: Form Component ---
function TemplateForm({ open, onOpenChange, template, onSuccess, onCancel }) {
  const [organ, setOrgan] = useState('');
  // --- MODIFIED: State for bilingual objects ---
  const [title, setTitle] = useState({ 'pt-BR': '', 'en-US': '' });
  const [text, setText] = useState({ 'pt-BR': '', 'en-US': '' });
  // ---
  const [order, setOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setOrgan(template.organ);
      // --- MODIFIED: Handle both old string data and new object data ---
      setTitle(
        typeof template.title === 'object' && template.title !== null
          ? template.title
          : { 'pt-BR': template.title || '', 'en-US': '' }
      );
      setText(
        typeof template.text === 'object' && template.text !== null
          ? template.text
          : { 'pt-BR': template.text || '', 'en-US': '' }
      );
      // ---
      setOrder(template.order || 0);
    } else {
      // Reset
      setOrgan('');
      setTitle({ 'pt-BR': '', 'en-US': '' });
      setText({ 'pt-BR': '', 'en-US': '' });
      setOrder(0);
    }
  }, [template, open]); // Resetar quando o template ou 'open' mudar

  // --- NEW: Handlers for bilingual state ---
  const handleTitleChange = (lang, value) => {
    setTitle(prev => ({ ...prev, [lang]: value }));
  };
  const handleTextChange = (lang, value) => {
    setText(prev => ({ ...prev, [lang]: value }));
  };
  // ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    // --- MODIFIED: Validate the PT-BR text field ---
    if (isSaving || !organ || !text['pt-BR']) {
      toast.warning('Preencha pelo menos o Órgão e o Texto Padrão (PT-BR).');
      return;
    }
    setIsSaving(true);
    
    const data = {
      organ,
      title, // Save the entire title object
      text,  // Save the entire text object
      order: parseInt(order, 10) || 0,
      category: 'finding' // Categoria padrão
    };

    try {
      if (template) {
        await db.updateTemplate(template.id, data);
        toast.success('Texto padrão atualizado!');
      } else {
        await db.createTemplate(data);
        toast.success('Texto padrão criado!');
      }
      onSuccess(); // Recarrega e fecha
    } catch (error) {
      toast.error('Erro ao salvar texto padrão.');
      console.error('Erro DB (saveTemplate):', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Texto Padrão' : 'Novo Texto Padrão'}</DialogTitle>
          <DialogDescription>
            Crie ou edite um texto para reuso rápido nos laudos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="organ">Órgão</Label>
            <Select value={organ} onValueChange={setOrgan} required>
              <SelectTrigger id="organ">
                <SelectValue placeholder="Selecione um órgão..." />
              </SelectTrigger>
              <SelectContent>
                {/* --- MODIFIED: Use the full flat list of all organs --- */}
                {ALL_ORGANS_FLAT.map(organName => (
                  <SelectItem key={organName} value={organName}>{organName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* --- NEW: Bilingual Title --- */}
            <div>
              <Label htmlFor="title-pt">Título Curto (PT-BR)</Label>
              <Input
                id="title-pt"
                value={title['pt-BR']}
                onChange={(e) => handleTitleChange('pt-BR', e.target.value)}
                placeholder="Ex: Normal"
              />
            </div>
            <div>
              <Label htmlFor="title-en">Título Curto (EN-US)</Label>
              <Input
                id="title-en"
                value={title['en-US']}
                onChange={(e) => handleTitleChange('en-US', e.target.value)}
                placeholder="Ex: Normal"
              />
            </div>
          </div>

          <div>
            {/* --- NEW: Bilingual Text (PT) --- */}
            <Label htmlFor="text-pt">Texto Padrão (PT-BR) <span className="text-red-500">*</span></Label>
            <Textarea
              id="text-pt"
              value={text['pt-BR']}
              onChange={(e) => handleTextChange('pt-BR', e.target.value)}
              placeholder="Ex: Fígado com dimensões, contornos..."
              rows={5}
              required
            />
          </div>

          <div>
            {/* --- NEW: Bilingual Text (EN) --- */}
            <Label htmlFor="text-en">Texto Padrão (EN-US)</Label>
            <Textarea
              id="text-en"
              value={text['en-US']}
              onChange={(e) => handleTextChange('en-US', e.target.value)}
              placeholder="Ex: Liver with preserved dimensions, contours..."
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="order">Ordem (menor aparece primeiro)</Label>
            <Input
              id="order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}