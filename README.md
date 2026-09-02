# Central de Rotina — BRData

App de gestão de tarefas e atividades operacionais (Minha Rotina, Caixa de
Entrada, Tarefas, Atividades, Agenda, Empresas, Pessoas, Recorrentes, Visão
Geral e Configurações).

## Como rodar na sua máquina

Pré-requisito: [Node.js](https://nodejs.org) versão 18 ou superior instalado.

```bash
# 1. entrar na pasta do projeto
cd central-rotina

# 2. instalar as dependências (só precisa fazer isso uma vez)
npm install

# 3. rodar em modo desenvolvimento
npm run dev
```

O terminal vai mostrar um endereço como `http://localhost:5173` — abra no
navegador (ele deve abrir sozinho).

## Gerar uma versão para hospedar / usar sem o terminal aberto

```bash
npm run build
```

Isso cria a pasta `dist/` com o site pronto (HTML/CSS/JS estáticos). Você
pode:

- Abrir `dist/index.html` diretamente no navegador, **ou**
- Hospedar a pasta `dist/` em qualquer serviço de site estático (Vercel,
  Netlify, GitHub Pages, um servidor Nginx/Apache próprio, etc.), **ou**
- Rodar `npm run preview` para servir a pasta `dist/` localmente.

## Onde os dados ficam salvos

Os dados (tarefas, atividades, empresas, pessoas, recorrências) ficam salvos
no **localStorage do navegador** usado para acessar o app — ou seja, são
locais daquele navegador/computador, não vão para nenhum servidor.

Implicações práticas:
- Se você limpar os dados de navegação do navegador, os dados do app somem.
- Se abrir em outro navegador ou computador, começa vazio (não sincroniza).
- Não há login nem múltiplos usuários nesta versão.

Isso está isolado no arquivo `src/storage-shim.js`. Se no futuro você quiser
migrar para um banco de dados de verdade (Postgres, Supabase, etc.) para ter
acesso de qualquer dispositivo e backup automático, essa é a única peça que
precisa ser trocada por chamadas a uma API — o restante do app
(`src/App.jsx`) não precisa mudar.

## Estrutura do projeto

```
central-rotina/
├── index.html          # página raiz
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx         # ponto de entrada React
    ├── App.jsx          # aplicação inteira (telas, lógica, estilos)
    └── storage-shim.js  # camada de persistência (localStorage)
```

## Próximos passos sugeridos

- Trocar `storage-shim.js` por uma API real com banco de dados, se quiser
  acessar de vários dispositivos.
- Adicionar autenticação, caso mais de uma pessoa vá usar o mesmo sistema.
- Evoluir para os recursos de CRM (funil, propostas, indicadores comerciais)
  quando a rotina operacional já estiver consolidada.
