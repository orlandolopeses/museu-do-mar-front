# Site — Museu do Mar

Aplicação principal do cliente, com área pública, área autenticada e painel administrativo.

## Stack atual

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Auth.js / NextAuth
- PostgreSQL

## Porta padrão

- aplicação local: `3002`

## Runtime local

- Next.js 16 neste projeto exige Node `>=20.9.0`
- na máquina local atual, o trilho validado é Node 22 via `fnm`
- a task VS Code `Museu do Mar: Dev 3002` já foi alinhada para subir com `fnm exec --using=22`

## Variáveis de ambiente

Arquivo base: [site/.env.example](.env.example)

Obrigatórias:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

Opcionais:

- `ADMIN_NAME`
- `HOMOLOGATION_PUBLISH`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Login Google

O projeto já suporta base inicial para autenticação com Google via Auth.js / NextAuth.

Quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estiverem definidos:

- a tela de login passa a exibir botão `Entrar com Google`
- participantes autenticados por Google passam a ter usuário persistido no banco
- o acesso pode evoluir para jornadas multiator por perfil

Enquanto isso, o login por credenciais pode continuar como contingência administrativa.

## Utilitários operacionais

### Gerar hash da senha admin

```bash
npm run auth:hash-password -- 'SENHA_FORTE_AQUI'
```

### Gerar `NEXTAUTH_SECRET`

```bash
npm run auth:generate-secret
```

## Fluxo local recomendado

### 1. Subir banco local

```bash
npm run db:local:start
```

Use esse comando em um terminal dedicado quando quiser manter o Postgres local ativo manualmente.

Se a porta `5432` já estiver ocupada nesta máquina, rode o mesmo fluxo com uma `DATABASE_URL` temporária apontando para outra porta local, por exemplo:

```bash
DATABASE_URL=postgresql://museu_user:museu_pass_2026@127.0.0.1:55432/museu_do_mar npm run db:local:start
```

O mesmo override pode ser usado para `db:bootstrap`, `db:verify`, `local:bootstrap` e `local:validate` quando houver colisão de porta.

### 2. Bootstrap completo

```bash
npm run local:bootstrap
```

Esse fluxo executa:

- wrapper temporário com Postgres local
- `env:check`
- `db:bootstrap`
- `db:verify`

### 3. Validação técnica

```bash
npm run local:validate
```

Esse fluxo executa:

- wrapper temporário com Postgres local
- `lint`
- `test:smoke`
- `build`
- `env:check`
- `db:bootstrap`
- `db:verify`
- smoke runtime gerenciado do professor
- smoke runtime gerenciado do gestor
- smoke runtime gerenciado da equipe de produção
- smoke runtime gerenciado do bolsista
- smoke runtime gerenciado do voluntário
- smoke runtime gerenciado do apoiador

### 3.1. Pré-validação para deploy externo

```bash
npm run deploy:preflight
```

Esse fluxo executa:

- `env:check`
- `build`
- `db:verify`

Quando a intenção for ensaiar essa mesma verificação nesta máquina usando o Postgres embutido do projeto, sem depender de um banco já ligado manualmente, use:

```bash
fnm exec --using=22 npm run deploy:preflight:local
```

Esse wrapper reaproveita o mesmo trilho do banco local usado em `local:bootstrap` e `local:validate`, então é a prova mais fiel para validar a publicação externa a partir do workspace atual.

### 3.2. Publicação remota por SSH

Antes de publicar, valide a configuração local do alvo remoto:

```bash
npm run deploy:check
```

Esse comando confere `DEPLOY_HOST`, `DEPLOY_USER`, porta SSH, path remoto, nome do serviço e dependências locais como `ssh` e `rsync`.

Para sincronizar o projeto com o host externo, instalar dependências no servidor, validar o ambiente alvo e reiniciar o serviço:

```bash
DEPLOY_HOST=SEU_HOST \
DEPLOY_USER=SEU_USUARIO \
npm run deploy:remote
```

Se preferir, copie [site/.env.deploy.example](.env.deploy.example) para `.env.deploy.local`, preencha os dados do servidor e execute apenas:

```bash
npm run deploy:remote
```

Variáveis aceitas:

- `DEPLOY_HOST` — host SSH do servidor alvo (obrigatória)
- `DEPLOY_USER` — usuário SSH remoto
- `DEPLOY_SSH_PORT` — porta SSH, padrão `22`
- `DEPLOY_PATH` — diretório remoto, padrão `/srv/museu-do-mar/site`
- `DEPLOY_SERVICE` — nome do serviço systemd, padrão `museu-do-mar-site`
- `DEPLOY_SKIP_RESTART=true` — sincroniza e valida, mas não reinicia o serviço

O comando usa `rsync` para enviar o projeto sem sobrescrever `.env.local` no servidor e depois executa remotamente:

- normalização recursiva de ownership em todo o diretório publicado
- `npm ci`
- `npm run db:bootstrap`
- `npm run deploy:preflight`
- `sudo systemctl restart museu-do-mar-site`

### 4. Subir a aplicação

```bash
fnm exec --using=22 npx next dev -p 3002
```

Se o shell já estiver em Node 22, também funciona:

```bash
npm run dev
```

## Seeds e verificações

### Bootstrap principal

```bash
npm run db:bootstrap
```

Inclui:

- aplicação do schema via Drizzle quando necessário
- papéis RBAC
- admin inicial
- importação dos 3 posts editoriais
- seed de homologação
- seed das trilhas pedagógicas de `professor` e `estudante`

### Verificação pós-bootstrap

```bash
npm run db:verify
```

Confere:

- admin presente
- professor restrito de homologação presente
- 10 papéis RBAC
- 3 posts editoriais
- 3 trilhas pedagógicas de `professor`
- 3 trilhas pedagógicas de `estudante`
- 2 turmas de homologação, incluindo uma turma restrita para prova de escopo pedagógico
- 1 item de acervo
- 1 evento de homologação
- 1 tópico inicial de fórum
- 1 resposta inicial de fórum

### Prova runtime do recorte do professor

Com a aplicação já ativa em `http://127.0.0.1:3002` e o banco local bootstrapped, rode:

```bash
npm run scope:professor:smoke
```

O script autentica `professor.teste@museudomar.local`, valida em runtime que:

- o painel mostra apenas `Turma restrita de teste`
- a rota da turma do admin responde `404`
- `createActivity` persiste apenas na turma própria
- `updateActivity` altera apenas a atividade própria

O fluxo faz cleanup técnico das atividades temporárias ao final. Se a aplicação estiver em outra URL local, use `SCOPE_SMOKE_BASE_URL`.

Para rodar a mesma prova sem depender de um `next dev` já ativo:

```bash
npm run scope:professor:smoke:managed
```

Esse wrapper reutiliza um runtime existente em `3002` quando disponível; caso contrário, sobe um `next dev` temporário com Node 22 via `fnm`, executa o smoke e encerra o processo ao final.

### Prova runtime do recorte do gestor educacional

Com a aplicação já ativa em `http://127.0.0.1:3002` e o banco local bootstrapped, rode:

```bash
npm run scope:gestor:smoke
```

O script autentica `gestor.educacional@museudomar.local`, valida em runtime que:

- o painel mostra apenas a instituição vinculada
- o painel exibe as duas turmas da instituição homologada
- o detalhe institucional e os drill-downs dessas turmas respondem `200`
- uma instituição externa temporária e sua turma respondem `404`

O fluxo cria uma instituição/turma técnica fora do vínculo só para a prova negativa e faz cleanup ao final.

Para rodar a mesma prova sem depender de um `next dev` já ativo:

```bash
npm run scope:gestor:smoke:managed
```

Esse wrapper segue a mesma lógica do smoke do professor: reutiliza o runtime já vivo em `3002` quando disponível ou sobe um `next dev` temporário com Node 22 via `fnm`.

## Conteúdo mínimo de homologação

O seed de homologação cria ou atualiza:

- um item de acervo
- um evento
- um tópico inicial de fórum, aberto e fixado
- uma resposta inicial no tópico
- um professor restrito de homologação com vínculo institucional próprio
- um gestor educacional de homologação vinculado à mesma instituição
- uma turma restrita desse professor, separada da turma demo do admin

Credencial local de homologação para prova do recorte do professor:

- e-mail: `professor.teste@museudomar.local`
- senha: `ProfessorTeste2026!`

Credencial local de homologação para prova do recorte do gestor educacional:

- e-mail: `gestor.educacional@museudomar.local`
- senha: `GestorEducacional2026!`

Se `HOMOLOGATION_PUBLISH=true`, os itens públicos de acervo e agenda ficam publicados para validação pública.

## Próxima etapa operacional

O ambiente local está validado. O próximo passo é preparar a homologação externa/deploy com:

- segredos definitivos
- banco PostgreSQL do ambiente-alvo
- `NEXTAUTH_URL` do domínio real
- proxy reverso apontando para a porta `3002`

Templates prontos para deploy externo:

- [site/deploy/museu-do-mar-site.service](deploy/museu-do-mar-site.service)
- [site/deploy/museudomares.duckdns.org.nginx.conf](deploy/museudomares.duckdns.org.nginx.conf)

Comando recomendado no host antes de abrir o domínio ao público:

```bash
npm run deploy:preflight
```

Se preferir disparar a publicação a partir da máquina local com SSH configurado:

```bash
DEPLOY_HOST=SEU_HOST DEPLOY_USER=SEU_USUARIO npm run deploy:remote
```
