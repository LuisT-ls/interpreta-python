# 🐍 Interpretador Python Web

[![Next.js](https://img.shields.io/badge/Next.js-16.0.5-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Pyodide](https://img.shields.io/badge/Pyodide-0.26.1-green)](https://pyodide.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Uma aplicação web moderna e completa que permite executar código Python diretamente no navegador usando Pyodide (WebAssembly), sem necessidade de backend ou servidor.

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

### 🎨 Interface e Layout
- ✅ **Layout customizável** - Posicione o terminal abaixo, à direita, à esquerda ou acima do editor
- ✅ **Preferência salva** - Sua escolha de layout é salva no navegador
- ✅ **Dark mode** - Tema escuro com toggle manual
- ✅ **Design moderno** - Interface inspirada no VSCode com glassmorphism
- ✅ **Terminal estilizado** - Visual de terminal com fundo preto e texto verde
- ✅ **Responsivo** - Funciona perfeitamente em desktop, tablet e mobile

### ⚡ Performance e UX
- ✅ **Carregamento assíncrono** - Pyodide carrega em background com feedback visual
- ✅ **Saída em tempo real** - Os `print()` aparecem imediatamente durante a execução usando handlers batched
- ✅ **Input inline** - Digite valores diretamente no terminal, sem interrupções
- ✅ **Auto-scroll** - Terminal rola automaticamente para mostrar a saída mais recente
- ✅ **Animações suaves** - Transições e efeitos visuais modernos
- ✅ **Debounce inteligente** - Validação de sintaxe usa debounce de 800ms para evitar processamento excessivo

---

## 🛠️ Tecnologias

Este projeto utiliza as seguintes tecnologias:

- **[Next.js 16](https://nextjs.org/)** - Framework React com App Router e Turbopack
- **[React 19](https://react.dev/)** - Biblioteca JavaScript para interfaces
- **[TypeScript 5.6](https://www.typescriptlang.org/)** - Superset JavaScript com tipagem estática
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Pyodide 0.26.1](https://pyodide.org/)** - Python para WebAssembly
- **[JSZip](https://stuk.github.io/jszip/)** - Biblioteca para criar arquivos ZIP no navegador
- **Editor customizado** - Editor de código Python com syntax highlighting e validação em tempo real implementado do zero

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

---

## 📁 Estrutura do Projeto

```
interpreta-python/
├── app/
│   ├── img/
│   │   └── favicon/          # Favicons e ícones
│   ├── layout.tsx            # Layout principal da aplicação (metadata, fontes)
│   ├── page.tsx              # Página principal (orquestrador, execução de código, validação)
│   └── globals.css            # Estilos globais
├── components/
│   ├── PythonEditor.tsx       # Editor de código com syntax highlighting, validação e auto-complete
│   ├── OutputTerminal.tsx    # Terminal de saída com input inline
│   ├── ThemeToggle.tsx       # Toggle de tema claro/escuro
│   ├── LayoutSelector.tsx    # Seletor de layout
│   ├── EditorTabs.tsx        # Sistema de abas do editor
│   └── ExportMenu.tsx        # Menu de exportação
├── hooks/
│   ├── usePyodide.ts         # Hook para carregar e gerenciar Pyodide
│   ├── useLayout.ts          # Hook para gerenciar layout (com persistência no localStorage)
│   └── useEditorTabs.ts      # Hook para gerenciar abas do editor
├── public/
│   ├── logo.png              # Logo da aplicação
│   └── favicon/              # Arquivos de favicon
├── .eslintrc.json            # Configuração do ESLint
├── .gitignore                # Arquivos ignorados pelo Git
├── next.config.js            # Configuração do Next.js
├── package.json              # Dependências do projeto
├── postcss.config.js         # Configuração do PostCSS
├── tailwind.config.ts        # Configuração do Tailwind CSS
├── tsconfig.json             # Configuração do TypeScript
├── vercel.json               # Configuração do Vercel
└── README.md                 # Este arquivo
```

---

## 🚀 Deploy

### Deploy na Vercel (Recomendado)

A aplicação está otimizada para deploy na Vercel:

1. **Faça push do código** para um repositório Git (GitHub, GitLab, Bitbucket)

2. **Acesse [vercel.com](https://vercel.com)** e faça login

3. **Clique em "New Project"** e importe seu repositório

4. **A Vercel detectará automaticamente** que é um projeto Next.js

5. **Clique em "Deploy"** - não é necessário configurar variáveis de ambiente

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
- ⚠️ **Bibliotecas Python** - Algumas bibliotecas Python podem não estar disponíveis no Pyodide (especialmente aquelas que dependem de código C)
- ⚠️ **Performance** - Códigos muito complexos podem ser mais lentos que em Python nativo devido à execução via WebAssembly
- ⚠️ **Validação em Tempo Real** - A validação de sintaxe usa debounce de 800ms, então pode haver um pequeno delay na detecção de erros

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
