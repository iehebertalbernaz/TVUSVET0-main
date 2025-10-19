import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Plus, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/database.js'; // Sobe um nível para encontrar 'services'
import { PatientForm } from './PatientForm.js';
// O restante da função PatientCard permanece igual...
export function PatientCard({ patient, onUpdate, onEdit }) { // Adicionado onEdit como prop
  const [exams, setExams] = useState([]);
  const [examsCount, setExamsCount] = useState(0);
  const [showExamsDialog, setShowExamsDialog] = useState(false); // Renomeado para clareza
  const [showEditDialog, setShowEditDialog] = useState(false); // Estado para modal de edição
  const navigate = useNavigate();

  // Carrega contagem inicial e sempre que 'patient.id' ou 'onUpdate' mudar
  useEffect(() => {
     loadExamsCount();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, onUpdate]); // Adicionado onUpdate como dependência

  const loadExamsCount = async () => { // Async para consistência futura
    try {
      const patientExams = await db.getExams(patient.id);
      setExamsCount(patientExams.length);
      setExams(patientExams); // Armazena exames carregados para o modal
    } catch (error) {
      console.error('Erro ao carregar contagem/lista de exames:', error);
      toast.error('Erro ao buscar exames do paciente.');
    }
  };

  // Abre o modal de exames (usa os exames já carregados)
  const openExamsDialog = () => {
    setShowExamsDialog(true);
  };

  const createNewExam = async () => {
    try {
      const newExam = await db.createExam({
        patient_id: patient.id,
        exam_weight: patient.weight // Pré-preenche com o peso atual do paciente
      });
      navigate(`/exam/${newExam.id}`); // Navega para a página do novo exame
    } catch (error) {
      toast.error('Erro ao criar novo exame.');
      console.error('Erro DB (createExam):', error);
    }
  };

  // Função para lidar com o sucesso da edição
  const handleEditSuccess = () => {
      setShowEditDialog(false);
      if (onUpdate) {
          onUpdate(); // Chama a função para recarregar a lista na HomePage
      }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`patient-card-${patient.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{patient.name}</span>
          <div className="flex gap-1 items-center"> {/* Reduzido gap */}
            {/* Botão Editar agora abre o modal de edição */}
            <Button
              onClick={() => setShowEditDialog(true)} // Abre modal de edição
              variant="ghost"
              size="sm" // Tamanho pequeno
              className="h-7 w-7 p-0" // Ajuste fino de tamanho/padding
              data-testid={`edit-patient-${patient.id}`}
              title="Editar Paciente" // Tooltip
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Badge variant={patient.species === 'dog' ? 'default' : 'secondary'}>
              {patient.species === 'dog' ? 'Cão' : 'Gato'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {patient.breed} • {patient.weight}kg • {patient.size === 'small' ? 'Pequeno' : patient.size === 'medium' ? 'Médio' : 'Grande'}
          {patient.is_neutered ? ' • Castrado(a)' : ''} {/* Mostra status de castração */}
          {patient.owner_name && ` • Tutor: ${patient.owner_name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            onClick={createNewExam}
            className="flex-1"
            data-testid={`new-exam-button-${patient.id}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Exame
          </Button>
          <Button
            onClick={openExamsDialog} // Abre o modal
            variant="outline"
            className="flex-1"
            disabled={examsCount === 0} // Desabilita se não houver exames
            data-testid={`view-exams-button-${patient.id}`}
          >
            <FileText className="mr-2 h-4 w-4" />
            Exames ({examsCount})
          </Button>
        </div>

        {/* Modal (Dialog) para Listar Exames */}
        <Dialog open={showExamsDialog} onOpenChange={setShowExamsDialog}>
          <DialogContent className="max-w-xl"> {/* Tamanho ajustado */}
            <DialogHeader>
              <DialogTitle>Exames de {patient.name}</DialogTitle>
              <DialogDescription>Selecione um exame para visualizar ou editar.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] mt-4 pr-3"> {/* Adicionado padding direito */}
              {exams.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum exame realizado para este paciente.</p>
              ) : (
                <div className="space-y-2">
                  {exams.map(exam => (
                    <Card
                      key={exam.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/exam/${exam.id}`)} // Navega para o exame ao clicar
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            Exame de {new Date(exam.exam_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {exam.organs_data?.length || 0} órgãos descritos • {exam.images?.length || 0} imagens
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-600">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Modal (Dialog) para Editar Paciente */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Paciente</DialogTitle>
              <DialogDescription>Atualize os dados do paciente.</DialogDescription>
            </DialogHeader>
            <PatientForm
              patient={patient} // Passa o paciente atual para o formulário
              onSuccess={handleEditSuccess} // Fecha modal e recarrega lista ao salvar
              onCancel={() => setShowEditDialog(false)} // Apenas fecha o modal
            />
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}