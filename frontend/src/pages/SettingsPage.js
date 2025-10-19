import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// CORRIGIDO: ../components/ui/...
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { X, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
// CORRIGIDO: ../services/... e ../components/...
import { db } from '../services/database.js';
import { TemplatesManager } from '../components/TemplatesManager.js';
import { ReferenceValuesManager } from '../components/ReferenceValuesManager.js';
import { LetterheadSettings } from '../components/LetterheadSettings.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null); // Estado para as configurações gerais
  const [templates, setTemplates] = useState([]); // Estado para os textos padrão
  const [referenceValues, setReferenceValues] = useState([]); // Estado para os valores de referência
  const [activeTab, setActiveTab] = useState('clinic'); // Estado para controlar a aba ativa
  const navigate = useNavigate(); // Hook para navegação

  // useEffect para carregar todos os dados ao montar o componente
  useEffect(() => {
    loadAllData();
  }, []);

  // Função unificada para carregar todos os dados necessários
  const loadAllData = async () => {
    try {
      const s = await db.getSettings();
      setSettings(s || {}); // Garante que settings nunca seja null
      const t = await db.getTemplates();
      setTemplates(t);
      const rv = await db.getReferenceValues();
      setReferenceValues(rv);
    } catch (error) {
      toast.error('Erro ao carregar dados das configurações.');
      console.error('Erro DB (loadAllData):', error);
      setSettings({}); // Define como objeto vazio em caso de erro
    }
  };

  // Função para salvar as configurações gerais da clínica ou timbrado
  const saveSettings = async (data) => {
    try {
      await db.updateSettings(data);
      toast.success('Configurações salvas com sucesso!');
      loadAllData(); // Recarrega todos os dados
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error('Erro DB (updateSettings):', error);
    }
  };

  // Função para importar um backup (JSON simples ou criptografado)
  const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      try {
        let jsonData = content;
        // Tenta detectar se é um backup criptografado (pela estrutura)
        if (content.startsWith('{') && content.includes('"iv":') && content.includes('"salt":') && content.includes('"data":')) {
          const passphrase = prompt('Digite a senha do backup criptografado:');
          if (!passphrase) {
            toast.warning('Importação cancelada. Senha não fornecida.');
            return;
          }
          try {
            const { decryptBackup } = await import('../services/cryptoBackup.js');
            jsonData = await decryptBackup(content, passphrase);
          } catch (decryptError) {
            toast.error('Senha incorreta ou arquivo de backup inválido.');
            console.error('Erro ao descriptografar:', decryptError);
            return;
          }
        }

        // Tenta importar o JSON (descriptografado ou não)
        const success = db.importBackup(jsonData);
        if (success) {
          toast.success('Backup importado com sucesso! Recarregando...');
          loadAllData(); // Recarrega tudo após a importação
        } else {
          toast.error('Erro ao processar o arquivo de backup.');
        }
      } catch (error) {
        toast.error('Arquivo de backup inválido ou corrompido.');
        console.error('Erro ao importar backup:', error);
      } finally {
         // Limpa o input de arquivo para permitir importar o mesmo arquivo novamente se necessário
         event.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  // Mostra "Carregando..." enquanto os dados não são carregados
  if (!settings) {
    return <div className="p-6">Carregando configurações...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50" data-testid="settings-page">
      <div className="container mx-auto p-6">
        {/* Cabeçalho da Página */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Configurações
          </h1>
          <div className="flex gap-2">
            {/* Botão de Importar Backup */}
            <label htmlFor="import-backup" className="cursor-pointer">
              <input
                id="import-backup"
                type="file"
                accept=".json,.tvusvet.enc" // Aceita JSON e o formato criptografado
                onChange={importBackup}
                className="hidden"
              />
              <Button variant="outline" as="span"> {/* Usa as="span" para o botão ativar o input file */}
                <Upload className="mr-2 h-4 w-4" />
                Importar Backup
              </Button>
            </label>
            {/* Botão Voltar */}
            <Button onClick={() => navigate('/')} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Voltar para Início
            </Button>
          </div>
        </div>

        {/* Sistema de Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4"> {/* Ajustado para 5 colunas */}
            <TabsTrigger value="clinic">Dados da Clínica</TabsTrigger>
            <TabsTrigger value="letterhead">Timbrado</TabsTrigger>
            <TabsTrigger value="backup">Backup Seguro</TabsTrigger> {/* Nova aba */}
            <TabsTrigger value="templates">Textos Padrão</TabsTrigger>
            <TabsTrigger value="references">Valores de Referência</TabsTrigger>
          </TabsList>

          {/* Conteúdo das Abas */}
          <TabsContent value="clinic">
            <ClinicSettings settings={settings} onSave={saveSettings} />
          </TabsContent>

          <TabsContent value="letterhead">
            <LetterheadSettings settings={settings} onSave={saveSettings} />
          </TabsContent>

           {/* Nova Aba de Backup Seguro */}
          <TabsContent value="backup">
            <BackupSettings settings={settings} onSave={saveSettings} />
          </TabsContent>

          <TabsContent value="templates">
            {/* Passa a função loadAllData para o onUpdate, garantindo recarregamento */}
            <TemplatesManager templates={templates} onUpdate={loadAllData} />
          </TabsContent>

          <TabsContent value="references">
            {/* Passa a função loadAllData para o onUpdate */}
            <ReferenceValuesManager values={referenceValues} onUpdate={loadAllData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Componente Interno para Configurações da Clínica
function ClinicSettings({ settings, onSave }) {
  // Usa um estado local para o formulário, inicializado com as settings atuais
  const [formData, setFormData] = useState(settings);

  // Atualiza o estado local sempre que as settings externas mudarem
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); // Chama a função saveSettings passada como prop
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações da Clínica e Veterinário</CardTitle>
        <CardDescription>Estes dados aparecerão no cabeçalho dos laudos exportados.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="clinic_name">Nome da Clínica</Label>
            <Input id="clinic_name" value={formData?.clinic_name || ''} onChange={handleChange} data-testid="clinic-name-input" />
          </div>
          <div>
            <Label htmlFor="clinic_address">Endereço da Clínica</Label>
            <Input id="clinic_address" value={formData?.clinic_address || ''} onChange={handleChange} data-testid="clinic-address-input" />
          </div>
          <div>
            <Label htmlFor="veterinarian_name">Nome do Veterinário Responsável</Label>
            <Input id="veterinarian_name" value={formData?.veterinarian_name || ''} onChange={handleChange} data-testid="vet-name-input" />
          </div>
          <div>
            <Label htmlFor="crmv">CRMV</Label>
            <Input id="crmv" value={formData?.crmv || ''} onChange={handleChange} data-testid="crmv-input" />
          </div>
          <Button type="submit" data-testid="save-clinic-settings-button">Salvar Dados da Clínica</Button>
        </form>
      </CardContent>
    </Card>
  );
}

 // Componente Interno para Backup Seguro
function BackupSettings({ settings, onSave }) {
  const [useSavedPassphrase, setUseSavedPassphrase] = useState(!!settings?.saved_backup_passphrase);
  const [passphrase, setPassphrase] = useState('');

  useEffect(() => {
     setUseSavedPassphrase(!!settings?.saved_backup_passphrase);
  }, [settings?.saved_backup_passphrase]);


  const handleExport = async () => {
    try {
      const { encryptBackup } = await import('../services/cryptoBackup.js');
      const json = db.exportBackup(); // Pega os dados brutos do DB
      // Define a senha a ser usada: a salva (se 'useSavedPassphrase' estiver marcado) ou a digitada
      const finalPass = useSavedPassphrase && settings.saved_backup_passphrase ? settings.saved_backup_passphrase : passphrase;

      if (!finalPass) {
        toast.error('Defina uma senha para criptografar o backup ou marque a opção "Usar senha salva" (se houver uma).');
        return;
      }

      toast.info('Criptografando backup... Isso pode levar um momento.');
      // Adiciona um pequeno delay para a UI atualizar antes da criptografia pesada
      await new Promise(resolve => setTimeout(resolve, 100));

      const enc = await encryptBackup(json, finalPass); // Criptografa os dados

      // Cria um arquivo Blob e inicia o download
      const blob = new Blob([enc], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tvusvet_backup_${new Date().toISOString().split('T')[0]}.tvusvet.enc`; // Nome do arquivo criptografado
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup criptografado exportado com sucesso!');
      setPassphrase(''); // Limpa a senha digitada após o uso

    } catch (error) {
      toast.error('Erro ao exportar backup criptografado.');
      console.error('Erro Export Encrypted:', error);
    }
  };

  // Note que a importação é tratada diretamente na função `importBackup` do componente principal `SettingsPage`

  const savePassphrase = async () => {
     if (!passphrase) {
         toast.warning('Digite uma senha antes de salvar.');
         return;
     }
    try {
      // Salva a senha no objeto de configurações
      await onSave({ ...settings, saved_backup_passphrase: passphrase });
      setUseSavedPassphrase(true); // Marca automaticamente para usar a senha salva
      setPassphrase(''); // Limpa o campo de senha
      toast.success('Senha salva com sucesso para futuros backups/restaurações.');
    } catch (e) {
      toast.error('Erro ao salvar senha.');
      console.error('Erro Save Passphrase:', e);
    }
  };

  const clearPassphrase = async () => {
    if (window.confirm('Tem certeza que deseja remover a senha de backup salva? Você precisará digitá-la manualmente para futuros backups/restaurações.')) {
         try {
             // Remove a senha do objeto de configurações
             await onSave({ ...settings, saved_backup_passphrase: null });
             setUseSavedPassphrase(false); // Desmarca o uso da senha salva
             toast.success('Senha de backup removida.');
         } catch (e) {
             toast.error('Erro ao remover senha.');
             console.error('Erro Clear Passphrase:', e);
         }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Seguro (Criptografado)</CardTitle>
        <CardDescription>
          Exporte seus dados de forma segura com senha ou importe um backup anterior.
          Recomendamos exportar backups regularmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seção de Senha */}
        <div className="space-y-2">
          <Label htmlFor="backup-passphrase">Senha para Criptografia</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="backup-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={useSavedPassphrase ? 'Usando senha salva...' : 'Digite a senha aqui'}
              disabled={useSavedPassphrase} // Desabilita se estiver usando a salva
              className="flex-1"
              data-testid="backup-passphrase-input"
            />
            <div className="flex gap-2">
              <Button onClick={savePassphrase} variant="outline" data-testid="save-passphrase-button">
                {settings?.saved_backup_passphrase ? 'Atualizar Senha Salva' : 'Salvar Senha'}
              </Button>
              {/* Mostra o botão de remover apenas se existir uma senha salva */}
              {settings?.saved_backup_passphrase && (
                <Button onClick={clearPassphrase} variant="destructive" data-testid="clear-passphrase-button">
                  Remover Senha Salva
                </Button>
              )}
            </div>
          </div>
          {/* Checkbox para usar a senha salva */}
          {settings?.saved_backup_passphrase && (
             <div className="flex items-center gap-2 pt-2">
                 <input
                 type="checkbox"
                 id="use-saved-passphrase"
                 checked={useSavedPassphrase}
                 onChange={(e) => setUseSavedPassphrase(e.target.checked)}
                 className="h-4 w-4"
                 data-testid="use-saved-passphrase-checkbox"
                 />
                 <Label htmlFor="use-saved-passphrase" className="cursor-pointer">
                 Usar a senha salva para exportar/importar
                 </Label>
             </div>
          )}
           <p className="text-xs text-muted-foreground pt-1">
             {useSavedPassphrase
               ? 'A senha salva será usada. Desmarque para digitar manualmente.'
               : 'Digite uma senha para salvar ou para usar apenas nesta operação.'}
              {' '}Lembre-se desta senha, ela é necessária para restaurar o backup.
          </p>
        </div>

        {/* Botão de Exportar */}
        <Button onClick={handleExport} data-testid="export-encrypted-backup-button">
          <Download className="mr-2 h-4 w-4" />
          Exportar Backup Criptografado
        </Button>

         {/* Informações sobre Importação */}
         <div className="pt-4 border-t">
              <h4 className="font-medium mb-1">Importar Backup</h4>
              <p className="text-sm text-muted-foreground">
                  Para importar, clique no botão "Importar Backup" no topo da página.
                  Se o arquivo for criptografado (`.tvusvet.enc`), a senha (salva ou digitada) será solicitada.
                  Se for um backup antigo sem senha (`.json`), ele será importado diretamente.
              </p>
         </div>
      </CardContent>
    </Card>
  );
}