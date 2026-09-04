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

## Onde os dados ficam salvos — Supabase (tabelas relacionais)

Os dados ficam em tabelas próprias no Supabase — uma para cada tipo de
informação: `rotina_tasks`, `rotina_activities`, `rotina_companies`,
`rotina_people`, `rotina_categories`, `rotina_recurring`. Isso permite abrir
o **Table Editor** do Supabase e consultar/filtrar diretamente, ou rodar
SQL customizado no futuro (relatórios, indicadores, etc.) — diferente da
versão anterior, que guardava tudo como um único JSON dentro de uma
tabela genérica.

### Configurar pela primeira vez

1. **Criar as tabelas** — no painel do Supabase, abra o **SQL Editor** e
   rode o conteúdo do arquivo `supabase-migration.sql` (está na raiz deste
   projeto). Esse script cria as seis tabelas listadas acima e, se você já
   tinha usado a versão antiga (blob único em `rotina_app_storage`),
   **migra automaticamente** os dados existentes para as tabelas novas —
   é seguro rodar mesmo que essa tabela antiga não exista ou esteja vazia.

2. **Pegar as credenciais** — em *Project Settings → API*, copie a
   **Project URL** e a chave **anon public**.

3. **Criar o arquivo `.env`** na raiz do projeto (copie de `.env.example`)
   e preencha:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-public-aqui
   ```

4. Rodar `npm install` (já inclui o `@supabase/supabase-js`) e
   `npm run dev`.

5. Criar uma tarefa no app e conferir no **Table Editor** do Supabase se
   apareceu uma linha em `rotina_tasks`.

### Como a persistência funciona por baixo dos panos

`src/db-shim.js` expõe um objeto global `window.db` com um método por
operação (`insertTask`, `updateTask`, `deleteTask`, `insertCompany` etc.).
O `src/App.jsx` chama só esses métodos — ele não sabe (nem precisa saber)
que por trás existe Supabase. Isso significa que, se um dia você quiser
trocar de banco de dados ou adicionar uma API própria no meio do caminho,
a única coisa que muda é `src/db-shim.js`.

### Sobre a política de acesso (RLS)

O SQL cria uma política que libera leitura/escrita para qualquer
requisição que tenha a chave `anon` (pública por design, embutida no
código do navegador). Para um sistema de uso pessoal/interno isso costuma
ser aceitável. Se este app for ficar acessível publicamente na internet
algum dia, o recomendado é adicionar autenticação e restringir a política
ao usuário logado.

## Estrutura do projeto

```
central-rotina/
├── index.html               # página raiz
├── package.json
├── vite.config.js
├── supabase-migration.sql   # SQL: cria as tabelas + migra dados antigos
├── .env.example
└── src/
    ├── main.jsx             # ponto de entrada React
    ├── App.jsx              # aplicação inteira (telas, lógica, estilos)
    ├── supabaseClient.js    # cliente Supabase (lê o .env)
    └── db-shim.js           # camada de dados: expõe window.db usando Supabase
```

## Próximos passos sugeridos

- Adicionar autenticação, caso mais de uma pessoa vá usar o mesmo sistema.
- Evoluir para os recursos de CRM (funil, propostas, indicadores comerciais)
  quando a rotina operacional já estiver consolidada — agora que os dados
  são relacionais, unir com as tabelas do CRM fica mais direto.
