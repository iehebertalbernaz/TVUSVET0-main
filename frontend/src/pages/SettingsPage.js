// frontend/src/pages/SettingsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { ArrowLeft, Save, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/database.js';
// --- NEW: Import the managers ---
import TemplatesManager from '../components/TemplatesManager.js';
import ReferenceValuesManager from '../components/ReferenceValuesManager.js';
// --- END NEW ---

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    clinic_name: '',
    clinic_address: '',
    veterinarian_name: '',
    crmv: '',
    letterhead_path: null,
    letterhead_filename: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega as configurações ao montar a página
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const currentSettings = await db.getSettings();
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (error) {
      toast.error('Erro ao carregar configurações');
      console.error('Erro DB (getSettings):', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Salva as configurações
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await db.updateSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error('Erro DB (updateSettings):', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Lida com a mudança nos inputs
  const handleChange = (e) => {
    const { id, value } = e.target;
    setSettings(prev => ({ ...prev, [id]: value }));
  };

  // Lida com o upload do timbrado (letterhead)
  const handleLetterheadUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
        toast.error('Imagem muito grande. Limite de 2MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo inválido. Selecione uma imagem.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setSettings(prev => ({
          ...prev,
          letterhead_path: e.target.result, // Salva como Base64
          letterhead_filename: file.name
        }));
        toast.info('Timbrado carregado. Clique em "Salvar" para confirmar.');
      };
      reader.onerror = (e) => {
         toast.error('Erro ao ler o arquivo.');
         console.error("Erro FileReader:", e);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove o timbrado
  const removeLetterhead = () => {
     setSettings(prev => ({
       ...prev,
       letterhead_path: null,
       letterhead_filename: null
     }));
     toast.warning('Timbrado removido. Clique em "Salvar" para confirmar.');
  };
  
  // Lida com o backup e restauração
  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (window.confirm('IMPORTANTE: Isso substituirá TODOS os dados atuais. Deseja continuar?')) {
          try {
            const success = db.importBackup(e.target.result);
            if (success) {
              toast.success('Backup importado com sucesso! Recarregando...');
              // Recarrega a aplicação para refletir os novos dados
              setTimeout(() => window.location.reload(), 1500);
            } else {
              toast.error('Erro: Arquivo de backup inválido ou corrompido.');
            }
          } catch (error) {
            toast.error('Erro ao processar o backup.');
            console.error("Erro Importação:", error);
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Selecione um arquivo .json de backup válido.');
    }
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = null;
  };
  
  const handleClearData = () => {
    if (window.confirm('ATENÇÃO: TEM CERTEZA? Isso apagará TODOS os pacientes, exames e configurações. Esta ação é irreversível.')) {
       if (window.confirm('CONFIRMAÇÃO FINAL: Todos os dados serão perdidos. Continuar?')) {
         try {
           db.clearAll();
           toast.success('Dados apagados! A aplicação será reiniciada.');
           setTimeout(() => window.location.reload(), 1500);
         } catch(error) {
           toast.error('Erro ao apagar dados.');
         }
       }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando configurações...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto p-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/')} variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Configurações</h1>
              <p className="text-gray-600">Gerencie os dados da clínica, textos padrão e backups.</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        {/* Abas de Conteúdo */}
        <Tabs defaultValue="clinic">
          <TabsList className="mb-4">
            <TabsTrigger value="clinic">Clínica</TabsTrigger>
            <TabsTrigger value="templates">Textos Padrão</TabsTrigger>
            <TabsTrigger value="ref_values">Valores de Referência</TabsTrigger>
            <TabsTrigger value="backup">Backup / Restore</TabsTrigger>
          </TabsList>

          {/* Aba: Clínica */}
          <TabsContent value="clinic">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Clínica</CardTitle>
                <CardDescription>
                  Estas informações serão usadas no cabeçalho dos seus laudos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinic_name">Nome da Clínica</Label>
                    <Input id="clinic_name" value={settings.clinic_name || ''} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="clinic_address">Endereço/Telefone</Label>
                    <Input id="clinic_address" value={settings.clinic_address || ''} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="veterinarian_name">Nome do Veterinário(a)</Label>
                    <Input id="veterinarian_name" value={settings.veterinarian_name || ''} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="crmv">CRMV</Label>
                    <Input id="crmv" value={settings.crmv || ''} onChange={handleChange} />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Timbrado (Cabeçalho)</h3>
                  {settings.letterhead_path ? (
                    <div className="flex items-center gap-4">
                       <img src={settings.letterhead_path} alt="Timbrado" className="w-48 h-auto border rounded-md" />
                       <div>
                         <p className="text-sm text-gray-700">{settings.letterhead_filename}</p>
                         <Button variant="destructive" size="sm" onClick={removeLetterhead} className="mt-2">
                           <Trash2 className="h-4 w-4 mr-1"/> Remover
                         </Button>
                       </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="letterhead-upload" className="mb-2 block">
                        Selecione uma imagem para o cabeçalho (ideal: 1200x200 pixels, max 2MB)
                      </Label>
                      <Input
                        id="letterhead-upload"
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleLetterheadUpload}
                        className="max-w-md"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- MODIFIED: Aba: Textos Padrão --- */}
          <TabsContent value="templates">
            {/* O componente TemplatesManager agora é renderizado diretamente aqui */}
            <TemplatesManager />
          </TabsContent>
          {/* --- END MOD --- */}


          {/* --- NEW: Aba: Valores de Referência --- */}
          <TabsContent value="ref_values">
            {/* O componente ReferenceValuesManager é renderizado aqui */}
            {/* (Este arquivo não foi parte da sua solicitação, mas é assim que você o adicionaria) */}
            {/* <ReferenceValuesManager /> */}
            <Card>
              <CardHeader>
                <CardTitle>Valores de Referência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">
                  (O componente 'ReferenceValuesManager.js' seria renderizado aqui.)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          {/* --- END NEW --- */}


          {/* Aba: Backup / Restore */}
          <TabsContent value="backup">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Card de Importação */}
               <Card>
                 <CardHeader>
                   <CardTitle>Restaurar Backup (.json)</CardTitle>
                   <CardDescription>
                     Importe um arquivo de backup para restaurar todos os dados.
                     Atenção: Isso substituirá todos os dados existentes.
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Label htmlFor="import-backup" className="cursor-pointer">
                     <Button as="span" variant="secondary" className="w-full">
                       <Upload className="mr-2 h-4 w-4" />
                       Selecionar Arquivo de Backup
                     </Button>
                   </Label>
                   <input
                     id="import-backup"
                     type="file"
                     accept=".json, application/json"
                     onChange={handleImportBackup}
                     className="hidden"
                   />
                 </CardContent>
               </Card>
               
               {/* Card de Limpeza de Dados */}
               <Card className="border-red-500">
                 <CardHeader>
                   <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
                   <CardDescription>
                     Ações destrutivas e irreversíveis.
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Button variant="destructive" className="w-full" onClick={handleClearData}>
                     <Trash2 className="mr-2 h-4 w-4" />
                     Apagar Todos os Dados
                   </Button>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

