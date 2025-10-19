# 📱 TVUSVET LAUDOS - GUIA COMPLETO ANDROID STUDIO

## 🎯 O QUE FOI FEITO ATÉ AGORA:

✅ Capacitor instalado e configurado
✅ Plataforma Android adicionada
✅ SQLite plugin instalado
✅ Build do React criado
✅ Projeto sincronizado com Android

---

## 📂 ESTRUTURA DO PROJETO:

```
/app/frontend/
├── android/                    ← PROJETO ANDROID (abrir no Android Studio)
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/
│   │   │       ├── res/
│   │   │       └── assets/
│   │   │           └── public/  ← Build do React aqui
│   │   └── build.gradle
│   ├── gradle/
│   └── build.gradle
├── src/                        ← Código React
├── build/                      ← Build gerado
├── capacitor.config.json       ← Configuração Capacitor
└── package.json

```

---

## 🚀 PASSO 1: ABRIR NO ANDROID STUDIO

### **No seu computador:**

1. **Baixe o projeto** do servidor Emergent:
   ```bash
   # Use o método de download do Emergent
   # ou baixe via GitHub se configurou
   ```

2. **Abra o Android Studio**

3. **File → Open**

4. **Navegue até:** `/app/frontend/android`

5. **Clique em "Open"**

6. **Aguarde** o Gradle sync terminar (pode demorar alguns minutos na primeira vez)

---

## 🔧 PASSO 2: CONFIGURAR O PROJETO

### **2.1 - Verificar build.gradle (Project-level)**

Arquivo: `android/build.gradle`

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.3'
        classpath 'com.google.gms:google-services:4.4.0'
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

### **2.2 - Verificar build.gradle (App-level)**

Arquivo: `android/app/build.gradle`

Certifique-se que tem:
```gradle
android {
    namespace "com.tvusvet.laudos"
    compileSdkVersion rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.tvusvet.laudos"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
}

dependencies {
    implementation project(':capacitor-android')
    implementation project(':capacitor-community-sqlite')
    // outras dependências
}
```

### **2.3 - Atualizar AndroidManifest.xml**

Arquivo: `android/app/src/main/AndroidManifest.xml`

Adicione permissões necessárias:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="TVUSVET Laudos"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="TVUSVET Laudos"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## 💾 PASSO 3: IMPLEMENTAR SQLite LOCAL

### **3.1 - Arquivo de Banco de Dados**

Crie: `frontend/src/database.js`

```javascript
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class DatabaseService {
  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.db = null;
    this.dbName = 'tvusvet.db';
  }

  async init() {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      // Para testes no navegador
      await this.sqlite.initWebStore();
    }

    // Criar/abrir banco de dados
    this.db = await this.sqlite.createConnection(
      this.dbName,
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();
    await this.createTables();
  }

  async createTables() {
    // Tabela de pacientes
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT NOT NULL,
        weight REAL NOT NULL,
        size TEXT NOT NULL,
        sex TEXT NOT NULL,
        is_neutered INTEGER DEFAULT 0,
        owner_name TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Tabela de exames
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        exam_date TEXT NOT NULL,
        exam_weight REAL,
        organs_data TEXT,
        images TEXT,
        final_report TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabela de templates
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        organ TEXT NOT NULL,
        category TEXT NOT NULL,
        text TEXT NOT NULL,
        order_num INTEGER DEFAULT 0
      )
    `);

    // Tabela de valores de referência
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS reference_values (
        id TEXT PRIMARY KEY,
        organ TEXT NOT NULL,
        measurement_type TEXT NOT NULL,
        species TEXT NOT NULL,
        size TEXT NOT NULL,
        min_value REAL NOT NULL,
        max_value REAL NOT NULL,
        unit TEXT NOT NULL
      )
    `);

    // Tabela de licenças
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS license_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        is_used INTEGER DEFAULT 0,
        used_at TEXT,
        expires_at TEXT
      )
    `);

    // Tabela de configurações
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'global_settings',
        clinic_name TEXT,
        clinic_address TEXT,
        veterinarian_name TEXT,
        crmv TEXT,
        letterhead_path TEXT
      )
    `);
  }

  // CRUD de Pacientes
  async createPatient(patient) {
    const query = `
      INSERT INTO patients (id, name, species, breed, weight, size, sex, is_neutered, owner_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      patient.id,
      patient.name,
      patient.species,
      patient.breed,
      patient.weight,
      patient.size,
      patient.sex,
      patient.is_neutered ? 1 : 0,
      patient.owner_name || null,
      patient.created_at || new Date().toISOString()
    ]);
    
    return patient;
  }

  async getPatients() {
    const result = await this.db.query('SELECT * FROM patients ORDER BY created_at DESC');
    return result.values || [];
  }

  async getPatient(id) {
    const result = await this.db.query('SELECT * FROM patients WHERE id = ?', [id]);
    return result.values?.[0] || null;
  }

  async updatePatient(id, patient) {
    const query = `
      UPDATE patients 
      SET name = ?, species = ?, breed = ?, weight = ?, size = ?, sex = ?, is_neutered = ?, owner_name = ?
      WHERE id = ?
    `;
    
    await this.db.run(query, [
      patient.name,
      patient.species,
      patient.breed,
      patient.weight,
      patient.size,
      patient.sex,
      patient.is_neutered ? 1 : 0,
      patient.owner_name || null,
      id
    ]);
  }

  async deletePatient(id) {
    await this.db.run('DELETE FROM patients WHERE id = ?', [id]);
  }

  // CRUD de Exames
  async createExam(exam) {
    const query = `
      INSERT INTO exams (id, patient_id, exam_date, exam_weight, organs_data, images, final_report, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      exam.id,
      exam.patient_id,
      exam.exam_date || new Date().toISOString(),
      exam.exam_weight || null,
      JSON.stringify(exam.organs_data || []),
      JSON.stringify(exam.images || []),
      exam.final_report || '',
      exam.created_at || new Date().toISOString()
    ]);
    
    return exam;
  }

  async getExams(patientId = null) {
    let query = 'SELECT * FROM exams';
    let params = [];
    
    if (patientId) {
      query += ' WHERE patient_id = ?';
      params = [patientId];
    }
    
    query += ' ORDER BY exam_date DESC';
    
    const result = await this.db.query(query, params);
    const exams = result.values || [];
    
    // Parse JSON fields
    return exams.map(exam => ({
      ...exam,
      organs_data: JSON.parse(exam.organs_data || '[]'),
      images: JSON.parse(exam.images || '[]')
    }));
  }

  async getExam(id) {
    const result = await this.db.query('SELECT * FROM exams WHERE id = ?', [id]);
    const exam = result.values?.[0];
    
    if (!exam) return null;
    
    return {
      ...exam,
      organs_data: JSON.parse(exam.organs_data || '[]'),
      images: JSON.parse(exam.images || '[]')
    };
  }

  async updateExam(id, examData) {
    const query = `
      UPDATE exams 
      SET organs_data = ?, exam_weight = ?, final_report = ?
      WHERE id = ?
    `;
    
    await this.db.run(query, [
      JSON.stringify(examData.organs_data || []),
      examData.exam_weight || null,
      examData.final_report || '',
      id
    ]);
  }

  async deleteExam(id) {
    await this.db.run('DELETE FROM exams WHERE id = ?', [id]);
  }

  // Backup e Restore
  async exportDatabase() {
    const result = await this.sqlite.exportToJson({ database: this.dbName });
    return result.export;
  }

  async importDatabase(jsonString) {
    await this.sqlite.importFromJson({ jsonstring: jsonString });
  }

  async closeDatabase() {
    if (this.db) {
      await this.db.close();
    }
  }
}

export const db = new DatabaseService();
```

### **3.2 - Atualizar App.js para usar SQLite**

Modifique o arquivo `frontend/src/App.js` para usar o banco local ao invés das chamadas API.

No topo do arquivo, adicione:
```javascript
import { db } from './database';
import { useEffect, useState } from 'react';

// Inicializar banco de dados
const [dbReady, setDbReady] = useState(false);

useEffect(() => {
  async function initDB() {
    try {
      await db.init();
      setDbReady(true);
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database init error:', error);
    }
  }
  initDB();
}, []);
```

Substitua as chamadas `axios.get/post/put/delete` por chamadas ao banco:

```javascript
// ANTES:
const response = await axios.get(`${API}/patients`);
setPatients(response.data);

// DEPOIS:
const patients = await db.getPatients();
setPatients(patients);
```

---

## 🏗️ PASSO 4: GERAR APK NO ANDROID STUDIO

### **4.1 - Build de Desenvolvimento (Debug)**

1. No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Aguarde o build terminar
3. APK será gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Instale no celular via USB ou compartilhe o arquivo

### **4.2 - Build de Produção (Release)**

#### **Criar Keystore (primeira vez):**

No terminal do Android Studio:
```bash
keytool -genkey -v -keystore tvusvet-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tvusvet
```

Preencha as informações solicitadas e **GUARDE A SENHA!**

#### **Configurar assinatura:**

Crie arquivo `android/key.properties`:
```properties
storePassword=SUA_SENHA_AQUI
keyPassword=SUA_SENHA_AQUI
keyAlias=tvusvet
storeFile=../tvusvet-release-key.jks
```

Modifique `android/app/build.gradle`:
```gradle
// No topo
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    //...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### **Gerar APK Release:**

1. **Build → Generate Signed Bundle / APK**
2. Selecione **APK**
3. Escolha o keystore criado
4. Preencha as senhas
5. Selecione **release**
6. **Finish**

APK assinado estará em: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📲 PASSO 5: TESTAR NO CELULAR

### **Método 1: USB**
1. Ative **Depuração USB** no Android
2. Conecte o celular via USB
3. No Android Studio: **Run → Run 'app'**

### **Método 2: APK Direto**
1. Copie o APK para o celular
2. Instale manualmente
3. Permita "Fontes desconhecidas" se necessário

---

## 🔒 PASSO 6: CONFIGURAR LICENÇAS

### **Inicializar códigos de licença:**

Crie script para inserir os 200 códigos no SQLite:

```javascript
// Em database.js, adicione:
async initializeLicenseCodes(codes) {
  for (const code of codes) {
    const query = `
      INSERT OR IGNORE INTO license_codes (id, code, is_used, used_at, expires_at)
      VALUES (?, ?, 0, NULL, NULL)
    `;
    await this.db.run(query, [generateUUID(), code]);
  }
}

// No App.js, chame na inicialização:
const licenseCodes = [
  'SF28-P83O-H9LM-AKUE',
  'SJ62-JR3S-OBMH-3BQC',
  // ... resto dos códigos
];

await db.initializeLicenseCodes(licenseCodes);
```

---

## 📦 PASSO 7: EXPORT/IMPORT BACKUP

### **Exportar dados:**

```javascript
async function exportBackup() {
  const jsonData = await db.exportDatabase();
  
  // Salvar em arquivo
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  
  await Filesystem.writeFile({
    path: `tvusvet_backup_${Date.now()}.json`,
    data: JSON.stringify(jsonData),
    directory: Directory.Documents,
    encoding: 'utf8'
  });
}
```

### **Importar dados:**

```javascript
async function importBackup(fileContent) {
  await db.importDatabase(fileContent);
}
```

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES:

### **Erro: "SDK not found"**
**Solução:** Configure o SDK do Android no Android Studio
- File → Project Structure → SDK Location

### **Erro: "Gradle sync failed"**
**Solução:** 
```bash
cd android
./gradlew clean
./gradlew build
```

### **Erro: "SQLite plugin not found"**
**Solução:** Verifique que o plugin está no `android/app/build.gradle`

### **App crasha ao abrir**
**Solução:** Verifique logs:
```bash
adb logcat | grep TVUSVET
```

---

## 📝 CHECKLIST FINAL:

- [ ] Projeto aberto no Android Studio
- [ ] Gradle sync completo
- [ ] SQLite database implementado
- [ ] Todas as chamadas API substituídas
- [ ] Licenças inicializadas
- [ ] Build debug gerado
- [ ] Testado em dispositivo real
- [ ] Build release gerado e assinado
- [ ] Backup/restore funcionando

---

## 🎯 ARQUIVOS IMPORTANTES:

```
android/
├── app/
│   ├── build.gradle                    ← Configurações do app
│   └── src/main/AndroidManifest.xml   ← Permissões e config
├── build.gradle                        ← Config geral do projeto
├── key.properties                      ← Senhas da keystore (NÃO COMMITAR)
└── tvusvet-release-key.jks            ← Keystore (BACKUP!)

frontend/src/
├── database.js                         ← Nova classe de banco local
└── App.js                             ← Atualizado para usar SQLite
```

---

## 🚀 PRÓXIMOS PASSOS:

1. Complete a migração de todas as funções para SQLite
2. Teste todas as funcionalidades offline
3. Implemente sistema de exportação de laudos offline
4. Adicione splash screen personalizado
5. Configure ícone do app (ver pasta `android/app/src/main/res/mipmap`)
6. Teste em diferentes dispositivos Android
7. Publique na Play Store (opcional)

---

## 📞 SUPORTE:

Se tiver problemas, verifique:
- Logs do Android Studio
- Logs do dispositivo: `adb logcat`
- Documentação Capacitor: https://capacitorjs.com/docs
- Documentação SQLite: https://github.com/capacitor-community/sqlite

---

**Versão:** 1.0.0  
**Última atualização:** Outubro 2025  
**Plataforma mínima:** Android 5.0 (API 21)  
**Plataforma alvo:** Android 14 (API 34)
