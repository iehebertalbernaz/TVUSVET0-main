// frontend/src/services/i18n.js
const translations = {
  'pt-BR': {
    // Report Labels
    reportTitleUS: 'LAUDO DE ULTRASSONOGRAFIA ABDOMINAL',
    reportTitleEcho: 'LAUDO DE ECOCARDIOGRAFIA',
    reportTitleEcg: 'LAUDO DE ELETROCARDIOGRAFIA',
    patientData: 'Dados do Paciente',
    patientName: 'Nome',
    species: 'Espécie',
    breed: 'Raça',
    weight: 'Peso',
    size: 'Porte',
    sex: 'Sexo',
    neutered: 'Castrado(a)',
    owner: 'Tutor(a)',
    examDate: 'Data do Exame',
    findings: 'Achados Ultrassonográficos', // ...and so on
    images: 'Imagens do Exame',
    // Species/Sex
    dog: 'Canina',
    cat: 'Felina',
    male: 'Macho',
    female: 'Fêmea',
  },
  'en-US': {
    // Report Labels
    reportTitleUS: 'ABDOMINAL ULTRASOUND REPORT',
    reportTitleEcho: 'ECHOCARDIOGRAPHY REPORT',
    reportTitleEcg: 'ELECTROCARDIOGRAPHY REPORT',
    patientData: 'Patient Data',
    patientName: 'Name',
    species: 'Species',
    breed: 'Breed',
    weight: 'Weight',
    size: 'Size',
    sex: 'Sex',
    neutered: 'Neutered',
    owner: 'Owner',
    examDate: 'Exam Date',
    findings: 'Ultrasound Findings',
    images: 'Exam Images',
    // Species/Sex
    dog: 'Canine',
    cat: 'Feline',
    male: 'Male',
    female: 'Female',
  }
};

// Export a function to get translations
export const getTranslations = (lang) => translations[lang] || translations['pt-BR'];