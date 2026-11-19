# Ailla: como colocar o site no ar (grátis)

Esta pasta é o app Ailla pronto para o Netlify. A IA das respostas é o Gemini (Google), pelo plano gratuito.

O que tem aqui:
- `index.html`: o app
- `netlify/functions/ailla.mjs`: a função que conversa com o Gemini (a chave fica escondida nela)
- `netlify.toml`: configuração do Netlify

## 1. Pegar a chave do Gemini (5 min)
1. Entre em **aistudio.google.com** com seu Gmail.
2. Clique em **Get API key** e depois em **Create API key**.
3. Copie a chave e guarde. **Não mande essa chave para ninguém, nem cole no chat.**

## 2. Colocar os arquivos no GitHub (5 min)
1. Crie uma conta grátis em **github.com**, se ainda não tiver.
2. Clique em **New repository**, dê o nome `ailla` e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Descompacte o .zip e arraste **o conteúdo da pasta**: `index.html`, `netlify.toml`, `LEIA-ME.md` e a pasta `netlify`. Não arraste o .zip.
5. Clique em **Commit changes**.

## 3. Publicar no Netlify (5 min)
1. Entre em **app.netlify.com** e crie a conta com o botão **GitHub**.
2. Clique em **Add new project**, depois em **Import an existing project**, e escolha **GitHub**. Selecione o repositório `ailla`.
3. Antes de publicar, procure **Environment variables** e clique em **Add variable**:
   - Key: `GEMINI_API_KEY`
   - Value: a chave que você copiou no passo 1
4. Clique em **Deploy**. Em cerca de 1 minuto o site fica no ar.
5. Se você adicionou a chave depois do deploy, vá em **Deploys** e clique em **Trigger deploy** para ela passar a valer.
6. Para escolher o endereço, vá em **Project configuration**, depois em **Change project name**, e digite algo como `ailla-braz`. O site fica em `ailla-braz.netlify.app`.

## 4. Testar
Abra o site no celular, escolha um modo e pergunte "quem foi Pedro Álvares Cabral?" no campo do Guiar.
- **Se responder:** está pronto.
- **Se aparecer "A luz piscou…":** confira se a variável está escrita exatamente como `GEMINI_API_KEY` e faça **Trigger deploy** de novo.

## Limites do plano grátis
- O Gemini gratuito tem limite de perguntas por minuto e por dia. Os números aparecem no AI Studio. Se muita gente perguntar ao mesmo tempo, algumas respostas podem demorar ou pedir para tentar de novo.
- No plano gratuito, o Google pode usar as perguntas para melhorar os produtos dele. Por isso, não digite dados pessoais no app.
- O Netlify grátis tem uma cota mensal. Para uma apresentação, sobra.
