import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'; // Mantém os estilos globais
import { db } from './services/database'; // Importa o serviço de banco de dados offline
import HomePage from './pages/HomePage'; // Importa a nova página inicial
import SettingsPage from './pages/SettingsPage'; // Importa a nova página de configurações
import ExamPage from './pages/ExamPage'; // Importa a nova página de exame
import { Toaster } from './components/ui/sonner'; // Componente para exibir notificações

function App() {
  useEffect(() => {
    // Inicializa o banco de dados offline ao carregar o app
    const initDB = async () => {
      try {
        await db.init();
        console.log('✅ Banco de dados inicializado (modo offline)');
      } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
        // Opcional: Mostrar um erro para o usuário se o DB falhar
      }
    };
    initDB();
  }, []); // O array vazio [] garante que isso rode apenas uma vez

  return (
    <div className="App">
      <BrowserRouter> {/* Habilita a navegação entre telas */}
        <Routes> {/* Define as rotas disponíveis */}
          <Route path="/" element={<HomePage />} /> {/* Rota para a tela inicial */}
          <Route path="/exam/:examId" element={<ExamPage />} /> {/* Rota para a tela de exame, com ID dinâmico */}
          <Route path="/settings" element={<SettingsPage />} /> {/* Rota para a tela de configurações */}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" /> {/* Componente para mostrar notificações */}
    </div>
  );
}

export default App;