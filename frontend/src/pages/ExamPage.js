// frontend/src/pages/ExamPage.js

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// CORRIGIDO: Adicionado .jsx no final de cada import de componente ui
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { ScrollArea } from '../components/ui/scroll-area.jsx';
// CORRIGIDO: Adicionado Trash2
import { Upload, Save, Download, X, AlertCircle, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
// CORRIGIDO: Adicionado .js no final
import { db } from '../services/database.js';
// Importa a biblioteca para gerar DOCX
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Header, Footer, PageNumber, SectionType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver'; // Para iniciar o download do DOCX
// CORRIGIDO: Importação COMPLETA do Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
// --- NEW: Import translation service ---
import { getTranslations } from '../services/i18n.js';

// --- NEW: Centralized Organ Constants ---
const ORGANS_BASE = [
  'Estômago', 'Fígado', 'Baço', 'Rim Esquerdo', 'Rim Direito',
  'Vesícula Urinária', 'Adrenal Esquerda', 'Adrenal Direita',
  'Duodeno', 'Jejuno', 'Cólon', 'Ceco', 'Íleo', 'Linfonodos'
];
const REPRODUCTIVE_ORGANS_MALE = ['Próstata', 'Testículo Direito', 'Testículo Esquerdo'];
const REPRODUCTIVE_ORGANS_MALE_NEUTERED = ['Próstata']; // Avaliar próstata mesmo em castrados
const REPRODUCTIVE_ORGANS_FEMALE = ['Corpo Uterino', 'Corno Uterino Direito', 'Corno Uterino Esquerdo', 'Ovário Direito', 'Ovário Esquerdo'];
const REPRODUCTIVE_ORGANS_FEMALE_NEUTERED = []; // Não avaliar útero/ovários em fêmeas castradas

const ORGANS_ECHO = [
  'Valva Mitral', 'Valva Aórtica', 'Valva Pulmonar', 'Valva Tricúspide',
  'Ventrículo Esquerdo', 'Átrio Esquerdo', 'Ventrículo Direito', 'Átrio Direito',
  'Saepto Interventricular', 'Pericárdio', 'Análise Doppler', 'Medidas (Modo-M)', 'Medidas (Modo-B)'
].sort();

const ORGANS_ECG = [
  'Ritmo e Frequência', 'Eixo Elétrico', 'Onda P', 'Complexo QRS',
  'Segmento ST', 'Onda T', 'Intervalos (PR, QT)', 'Conclusão ECG'
].sort();
// --- END NEW ---

export default function ExamPage() {
  const { examId } = useParams(); // Pega o ID do exame da URL
  const navigate = useNavigate(); // Hook para navegação

  // Estados do componente
  const [exam, setExam] = useState(null);
  const [patient, setPatient] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [referenceValues, setReferenceValues] = useState([]);
  const [organsData, setOrgansData] = useState([]); // Dados específicos de cada órgão no exame atual
  const [currentOrganIndex, setCurrentOrganIndex] = useState(0); // Índice do órgão selecionado
  const [examWeight, setExamWeight] = useState(''); // Peso do animal no momento do exame
  const [examImages, setExamImages] = useState([]); // Lista de imagens anexadas (base64)
  const [uploading, setUploading] = useState(false); // Flag para indicar upload de imagem em andamento
  const [isSaving, setIsSaving] = useState(false); // Flag para indicar salvamento em andamento
  const [isExporting, setIsExporting] = useState(false); // Flag para indicar exportação em andamento
  const [isLoading, setIsLoading] = useState(true); // Flag para indicar carregamento inicial
  
  // --- NEW: State for report language ---
  const [reportLanguage, setReportLanguage] = useState('pt-BR');
  // --- END NEW ---

  // Função para carregar todos os dados necessários do banco de dados local
  const loadExamData = useCallback(async () => {
    setIsLoading(true);
    try {
      const examRes = await db.getExam(examId);
      if (!examRes) {
        toast.error('Exame não encontrado.');
        navigate('/');
        return;
      }
      setExam(examRes);
      setExamWeight(examRes.exam_weight !== null && examRes.exam_weight !== undefined ? String(examRes.exam_weight) : '');
      setExamImages(examRes.images || []);

      const patientRes = await db.getPatient(examRes.patient_id);
      if (!patientRes) {
          toast.error('Paciente associado ao exame não encontrado.');
          navigate('/');
          return;
      }
      setPatient(patientRes);

      const templatesRes = await db.getTemplates();
      setTemplates(templatesRes);

      const refValuesRes = await db.getReferenceValues();
      setReferenceValues(refValuesRes);

      // --- MODIFIED: Define a lista de órgãos com base no TIPO de exame ---
      let organList = [];
      const examType = examRes.exam_type || 'ultrasound';

      if (examType === 'echo') {
        organList = [...ORGANS_ECHO];
      } else if (examType === 'ecg') {
        organList = [...ORGANS_ECG];
      } else { // Padrão 'ultrasound'
        organList = [...ORGANS_BASE];
        if (patientRes.sex === 'male') {
          organList.push(...(patientRes.is_neutered ? REPRODUCTIVE_ORGANS_MALE_NEUTERED : REPRODUCTIVE_ORGANS_MALE));
        } else { // female
          organList.push(...(patientRes.is_neutered ? REPRODUCTIVE_ORGANS_FEMALE_NEUTERED : REPRODUCTIVE_ORGANS_FEMALE));
        }
      }
      
      const allOrgans = organList;
      // --- END MOD ---

      // Inicializa ou carrega os dados dos órgãos
      const initialOrgansData = allOrgans.map(organName => {
        // Procura por dados já salvos para este órgão neste exame
        const existingData = (examRes.organs_data || []).find(od => od.organ_name === organName);
        // Se existir, usa os dados salvos, senão, cria uma estrutura padrão
        return existingData || {
          organ_name: organName,
          measurements: {},
          selected_findings: [],
          custom_notes: '',
          report_text: '' // Texto final que vai para o laudo
        };
      });
      setOrgansData(initialOrgansData);
      setCurrentOrganIndex(0); // Seleciona o primeiro órgão

    } catch (error) {
      toast.error('Erro fatal ao carregar dados do exame.');
      console.error('Erro DB (loadExamData):', error);
      navigate('/'); // Volta para a home em caso de erro grave
    } finally {
      setIsLoading(false);
    }
  }, [examId, navigate]);

  // useEffect para carregar os dados quando o examId mudar
  useEffect(() => {
    loadExamData();
  }, [loadExamData]); // Depende da função memoizada loadExamData

  // Função para salvar o estado atual do exame no banco de dados local
  const saveExam = async () => {
    if (isSaving || !exam) return; // Evita salvamentos múltiplos
    setIsSaving(true);
    try {
      // Converte o peso para número ou null se vazio
      const weightValue = examWeight === '' ? null : parseFloat(examWeight);
      if (examWeight !== '' && isNaN(weightValue)) {
         toast.error('Peso inválido. Use apenas números e ponto decimal.');
         setIsSaving(false);
         return;
      }

      await db.updateExam(examId, {
        organs_data: organsData, // Salva os dados de todos os órgãos
        exam_weight: weightValue, // Salva o peso no momento do exame
        images: examImages // Salva a lista de imagens atualizada
      });
      toast.success('Exame salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar o exame.');
      console.error('Erro DB (updateExam):', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Função para lidar com o upload de imagens
  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let addedCount = 0;
    const newImages = [...examImages]; // Copia as imagens existentes

    try {
      // Processa cada arquivo selecionado
      for (let file of files) {
        if (!file.type.startsWith('image/')) {
          toast.warning(`Arquivo "${file.name}" não é uma imagem e foi ignorado.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) { // Limite de 10MB por imagem
          toast.warning(`Imagem "${file.name}" excede 10MB e foi ignorada.`);
          continue;
        }
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        const imageData = {
          id: db.generateId(), // Gera um ID único para a imagem
          filename: file.name,
          data: base64Data, // String Base64
          organ: organsData[currentOrganIndex]?.organ_name || null // Associa ao órgão atual
        };
        newImages.push(imageData); // Adiciona à lista
        addedCount++;
      }

      if (addedCount > 0) {
          setExamImages(newImages); // Atualiza o estado local
          // --- MODIFIED: Não salva mais automaticamente em cada upload ---
          // Apenas atualiza o estado. O usuário deve clicar em "Salvar"
          toast.success(`${addedCount} imagem(ns) adicionada(s)! Salve o exame para mantê-las.`);
          // await saveExam(); // REMOVIDO
      }

    } catch (error) {
      toast.error('Erro ao processar imagens.');
      console.error('Erro Upload Imagem:', error);
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  // Função para deletar uma imagem
  const handleDeleteImage = async (imageId) => {
     if (!window.confirm('Tem certeza que deseja remover esta imagem?')) return;
    try {
      const updatedImages = examImages.filter(img => img.id !== imageId);
      setExamImages(updatedImages); // Atualiza estado local primeiro
      // --- MODIFIED: Não salva mais automaticamente ---
      toast.warning('Imagem removida. Salve o exame para confirmar.');
      // await saveExam(); // REMOVIDO
    } catch (error) {
      toast.error('Erro ao remover imagem.');
      console.error('Erro DB (deleteImage):', error);
    }
  };

  // Função para atualizar os dados do órgão selecionado
  const updateOrganData = (index, field, value) => {
    const newOrgansData = [...organsData];
    newOrgansData[index] = {
      ...newOrgansData[index],
      [field]: value
    };
    setOrgansData(newOrgansData);
  };

  // Função utilitária para converter Base64 em ArrayBuffer (necessário para docx)
  const base64ToArrayBuffer = (base64) => {
     const binaryString = window.atob(base64.split(',')[1]);
     const len = binaryString.length;
     const bytes = new Uint8Array(len);
     for (let i = 0; i < len; i++) {
         bytes[i] = binaryString.charCodeAt(i);
     }
     return bytes.buffer;
  };

 // --- MODIFIED: Função para exportar o laudo para DOCX (agora bilíngue) ---
 const exportToDocx = async (lang) => { // Recebe o idioma
     if (isExporting || isLoading || !patient || !exam) return;
     setIsExporting(true);
     toast.info('Gerando laudo DOCX...');

     // --- NEW: Get translation object ---
     const t = getTranslations(lang);

     try {
         // Garante que os dados mais recentes estão salvos antes de exportar
         // (O usuário pode ter editado e esquecido de salvar)
         await saveExam(); 
         
         const settings = await db.getSettings(); // Pega as configurações da clínica

         let docChildren = []; // Array para guardar os parágrafos e tabelas do corpo do DOCX

         // --- Seção de Cabeçalho (Header) ---
         let headerChildren = [];
         if (settings.letterhead_path && settings.letterhead_path.startsWith('data:image')) {
             try {
             const imgBuffer = base64ToArrayBuffer(settings.letterhead_path);
             headerChildren.push(
                 new Paragraph({
                 children: [new ImageRun({ data: imgBuffer, transformation: { width: 595, height: 100 } })], // Ajuste
                 alignment: AlignmentType.CENTER,
                 })
             );
             } catch (e) { console.error("Erro ao processar imagem do timbrado:", e); }
         } else {
              if (settings.clinic_name) {
                 headerChildren.push(new Paragraph({ text: settings.clinic_name, alignment: AlignmentType.CENTER, style: "Heading1" }));
              }
               if (settings.veterinarian_name || settings.crmv) {
                  headerChildren.push(new Paragraph({ text: `${settings.veterinarian_name || ''} ${settings.crmv ? '• CRMV: ' + settings.crmv : ''}`, alignment: AlignmentType.CENTER, style: "Normal"}));
              }
               if (settings.clinic_address) {
                  headerChildren.push(new Paragraph({ text: settings.clinic_address, alignment: AlignmentType.CENTER, style: "Normal" }));
              }
             headerChildren.push(new Paragraph({ text: " ", style: "Normal"})); // Espaçador
         }
          const header = new Header({ children: headerChildren });

         // --- Seção do Corpo do Laudo ---
         
         // --- NEW: Dynamic Title ---
         let reportTitle = t.reportTitleUS; // Default
         if (exam.exam_type === 'echo') reportTitle = t.reportTitleEcho;
         if (exam.exam_type === 'ecg') reportTitle = t.reportTitleEcg;
         docChildren.push(new Paragraph({ text: reportTitle, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
         // --- END NEW ---

         docChildren.push(new Paragraph(" ")); // Espaçador

         // Dados do Paciente (usando 't' para traduções)
         docChildren.push(new Paragraph({ text: t.patientData, heading: HeadingLevel.HEADING_2 }));
         const addPatientInfo = (label, value) => {
             if (value !== null && value !== undefined && value !== '') {
                 docChildren.push(new Paragraph({ children: [ new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value)) ] }));
             }
         };
         
         addPatientInfo(t.patientName, patient.name);
         addPatientInfo(t.species, patient.species === 'dog' ? t.dog : t.cat);
         addPatientInfo(t.breed, patient.breed);
         const currentWeight = examWeight !== '' ? examWeight : patient.weight;
         addPatientInfo(t.weight, `${currentWeight} kg`);
         addPatientInfo(t.size, patient.size === 'small' ? t.small : patient.size === 'medium' ? t.medium : t.large);
         addPatientInfo(t.sex, patient.sex === 'male' ? t.male : t.female);
         if (patient.is_neutered) { docChildren.push(new Paragraph({ children: [ new TextRun({ text: `${t.sex}: `, bold: true }), new TextRun(t.neutered) ] })); }
         addPatientInfo(t.owner, patient.owner_name);
         const examDate = new Date(exam.exam_date);
         addPatientInfo(t.examDate, examDate.toLocaleDateString(lang)); // Usa o idioma
         docChildren.push(new Paragraph(" "));

         // Achados (Laudo)
         docChildren.push(new Paragraph({ text: t.findings, heading: HeadingLevel.HEADING_2 }));

         // --- MODIFIED: Define a ordem correta dos órgãos com base no TIPO de exame ---
         let reportOrganOrder = [];
         const examType = exam.exam_type || 'ultrasound';

         if (examType === 'echo') {
           reportOrganOrder = [...ORGANS_ECHO];
         } else if (examType === 'ecg') {
           reportOrganOrder = [...ORGANS_ECG];
         } else {
           reportOrganOrder = [...ORGANS_BASE];
           if (patient.sex === 'male') {
             reportOrganOrder.push(...(patient.is_neutered ? REPRODUCTIVE_ORGANS_MALE_NEUTERED : REPRODUCTIVE_ORGANS_MALE));
           } else {
             reportOrganOrder.push(...(patient.is_neutered ? REPRODUCTIVE_ORGANS_FEMALE_NEUTERED : REPRODUCTIVE_ORGANS_FEMALE));
           }
         }
         // --- END MOD ---

         // Adiciona os textos de cada órgão na ordem definida
         reportOrganOrder.forEach(organName => {
             const organData = organsData.find(o => o.organ_name === organName);
             if (organData && organData.report_text && organData.report_text.trim()) {
                 docChildren.push(new Paragraph({ text: organName, heading: HeadingLevel.HEADING_3 }));
                 
                 organData.report_text.split('\n').forEach(line => {
                     if (line.trim()) {
                         docChildren.push(new Paragraph({ text: line.trim(), alignment: AlignmentType.JUSTIFIED }));
                     }
                 });
                  docChildren.push(new Paragraph(" ")); // Espaço entre órgãos
             }
         });

         // Adiciona quebra de página antes das imagens, se houver imagens
         if (examImages.length > 0) {
              docChildren.push(new Paragraph({ children: [new PageBreak()] }));
              docChildren.push(new Paragraph({ text: t.images, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }));
              docChildren.push(new Paragraph(" "));
         }

         // Agrupa imagens em blocos de 6
         const imageChunks = [];
         for (let i = 0; i < examImages.length; i += 6) {
             imageChunks.push(examImages.slice(i, i + 6));
         }

         // Cria tabelas para as imagens
         imageChunks.forEach((chunk, chunkIndex) => {
             const rows = [];
             for (let i = 0; i < chunk.length; i += 3) {
                 const rowImages = chunk.slice(i, i + 3);
                 const tableCells = rowImages.map(img => {
                     try {
                         const imgBuffer = base64ToArrayBuffer(img.data);
                         return new TableCell({
                             children: [
                                 new Paragraph({
                                     children: [new ImageRun({ data: imgBuffer, transformation: { width: 180, height: 140 } })], 
                                     alignment: AlignmentType.CENTER
                                 }),
                                 new Paragraph({ text: img.organ || '', alignment: AlignmentType.CENTER, style: "Caption" })
                             ],
                             borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                             margins: { bottom: 100 } 
                         });
                     } catch (e) {
                         console.error("Erro ao processar imagem para DOCX:", img.filename, e);
                         return new TableCell({ children: [new Paragraph("Erro ao carregar imagem")] });
                     }
                 });
                 
                 while (tableCells.length < 3) {
                     tableCells.push(new TableCell({ children: [new Paragraph('')], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }));
                 }
                 rows.push(new TableRow({ children: tableCells }));
             }

             const table = new Table({
                 rows: rows,
                 width: { size: 100, type: WidthType.PERCENTAGE },
                 borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
             });
             docChildren.push(table);

             if (chunkIndex < imageChunks.length - 1) {
                 docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                  docChildren.push(new Paragraph(" "));
             }
         });

         // Cria o documento final
         const doc = new Document({
             sections: [{
                 properties: { },
                 headers: { default: header },
                 children: docChildren,
             }],
         });

         // Gera o blob e inicia o download
         const blob = await Packer.toBlob(doc);
         saveAs(blob, `laudo_${patient.name.replace(/ /g, '_')}_${examDate.toISOString().split('T')[0]}.docx`);
         toast.success('Laudo DOCX gerado com sucesso!');

     } catch (error) {
         console.error('Erro ao gerar DOCX:', error);
         toast.error('Falha ao gerar o laudo DOCX.');
     } finally {
         setIsExporting(false);
     }
 };
 // --- END MODIFIED FUNCTION ---

  // Renderiza "Carregando..." ou a interface do exame
  if (isLoading || !patient || !exam) {
    return <div className="flex items-center justify-center h-screen">Carregando dados do exame...</div>;
  }
  
  // --- NEW: Helper para nome do exame ---
  const getExamTypeName = (type) => {
    switch (type) {
      case 'echo': return 'Ecocardiografia';
      case 'ecg': return 'Eletrocardiografia';
      case 'ultrasound':
      default: return 'Ultrassonografia Abdominal';
    }
  };
  // --- END NEW ---

  const currentOrgan = organsData[currentOrganIndex];
  const organTemplates = templates.filter(t => t.organ === currentOrgan?.organ_name);
  const organReferenceValues = referenceValues.filter(rv =>
    rv.organ === currentOrgan?.organ_name && rv.species === patient.species && rv.size === patient.size
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50" data-testid="exam-page">
      <div className="container mx-auto p-6">
        {/* Cabeçalho com nome, data e botões */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {/* --- MODIFIED: Show dynamic exam name --- */}
              {getExamTypeName(exam.exam_type)} de {patient.name}
            </h1>
            <p className="text-gray-600 mb-2">
              {patient.breed} • {new Date(exam.exam_date).toLocaleDateString('pt-BR')}
            </p>
            {/* Input para peso no exame */}
            <div className="flex items-center gap-2 max-w-xs">
              <Label htmlFor="exam-weight" className="text-sm shrink-0">Peso no exame (kg):</Label>
              <Input
                id="exam-weight"
                type="number"
                step="0.1"
                value={examWeight}
                onChange={(e) => setExamWeight(e.target.value)}
                className="w-28 h-8 text-sm" 
                placeholder={`Cadastrado: ${patient.weight}kg`}
                data-testid="exam-weight-input"
              />
            </div>
          </div>
          
          {/* --- MODIFIED: Botões de Ação (adicionado Seletor de Idioma) --- */}
          <div className="flex flex-wrap items-end gap-2">
            <Button onClick={saveExam} variant="outline" className="h-10 px-4" disabled={isSaving || isLoading} data-testid="save-exam-button">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            
            {/* --- NEW: Language Selector --- */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="report-lang" className="text-xs text-gray-600">Idioma do Laudo</Label>
              <Select value={reportLanguage} onValueChange={setReportLanguage}>
                <SelectTrigger id="report-lang" className="h-10 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={() => exportToDocx(reportLanguage)} className="h-10 px-4" disabled={isExporting || isLoading} data-testid="export-button">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar Laudo (.docx)'}
            </Button>
            
            <Button onClick={() => navigate('/')} variant="ghost" className="h-10 px-4">
              <X className="mr-2 h-4 w-4" />
              Fechar Exame
            </Button>
          </div>
          {/* --- END MOD --- */}
        </div>

        {/* Layout Principal: Imagens | Editor | Lista de Órgãos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Coluna de Imagens (Esquerda) */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-base font-medium">Imagens ({examImages.length})</CardTitle>
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Button size="sm" variant="outline" disabled={uploading} className="h-8 px-3 text-xs" data-testid="upload-images-button" as="span">
                    <Upload className="h-3 w-3 mr-1" />
                    {uploading ? 'Enviando...' : 'Adicionar'}
                  </Button>
                </label>
                <input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden"/>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[calc(100vh-260px)]">
                  {examImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ImageIcon className="h-16 w-16 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">Nenhuma imagem adicionada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {examImages.map((image) => (
                        <div key={image.id} className="relative group border rounded-md overflow-hidden">
                          <img src={image.data} alt={image.organ || 'Imagem do exame'} className="w-full h-auto object-contain bg-gray-100"/>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1.5 right-1.5 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            onClick={() => handleDeleteImage(image.id)}
                            data-testid={`delete-image-${image.id}`}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remover Imagem</span>
                          </Button>
                          {image.organ && <Badge variant="secondary" className="absolute bottom-1.5 left-1.5 text-xs">{image.organ}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Coluna do Editor de Órgão (Centro) */}
          <div className="lg:col-span-6">
            {currentOrgan && (
              <OrganEditor
                key={currentOrgan.organ_name} // Chave para forçar remontagem
                organ={currentOrgan}
                templates={organTemplates}
                referenceValues={organReferenceValues}
                onChange={(field, value) => updateOrganData(currentOrganIndex, field, value)}
                // --- NEW: Pass language for template ---
                reportLanguage={reportLanguage}
              />
            )}
          </div>

          {/* Coluna da Lista de Órgãos (Direita) */}
          <div className="lg:col-span-2"> 
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Órgãos Avaliados</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-260px)]"> 
                  <div className="space-y-1">
                    {organsData.map((organ, idx) => (
                      <Button
                        key={organ.organ_name} 
                        variant={currentOrganIndex === idx ? 'secondary' : 'ghost'} 
                        className="w-full justify-start text-left h-auto py-2 px-3 text-xs" 
                        onClick={() => setCurrentOrganIndex(idx)}
                        data-testid={`organ-button-${idx}`}
                      >
                        {organ.organ_name}
                        {organ.report_text && organ.report_text.trim() && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" title="Possui texto no laudo"></span>
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MODIFIED: Componente Aninhado: Editor de Órgão ---
function OrganEditor({ organ, templates, referenceValues, onChange, reportLanguage }) {
  const [measurements, setMeasurements] = useState(organ.measurements || {});
  const [reportText, setReportText] = useState(organ.report_text || '');
  const [activeTab, setActiveTab] = useState('report'); 

  useEffect(() => {
    setMeasurements(organ.measurements || {});
    setReportText(organ.report_text || '');
  }, [organ]);

  const handleMeasurementsChange = (newMeasurements) => {
    setMeasurements(newMeasurements);
    onChange('measurements', newMeasurements); // Atualiza o estado em ExamPage
  };

  const handleReportTextChange = (newText) => {
    setReportText(newText);
    onChange('report_text', newText); // Atualiza o estado em ExamPage
  };

  // --- MODIFIED: Insere um texto de template (na língua correta) ---
  const insertTemplate = (template) => {
    // Pega o texto do objeto template na língua selecionada, ou fallback para pt-BR, ou string antiga
    const templateText = (typeof template.text === 'object' && template.text !== null)
      ? (template.text[reportLanguage] || template.text['pt-BR'] || '')
      : (template.text || ''); // Fallback para formato de string antigo

    if (!templateText) {
      toast.info('Este template não possui texto para o idioma selecionado.');
      return;
    }

    const textarea = document.getElementById(`report-text-${organ.organ_name}`);
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;
        const newText = currentText.substring(0, start) + templateText + currentText.substring(end);
        
        handleReportTextChange(newText); // Atualiza o estado
        
        // Foca e move o cursor após a atualização do estado
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + templateText.length;
        });
    } else {
        const newFullText = reportText ? `${reportText}\n${templateText}` : templateText;
        handleReportTextChange(newFullText);
    }
  };
  // --- END MOD ---

  return (
    <Card data-testid={`organ-editor-${organ.organ_name}`}>
      <CardHeader>
        <CardTitle>{organ.organ_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-10"> 
            <TabsTrigger value="measurements">Medidas</TabsTrigger>
            <TabsTrigger value="findings">Achados</TabsTrigger>
            <TabsTrigger value="report">Laudo</TabsTrigger>
          </TabsList>

          {/* Aba de Medidas */}
          <TabsContent value="measurements" className="mt-4 space-y-4">
             <MeasurementInput
               onAdd={(type, value, unit) => {
                 const newMeasurements = {
                   ...measurements,
                   [type]: { value: parseFloat(value), unit, is_abnormal: false } 
                 };
                 handleMeasurementsChange(newMeasurements);
               }}
               existingMeasurements={measurements} 
               referenceValues={referenceValues} 
             />
            {Object.keys(measurements).length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700">Medidas Registradas:</h4>
                {Object.entries(measurements).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded border">
                    <span>{type.replace(/_/g, ' ')}: <span className="font-semibold">{data.value} {data.unit}</span></span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => {
                        const { [type]: _, ...rest } = measurements; // Remove a medida
                        handleMeasurementsChange(rest);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba de Achados (Templates) */}
          <TabsContent value="findings" className="mt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Textos Padrão (Idioma: {reportLanguage}):</h3>
            <ScrollArea className="h-[400px] border rounded-md p-2">
              {templates.length > 0 ? (
                templates.map(template => {
                  // --- MODIFIED: Pega título na língua correta para exibir ---
                  const title = (typeof template.title === 'object' && template.title !== null)
                    ? (template.title[reportLanguage] || template.title['pt-BR'] || 'Template Antigo')
                    : (template.title || 'Template Antigo');
                  
                  // Pega o texto para o tooltip
                  const tooltipText = (typeof template.text === 'object' && template.text !== null)
                    ? (template.text[reportLanguage] || template.text['pt-BR'] || '')
                    : (template.text || '');
                  
                  return (
                    <Button
                      key={template.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2 px-2 text-xs mb-1 hover:bg-emerald-50"
                      onClick={() => insertTemplate(template)} // Passa o objeto template inteiro
                      data-testid={`template-button-${template.id}`}
                      title={`Inserir: "${tooltipText}"`} // Tooltip com o texto completo
                    >
                      {title}
                    </Button>
                  );
                  // --- END MOD ---
                })
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Nenhum texto padrão encontrado para {organ.organ_name}.</p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Aba de Laudo (Texto Final) */}
          <TabsContent value="report" className="mt-4">
            <Label htmlFor={`report-text-${organ.organ_name}`} className="text-sm font-medium text-gray-700">Texto Final para o Laudo:</Label>
            <Textarea
              id={`report-text-${organ.organ_name}`}
              value={reportText}
              onChange={(e) => handleReportTextChange(e.target.value)}
              rows={15} 
              placeholder="Digite o texto do laudo aqui ou use os achados pré-definidos da aba 'Achados'."
              className="mt-1 text-sm"
              data-testid="report-textarea"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
// --- END MODIFIED ---


// Componente Aninhado: Input para adicionar medidas (Sem alterações)
function MeasurementInput({ onAdd, existingMeasurements }) {
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState('cm'); 

    const handleAdd = () => {
        const numericValue = parseFloat(value);
        if (value && !isNaN(numericValue)) {
            let key = 'medida';
            let counter = 1;
            while (existingMeasurements[`${key}_${counter}`]) {
                counter++;
            }
            key = `${key}_${counter}`;
            onAdd(key, numericValue, unit);
            setValue('');
        } else {
            toast.warning('Por favor, insira um Valor numérico válido.');
        }
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md bg-gray-50">
            {/* Coluna 1 a 6: Input de Valor */}
            <div className="col-span-6">
                <Label htmlFor="measurement-value" className="text-xs">Valor da Medida</Label>
                <Input
                    id="measurement-value"
                    type="number"
                    step="0.01"
                    placeholder="Valor"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="measurement-value-input"
                />
            </div>

             {/* Coluna 7 a 9: Seletor de Unidade */}
            <div className="col-span-3">
                <Label htmlFor="measurement-unit-select" className="text-xs">Unidade</Label>
                <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="measurement-unit-select" className="h-8 text-xs focus:ring-0" data-testid="measurement-unit-select">
                        <SelectValue placeholder="cm" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Coluna 10 a 12: Botão Adicionar */}
            <div className="col-span-3">
                <Label className="text-xs opacity-0">.</Label> {/* Label vazio para alinhar */}
                <Button onClick={handleAdd} size="sm" className="w-full h-8 text-xs" data-testid="add-measurement-button">
                    Adicionar Medida
                </Button>
            </div>
        </div>
    );
}