# Nível — Jogos com Perguntas

Plataforma educacional gamificada com 10 minijogos interativos, salas ao vivo (estilo Kahoot e Jogos ao Vivo), placar semanal, relatórios de desempenho da turma e gestão de questionários/usuários integrada ao **Firebase Firestore**.

---

## Estrutura do Projeto

```text
nivel-quiz/
├── index.html                  # Estrutura HTML principal e carregamento dos módulos
├── firestore.rules             # Regras de segurança do Cloud Firestore
├── firebase.json               # Configuração para deploy no Firebase Hosting / Firestore
├── .firebaserc                 # Vínculo com o projeto Firebase (nivel-quiz-e4b31)
├── README.md                   # Documentação do projeto
│
├── css/
│   ├── base.css                # Variáveis (tema claro/escuro), reset, tipografia, topo, botões e inputs
│   ├── views.css               # Estilos das telas (Login, Home, Professor, Usuários, Sala ao Vivo, Placar, Relatórios, Perfil)
│   └── games.css               # Estilos do HUD, palco, modal de pergunta e dos 10 jogos
│
└── js/
    ├── app.js                  # Roteamento entre telas, barra de navegação e inicialização (boot)
    │
    ├── config/
    │   ├── constants.js        # Níveis de dificuldade, avatares, cores, views e constantes
    │   └── firebase.js         # Credenciais do Firebase e camada de abstração Store (Firestore)
    │
    ├── core/
    │   ├── utils.js            # Funções utilitárias (DOM, datas, formatação, localStorage, toast)
    │   ├── state.js            # Estado global compartilhado (window.Nivel) e seletores
    │   └── auth.js             # Hash de senhas (PBKDF2 + salt) e gerador de usuários
    │
    ├── data/
    │   └── seed.js             # Questionários padrão criados no setup inicial
    │
    ├── services/
    │   └── stats.js            # Gravação de tentativas, cálculo de estatísticas e HTML de relatórios
    │
    ├── games/
    │   ├── question-modal.js   # Modal/card de pergunta com temporizador e atalhos de teclado
    │   ├── engine.js           # Catálogo GAMES, controle de vidas/pontos/HUD e ciclo de vida da partida
    │   └── list/               # Implementação isolada de cada um dos 10 minijogos
    │       ├── quiz.js         # 1. Quiz Relâmpago
    │       ├── memory.js       # 2. Memória dos Pares
    │       ├── snake.js        # 3. Cobrinha Curiosa
    │       ├── balloons.js     # 4. Estoura Balões
    │       ├── runner.js       # 5. Corrida de Obstáculos
    │       ├── forca.js        # 6. Forca
    │       ├── naval.js        # 7. Batalha Naval
    │       ├── trilha.js       # 8. Caça ao Tesouro
    │       ├── torre.js        # 9. Defesa da Torre
    │       └── roleta.js       # 10. Roleta da Sorte
    │
    └── views/
        ├── login.js            # Login, configuração inicial da conta master e sessão
        ├── home.js             # Seleção de questionário e vitrine de jogos
        ├── teacher.js          # CRUD de questionários, perguntas e importação/exportação JSON
        ├── users.js            # Gestão de usuários individual e em lote (professor master)
        ├── live.js             # Sala ao vivo (Quiz e Jogos ao vivo para professor e aluno)
        ├── board.js            # Placar semanal e geral dos alunos
        ├── reports.js          # Relatórios da turma, busca/filtros e exportação CSV
        └── profile.js          # Edição de perfil, avatar e alteração de senha
```

---

## Como Executar

1. **Direto no navegador:** Basta abrir o arquivo `index.html` no navegador (os scripts usam `<script defer>` sob o namespace `window.Nivel`, funcionando tanto via `file://` quanto via servidor HTTP).
2. **Com servidor local (recomendado para desenvolvimento):**
   - Extensão **Live Server** no VS Code, ou
   - `npx serve .` / `python -m http.server 8080`

---

## Como Adicionar um Novo Jogo no Futuro

1. Crie um arquivo em `js/games/list/meu-jogo.js` registrando a função em `Nivel.gameImpls.meuJogo = function(api) { ... }`.
2. Adicione a entrada correspondente no array `GAMES` em `js/games/engine.js`.
3. Inclua a tag `<script defer src="./js/games/list/meu-jogo.js"></script>` em `index.html` antes de `js/games/engine.js`.
