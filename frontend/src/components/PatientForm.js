import React, { useState, useEffect } from 'react'; // Adicionado useEffect
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { toast } from 'sonner';
import { db } from '../services/database.js'; // Sobe um nível
// O restante da função PatientForm permanece igual...
export function PatientForm({ patient, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(patient || {
    name: '',
    species: 'dog',
    breed: '',
    weight: '',
    size: 'medium',
    sex: 'male',
    is_neutered: false,
    owner_name: ''
  });

  // Ajusta o peso inicial se for numérico
  useEffect(() => {
     if (patient && typeof patient.weight === 'number') {
         setFormData(prev => ({...prev, weight: String(patient.weight)}));
     }
  }, [patient]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validação básica
    if (!formData.name || !formData.species || !formData.breed || !formData.weight || !formData.size || !formData.sex) {
         toast.error('Por favor, preencha todos os campos obrigatórios (*)');
         return;
    }
     const weightValue = parseFloat(formData.weight);
     if (isNaN(weightValue) || weightValue <= 0) {
         toast.error('Peso inválido. Insira um número positivo.');
         return;
     }

    try {
      const data = {
        ...formData,
        weight: weightValue, // Salva como número
        // Garante que is_neutered seja boolean
        is_neutered: Boolean(formData.is_neutered),
        // Define owner_name como null se estiver vazio
        owner_name: formData.owner_name || null
      };

      if (patient && patient.id) { // Verifica se tem ID para atualizar
        await db.updatePatient(patient.id, data);
        toast.success('Paciente atualizado com sucesso!');
      } else {
        // Gera ID antes de criar
        const newPatientData = { ...data, id: db.generateId(), created_at: new Date().toISOString() };
        await db.createPatient(newPatientData);
        toast.success('Paciente cadastrado com sucesso!');
      }
      onSuccess(); // Chama a função de sucesso passada como prop
    } catch (error) {
      toast.error(`Erro ao ${patient ? 'atualizar' : 'cadastrar'} paciente.`);
      console.error('Erro DB (PatientForm):', error);
    }
  };

  // Handler genérico para inputs de texto
  const handleChange = (e) => {
      const { id, value } = e.target;
      setFormData(prev => ({...prev, [id]: value }));
  };

  // Handler para checkboxes
  const handleCheckboxChange = (e) => {
      const { id, checked } = e.target;
      setFormData(prev => ({...prev, [id]: checked }));
  };

  // Handler para Selects
  const handleSelectChange = (id, value) => {
      setFormData(prev => ({...prev, [id]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="patient-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome do Paciente *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            data-testid="patient-name-input"
          />
        </div>
        <div>
          <Label htmlFor="owner_name">Nome do Tutor</Label>
          <Input
            id="owner_name"
            value={formData.owner_name || ''} // Garante que seja string vazia se null
            onChange={handleChange}
            data-testid="owner-name-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="species">Espécie *</Label>
          <Select value={formData.species} onValueChange={(value) => handleSelectChange('species', value)}>
            <SelectTrigger data-testid="species-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dog">Cão</SelectItem>
              <SelectItem value="cat">Gato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="breed">Raça *</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={handleChange}
            required
            data-testid="breed-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="weight">Peso (kg) *</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            min="0.1" // Impede peso zero ou negativo
            value={formData.weight}
            onChange={handleChange}
            required
            data-testid="weight-input"
          />
        </div>
        <div>
          <Label htmlFor="size">Porte *</Label>
          <Select value={formData.size} onValueChange={(value) => handleSelectChange('size', value)}>
            <SelectTrigger data-testid="size-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeno</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sex">Sexo *</Label>
          <Select value={formData.sex} onValueChange={(value) => handleSelectChange('sex', value)}>
            <SelectTrigger data-testid="sex-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Macho</SelectItem>
              <SelectItem value="female">Fêmea</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-2"> {/* Adicionado padding top */}
        <input
          type="checkbox"
          id="is_neutered"
          checked={!!formData.is_neutered} // Garante que seja boolean
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" // Estilos ajustados
          data-testid="neutered-checkbox"
        />
        <Label htmlFor="is_neutered" className="cursor-pointer">Paciente Castrado(a)</Label> {/* Texto ajustado */}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button type="submit" className="flex-1" data-testid="save-patient-button">
          {patient ? 'Atualizar Paciente' : 'Salvar Paciente'} {/* Textos ajustados */}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
      </div>
    </form>
  );
}