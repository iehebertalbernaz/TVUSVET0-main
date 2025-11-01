/**
 * TVUSVET Database Service - 100% Offline
 * Gerencia todo armazenamento local com localStorage
 */

class DatabaseService {
  constructor() {
    this.storage = window.localStorage;
    this.initialized = false;
  }

  // Inicializar banco de dados
  async init() {
    if (this.initialized) return;
    
    // Criar estruturas padrão se não existirem
    if (!this.storage.getItem('patients')) {
      this.storage.setItem('patients', JSON.stringify([]));
    }
    if (!this.storage.getItem('exams')) {
      this.storage.setItem('exams', JSON.stringify([]));
    }
    if (!this.storage.getItem('templates')) {
      this.initializeDefaultTemplates();
    }
    if (!this.storage.getItem('reference_values')) {
      this.initializeDefaultReferenceValues();
    }
    if (!this.storage.getItem('settings')) {
      this.storage.setItem('settings', JSON.stringify({
        id: 'global_settings',
        clinic_name: '',
        clinic_address: '',
        veterinarian_name: '',
        crmv: '',
        letterhead_path: null,
        letterhead_filename: null,
        letterhead_margins_mm: { top: 30, left: 15, right: 15, bottom: 20 },
        saved_backup_passphrase: null
      }));
    }
    
    this.initialized = true;
    console.log('✅ Database initialized (offline mode)');
  }

  // ============= PACIENTES =============
  
  async createPatient(patient) {
    const patients = this.getPatients();
    const newPatient = {
      ...patient,
      id: this.generateId(),
      created_at: new Date().toISOString()
    };
    patients.push(newPatient);
    this.storage.setItem('patients', JSON.stringify(patients));
    return newPatient;
  }

  getPatients() {
    return JSON.parse(this.storage.getItem('patients') || '[]');
  }

  async getPatient(id) {
    const patients = this.getPatients();
    return patients.find(p => p.id === id) || null;
  }

  async updatePatient(id, patientData) {
    const patients = this.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index !== -1) {
      patients[index] = { ...patients[index], ...patientData };
      this.storage.setItem('patients', JSON.stringify(patients));
      return patients[index];
    }
    throw new Error('Patient not found');
  }

  async deletePatient(id) {
    let patients = this.getPatients();
    patients = patients.filter(p => p.id !== id);
    this.storage.setItem('patients', JSON.stringify(patients));
    
    // Deletar exames do paciente também
    let exams = this.getExams();
    exams = exams.filter(e => e.patient_id !== id);
    this.storage.setItem('exams', JSON.stringify(exams));
  }

  // ============= EXAMES =============
  
  // --- MODIFIED FUNCTION ---
  async createExam(examData) {
    const exams = this.getExams();
    const newExam = {
      ...examData,
      id: this.generateId(),
      exam_type: examData.exam_type || 'ultrasound', // <-- ADDED THIS LINE
      exam_date: examData.exam_date || new Date().toISOString(),
      organs_data: examData.organs_data || [],
      images: examData.images || [],
      created_at: new Date().toISOString()
    };
    exams.push(newExam);
    this.storage.setItem('exams', JSON.stringify(exams));
    return newExam;
  }
  // --- END MODIFIED FUNCTION ---

  getExams(patientId = null) {
    const exams = JSON.parse(this.storage.getItem('exams') || '[]');
    if (patientId) {
      return exams.filter(e => e.patient_id === patientId)
        .sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    }
    return exams.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
  }

  async getExam(id) {
    const exams = this.getExams();
    return exams.find(e => e.id === id) || null;
  }

  async updateExam(id, examData) {
    const exams = this.getExams();
    const index = exams.findIndex(e => e.id === id);
    if (index !== -1) {
      exams[index] = { ...exams[index], ...examData };
      this.storage.setItem('exams', JSON.stringify(exams));
      return exams[index];
    }
    throw new Error('Exam not found');
  }

  async deleteExam(id) {
    let exams = this.getExams();
    exams = exams.filter(e => e.id !== id);
    this.storage.setItem('exams', JSON.stringify(exams));
  }

  // ============= TEMPLATES =============
  
  // --- MODIFIED FUNCTION ---
  initializeDefaultTemplates() {
    const organs = [
      'Estômago', 'Fígado', 'Baço', 'Rim Esquerdo', 'Rim Direito',
      'Vesícula Urinária', 'Adrenal Esquerda', 'Adrenal Direita',
      'Duodeno', 'Jejuno', 'Cólon', 'Ceco', 'Íleo', 'Linfonodos'
    ];
    
    // --- NEW: Lists for new exam types ---
    const echoOrgans = [
      'Valva Mitral', 'Valva Aórtica', 'Ventrículo Esquerdo', 'Átrio Esquerdo',
      'Saepto Interventricular', 'Pericárdio', 'Análise Doppler'
    ];
    const ecgOrgans = [
      'Ritmo e Frequência', 'Eixo Elétrico', 'Onda P', 'Complexo QRS',
      'Segmento ST', 'Onda T', 'Intervalos (PR, QT)', 'Conclusão ECG'
    ];
    // --- END NEW ---

    const templates = [];

    // --- Ultrasound Organs ---
    organs.forEach((organ, idx) => {
      templates.push(
        {
          id: this.generateId(),
          organ,
          category: 'normal',
          // --- MODIFIED: Bilingual Object ---
          title: { 'pt-BR': 'Normal', 'en-US': 'Normal' },
          text: {
            'pt-BR': `${organ} com dimensões, contornos, ecogenicidade e ecotextura preservados.`,
            'en-US': `${organ} with preserved dimensions, contours, echogenicity, and echotexture.`
          },
          // --- END MOD ---
          order: idx * 10
        },
        {
          id: this.generateId(),
          organ,
          category: 'finding',
          // --- MODIFIED: Bilingual Object ---
          title: { 'pt-BR': 'Alteração de ecogenicidade', 'en-US': 'Altered echogenicity' },
          text: {
            'pt-BR': `${organ} apresenta alteração de ecogenicidade.`,
            'en-US': `${organ} presents altered echogenicity.`
          },
          // --- END MOD ---
          order: idx * 10 + 1
        },
        {
          id: this.generateId(),
          organ,
          category: 'finding',
          // --- MODIFIED: Bilingual Object ---
          title: { 'pt-BR': 'Aumento de dimensões', 'en-US': 'Increased dimensions' },
          text: {
            'pt-BR': `${organ} com aumento de dimensões.`,
            'en-US': `${organ} with increased dimensions.`
          },
          // --- END MOD ---
          order: idx * 10 + 2
        }
      );
    });
    
    // --- NEW: Default Echo Templates ---
    let echoOrder = organs.length * 10;
    echoOrgans.forEach((organ, idx) => {
      templates.push({
        id: this.generateId(),
        organ,
        category: 'normal',
        title: { 'pt-BR': 'Normal', 'en-US': 'Normal' },
        text: {
          'pt-BR': `Avaliação de ${organ} dentro dos padrões de normalidade.`,
          'en-US': `${organ} assessment within normal limits.`
        },
        order: echoOrder + (idx * 10)
      });
    });

    // --- NEW: Default ECG Templates ---
    let ecgOrder = (organs.length + echoOrgans.length) * 10;
    ecgOrgans.forEach((organ, idx) => {
      templates.push({
        id: this.generateId(),
        organ,
        category: 'normal',
        title: { 'pt-BR': 'Normal', 'en-US': 'Normal' },
        text: {
          'pt-BR': `${organ}: Dentro dos limites da normalidade.`,
          'en-US': `${organ}: Within normal limits.`
        },
        order: ecgOrder + (idx * 10)
      });
    });
    // --- END NEW ---

    this.storage.setItem('templates', JSON.stringify(templates));
  }
  // --- END MODIFIED FUNCTION ---

  getTemplates(organ = null) {
    const templates = JSON.parse(this.storage.getItem('templates') || '[]');
    if (organ) {
      return templates.filter(t => t.organ === organ).sort((a, b) => a.order - b.order);
    }
    return templates.sort((a, b) => a.order - b.order);
  }

  async createTemplate(templateData) {
    const templates = this.getTemplates();
    const newTemplate = {
      ...templateData,
      id: this.generateId()
    };
    templates.push(newTemplate);
    this.storage.setItem('templates', JSON.stringify(templates));
    return newTemplate;
  }

  async updateTemplate(id, templateData) {
    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...templateData };
      this.storage.setItem('templates', JSON.stringify(templates));
      return templates[index];
    }
    throw new Error('Template not found');
  }

  async deleteTemplate(id) {
    let templates = this.getTemplates();
    templates = templates.filter(t => t.id !== id);
    this.storage.setItem('templates', JSON.stringify(templates));
  }

  // ============= VALORES DE REFERÊNCIA =============
  
  initializeDefaultReferenceValues() {
    const refValues = [
      // Rins
      { organ: 'Rim Esquerdo', measurement_type: 'comprimento', species: 'dog', size: 'small', min_value: 3.5, max_value: 5.5, unit: 'cm' },
      { organ: 'Rim Esquerdo', measurement_type: 'comprimento', species: 'dog', size: 'medium', min_value: 5.0, max_value: 7.0, unit: 'cm' },
      { organ: 'Rim Esquerdo', measurement_type: 'comprimento', species: 'dog', size: 'large', min_value: 6.5, max_value: 9.0, unit: 'cm' },
      { organ: 'Rim Direito', measurement_type: 'comprimento', species: 'dog', size: 'small', min_value: 3.5, max_value: 5.5, unit: 'cm' },
      { organ: 'Rim Direito', measurement_type: 'comprimento', species: 'dog', size: 'medium', min_value: 5.0, max_value: 7.0, unit: 'cm' },
      { organ: 'Rim Direito', measurement_type: 'comprimento', species: 'dog', size: 'large', min_value: 6.5, max_value: 9.0, unit: 'cm' },
      // Fígado
      { organ: 'Fígado', measurement_type: 'espessura', species: 'dog', size: 'small', min_value: 2.0, max_value: 4.0, unit: 'cm' },
      { organ: 'Fígado', measurement_type: 'espessura', species: 'dog', size: 'medium', min_value: 3.0, max_value: 5.5, unit: 'cm' },
      { organ: 'Fígado', measurement_type: 'espessura', species: 'dog', size: 'large', min_value: 4.0, max_value: 7.0, unit: 'cm' },
      // Baço
      { organ: 'Baço', measurement_type: 'espessura', species: 'dog', size: 'small', min_value: 0.5, max_value: 1.5, unit: 'cm' },
      { organ: 'Baço', measurement_type: 'espessura', species: 'dog', size: 'medium', min_value: 1.0, max_value: 2.0, unit: 'cm' },
      { organ: 'Baço', measurement_type: 'espessura', species: 'dog', size: 'large', min_value: 1.5, max_value: 2.5, unit: 'cm' }
    ];
    
    const withIds = refValues.map(rv => ({ ...rv, id: this.generateId() }));
    this.storage.setItem('reference_values', JSON.stringify(withIds));
  }

  getReferenceValues(filters = {}) {
    const values = JSON.parse(this.storage.getItem('reference_values') || '[]');
    let filtered = values;
    
    if (filters.organ) {
      filtered = filtered.filter(v => v.organ === filters.organ);
    }
    if (filters.species) {
      filtered = filtered.filter(v => v.species === filters.species);
    }
    if (filters.size) {
      filtered = filtered.filter(v => v.size === filters.size);
    }
    
    return filtered;
  }

  async createReferenceValue(valueData) {
    const values = this.getReferenceValues();
    const newValue = {
      ...valueData,
      id: this.generateId()
    };
    values.push(newValue);
    this.storage.setItem('reference_values', JSON.stringify(values));
    return newValue;
  }

  async updateReferenceValue(id, valueData) {
    const values = this.getReferenceValues();
    const index = values.findIndex(v => v.id === id);
    if (index !== -1) {
      values[index] = { ...values[index], ...valueData };
      this.storage.setItem('reference_values', JSON.stringify(values));
      return values[index];
    }
    throw new Error('Reference value not found');
  }

  async deleteReferenceValue(id) {
    let values = this.getReferenceValues();
    values = values.filter(v => v.id !== id);
    this.storage.setItem('reference_values', JSON.stringify(values));
  }

  // ============= CONFIGURAÇÕES =============
  
  getSettings() {
    return JSON.parse(this.storage.getItem('settings') || '{}');
  }

  async updateSettings(settingsData) {
    const current = this.getSettings();
    const updated = { ...current, ...settingsData };
    this.storage.setItem('settings', JSON.stringify(updated));
    return updated;
  }

  // ============= IMAGENS =============
  
  async saveImage(examId, imageData) {
    const exam = await this.getExam(examId);
    if (!exam) throw new Error('Exam not found');
    
    const imageId = this.generateId();
    const image = {
      id: imageId,
      filename: imageData.filename,
      data: imageData.data, // Base64
      organ: imageData.organ || null
    };
    
    exam.images = exam.images || [];
    exam.images.push(image);
    await this.updateExam(examId, exam);
    
    return image;
  }

  async deleteImage(examId, imageId) {
    const exam = await this.getExam(examId);
    if (!exam) throw new Error('Exam not found');
    
    exam.images = (exam.images || []).filter(img => img.id !== imageId);
    await this.updateExam(examId, exam);
  }

  // ============= BACKUP/RESTORE =============
  
  exportBackup() {
    const data = {
      patients: this.getPatients(),
      exams: this.getExams(),
      templates: this.getTemplates(),
      reference_values: this.getReferenceValues(),
      settings: this.getSettings(),
      exported_at: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return JSON.stringify(data, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.patients) this.storage.setItem('patients', JSON.stringify(data.patients));
      if (data.exams) this.storage.setItem('exams', JSON.stringify(data.exams));
      if (data.templates) this.storage.setItem('templates', JSON.stringify(data.templates));
      if (data.reference_values) this.storage.setItem('reference_values', JSON.stringify(data.reference_values));
      if (data.settings) this.storage.setItem('settings', JSON.stringify(data.settings));
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  clearAll() {
    this.storage.removeItem('patients');
    this.storage.removeItem('exams');
    this.storage.removeItem('templates');
    this.storage.removeItem('reference_values');
    this.storage.removeItem('settings');
    this.initialized = false;
  }

  // ============= UTILS =============
  
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const db = new DatabaseService();