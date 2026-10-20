# 🐍 Interpretador Python Web

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Pyodide](https://img.shields.io/badge/Pyodide-0.26.1-green)](https://pyodide.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Uma aplicação web para executar código Python diretamente no navegador com Pyodide (WebAssembly). A execução continua local; opcionalmente, usuários autenticados podem sincronizar projetos e compartilhar cópias somente para leitura pela infraestrutura Auth0 + Neon.

🌐 **Acesse a aplicação:** [https://icti-python.vercel.app/](https://icti-python.vercel.app/)  
📦 **Repositório:** [https://github.com/LuisT-ls/interpreta-python](https://github.com/LuisT-ls/interpreta-python)

---

## ✨ Funcionalidades

### 🎯 Execução de Código
- ✅ **Execução 100% no cliente** - Todo o processamento acontece no navegador, sem envio de dados para servidor
- ✅ **Suporte completo ao Python 3.12** - Execute código Python moderno com todas as funcionalidades
- ✅ **Captura de stdout e stderr** - Visualize saídas e erros em tempo real
- ✅ **Formatação de tracebacks** - Erros Python são exibidos de forma clara e legível com mapeamento preciso de linhas
- ✅ **Suporte a múltiplos tipos de erro** - Detecta e formata SyntaxError, IndentationError, TypeError, ValueError, NameError e muitos outros
- ✅ **Mapeamento de linhas de erro** - Erros são mapeados corretamente para as linhas originais do código, mesmo com código transformado
- ✅ **Botão de parar execução** - Interrompa códigos em loop infinito ou execuções longas com KeyboardInterrupt
- ✅ **Suporte a `input()`** - Sistema de input inline no terminal, sem popups do navegador
- ✅ **Suporte a imports** - Imports são tratados separadamente e executados antes do código principal
- ✅ **Ações no terminal** - Copiar, exportar `.txt` e limpar saída, inclusive a célula ativa do notebook

### 📝 Editor de Código
- ✅ **Syntax highlighting** - Destaque de sintaxe para palavras-chave, funções built-in, strings, números e operadores
- ✅ **Números de linha** - Visualização clara das linhas do código
- ✅ **Validação em tempo real** - Detecta erros de sintaxe enquanto você digita (com debounce de 800ms)
- ✅ **Destaque visual de erros** - Linha com erro é destacada em vermelho no editor
- ✅ **Auto-complete de caracteres** - Parênteses, colchetes, chaves e aspas são fechados automaticamente
- ✅ **Indentação inteligente** - Tab para indentar, Enter mantém indentação e adiciona 4 espaços após `:` (indentação automática)
- ✅ **Múltiplas abas** - Trabalhe com vários arquivos simultaneamente
- ✅ **Nomes dinâmicos de abas** - Cada nova aba recebe um nome sequencial (editor.py, editor_2.py, etc.)
- ✅ **Fechar abas** - Feche abas individuais mantendo outras abertas
- ✅ **Editor responsivo** - Adapta-se perfeitamente a diferentes tamanhos de tela

### 💾 Importação e Exportação
- ✅ **Exportar código** - Salve seu código em arquivo `.py`
- ✅ **Importar código** - Carregue arquivos `.py` diretamente no editor
- ✅ **Exportar múltiplas abas** - Exporte todas as abas como arquivo `.zip`
- ✅ **Menu interativo de exportação** - Escolha entre exportar apenas a aba atual ou todas as abas
- ✅ **Projetos portáteis** - Importe e exporte projetos completos em `.zip`, com código, células, histórico e arquivos virtuais
- ✅ **Sincronização opcional** - Entre com Auth0 para salvar projetos privados na nuvem; conflitos de versão são detectados antes de sobrescrever dados
- ✅ **Compartilhamento somente para leitura** - Gere links temporários para uma cópia do projeto, sem expor o workspace privado

### 🎨 Interface e Layout
- ✅ **Layout customizável** - Posicione o terminal abaixo, à direita, à esquerda ou acima do editor
- ✅ **Preferência salva** - Sua escolha de layout é salva no navegador
- ✅ **Dark mode** - Tema escuro com toggle manual
- ✅ **Design moderno** - Interface inspirada no VSCode com glassmorphism
- ✅ **Terminal estilizado** - Visual de terminal com fundo preto e texto verde
- ✅ **Responsivo** - Funciona perfeitamente em desktop, tablet e mobile
- ✅ **Acessibilidade** - Diálogos com foco inicial/retorno, navegação por teclado e mensagens para leitores de tela
- ✅ **Drawer de arquivos no mobile** - O explorador abre sobre o editor e pode ser fechado por Escape ou clicando fora

### 📊 Visualização de Dados
- ✅ **Suporte a Matplotlib** - Renderize gráficos do matplotlib diretamente na interface
- ✅ **Captura automática de plots** - Gráficos gerados com `plt.show()` são exibidos automaticamente no terminal
- ✅ **Múltiplos gráficos por execução** - Suporte a múltiplos plots na mesma execução
- ✅ **Renderização em canvas** - Gráficos renderizados com alta qualidade em HTML5 Canvas

### 📁 Sistema de Arquivos Virtual
- ✅ **FileSystem completo** - Sistema de arquivos virtual usando Emscripten FS do Pyodide
- ✅ **Criar arquivos e pastas** - Interface gráfica para criar arquivos e diretórios
- ✅ **Navegação por diretórios** - Navegue pela estrutura de arquivos com breadcrumbs
- ✅ **Editar arquivos** - Editor modal para editar conteúdo de arquivos
- ✅ **Deletar arquivos e pastas** - Remova arquivos e diretórios com confirmação
- ✅ **Integração com Python** - Use `open()` para ler/escrever arquivos criados na interface
- ✅ **Sidebar retrátil** - Painel lateral que pode ser aberto/fechado
- ✅ **Botão flutuante de acesso rápido** - Acesso rápido ao sistema de arquivos via botão flutuante

### 📦 Gerenciador de Pacotes
- ✅ **Interface de pacotes** - Instale pacotes Python compatíveis com Pyodide usando micropip
- ✅ **Busca de pacotes** - Filtra uma seleção curada de pacotes populares; não consulta todo o PyPI
- ✅ **Categorias de pacotes** - Pacotes organizados por categoria (Data Science, Web, Utils, etc.)
- ✅ **Lista de pacotes instalados** - Visualize todos os pacotes já instalados
- ✅ **Instalação com feedback visual** - Status de instalação em tempo real
- ℹ️ **Remover da lista** - Oculta o pacote na interface; o módulo permanece no runtime Pyodide
- ✅ **Botão flutuante de acesso rápido** - Acesso rápido ao gerenciador via botão flutuante

### ⌨️ Produtividade
- ✅ **Command Palette** - Acesse ações via atalho de teclado (Ctrl+P / Cmd+P)
- ✅ **Zen Mode** - Modo foco que esconde elementos da interface para máxima concentração
- ✅ **Atalhos de teclado** - Navegação rápida por comandos e ações

### ⚡ Performance e UX
- ✅ **Carregamento assíncrono** - Pyodide carrega em background com feedback visual
- ✅ **Saída em tempo real** - Os `print()` aparecem imediatamente durante a execução usando handlers batched
- ✅ **Input inline** - Digite valores diretamente no terminal, sem interrupções
- ✅ **Auto-scroll** - Terminal rola automaticamente para mostrar a saída mais recente
- ✅ **Animações suaves** - Transições e efeitos visuais modernos
- ✅ **Debounce inteligente** - Validação de sintaxe usa debounce de 800ms para evitar processamento excessivo
- ✅ **Feedback consistente** - Toasts de sucesso e erro substituem alertas nativos nos fluxos comuns
- ✅ **Limpar workspace** - Apaga código, histórico, progresso e arquivos virtuais após confirmação; preserva runtime e pacotes carregados
- ✅ **Preparar offline** - Armazena sob demanda o núcleo Pyodide já baixado neste navegador; a instalação de pacotes novos ainda requer internet

### 🧩 Projetos e aprendizagem
- ✅ **Workspace local por projeto** - Projetos, abas, configurações, células e progresso ficam no IndexedDB do navegador
- ✅ **Modos script e notebook** - Células executáveis com namespace persistente por projeto
- ✅ **Trilha guiada** - Desafios introdutórios com dicas e progresso
- ✅ **Histórico de execuções** - Até 30 versões por projeto, com código, saída, erros e gráficos
- ✅ **Backup do filesystem virtual** - Snapshot automático periódico, limitado a 20 MB por projeto

### 🧪 Qualidade e Testes
- ✅ **Testes unitários** - Cobertura de testes para lógica crítica (parser de erros)
- ✅ **Jest configurado** - Ambiente de testes completo com Jest e Testing Library
- ✅ **Cobertura de código** - Relatórios de cobertura disponíveis

---

## 🛠️ Tecnologias

Este projeto utiliza as seguintes tecnologias:

- **[Next.js 16](https://nextjs.org/)** - Framework React com App Router e Turbopack
- **[React 19](https://react.dev/)** - Biblioteca JavaScript para interfaces
- **[TypeScript 5.6](https://www.typescriptlang.org/)** - Superset JavaScript com tipagem estática
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Pyodide 0.26.1](https://pyodide.org/)** - Python para WebAssembly
- **[JSZip](https://stuk.github.io/jszip/)** - Biblioteca para criar arquivos ZIP no navegador
- **[CodeMirror](https://codemirror.net/)** - Editor de código com syntax highlighting avançado
- **[React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)** - Painéis redimensionáveis para layout flexível
- **[Jest](https://jestjs.io/)** - Framework de testes JavaScript
- **[Testing Library](https://testing-library.com/)** - Utilitários para testes de componentes React
- **[Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0)** - Login e sessão para sincronização opcional
- **[Neon PostgreSQL](https://neon.tech/)** - Armazenamento de projetos autenticados
- **[CodeMirror 6](https://codemirror.net/)** - Editor Python com busca, seleção e navegação por teclado

---

## 📦 Instalação

### Pré-requisitos

- **Node.js** 20.9 ou superior
- **npm** ou **yarn**
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Passo a Passo

1. **Clone o repositório:**
```bash
git clone https://github.com/LuisT-ls/interpreta-python.git
cd interpreta-python
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Execute o servidor de desenvolvimento:**
```bash
npm run dev
```

Sem variáveis de autenticação e banco, o modo local continua disponível; os recursos de nuvem ficam desativados. Para habilitá-los localmente, configure `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`, `DATABASE_URL` e `DATABASE_URL_UNPOOLED` no `.env.local`. `APP_BASE_URL` deve corresponder à URL cadastrada como callback/logout no Auth0 (em desenvolvimento, normalmente `http://localhost:3000`). Nunca versione esse arquivo.

Antes do primeiro uso da nuvem, aplique o schema usando a conexão direta do Neon:

```bash
npm run db:migrate
```

O comando exige `DATABASE_URL_UNPOOLED`; a aplicação usa `DATABASE_URL` (pooler) em runtime. Em produção, configure ambas como variáveis do projeto Vercel e execute a migração como etapa operacional controlada antes de habilitar sincronização.

> **💡 Dica:** Next.js 16 usa o **Turbopack** por padrão, oferecendo tempos de compilação muito mais rápidos. Se precisar usar Webpack, execute `npm run dev -- --webpack`.

4. **Acesse a aplicação:**
   - Abra seu navegador e vá para [http://localhost:3000](http://localhost:3000)

---

## 💡 Como Usar

### Executando Código Python

1. **Aguarde o carregamento** - O Pyodide será carregado automaticamente ao abrir a página
2. **Digite ou cole seu código** - Use o editor para escrever código Python
3. **Clique em "Executar Código"** - O código será executado no navegador
4. **Veja a saída** - Os resultados aparecerão no terminal em tempo real

### Trabalhando com Múltiplas Abas

1. **Criar nova aba** - Clique no botão "+" ao lado do nome da aba atual
2. **Alternar entre abas** - Clique no nome da aba desejada
3. **Fechar aba** - Clique no "×" na aba (não é possível fechar a última aba)

### Importando e Exportando Código

**Exportar:**
- Clique no ícone de download no topo do editor
- Se houver múltiplas abas, escolha exportar apenas a atual ou todas

**Importar:**
- Clique no ícone de upload no topo do editor
- Selecione um arquivo `.py` do seu computador
- O código será carregado na aba atual

### Customizando o Layout

1. Clique no seletor de layout no header
2. Escolha uma das opções:
   - **Direita** (padrão) - Terminal ao lado direito do editor
   - **Esquerda** - Terminal ao lado esquerdo do editor
   - **Abaixo** - Terminal abaixo do editor
   - **Acima** - Terminal acima do editor

Sua preferência será salva automaticamente no navegador.

### Usando Input do Usuário

Quando seu código contém `input()`, um campo de texto aparecerá inline no terminal:

```python
nome = input("Digite seu nome: ")
print(f"Olá, {nome}!")
```

1. Digite o valor solicitado no campo que aparece no terminal
2. Pressione Enter para enviar
3. O código continuará a execução com o valor fornecido

### Trabalhando com Sistema de Arquivos Virtual

O sistema de arquivos virtual permite criar, editar e gerenciar arquivos que podem ser acessados pelo Python:

1. **Abrir o Sistema de Arquivos** - Clique no botão flutuante de pasta no lado esquerdo da tela
2. **Criar arquivo/pasta** - Use o botão "+" na toolbar
3. **Navegar** - Clique em pastas para navegar, use breadcrumbs para voltar
4. **Editar arquivo** - Clique em um arquivo para abrir o editor
5. **Usar no Python** - Acesse arquivos criados usando `open()`:

```python
# Criar e escrever em arquivo
with open('dados.txt', 'w') as f:
    f.write('Olá, mundo!')

# Ler arquivo
with open('dados.txt', 'r') as f:
    conteudo = f.read()
    print(conteudo)
```

### Instalando Pacotes Python

Use o Gerenciador de Pacotes para instalar bibliotecas Python suportadas pelo Pyodide:

1. **Abrir o Gerenciador** - Use a barra de ações ou a Command Palette (`Ctrl+P` / `Cmd+P`)
2. **Buscar pacote** - Digite o nome do pacote na barra de busca
3. **Filtrar por categoria** - Use os filtros para encontrar pacotes por categoria
4. **Instalar** - Clique em "Instalar" ao lado do pacote desejado
5. **Usar no código** - Após instalação, importe normalmente:

```python
import pandas as pd
import numpy as np

# Agora você pode usar pandas e numpy!
```

### Criando Gráficos com Matplotlib

Gráficos do matplotlib são renderizados automaticamente na interface:

```python
import matplotlib.pyplot as plt
import numpy as np

# Criar dados
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Criar gráfico
plt.figure(figsize=(10, 6))
plt.plot(x, y)
plt.title('Gráfico de Seno')
plt.xlabel('X')
plt.ylabel('Y')
plt.grid(True)

# Exibir (será renderizado automaticamente)
plt.show()
```

### Usando o Command Palette

Acesse rapidamente todas as funcionalidades via Command Palette:

1. **Abrir** - Pressione `Ctrl+P` (Windows/Linux) ou `Cmd+P` (Mac)
2. **Navegar** - Use as setas ou digite para filtrar comandos
3. **Executar** - Pressione Enter para executar o comando selecionado

Comandos disponíveis:
- Executar código
- Parar execução
- Toggle Zen Mode
- Abrir/Fechar Sistema de Arquivos
- Abrir Gerenciador de Pacotes
- Alternar tema
- E mais...

### Modo Zen

O Modo Zen remove elementos da interface para focar apenas no código:

1. **Ativar** - Use o Command Palette (`Ctrl+P`) e selecione "Zen Mode"
2. **Focar** - A interface ficará minimalista, mostrando apenas o essencial
3. **Desativar** - Clique no botão "Sair do Modo Zen" que aparece no topo

---

## 📚 Exemplos de Código

### Exemplo Básico
```python
print("Olá, mundo!")
print("Python está funcionando! 🐍")

numeros = [1, 2, 3, 4, 5]
soma = sum(numeros)
print(f"A soma de {numeros} é {soma}")

for i in range(3):
    print(f"Contagem: {i}")
```

### Exemplo com Input
```python
# Solicitar dados do usuário
nome = input("Digite seu nome: ")
idade = int(input("Digite sua idade: "))

print(f"\nOlá, {nome}!")
print(f"Você tem {idade} anos.")
print(f"Em 10 anos, você terá {idade + 10} anos.")
```

### Exemplo com Listas e Loops
```python
# Criar e manipular listas
vetor = []

for i in range(4):
    numero = float(input(f"Digite o {i+1}° número: "))
    vetor.append(numero)

print("Vetor armazenado:", vetor)
print(f"Soma: {sum(vetor)}")
print(f"Média: {sum(vetor) / len(vetor)}")
```

### Exemplo com Funções
```python
def calcular_fatorial(n):
    if n <= 1:
        return 1
    return n * calcular_fatorial(n - 1)

numero = int(input("Digite um número: "))
resultado = calcular_fatorial(numero)
print(f"O fatorial de {numero} é {resultado}")
```

### Exemplo com Matplotlib
```python
import matplotlib.pyplot as plt
import numpy as np

# Criar dados
x = np.linspace(0, 2 * np.pi, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Criar gráfico
plt.figure(figsize=(10, 6))
plt.plot(x, y1, label='Seno', linewidth=2)
plt.plot(x, y2, label='Cosseno', linewidth=2)
plt.title('Gráfico de Funções Trigonométricas')
plt.xlabel('X (radianos)')
plt.ylabel('Y')
plt.legend()
plt.grid(True, alpha=0.3)

# Exibir (será renderizado automaticamente)
plt.show()
```

### Exemplo com Sistema de Arquivos
```python
# Criar arquivo de dados
dados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

with open('numeros.txt', 'w') as f:
    for numero in dados:
        f.write(f"{numero}\n")

# Ler e processar
with open('numeros.txt', 'r') as f:
    linhas = f.readlines()
    numeros = [int(linha.strip()) for linha in linhas]

print(f"Números lidos: {numeros}")
print(f"Soma: {sum(numeros)}")
print(f"Média: {sum(numeros) / len(numeros)}")
```

### Exemplo com Pacotes Externos
```python
# Após instalar pandas via Gerenciador de Pacotes
import pandas as pd

# Criar DataFrame
dados = {
    'Nome': ['Alice', 'Bob', 'Charlie'],
    'Idade': [25, 30, 35],
    'Cidade': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte']
}

df = pd.DataFrame(dados)
print(df)

# Operações com pandas
print(f"\nMédia de idades: {df['Idade'].mean()}")
print(f"\nPessoas em São Paulo: {len(df[df['Cidade'] == 'São Paulo'])}")
```

---

## 📁 Estrutura do Projeto

```
interpreta-python/
├── app/
│   ├── api/                  # Sessão, projetos privados, compartilhamentos e busca exata PyPI
│   ├── share/[token]/        # Visualização/importação de cópia compartilhada
│   ├── img/
│   │   └── favicon/          # Favicons e ícones
│   ├── layout.tsx            # Layout principal da aplicação (metadata, fontes)
│   ├── page.tsx              # Página principal (orquestrador, integração de componentes)
│   ├── globals.css            # Estilos globais
│   ├── robots.ts              # Configuração de robots.txt
│   └── sitemap.ts             # Sitemap da aplicação
├── components/
│   ├── PythonEditor.tsx       # Editor de código com syntax highlighting, validação e auto-complete
│   ├── OutputTerminal.tsx    # Terminal de saída com input inline e renderização de plots
│   ├── MatplotlibPlot.tsx    # Componente para renderizar gráficos matplotlib
│   ├── ThemeToggle.tsx       # Toggle de tema claro/escuro
│   ├── LayoutSelector.tsx    # Seletor de layout
│   ├── EditorTabs.tsx        # Sistema de abas do editor
│   ├── ExportMenu.tsx        # Menu de exportação
│   ├── FileSystemSidebar.tsx # Sidebar do sistema de arquivos virtual
│   ├── FileEditor.tsx        # Editor modal para arquivos do VFS
│   ├── PackageManager.tsx    # Interface gráfica do gerenciador de pacotes
│   ├── CommandPalette.tsx    # Palette de comandos com atalhos de teclado
│   ├── AboutModal.tsx        # Modal com informações sobre a aplicação
│   ├── ActionToolbar.tsx, OnboardingModal.tsx
│   ├── PersistenceNotice.tsx
│   ├── WorkspaceHub.tsx, NotebookEditor.tsx
│   ├── LearningPathModal.tsx, ExecutionHistoryModal.tsx
│   └── ResetWorkspaceDialog.tsx, ToastViewport.tsx
├── hooks/
│   ├── usePyodide.ts         # Hook para carregar e gerenciar Pyodide
│   ├── useLayout.ts          # Hook para gerenciar layout (com persistência no localStorage)
│   ├── useEditorTabs.ts      # Hook para gerenciar abas do editor
│   ├── usePythonExecution.ts # Hook para execução de código Python
│   ├── useSyntaxValidation.ts # Hook para validação de sintaxe em tempo real
│   ├── useFileSystem.ts      # Hook para interagir com o sistema de arquivos virtual
│   ├── usePackageManager.ts  # Hook para gerenciar pacotes Python (micropip)
│   ├── useProjectWorkspace.ts # Projetos locais e persistência
│   ├── useAccessibleDialog.ts, useToast.ts
│   └── useZenMode.ts          # Hook para gerenciar modo Zen
├── utils/
│   ├── parsePyodideError.ts  # Parser de erros do Pyodide com mapeamento de linhas
│   ├── shareCode.ts          # Utilitários para compartilhamento de código
│   ├── workspaceDb.ts, projectArchive.ts, virtualWorkspaceFs.ts
│   ├── logger.ts
│   └── __tests__/
│       ├── parsePyodideError.test.ts # Testes unitários do parser de erros
│       └── README.md          # Documentação dos testes
├── docs/
│   ├── FILESYSTEM_ANALYSIS.md # Análise do sistema de arquivos
│   └── ROADMAP_PRODUTO_UX.md  # Roadmap e status de implementação
├── public/
│   ├── sw.js                 # Cache offline opt-in para recursos Pyodide
│   ├── logo.png              # Logo da aplicação
│   └── favicon/              # Arquivos de favicon
├── coverage/                 # Relatórios de cobertura de testes (gerado)
├── jest.config.js            # Configuração do Jest
├── jest.setup.js             # Setup do ambiente de testes
├── .eslintrc.json            # Configuração do ESLint
├── .gitignore                # Arquivos ignorados pelo Git
├── next.config.js            # Configuração do Next.js
├── db/migrations/            # Schema da nuvem
├── scripts/                  # Migração de banco
├── package.json              # Dependências e scripts do projeto
├── postcss.config.js         # Configuração do PostCSS
├── tailwind.config.ts        # Configuração do Tailwind CSS
├── tsconfig.json             # Configuração do TypeScript
├── vercel.json               # Configuração do Vercel
└── README.md                 # Este arquivo
```

---

### Persistência e limites

Projetos e histórico ficam no IndexedDB deste navegador; configurações legadas do editor ainda usam `localStorage`. Ao entrar, o usuário pode sincronizar snapshots de projetos com sua conta Auth0 e gerar links temporários somente para leitura. O salvamento detecta versões concorrentes, mas não oferece edição colaborativa em tempo real. Sem configuração de Auth0/Neon, a aplicação permanece utilizável localmente e os recursos de nuvem ficam indisponíveis.

O backup automático dos arquivos virtuais locais ocorre periodicamente e tem limite de 20 MB por projeto. Limpar os dados do navegador pode remover projetos e backups. Pacotes instalados ficam no runtime atual e não são restaurados automaticamente ao abrir um projeto; “Remover da lista” não os desinstala. “Preparar offline” guarda o núcleo Pyodide neste dispositivo, mas pacotes não cacheados e novas instalações continuam dependendo de internet.

## 🚀 Deploy

### Deploy na Vercel (Recomendado)

A aplicação está otimizada para deploy na Vercel:

1. **Faça push do código** para um repositório Git (GitHub, GitLab, Bitbucket)

2. **Acesse [vercel.com](https://vercel.com)** e faça login

3. **Clique em "New Project"** e importe seu repositório

4. **A Vercel detectará automaticamente** que é um projeto Next.js

5. **Configure Auth0 e Neon no projeto Vercel** para ativar login, sincronização e compartilhamento; a execução local no navegador não depende desses serviços
6. **Aplique a migração do Neon** com a conexão direta antes de habilitar os endpoints de nuvem
7. **Cadastre as URLs de callback/logout do Auth0** para o domínio de produção e valide login, logout e compartilhamento após o deploy

6. **Aguarde o deploy** e sua aplicação estará online!

### Deploy via CLI

```bash
# Instalar Vercel CLI globalmente
npm install -g vercel

# Fazer deploy
vercel

# Para produção
vercel --prod
```

### Outras Plataformas

A aplicação também pode ser deployada em:
- **Netlify** - Suporte nativo a Next.js
- **Railway** - Deploy simples via Git
- **Render** - Deploy automático
- **Docker** - Containerização (requer configuração adicional)

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento (Turbopack)

# Build
npm run build        # Cria build de produção
npm start            # Inicia servidor de produção

# Testes
npm test             # Executa todos os testes
npm run test:watch   # Executa testes em modo watch
npm run test:coverage # Executa testes com relatório de cobertura

# Qualidade de Código
npm run lint         # Executa o ESLint
```

---

## 🎨 Características do Design

- **Layout Responsivo** - Adapta-se perfeitamente a dispositivos móveis e desktop
- **Dark Mode** - Tema escuro com suporte a preferência do sistema
- **Glassmorphism** - Efeitos de vidro leves no header
- **Terminal Estilizado** - Visual inspirado em terminais com fundo preto e texto verde
- **Animações Suaves** - Transições e hover effects modernos
- **Acessibilidade** - Suporte a ARIA labels e navegação por teclado

---

## 📝 Notas Importantes

### Limitações

- ⚠️ **Conexão com Internet** - O Pyodide é carregado via CDN (jsdelivr), então é necessária conexão com a internet
- ⚠️ **Primeira Execução** - A primeira execução pode demorar alguns segundos enquanto o Pyodide baixa os arquivos necessários (~10-15MB)
- ⚠️ **Bibliotecas Python** - Algumas bibliotecas Python podem não estar disponíveis no Pyodide (especialmente aquelas que dependem de código C). Use o Gerenciador de Pacotes para verificar pacotes disponíveis
- ⚠️ **Performance** - Códigos muito complexos podem ser mais lentos que em Python nativo devido à execução via WebAssembly
- ⚠️ **Validação em Tempo Real** - A validação de sintaxe usa debounce de 800ms, então pode haver um pequeno delay na detecção de erros
- ⚠️ **Sistema de Arquivos** - O sistema de arquivos é virtual e existe apenas durante a sessão do navegador. Arquivos são perdidos ao recarregar a página
- ⚠️ **Pacotes Instalados** - Pacotes instalados via Gerenciador de Pacotes são mantidos apenas durante a sessão atual. É necessário reinstalá-los ao recarregar a página

### Segurança

- ✅ **Execução no Cliente** - Todo o código é executado no navegador, sem envio para servidor
- ✅ **Sem Backend** - Não há servidor processando seu código
- ✅ **Privacidade** - Seus códigos nunca saem do seu navegador

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. **Fazer Fork** do projeto
2. **Criar uma branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abrir um Pull Request**

### Diretrizes de Contribuição

- Siga os padrões de código existentes
- Adicione testes quando apropriado
- Atualize a documentação conforme necessário
- Mantenha os commits descritivos

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Luis Teixeira**

- 🌐 Website: [https://luistls.vercel.app/](https://luistls.vercel.app/)
- 💼 LinkedIn: [https://www.linkedin.com/in/luis-tei](https://www.linkedin.com/in/luis-tei)
- 🐙 GitHub: [@LuisT-ls](https://github.com/LuisT-ls)

---

## 🙏 Agradecimentos

- [Pyodide](https://pyodide.org/) - Por tornar Python possível no navegador
- [Next.js](https://nextjs.org/) - Por fornecer uma base sólida para a aplicação
- [Vercel](https://vercel.com/) - Por hospedar a aplicação gratuitamente

---

## 📊 Estatísticas

![GitHub stars](https://img.shields.io/github/stars/LuisT-ls/interpreta-python?style=social)
![GitHub forks](https://img.shields.io/github/forks/LuisT-ls/interpreta-python?style=social)
![GitHub issues](https://img.shields.io/github/issues/LuisT-ls/interpreta-python)
![GitHub license](https://img.shields.io/github/license/LuisT-ls/interpreta-python)

---

⭐ **Se este projeto foi útil para você, considere dar uma estrela no repositório!**
