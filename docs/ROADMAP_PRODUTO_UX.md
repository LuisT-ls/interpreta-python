# Roadmap de Produto, UX e Arquitetura

Documento de referência para acompanhar melhorias estratégicas implementadas e pendentes do Interpretador Python Web.

> Status do documento: backlog inicial consolidado; itens concluídos e pendências de validação atualizados
>
> Última revisão: 2026-10-20

## 1. Direção do produto

O produto é uma IDE/playground Python executada inteiramente no navegador:

- Next.js, React e TypeScript;
- Pyodide/WebAssembly para executar Python no cliente;
- execução Python no navegador, com sincronização opcional por Auth0 + Neon;
- projetos, histórico e filesystem em IndexedDB; preferências legadas em `localStorage`;
- recursos de nuvem desativados quando Auth0/Neon não estão configurados;
- deploy preparado para Vercel.

### Objetivo estratégico

Evoluir de um interpretador online com vários recursos para um ambiente simples, confiável e guiado para:

1. aprender Python;
2. experimentar código rapidamente;
3. trabalhar com pequenos projetos;
4. compartilhar resultados reproduzíveis.

### Princípios de produto

- O usuário deve conseguir executar o primeiro exemplo em poucos segundos.
- As ações principais devem ser visíveis sem exigir conhecimento de atalhos.
- Erros devem indicar o próximo passo, não apenas mostrar texto técnico.
- O usuário deve saber exatamente o que está salvo e o que será perdido.
- Recursos avançados devem complementar o fluxo principal, não escondê-lo.
- A evolução deve preservar a execução local e a privacidade como diferenciais.

## 2. Mapa atual da aplicação

### Rotas

| Rota | Responsabilidade |
|---|---|
| `/` | Aplicação principal em `app/page.tsx` |
| `/auth/*` | Login, logout e callback do Auth0 (SDK) |
| `/api/auth/session` | Estado mínimo da sessão, sem expor tokens |
| `/api/cloud/projects` | Listagem e salvamento versionado de projetos do usuário autenticado |
| `/api/cloud/projects/[projectId]` | Leitura de projeto pertencente ao usuário autenticado |
| `/api/cloud/projects/[projectId]/share` | Criar/rotacionar ou revogar link temporário somente leitura |
| `/api/cloud/share/[token]` | Leitura pública de snapshot por token opaco com expiração |
| `/api/pypi` | Consulta de metadados por nome exato do pacote |
| `/share/[token]` | Prévia e importação como novo projeto local |
| `/robots.txt` | Configuração para crawlers |
| `/sitemap.xml` | Sitemap da aplicação |

Não há dashboard separado nem administração. As APIs de nuvem são opcionais e dependem de Auth0 e Neon.

### Entidades atuais

| Entidade | Onde vive | Observação |
|---|---|---|
| `EditorTab` | Estado React + IndexedDB | Código, saída, erro e plots |
| Workspace do projeto | IndexedDB local | Abas, células, preferências e backup do filesystem |
| Projeto cloud | Neon PostgreSQL | Snapshot JSON por `owner_id` Auth0 e UUID |
| Compartilhamento | Neon PostgreSQL | Hash SHA-256 do token, expiração e referência ao projeto; somente leitura |
| `MatplotlibPlot` | Dentro de `EditorTab` | Imagem gerada durante execução |
| `FileSystemEntry` | Filesystem virtual do Pyodide | Volátil, não persiste após reload |
| `InstalledPackage` | Estado derivado do Pyodide | Não há desinstalação real no runtime |
| Preferências | `localStorage` | Tema, layout, fonte e modo Zen |

### Fluxo principal atual

1. Usuário acessa `/`.
2. O navegador baixa e inicializa o Pyodide via CDN.
3. O usuário escreve ou importa código Python.
4. O código é executado por botão ou atalho.
5. `stdout`, `stderr`, `input()` e gráficos são enviados ao terminal.
6. Erros são interpretados e exibidos.
7. O usuário pode trabalhar com abas, arquivos virtuais, pacotes, exportação e compartilhamento.

### Arquivos de referência

- `app/page.tsx`: orquestração da interface.
- `hooks/usePyodide.ts`: carregamento do runtime Python.
- `hooks/usePythonExecution.ts`: execução, input, saída, erros e plots.
- `hooks/useEditorTabs.ts`: abas e persistência local.
- `hooks/useFileSystem.ts`: filesystem virtual.
- `hooks/usePackageManager.ts`: instalação via micropip.
- `utils/parsePyodideError.ts`: parser e mapeamento de erros.
- `utils/shareCode.ts`: compartilhamento de código por URL.

## 3. Matriz de priorização

### Legenda

- **Prioridade 1:** implementar primeiro.
- **Prioridade 2:** roadmap principal.
- **Prioridade 3:** melhoria contínua.
- **Prioridade 4:** postergar ou evitar no estágio atual.

| Feature | Impacto | Esforço | Prioridade |
|---|---:|---:|---:|
| Onboarding de primeira execução | Alto | Baixo | 1 |
| Toolbar com ações principais | Alto | Baixo | 1 |
| Erros acionáveis | Alto | Baixo/Médio | 1 |
| Avisos de persistência | Alto | Baixo | 1 |
| Retry do Pyodide | Médio/Alto | Baixo/Médio | 1 |
| Projetos Python portáteis | Muito alto | Alto | 2 |
| Modo Notebook | Muito alto | Alto | 2 |
| Trilha guiada de aprendizagem | Alto | Médio/Alto | 2 |
| Histórico de execuções | Alto | Médio/Alto | 2 |
| Backup automático do workspace | Alto | Médio | 2 |
| Copiar/exportar terminal | Médio | Baixo | 3 |
| Transparência do gerenciador de pacotes | Médio | Baixo | 3 |
| Acessibilidade | Médio | Baixo/Médio | 3 |
| Polimento responsivo | Médio | Baixo/Médio | 3 |
| Toasts e estados vazios | Médio | Baixo | 3 |
| Limpeza técnica/documentação | Baixo/Médio | Baixo | 3 |
| Reset explícito de sessão | Médio | Baixo | 3 |
| Autenticação e colaboração | Baixo atualmente | Muito alto | 4 |
| Desinstalação real de pacotes | Baixo/Médio | Alto | 4 |
| Offline completo | Médio | Alto | 4 |
| Busca completa no PyPI | Médio | Médio/Alto | 4 |
| Troca completa do editor | Incerto | Alto | 4 |

## 4. Backlog priorizado e acompanhamento

Nos itens P1/P2, as caixas de escopo marcadas indicam implementação no código. As caixas dos critérios de aceite permanecem desmarcadas quando dependem de validação manual de UX/dispositivo, que não é coberta apenas pela build.

## Prioridade 1 — Rápido de implementar e alto impacto

### P1.1 — Onboarding de primeira execução — implementado

**Problema:** o usuário precisa entender sozinho onde escrever e como executar.

**Escopo:**

- [x] Criar estado inicial de onboarding para a primeira visita.
- [x] Exibir ações de exemplo e abertura/importação de arquivo.
- [x] Permitir fechar e reabrir o onboarding pelos controles da aplicação.
- [x] Preencher o editor com o exemplo escolhido.
- [x] Exibir dica de execução por atalho.

**Justificativa técnica:** reutiliza `EditorTab`, `updateTabCode` e `executeCode`; não exige banco nem nova API.

**Critérios de aceite:**

- [ ] Um usuário novo entende como executar código sem consultar a documentação.
- [ ] O primeiro exemplo executa com uma ação clara.
- [ ] O onboarding não reaparece após ser concluído, salvo se o usuário solicitar.
- [ ] O fluxo continua funcionando em desktop e mobile.

### P1.2 — Toolbar com ações principais visíveis — implementado

**Problema:** funções importantes estão divididas entre ícones, botões flutuantes e Command Palette.

**Escopo:**

- [x] Criar uma barra de ações principal próxima ao editor.
- [x] Tornar visíveis as ações principais e atalhos para arquivos/pacotes.
- [x] Manter a Command Palette como acesso avançado.
- [x] Adaptar os controles a desktop e mobile.
- [x] Definir estados de disponibilidade e execução.

**Justificativa técnica:** é principalmente reorganização da interface existente em `app/page.tsx` e `EditorTabs.tsx`.

**Critérios de aceite:**

- [ ] Um usuário encontra Executar sem conhecer atalhos.
- [ ] Arquivos e Pacotes são descobertos sem depender de botões laterais ocultos.
- [ ] A toolbar não compete visualmente com o editor.
- [ ] Ações indisponíveis explicam o motivo.

### P1.3 — Erros acionáveis — implementado

**Problema:** o traceback é técnico e runtime errors podem não destacar a linha correta.

**Escopo:**

- [x] Integrar mapeamento de linha e limpar o estado por execução.
- [x] Destacar a linha de erro no editor.
- [x] Permitir navegar do terminal até a linha correspondente.
- [x] Apresentar erros e traceback com ações de cópia.

**Justificativa técnica:** `parsePyodideError` e `lineMappingRef` já existem; a primeira correção é de integração.

**Critérios de aceite:**

- [ ] Um erro com linha conhecida destaca a linha no editor.
- [ ] O usuário consegue navegar do terminal para a linha correspondente.
- [ ] O erro aparece com resumo curto antes do traceback completo.
- [ ] O botão de copiar confirma sucesso visualmente.

### P1.4 — Avisos de persistência e perda de dados — implementado

**Problema:** abas persistem, mas filesystem e pacotes são temporários.

**Escopo:**

- [x] Informar o que é salvo no navegador e o que depende da sessão/runtime.
- [x] Explicar a persistência/backup dos arquivos virtuais e dos pacotes.
- [x] Mostrar confirmação antes de limpar workspace ou reiniciar ambiente.
- [x] Manter ações de exportação disponíveis antes de encerrar o trabalho.

**Justificativa técnica:** usa estados e ações já existentes; não requer persistência nova.

**Critérios de aceite:**

- [ ] O usuário sabe o que está salvo e o que é temporário.
- [ ] A mensagem aparece no momento relevante, não apenas na documentação.
- [ ] A confirmação não bloqueia ações seguras e repetitivas.

### P1.5 — Retry e diagnóstico do carregamento do Pyodide — implementado

**Problema:** uma falha de CDN/rede termina em uma mensagem genérica e reload manual.

**Escopo:**

- [x] Expor uma função de retry em `usePyodide`.
- [x] Adicionar controle “Tentar novamente”.
- [x] Apresentar falha e próximo passo de recuperação.
- [x] Informar dependência de rede quando o runtime ainda não foi cacheado.

**Justificativa técnica:** requer pequena refatoração do efeito de carregamento, sem mudar a arquitetura client-side.

**Critérios de aceite:**

- [ ] O usuário consegue tentar novamente sem recarregar toda a página.
- [ ] O estado de loading é restaurado corretamente.
- [ ] Não são criadas múltiplas instâncias ou scripts duplicados.

## Prioridade 2 — Projetos estratégicos

### P2.1 — Projetos Python portáteis — implementado

**Problema:** abas, arquivos, pacotes e configurações não formam uma unidade restaurável.

**Escopo:**

- [x] Definir entidade `Project` e formato de arquivo versionado.
- [x] Agrupar abas, arquivos virtuais, configurações e manifesto de pacotes.
- [x] Persistir projetos no IndexedDB.
- [x] Exportar/importar projeto como `.zip` e restaurar workspace.
- [x] Criar, duplicar, renomear e excluir projetos.

**Justificativa técnica:** exige novo modelo de domínio e persistência; JSZip já está disponível, mas `localStorage` não é suficiente.

**Dependências:** P1.4, P3.7 e definição do manifesto de pacotes.

**Critérios de aceite:**

- [ ] Um projeto exportado pode ser importado em outro navegador.
- [ ] Abas e arquivos são restaurados corretamente.
- [ ] Pacotes necessários aparecem como dependências, mesmo quando não podem ser restaurados automaticamente.
- [ ] Projetos corrompidos geram mensagem recuperável.

### P2.2 — Modo Notebook com células — implementado

**Problema:** executar o arquivo inteiro torna experimentação e aprendizagem mais lentas.

**Escopo:**

- [x] Definir o modelo de células e execução individual.
- [x] Manter namespace Python entre células do projeto.
- [x] Exibir saída e plots por célula.
- [x] Adicionar, excluir, duplicar e reordenar células.
- [x] Tratar erros/reexecução e converter notebook em script.

**Justificativa técnica:** o executor atual foi desenhado para um script único; será necessário controlar execução parcial e estado Python persistente.

**Dependências:** P1.3 e P2.1.

**Critérios de aceite:**

- [ ] Variáveis criadas em uma célula podem ser usadas em outra.
- [ ] A saída pertence visualmente à célula correta.
- [ ] Executar novamente uma célula não duplica plots ou handlers.
- [ ] O usuário pode converter um notebook em arquivo Python.

### P2.3 — Trilha guiada de aprendizagem — implementado (MVP)

**Problema:** iniciantes não recebem um caminho claro para aprender usando a aplicação.

**Escopo:**

- [x] Criar catálogo introdutório com desafios e código inicial.
- [x] Adicionar instruções e dicas.
- [x] Validar resultado esperado e mostrar progresso local.
- [x] Abrir lições no editor atual.

**Justificativa técnica:** a infraestrutura de execução já existe; o esforço principal está em conteúdo, validação e design da experiência.

**Dependências:** P1.1, P1.3 e opcionalmente P2.2.

**Critérios de aceite:**

- [ ] Um iniciante conclui uma primeira lição sem sair da aplicação.
- [ ] O feedback informa o que está errado e oferece uma próxima tentativa.
- [ ] O progresso é salvo localmente sem exigir conta.

### P2.4 — Histórico de execuções e versões — implementado

**Problema:** o usuário perde contexto de tentativas anteriores e não consegue comparar resultados.

**Escopo:**

- [x] Criar entidade `ExecutionRun` e armazenar código, data, saída, erro e plots.
- [x] Exibir histórico por projeto e permitir restaurar uma execução.
- [x] Comparar saídas e limitar o histórico a 30 execuções por projeto.

**Justificativa técnica:** requer armazenamento estruturado e controle de tamanho; IndexedDB é mais adequado que `localStorage`.

**Dependências:** P2.1.

**Critérios de aceite:**

- [ ] Cada execução possui identificação e timestamp.
- [ ] O usuário consegue restaurar uma versão anterior sem perder a atual.
- [ ] O histórico não degrada o desempenho do editor.

### P2.5 — Backup automático do workspace — implementado

**Problema:** arquivos virtuais podem ser perdidos por reload ou fechamento da sessão.

**Escopo:**

- [x] Serializar periodicamente o filesystem virtual no IndexedDB.
- [x] Restaurar backup ao reabrir/alternar projeto.
- [x] Exibir a data do snapshot e permitir removê-lo.

**Justificativa técnica:** exige percorrer e serializar o FS do Emscripten, além de controlar tamanho e consistência.

**Dependências:** P2.1.

**Critérios de aceite:**

- [ ] Um reload inesperado não elimina o último snapshot válido.
- [ ] O usuário pode restaurar ou descartar o backup.
- [ ] Backups não bloqueiam a execução Python.

## Prioridade 3 — Melhorias contínuas

### P3.1 — Copiar e exportar saída do terminal — implementado

- [x] Adicionar “Copiar saída”.
- [x] Adicionar “Baixar saída `.txt`”.
- [x] Adicionar “Limpar terminal” visível.
- [x] Exibir confirmação após copiar.

**Justificativa técnica:** a saída já está disponível como string em `OutputTerminal`.

### P3.2 — Transparência do gerenciador de pacotes — implementado

- [x] Alterar “Desinstalar” para “Remover da lista” quando aplicável.
- [x] Explicar que o pacote permanece carregado no runtime atual.
- [x] Identificar a lista de pacotes populares como seleção curada (sem busca integral no PyPI).
- [x] Informar progresso da instalação e falhas de dependência.

**Justificativa técnica:** ajustes de interface são simples; desinstalação real deve permanecer fora deste escopo.

### P3.3 — Acessibilidade — implementado, com auditoria visual pendente

- [x] Revisar `aria-label`, `aria-live` e `aria-describedby` nos fluxos alterados.
- [x] Garantir foco inicial em diálogos.
- [x] Implementar foco de retorno ao fechar diálogos.
- [x] Manter o foco contido e permitir Escape/Tab nos diálogos.
- [ ] Revisar contraste e estados de foco.

**Justificativa técnica:** componentes já possuem estrutura React e alguns atributos ARIA; o trabalho é de revisão e testes.

### P3.4 — Polimento responsivo — implementado; validação em dispositivos pendente

- [x] Ajustar altura mínima do editor/terminal para telas menores.
- [x] Tornar o explorador de arquivos um drawer no mobile.
- [x] Manter acesso ao gerenciador de pacotes na barra de ações.
- [x] Permitir quebra de linha da toolbar.
- [ ] Validar visualmente em dispositivos abaixo de 600px.

**Justificativa técnica:** alterações concentradas em classes Tailwind e composição dos painéis.

### P3.5 — Toasts e estados vazios — implementado

- [x] Criar componente de toast reutilizável.
- [x] Padronizar mensagens de sucesso e erro nos fluxos comuns.
- [x] Melhorar estados vazios do terminal, arquivos e pacotes.
- [x] Evitar `alert()` nativo para fluxos comuns.

**Justificativa técnica:** não exige novo armazenamento; centraliza feedback já disperso.

### P3.6 — Limpeza técnica e documentação — implementado; auditoria de dependências pendente

- [x] Revisar hooks/componentes não utilizados.
- [x] Remover `useMatplotlib` e `InputDialog`, que não tinham consumidores.
- [x] Atualizar README e a estrutura real do projeto.
- [x] Documentar persistência local e limitações de pacotes/backup.
- [ ] Auditar dependências do projeto de forma completa.

**Justificativa técnica:** baixo risco e baixo impacto imediato, mas reduz manutenção e inconsistência.

### P3.7 — Reset explícito de sessão — implementado

- [x] Adicionar ação “Limpar workspace” na área do projeto e na Command Palette.
- [x] Diferenciar limpar saída de terminal e limpar o workspace do projeto.
- [x] Exigir confirmação antes de apagar código e arquivos virtuais.
- [x] Explicar que runtime e pacotes permanecem ativos.

**Justificativa técnica:** utiliza os estados e callbacks existentes, mas precisa de cuidado para não apagar dados por engano.

## Prioridade 4 — Itens reavaliados e status de implementação

### P4.1 — Autenticação e sincronização em nuvem — MVP implementado; fluxo real pendente

- [x] Provisionar Auth0 e Neon no projeto Vercel selecionado.
- [x] Adicionar login/logout Auth0 e estado de sessão sem enviar tokens ao cliente.
- [x] Implementar listagem, leitura e salvamento privado de snapshots com isolamento por `owner_id`.
- [x] Detectar conflito de atualização concorrente (HTTP 409), sem sobrescrever silenciosamente.
- [x] Criar links temporários, revogáveis e somente leitura; persistir somente o hash do token.
- [x] Importar compartilhamentos como novo projeto local, sem sobrescrever workspace existente.
- [x] Criar migração SQL versionada e comando `npm run db:migrate`.
- [x] Atualizar dependências/lockfile; TypeScript, 50 testes e build de produção passaram.
- [x] Sincronizar variáveis Production para `.env.local` ignorado pelo Git sem exibir valores.
- [x] Aplicar as migrações 001 e 002 no Neon; snapshots compartilhados são imutáveis.
- [ ] Completar login/callback e compartilhamento pelo domínio real de produção antes de anunciar o recurso.
- [x] Manter colaboração simultânea e sincronização em tempo real fora do escopo deste MVP.

**Limites:** snapshots têm limite de 3,5 MB por chamada; o link contém uma cópia estática e expira em 30 dias.

### P4.2 — Desinstalação real de pacotes — alternativa segura implementada

- [x] Manter a mensagem de que “Remover da lista” não desinstala o módulo já carregado.
- [x] Oferecer reinicialização explícita do runtime Pyodide, preservando o workspace e limpando o estado dos pacotes.
- [x] Não simular remoção individual de módulos já importados.

**Motivo:** desmontar parcialmente módulos pode deixar o runtime inconsistente; reiniciar o ambiente é previsível.

### P4.3 — Suporte offline — cache parcial implementado; offline completo segue fora do escopo

- [x] Registrar Service Worker em produção e oferecer “Preparar offline” explícito.
- [x] Cachear recursos essenciais Pyodide e recursos/wheels já acessados, com limite de cache.
- [x] Excluir APIs e autenticação do cache de navegação.
- [x] Informar que novos pacotes ou recursos não cacheados precisam de internet.
- [ ] Validar instalação e recuperação de cache nos navegadores alvo.
- [x] Não prometer disponibilidade offline completa: cache é local e sujeito às cotas/evicção do navegador.

### P4.4 — Busca no PyPI — consulta por nome exato implementada

- [x] Adicionar endpoint de metadados PyPI por nome exato e avisar que compatibilidade Pyodide não é garantida.
- [x] Manter catálogo curado para navegação; busca full-text geral fica postergada.

**Motivo:** disponibilidade no PyPI não garante wheel compatível com Pyodide; não há busca ampla validada nesta entrega.

### P4.5 — Editor — migração para CodeMirror 6 implementada

- [x] Migrar para CodeMirror 6 mantendo Python, tema, busca, navegação, seleção e integração com abas/linha de erro.
- [x] Restaurar dependências e validar TypeScript/testes/build; validação visual em dispositivos permanece pendente.

## 5. Roadmap sugerido

### Fase 0 — Preparação

- [ ] Criar uma lista de métricas básicas: tempo até primeira execução, falha de carregamento, execução com erro e exportação.
- [ ] Definir padrão visual para toolbar, toast, modal e estados vazios.
- [ ] Adicionar testes para os fluxos críticos antes das mudanças maiores.
- [ ] Corrigir a integração do destaque de linha de erro.

### Fase 1 — Primeira experiência e confiança

- [x] Onboarding, toolbar, erros acionáveis e avisos de persistência.
- [x] Retry do Pyodide, copiar/exportar terminal e reset de workspace/ambiente.

### Fase 2 — Base de workspace

- [x] Entidade `Project`, persistência IndexedDB e backup local do filesystem.
- [x] Exportação/importação de projeto e manifesto de pacotes.

### Fase 3 — Aprendizagem e produtividade

- [x] Trilha guiada, histórico de execuções, backup automático e modo Notebook.

### Fase 4 — Integrações opcionais e robustez

- [x] MVP de login, projetos cloud privados e links somente leitura.
- [x] Cache offline parcial do runtime Pyodide.
- [x] Consulta de metadados PyPI por nome exato.
- [x] Migração para CodeMirror 6.
- [ ] Validar Auth0/Neon com credenciais de produção e domínio real.
- [x] Aplicar migrações do schema.
- [x] Smoke test local: Auth0 configurado, lista privada retorna 401 sem sessão e lookup anônimo de share retorna 404 para token inexistente.
- [ ] Validar callback, compartilhamento e offline nos navegadores alvo.

## 6. Definição de pronto

Uma melhoria só deve ser considerada concluída quando:

- [ ] o fluxo principal funciona em desktop e mobile;
- [ ] estados de loading, sucesso, erro e vazio foram tratados;
- [ ] a ação é acessível por teclado quando aplicável;
- [ ] a mudança não quebra execução, input, plots ou persistência existente;
- [ ] há teste unitário ou de integração proporcional ao risco;
- [ ] README e documentação relevante estão atualizados;
- [ ] o comportamento foi validado em uma build de produção;
- [ ] a tarefa possui evidência de aceite ou feedback de usuário.

## 7. Riscos de produto e arquitetura

### Estado global excessivamente concentrado

`app/page.tsx` ainda concentra parte da orquestração. Conforme o produto crescer, convém separar domínio, estado de workspace e apresentação.

### Limites do armazenamento local

Projetos, histórico e snapshots já usam IndexedDB; `localStorage` permanece para preferências legadas e ponte de projeto ativo. Não expandir esse armazenamento para dados volumosos.

### Estado compartilhado do Pyodide

O namespace do Notebook é isolado por projeto e compartilhado entre suas células. O runtime de script e os pacotes ainda precisam ser tratados como estado de sessão ao alternar projetos.

### Compatibilidade de pacotes

Instalar um pacote do PyPI não significa que ele funcionará no Pyodide. O produto precisa comunicar compatibilidade, tamanho, tempo de instalação e limitações.

### URLs de compartilhamento

Compartilhar código comprimido por URL é útil para exemplos pequenos, mas não deve ser usado como formato principal para projetos com arquivos, imagens ou histórico.

## 8. Próximas decisões de produto

- Definir se o posicionamento principal será aprendizagem, playground geral ou data science.
- Medir uso recorrente antes de priorizar colaboração em tempo real.
- Decidir se a restauração automática de pacotes deve usar um manifesto compatível com Pyodide.
- Definir retenção e quota de projetos cloud e links compartilhados conforme uso real.
- Validar mensagens de privacidade e limites do cache offline com usuários.

## 9. Entrega da fase estratégica — 20/10/2026

Naquele marco foi implementado um MVP local das cinco iniciativas P2, mantendo a execução Python no navegador. A sincronização Auth0/Neon foi adicionada posteriormente na seção P4:

- **Projetos portáteis:** projetos independentes no IndexedDB; criar, duplicar, renomear e excluir; alternar projeto; importar/exportar ZIP versionado com abas, arquivos, células, preferências de layout/fonte e manifesto de pacotes. Os pacotes são registrados, mas precisam ser instalados manualmente no novo runtime.
- **Notebook:** modo opcional com células de código; executar individualmente; adicionar, duplicar, reordenar e excluir; saída e gráficos por célula; namespace Python isolado por projeto e compartilhado entre células; conversão de volta a script antes da exportação `.py`.
- **Trilha guiada:** cinco desafios com instruções e dicas; validação por saída esperada; progresso local ao projeto.
- **Histórico:** até 30 execuções por projeto, incluindo código, saída, erros e gráficos; restauração do código e comparação lado a lado de duas saídas.
- **Backup automático:** snapshot periódico (30 s) do filesystem virtual do usuário, restauração ao reabrir/alternar projeto, horário visível e remoção manual do backup. O snapshot limita-se a 20 MB e ignora diretórios internos do runtime.

### Limites conhecidos do MVP local

- Sem login, os dados locais ficam no navegador atual; limpar os dados do site pode removê-los. Com login, snapshots podem ser sincronizados manualmente pela nuvem.
- Os pacotes registrados no manifesto não são reinstalados automaticamente, porque a compatibilidade depende do runtime Pyodide e da disponibilidade de wheels compatíveis.
- O histórico mantém no máximo 30 execuções por projeto; imagens de gráficos aumentam o uso de quota do IndexedDB.
- O backup automático guarda o último snapshot, não uma sequência de pontos históricos. Exportar o projeto gera uma cópia portátil independente.
- A comparação de versões mostra as duas saídas lado a lado; não calcula diff textual.

## 10. Fechamento das iniciativas P4 — 20/10/2026

O código P4 está implementado: integração opcional Auth0/Neon, sincronização com controle otimista de versão, compartilhamento por snapshots imutáveis, reinicialização segura do runtime, cache offline parcial, consulta PyPI por nome exato e migração para CodeMirror 6. Dependências e lockfile atualizados; TypeScript, 50 testes, build de produção e migrações 001/002 confirmados. As variáveis Production foram puxadas para `.env.local` ignorado pelo Git. Resta validar o fluxo OAuth/callback e o compartilhamento no domínio real, além de testar o comportamento offline nos navegadores alvo.
