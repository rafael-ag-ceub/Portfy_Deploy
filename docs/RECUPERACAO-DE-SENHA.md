# Recuperação de senha no Portfy

Guia de como funciona, o que configurar no Supabase e **como descobrir por que o link do e-mail não abre a tela "Criar nova senha"**.

## 1. Como funciona

```
Login > "Esqueceu a senha?" > e-mail > Supabase envia a mensagem
      > clique em "Reset password" > o Supabase confere o link e VOLTA AO SITE
      > tela própria "Criar nova senha" > "Senha alterada!" > entra no app
```

O ponto crítico é o **"VOLTA AO SITE"**: o Supabase só devolve a pessoa para um endereço que esteja na lista **Redirect URLs**. Se o endereço não estiver na lista, ele ignora o pedido e manda para o **Site URL**. É aí que quase todo problema acontece.

Telas novas (em `index.html`): `a-newpass-wait` (validando), `a-newpass` (Criar nova senha), `a-newpass-ok` (sucesso) e `a-linkerr` (link inválido).

## 2. Configuração no painel do Supabase

### 2.1 Authentication > **URL Configuration**
O endereço do site **tem de ser exatamente o que aparece na barra do navegador** quando você abre o Portfy (mesma porta, mesmo `127.0.0.1` ou `localhost`).

**Site URL** (um só, sem curinga). Para testes locais: `http://127.0.0.1:5501/index.html` (ajuste a porta).

**Redirect URLs** (use sempre `/**` no fim, que cobre qualquer caminho):

```
http://127.0.0.1:5500/**
http://127.0.0.1:5501/**
http://localhost:5500/**
http://localhost:5501/**
https://auggusti0g.github.io/Software-Portfy/**
```

> Uma entrada como `http://127.0.0.1:5501/index.html` (sem `/**`) só vale para **aquele caminho exato**. Se o site abrir em `http://127.0.0.1:5501/` ou em `.../Portfy_atual/index.html`, o endereço não bate e o Supabase manda para o Site URL.

### 2.2 Authentication > Notifications > **Emails** (modelo do e-mail)
O painel avisa: *"Set up custom SMTP to edit templates"*. Enquanto o SMTP próprio não estiver configurado, o Supabase usa o e-mail padrão, em inglês ("Reset your password" / "Reset password"). **Isso não impede a recuperação de funcionar**, só o texto e o visual.

Para personalizar: **Set up SMTP** (Resend: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = chave da API, remetente de um domínio verificado). Depois, em **Reset password**, use o assunto `Redefina sua senha do Portfy` e cole o conteúdo de `supabase/templates/recovery.html`.

### 2.3 Não é preciso SQL, tabela ou Edge Function para esta funcionalidade.

## 3. Descobrindo o que está errado (2 minutos)

**Passo A: confirme que o código novo está rodando.** Abra o site, pressione **F12 > Console** e dê **Ctrl+F5**. Deve aparecer:

```
[Portfy] versão: recuperacao-de-senha v7 | endereço do site: http://127.0.0.1:5501/index.html | link de recuperação: nenhum
```

- Não apareceu "versão": o navegador está servindo arquivos antigos, ou você abriu **outra pasta/cópia** do projeto. Feche tudo, abra a pasta nova no VS Code (**File > Open Folder**, escolhendo a pasta que contém `index.html`) e rode o Live Server a partir dela.
- Apareceu: anote o **endereço do site** que o console mostra.

**Passo B: confira o endereço de retorno.** Em *Esqueceu a senha?* a tela agora mostra, embaixo, `O link do e-mail voltará para: ...`. Esse texto precisa **casar com uma das Redirect URLs** do painel (2.1). Se não casar, é essa a causa.

**Passo C: veja onde o link do e-mail leva.** Peça um e-mail novo, clique em **Reset password** e, **antes de mexer em qualquer coisa**, olhe a barra de endereço e o Console:

| O que você vê | Significado | O que fazer |
|---|---|---|
| Porta ou endereço **diferente** do seu (ex.: `:5500` com o Live Server em `:5501`) | O endereço não estava na lista e caiu no Site URL | Passo 2.1 |
| Endereço certo e a tela **"Link inválido ou expirado"** | Link já usado ou vencido. Programas de e-mail corporativos (o seu mostra o rótulo **Externo**) às vezes abrem o link sozinhos e o invalidam | Peça um link novo e abra na hora; use o SMTP próprio (2.2) com o modelo do Portfy, que não é "gasto" por leitores automáticos |
| Endereço certo, console diz `link de recuperação: #hash` ou `token_hash`, mas aparece o login | Código antigo em uso | Passo A |
| Página não carrega (erro de conexão) | O Live Server daquela porta não está ligado | Ligue o servidor na porta indicada ou ajuste o Site URL |

## 4. Teste final
1. Console mostrando `versão: recuperacao-de-senha v7`.
2. Esqueceu a senha > e-mail > **Enviar link**.
3. Abra o e-mail mais recente > **Reset password** > deve abrir **Criar nova senha**.
4. Digite a senha nos dois campos > **Salvar nova senha** > **Entrar no Portfy**.

## 5. Segurança (para a apresentação)
- A senha vai direto ao Supabase Auth, que guarda só o hash.
- O link é de uso único e expira em 1 hora.
- O pedido sempre responde "se o e-mail existir, enviamos o link", para não revelar quem tem conta.
- A sessão criada pelo link só serve para trocar a senha; se a pessoa cancelar, ela é encerrada.
