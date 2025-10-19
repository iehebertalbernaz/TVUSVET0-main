import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Upload, Save, Download, X, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/database'; // Importa o serviço de banco de dados local
// Importa a biblioteca para gerar DOCX
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Header, Footer, PageNumber, SectionType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver'; // Para iniciar o download do DOCX

// Constantes de Órgãos
const ORGANS_BASE = [
  'Estômago', 'Fígado', 'Baço', 'Rim Esquerdo', 'Rim Direito',
  'Vesícula Urinária', 'Adrenal Esquerda', 'Adrenal Direita',
  'Duodeno', 'Jejuno', 'Cólon', 'Ceco', 'Íleo', 'Linfonodos'
];
const REPRODUCTIVE_ORGANS_MALE = ['Próstata', 'Testículo Direito', 'Testículo Esquerdo'];
const REPRODUCTIVE_ORGANS_MALE_NEUTERED = ['Próstata']; // Avaliar próstata mesmo em castrados
const REPRODUCTIVE_ORGANS_FEMALE = ['Corpo Uterino', 'Corno Uterino Direito', 'Corno Uterino Esquerdo', 'Ovário Direito', 'Ovário Esquerdo'];
const REPRODUCTIVE_ORGANS_FEMALE_NEUTERED = []; // Não avaliar útero/ovários em fêmeas castradas

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

      // Define a lista de órgãos a serem avaliados com base no sexo e castração
      const allOrgans = [...ORGANS_BASE];
      if (patientRes.sex === 'male') {
        allOrgans.push(...(patientRes.is_neutered ? REPRODUCTIVE_ORGANS_MALE_NEUTERED : REPRODUCTIVE_ORGANS_MALE));
      } else { // female
        allOrgans.push(...(patientRes.is_neutered ? REPRODUCTIVE_ORGANS_FEMALE_NEUTERED : REPRODUCTIVE_ORGANS_FEMALE));
      }

      // Inicializa ou carrega os dados dos órgãos
      const initialOrgansData = allOrgans.map(organName => {
        // Procura por dados já salvos para este órgão neste exame
        const existingData = (examRes.organs_data || []).find(od => od.organ_name === organName);
        // Se existir, usa os dados salvos, senão, cria uma estrutura padrão
        return existingData || {
          organ_name: organName,
          measurements: {},
          selected_findings: [], // Não usado atualmente, mas mantido para futuro
          custom_notes: '', // Não usado atualmente
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
      // Opcional: Recarregar dados após salvar para garantir consistência
      // await loadExamData();
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
        // Verifica tipo e tamanho
        if (!file.type.startsWith('image/')) {
          toast.warning(`Arquivo "${file.name}" não é uma imagem e foi ignorado.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) { // Limite de 10MB por imagem
          toast.warning(`Imagem "${file.name}" excede 10MB e foi ignorada.`);
          continue;
        }

        // Converte a imagem para Base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        // Cria o objeto da imagem para salvar no DB
        const imageData = {
          id: db.generateId(), // Gera um ID único para a imagem
          filename: file.name,
          data: base64Data, // String Base64
          organ: organsData[currentOrganIndex]?.organ_name || null // Associa ao órgão atual (opcional)
        };
        newImages.push(imageData); // Adiciona à lista
        addedCount++;
      }

      if (addedCount > 0) {
          setExamImages(newImages); // Atualiza o estado local
          await saveExam(); // Salva o exame com as novas imagens
          toast.success(`${addedCount} imagem(ns) adicionada(s)!`);
      }

    } catch (error) {
      toast.error('Erro ao processar imagens.');
      console.error('Erro Upload Imagem:', error);
    } finally {
      setUploading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      event.target.value = null;
    }
  };

  // Função para deletar uma imagem
  const handleDeleteImage = async (imageId) => {
     if (!window.confirm('Tem certeza que deseja remover esta imagem?')) return;
    try {
      const updatedImages = examImages.filter(img => img.id !== imageId);
      setExamImages(updatedImages); // Atualiza estado local primeiro para resposta rápida
      await saveExam(); // Salva o exame sem a imagem
      toast.success('Imagem removida com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover imagem.');
      // Desfaz a remoção local se o salvamento falhar (opcional)
      setExamImages(examImages);
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

 // Função para exportar o laudo para DOCX
 const exportToDocx = async () => {
     if (isExporting || isLoading || !patient || !exam) return;
     setIsExporting(true);
     toast.info('Gerando laudo DOCX...');

     try {
         await saveExam(); // Garante que os dados mais recentes estão salvos antes de exportar
         const settings = await db.getSettings(); // Pega as configurações da clínica

         let docChildren = []; // Array para guardar os parágrafos e tabelas do corpo do DOCX

         // --- Seção de Cabeçalho (será adicionada à seção do DOCX) ---
         let headerChildren = [];
         // Tenta adicionar a imagem do timbrado se existir
         if (settings.letterhead_path && settings.letterhead_path.startsWith('data:image')) {
             try {
             const imgBuffer = base64ToArrayBuffer(settings.letterhead_path);
             headerChildren.push(
                 new Paragraph({
                 children: [new ImageRun({ data: imgBuffer, transformation: { width: 595, height: 100 } })], // Ajuste width/height conforme necessário
                 alignment: AlignmentType.CENTER,
                 })
             );
             } catch (e) { console.error("Erro ao processar imagem do timbrado:", e); }
         } else { // Se não houver imagem, usa texto
              if (settings.clinic_name) {
                 headerChildren.push(new Paragraph({ text: settings.clinic_name, alignment: AlignmentType.CENTER, style: "Heading1" })); // Usar estilo se disponível
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
         docChildren.push(new Paragraph({ text: 'LAUDO DE ULTRASSONOGRAFIA ABDOMINAL', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
         docChildren.push(new Paragraph(" ")); // Espaçador

         // Dados do Paciente
         docChildren.push(new Paragraph({ text: 'Dados do Paciente', heading: HeadingLevel.HEADING_2 }));
         const addPatientInfo = (label, value) => {
             if (value !== null && value !== undefined && value !== '') {
                 docChildren.push(new Paragraph({ children: [ new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value)) ] }));
             }
         };
         addPatientInfo('Nome', patient.name);
         addPatientInfo('Espécie', patient.species === 'dog' ? 'Canina' : 'Felina');
         addPatientInfo('Raça', patient.breed);
         const currentWeight = examWeight !== '' ? examWeight : patient.weight; // Prioriza peso do exame
         addPatientInfo('Peso', `${currentWeight} kg`);
         addPatientInfo('Porte', patient.size === 'small' ? 'Pequeno' : patient.size === 'medium' ? 'Médio' : 'Grande');
         addPatientInfo('Sexo', patient.sex === 'male' ? 'Macho' : 'Fêmea');
         if (patient.is_neutered) { docChildren.push(new Paragraph({ children: [ new TextRun({ text: "Status Reprodutivo: ", bold: true }), new TextRun("Castrado(a)") ] })); }
         addPatientInfo('Tutor(a)', patient.owner_name);
         const examDate = new Date(exam.exam_date);
         addPatientInfo('Data do Exame', examDate.toLocaleDateString('pt-BR'));
         docChildren.push(new Paragraph(" "));

         // Achados Ultrassonográficos
         docChildren.push(new Paragraph({ text: 'Achados Ultrassonográficos', heading: HeadingLevel.HEADING_2 }));

         // Define a ordem correta dos órgãos para o laudo
         const reportOrganOrder = [...ORGANS_BASE];
          if (patient.sex === 'male') {
             reportOrganOrder.push(...(patient.is_neutered ? REPRODUCTIVE_ORGANS_MALE_NEUTERED : REPRODUCTIVE_ORGANS_MALE));
         } else {
             reportOrganOrder.push(...(patient.is_neutered ? REPRODUCTIVE_ORGANS_FEMALE_NEUTERED : REPRODUCTIVE_ORGANS_FEMALE));
         }

         // Adiciona os textos de cada órgão na ordem definida
         reportOrganOrder.forEach(organName => {
             const organData = organsData.find(o => o.organ_name === organName);
             if (organData && organData.report_text && organData.report_text.trim()) {
                 docChildren.push(new Paragraph({ text: organName, heading: HeadingLevel.HEADING_3 }));
                 // Adiciona cada linha do texto como um parágrafo separado para manter a formatação
                 organData.report_text.split('\n').forEach(line => {
                     if (line.trim()) { // Evita parágrafos vazios extras
                         docChildren.push(new Paragraph({ text: line.trim(), alignment: AlignmentType.JUSTIFIED }));
                     }
                 });
                  docChildren.push(new Paragraph(" ")); // Espaço entre órgãos
             }
         });

         // Adiciona quebra de página antes das imagens, se houver imagens
         if (examImages.length > 0) {
              docChildren.push(new Paragraph({ children: [new PageBreak()] }));
              docChildren.push(new Paragraph({ text: 'Imagens do Exame', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }));
              docChildren.push(new Paragraph(" "));
         }

         // Agrupa imagens em blocos de 6 para cada tabela/página
         const imageChunks = [];
         for (let i = 0; i < examImages.length; i += 6) {
             imageChunks.push(examImages.slice(i, i + 6));
         }

         // Cria uma tabela para cada bloco de 6 imagens
         imageChunks.forEach((chunk, chunkIndex) => {
             const rows = [];
             // Cria as linhas da tabela (até 2 linhas com 3 imagens cada)
             for (let i = 0; i < chunk.length; i += 3) {
                 const rowImages = chunk.slice(i, i + 3);
                 const tableCells = rowImages.map(img => {
                     try {
                         const imgBuffer = base64ToArrayBuffer(img.data);
                         return new TableCell({
                             children: [
                                 new Paragraph({
                                     children: [new ImageRun({ data: imgBuffer, transformation: { width: 180, height: 140 } })], // Tamanho fixo para consistência
                                     alignment: AlignmentType.CENTER
                                 }),
                                 // Adiciona legenda com o nome do órgão, se houver
                                 new Paragraph({ text: img.organ || '', alignment: AlignmentType.CENTER, style: "Caption" }) // Usa estilo Caption se disponível
                             ],
                             // Remove bordas da célula
                             borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                             margins: { bottom: 100 } // Espaçamento abaixo da imagem/legenda
                         });
                     } catch (e) {
                         console.error("Erro ao processar imagem para DOCX:", img.filename, e);
                         return new TableCell({ children: [new Paragraph("Erro ao carregar imagem")] });
                     }
                 });
                 // Preenche células vazias se a linha não tiver 3 imagens
                 while (tableCells.length < 3) {
                     tableCells.push(new TableCell({ children: [new Paragraph('')], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }));
                 }
                 rows.push(new TableRow({ children: tableCells }));
             }

             // Adiciona a tabela ao documento
             const table = new Table({
                 rows: rows,
                 width: { size: 100, type: WidthType.PERCENTAGE },
                  // Remove bordas da tabela inteira
                 borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
             });
             docChildren.push(table);

             // Adiciona quebra de página se houver mais blocos de imagens
             if (chunkIndex < imageChunks.length - 1) {
                 docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                  docChildren.push(new Paragraph(" ")); // Espaço após quebra de página
             }
         });

         // Cria o documento final com a seção contendo cabeçalho e corpo
         const doc = new Document({
             sections: [{
                 properties: { }, // Pode adicionar margens aqui se necessário
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

  // Renderiza "Carregando..." ou a interface do exame
  if (isLoading || !patient || !exam) {
    return <div className="flex items-center justify-center h-screen">Carregando dados do exame...</div>;
  }

  const currentOrgan = organsData[currentOrganIndex]; // Pega os dados do órgão atualmente selecionado
  const organTemplates = templates.filter(t => t.organ === currentOrgan?.organ_name); // Filtra templates para o órgão atual
  // Filtra valores de referência para o órgão, espécie e porte atuais
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
              Exame de {patient.name}
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
                className="w-28 h-8 text-sm" // Tamanho menor
                placeholder={`Cadastrado: ${patient.weight}kg`}
                data-testid="exam-weight-input"
              />
            </div>
          </div>
          {/* Botões de Ação */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveExam} variant="outline" className="h-10 px-4" disabled={isSaving || isLoading} data-testid="save-exam-button">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button onClick={exportToDocx} className="h-10 px-4" disabled={isExporting || isLoading} data-testid="export-button">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar Laudo (.docx)'}
            </Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="h-10 px-4">
              <X className="mr-2 h-4 w-4" />
              Fechar Exame
            </Button>
          </div>
        </div>

        {/* Layout Principal: Imagens | Editor | Lista de Órgãos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Coluna de Imagens (Esquerda) */}
          <div className="lg:col-span-4"> {/* Ajustado para ocupar menos espaço */}
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
                <ScrollArea className="h-[calc(100vh-260px)]"> {/* Ajuste de altura */}
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
                          {/* Mostra o órgão associado se houver */}
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
          <div className="lg:col-span-6"> {/* Ajustado para ocupar mais espaço */}
            {currentOrgan && (
              <OrganEditor
                key={currentOrgan.organ_name} // Chave para forçar remontagem ao mudar de órgão
                organ={currentOrgan}
                templates={organTemplates}
                referenceValues={organReferenceValues}
                onChange={(field, value) => updateOrganData(currentOrganIndex, field, value)}
              />
            )}
          </div>

          {/* Coluna da Lista de Órgãos (Direita) */}
          <div className="lg:col-span-2"> {/* Ajustado para ocupar menos espaço */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Órgãos Avaliados</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-260px)]"> {/* Ajuste de altura */}
                  <div className="space-y-1">
                    {organsData.map((organ, idx) => (
                      <Button
                        key={organ.organ_name} // Usar nome do órgão como chave
                        variant={currentOrganIndex === idx ? 'secondary' : 'ghost'} // Destaca o órgão ativo
                        className="w-full justify-start text-left h-auto py-2 px-3 text-xs" // Estilo mais compacto
                        onClick={() => setCurrentOrganIndex(idx)}
                        data-testid={`organ-button-${idx}`}
                      >
                        {organ.organ_name}
                        {/* Adiciona um indicador visual se o órgão já tem texto no laudo */}
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

// Componente Aninhado: Editor de Órgão
function OrganEditor({ organ, templates, referenceValues, onChange }) {
  // Estados locais para edição dentro deste componente
  const [measurements, setMeasurements] = useState(organ.measurements || {});
  const [reportText, setReportText] = useState(organ.report_text || '');
  const [activeTab, setActiveTab] = useState('report'); // Começa na aba Laudo

  // Sincroniza estados locais se o órgão mudar (importante!)
  useEffect(() => {
    setMeasurements(organ.measurements || {});
    setReportText(organ.report_text || '');
  }, [organ]);

  // Handler para salvar as medidas no estado PAI (ExamPage)
  const handleMeasurementsChange = (newMeasurements) => {
    setMeasurements(newMeasurements);
    onChange('measurements', newMeasurements); // Atualiza o estado em ExamPage
  };

  // Handler para salvar o texto do laudo no estado PAI
  const handleReportTextChange = (newText) => {
    setReportText(newText);
    onChange('report_text', newText); // Atualiza o estado em ExamPage
  };

  // Insere um texto de template no campo do laudo
  const insertTemplate = (templateText) => {
    // Adiciona o texto na posição atual do cursor ou no final
    const textarea = document.getElementById(`report-text-${organ.organ_name}`); // ID único
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = textarea.value;
        const newText = currentText.substring(0, start) + templateText + currentText.substring(end);
        textarea.value = newText; // Atualiza o valor diretamente (React controlará via state)
        handleReportTextChange(newText); // Atualiza o estado
        // Move o cursor para o final do texto inserido
        textarea.selectionStart = textarea.selectionEnd = start + templateText.length;
        textarea.focus();
    } else {
        // Fallback se não encontrar o textarea (adiciona ao final)
        const newFullText = reportText ? `${reportText}\n${templateText}` : templateText;
        handleReportTextChange(newFullText);
    }
  };

  return (
    <Card data-testid={`organ-editor-${organ.organ_name}`}>
      <CardHeader>
        <CardTitle>{organ.organ_name}</CardTitle>
        {/* Opcional: Descrição ou info rápida */}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-10"> {/* Altura ligeiramente menor */}
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
                   [type]: { value: parseFloat(value), unit, is_abnormal: false } // is_abnormal desativado por enquanto
                 };
                 handleMeasurementsChange(newMeasurements);
               }}
               existingMeasurements={measurements} // Passa as medidas existentes
               referenceValues={referenceValues} // Passa os valores de referência para validação (opcional)
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
            <h3 className="text-sm font-medium text-gray-700">Textos Padrão:</h3>
            <ScrollArea className="h-[400px] border rounded-md p-2">
              {templates.length > 0 ? (
                templates.map(template => (
                  <Button
                    key={template.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2 px-2 text-xs mb-1 hover:bg-emerald-50"
                    onClick={() => insertTemplate(template.text)}
                    data-testid={`template-button-${template.id}`}
                    title={`Inserir: "${template.text}"`} // Tooltip com o texto completo
                  >
                    {/* Mostra um título curto ou início do texto */}
                    {template.title || template.text.substring(0, 60) + (template.text.length > 60 ? '...' : '')}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Nenhum texto padrão encontrado para {organ.organ_name}.</p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Aba de Laudo (Texto Final) */}
          <TabsContent value="report" className="mt-4">
            <Label htmlFor={`report-text-${organ.organ_name}`} className="text-sm font-medium text-gray-700">Texto Final para o Laudo:</Label>
            <Textarea
              id={`report-text-${organ.organ_name}`} // ID único por órgão
              value={reportText}
              onChange={(e) => handleReportTextChange(e.target.value)}
              rows={15} // Altura ajustável conforme necessário
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

// Componente Aninhado: Input para adicionar medidas
function MeasurementInput({ onAdd, existingMeasurements, referenceValues }) {
  const [label, setLabel] = useState(''); // Rótulo/Nome da medida (ex: Comprimento, Espessura Lobo D)
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('cm');

  const handleAdd = () => {
    const numericValue = parseFloat(value);
    if (label && value && !isNaN(numericValue)) {
      // Cria uma chave única (evita sobrescrever se o usuário usar o mesmo label)
      let key = label.trim().toLowerCase().replace(/ /g, '_');
      let counter = 1;
      while (existingMeasurements[key]) {
          key = `${label.trim().toLowerCase().replace(/ /g, '_')}_${counter}`;
          counter++;
      }

      // Verifica se está fora da referência (se aplicável) - Desativado
      // const isAbnormal = checkReference(label, numericValue, unit);
      onAdd(key, numericValue, unit);

      // Limpa os campos após adicionar
      setLabel('');
      setValue('');
      // Mantém a unidade selecionada
    } else {
      toast.warning('Preencha o Rótulo e um Valor numérico válido para a medida.');
    }
  };

  // Função para verificar valor de referência (opcional, desativada)
  // const checkReference = (type, val, u) => {
  //   const ref = referenceValues.find(rv => rv.measurement_type.toLowerCase() === type.toLowerCase() && rv.unit === u);
  //   if (!ref) return false;
  //   return val < ref.min_value || val > ref.max_value;
  // };

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md bg-gray-50">
      <div className="col-span-5">
        <Label htmlFor="measurement-label" className="text-xs">Rótulo da Medida</Label>
        <Input
          id="measurement-label"
          placeholder="Ex: Comprimento, Espessura"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-sm"
          data-testid="measurement-label-input"
        />
      </div>
      <div className="col-span-3">
        <Label htmlFor="measurement-value" className="text-xs">Valor</Label>
        <Input
          id="measurement-value"
          type="number"
          step="0.01" // Permite mais precisão
          placeholder="Valor"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
          data-testid="measurement-value-input"
        />
      </div>
      <div className="col-span-2">
         <Label htmlFor="measurement-unit" className="text-xs">Unidade</Label>
         <Select value={unit} onValueChange={setUnit}>
             <SelectTrigger className="h-8 text-xs" data-testid="measurement-unit-select">
                 <SelectValue />
             </SelectTrigger>
             <SelectContent>
                 <SelectItem value="cm">cm</SelectItem>
                 <SelectItem value="mm">mm</SelectItem>
             </SelectContent>
         </Select>
      </div>
      <div className="col-span-2">
        <Button onClick={handleAdd} size="sm" className="w-full h-8 text-xs" data-testid="add-measurement-button">
          Adicionar
        </Button>
      </div>
    </div>
  );
}