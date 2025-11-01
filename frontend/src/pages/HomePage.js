// frontend/src/pages/HomePage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// CORRIGIDO: ../components/ui/...
import { Button } from '../components/ui/button.jsx';
import { Card } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx';
import { Search, Settings, Plus, Download, FilePlus2 } from 'lucide-react'; // --- ADDED FilePlus2 icon ---
import { toast } from 'sonner';
// CORRIGIDO: ../services/... e ../components/...
import { db } from '../services/database.js';
import { PatientCard } from '../components/PatientCard.js';
import { PatientForm } from '../components/PatientForm.js';

export default function HomePage() {
  const [patients, setPatients] = useState([]); // Estado para armazenar a lista de pacientes
  const [searchTerm, setSearchTerm] = useState(''); // Estado para o termo de busca
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false); // Estado para controlar a exibição do modal de novo paciente
  const [editingPatient, setEditingPatient] = useState(null); // Estado para guardar o paciente sendo editado (ou null se for novo)
  
  // --- NEW: State for New Exam Dialog ---
  const [showNewExamDialog, setShowNewExamDialog] = useState(false);
  const [patientForNewExam, setPatientForNewExam] = useState(null);
  // --- END NEW ---

  const navigate = useNavigate(); // Hook para navegação

  // useEffect para carregar os pacientes quando o componente é montado
  useEffect(() => {
    loadPatients();
  }, []);

  // Função para carregar pacientes do banco de dados local
  const loadPatients = async () => {
    try {
      const allPatients = await db.getPatients(); // Busca pacientes do DB local
      setPatients(allPatients);
    } catch (error) {
      toast.error('Erro ao carregar pacientes');
      console.error('Erro DB (getPatients):', error);
    }
  };

  // Filtra os pacientes com base no termo de busca (nome, raça ou tutor)
  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.owner_name && p.owner_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Função para exportar backup (sem criptografia por enquanto)
  const exportBackup = () => {
    try {
      const backup = db.exportBackup(); // Gera o JSON do backup
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tvusvet_backup_${new Date().toISOString().split('T')[0]}.json`; // Nome do arquivo
      document.body.appendChild(a);
      a.click(); // Inicia o download
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar backup');
      console.error('Erro Backup:', error);
    }
  };

  // Função para abrir o formulário de paciente (novo ou edição)
  const openPatientForm = (patientToEdit = null) => {
    setEditingPatient(patientToEdit);
    setShowNewPatientDialog(true);
  };

  // Função chamada quando o formulário de paciente é salvo com sucesso
  const handlePatientSuccess = () => {
    setShowNewPatientDialog(false);
    setEditingPatient(null);
    loadPatients(); // Recarrega a lista de pacientes
  };

  // --- NEW: Handlers for New Exam Flow ---
  
  // 1. Esta função é chamada pelo PatientCard
  const openNewExamDialog = (patient) => {
    setPatientForNewExam(patient);
    setShowNewExamDialog(true);
  };

  // 2. Esta é chamada pelos botões no novo dialog
  const handleCreateExam = async (examType) => {
    if (!patientForNewExam) return;
    try {
      // Cria o exame com o 'exam_type' correto
      const newExam = await db.createExam({
        patient_id: patientForNewExam.id,
        exam_type: examType 
      });
      
      toast.success('Exame criado com sucesso!');
      setShowNewExamDialog(false);
      setPatientForNewExam(null);
      navigate(`/exam/${newExam.id}`); // Navega para a página do novo exame
    } catch (error) {
      toast.error('Erro ao criar exame.');
      console.error('Erro DB (createExam):', error);
    }
  };
  // --- END NEW ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50" data-testid="home-page">
      <div className="container mx-auto p-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              TVUSVET Laudos
            </h1>
            <p className="text-gray-600">Sistema de Ultrassonografia Veterinária - 100% Offline</p>
          </div>
          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button onClick={exportBackup} variant="outline" data-testid="export-backup-button">
              <Download className="mr-2 h-4 w-4" />
              Exportar Backup
            </Button>
            <Button onClick={() => navigate('/settings')} variant="outline" data-testid="settings-button">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
            <Button onClick={() => openPatientForm()} data-testid="new-patient-button" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar paciente por nome, raça ou tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Lista de Pacientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onUpdate={loadPatients} // Passa a função para recarregar a lista após edição/exclusão
              onEdit={() => openPatientForm(patient)} // Abre o form em modo edição
              onNewExam={() => openNewExamDialog(patient)} // --- MODIFIED: Passa a nova função ---
            />
          ))}
        </div>

        {/* Mensagem se não houver pacientes */}
        {filteredPatients.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-gray-500">
              {searchTerm ? 'Nenhum paciente encontrado para sua busca.' : 'Nenhum paciente cadastrado. Clique em "Novo Paciente" para começar!'}
            </p>
          </Card>
        )}
      </div>

      {/* Modal (Dialog) para Novo/Editar Paciente */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>
              {editingPatient ? 'Atualize os dados do paciente.' : 'Cadastre um novo paciente no sistema.'}
            </DialogDescription>
          </DialogHeader>
          {/* Renderiza o formulário dentro do modal */}
          <PatientForm
            patient={editingPatient} // Passa o paciente a ser editado (ou null)
            onSuccess={handlePatientSuccess} // Função a ser chamada no sucesso
            onCancel={() => { setShowNewPatientDialog(false); setEditingPatient(null); }} // Fecha o modal ao cancelar
          />
        </DialogContent>
      </Dialog>

      {/* --- NEW: Modal (Dialog) para Selecionar Tipo de Exame --- */}
      <Dialog 
        open={showNewExamDialog} 
        onOpenChange={(isOpen) => {
          setShowNewExamDialog(isOpen);
          if (!isOpen) setPatientForNewExam(null); // Limpa o paciente ao fechar
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Exame para {patientForNewExam?.name}</DialogTitle>
            <DialogDescription>
              Selecione o tipo de exame que deseja criar para este paciente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => handleCreateExam('ultrasound')} size="lg" className="h-12 text-base">
              <FilePlus2 className="mr-2 h-5 w-5" />
              Ultrassonografia
            </Button>
            <Button onClick={() => handleCreateExam('echo')} size="lg" variant="outline" className="h-12 text-base">
              <FilePlus2 className="mr-2 h-5 w-5" />
              Ecocardiografia
            </Button>
            <Button onClick={() => handleCreateExam('ecg')} size="lg" variant="outline" className="h-12 text-base">
              <FilePlus2 className="mr-2 h-5 w-5" />
              Eletrocardiografia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* --- END NEW --- */}

    </div>
  );
}