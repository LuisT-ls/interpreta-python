# Interpretador Python Web

Uma aplicação moderna e responsiva desenvolvida em Next.js que permite executar código Python diretamente no navegador usando Pyodide (WebAssembly).

## 🚀 Funcionalidades

- ✅ Execução de código Python 100% no cliente (sem backend)
- ✅ Editor de código com suporte a indentação automática
- ✅ Terminal estilizado para exibição de saída e erros
- ✅ Dark mode com toggle
- ✅ Design responsivo e moderno inspirado no VSCode
- ✅ Carregamento assíncrono do Pyodide com feedback visual
- ✅ Captura de stdout, stderr e tracebacks

## 🛠️ Tecnologias

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Pyodide** (v0.26.1)

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd interpreta-python
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🚢 Deploy na Vercel

A aplicação está pronta para deploy na Vercel:

1. Faça push do código para um repositório Git (GitHub, GitLab, Bitbucket)

2. Acesse [vercel.com](https://vercel.com) e faça login

3. Clique em "New Project" e importe seu repositório

4. A Vercel detectará automaticamente que é um projeto Next.js

5. Clique em "Deploy" - não é necessário configurar variáveis de ambiente

6. Aguarde o deploy e sua aplicação estará online!

### Deploy via CLI

```bash
npm install -g vercel
vercel
```

## 📁 Estrutura do Projeto

```
interpreta-python/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx             # Página principal
│   └── globals.css          # Estilos globais
├── components/
│   ├── PythonEditor.tsx     # Editor de código
│   ├── OutputTerminal.tsx   # Terminal de saída
│   └── ThemeToggle.tsx      # Toggle de tema
├── hooks/
│   └── usePyodide.ts        # Hook para gerenciar Pyodide
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## 🎨 Características do Design

- **Layout responsivo**: Adapta-se perfeitamente a dispositivos móveis e desktop
- **Dark mode**: Tema escuro com suporte a preferência do sistema
- **Glassmorphism**: Efeitos de vidro leves no header
- **Terminal estilizado**: Visual inspirado em terminais com fundo preto e texto verde
- **Animações suaves**: Transições e hover effects modernos

## 💡 Como Usar

1. O Pyodide será carregado automaticamente ao abrir a página
2. Digite ou cole seu código Python no editor
3. Clique no botão "Executar Código"
4. Veja a saída no terminal abaixo

### Exemplo de Código

```python
print("Olá, mundo!")
print("Python está funcionando! 🐍")

numeros = [1, 2, 3, 4, 5]
soma = sum(numeros)
print(f"A soma de {numeros} é {soma}")

for i in range(3):
    print(f"Contagem: {i}")
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## 📝 Notas

- O Pyodide é carregado via CDN (jsdelivr), então é necessária conexão com a internet
- A primeira execução pode demorar alguns segundos enquanto o Pyodide baixa os arquivos necessários
- Algumas bibliotecas Python podem não estar disponíveis no Pyodide
- O código é executado completamente no cliente, sem envio para servidor

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
