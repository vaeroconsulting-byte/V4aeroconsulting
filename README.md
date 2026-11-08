# Plataforma de Aviação

Aplicação web com Next.js App Router, TypeScript e Tailwind CSS. A página inicial
é uma apresentação visual demonstrativa; identidade, conteúdo, serviços, frota e
canais de contato devem ser confirmados com a empresa antes da publicação.

## Desenvolvimento

```bash
npm install
npm run dev
```

O projeto estará disponível em [http://localhost:3000](http://localhost:3000).

## Comandos

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run build`: valida e compila a aplicação para produção.
- `npm run start`: inicia a aplicação compilada.
- `npm run lint`: executa o ESLint.

## Estrutura

- `src/app`: layout global, estilos e rotas.
- `src/components`: componentes reutilizáveis.
- `src/data`: dados temporários e demonstrativos.
- `src/lib`: funções auxiliares.
- `src/types`: tipagens compartilhadas.
- `public/images`: imagens e recursos visuais estáticos.

O alias `@/*` aponta para `src/*`.

## Identidade visual provisória

Os tokens de cor, tipografia, largura de conteúdo e espaçamento estão
centralizados no início de `src/app/globals.css` para facilitar a substituição
após o recebimento do briefing e da identidade oficial. As fotografias locais
são ilustrativas. O formulário monta uma solicitação de cotação e abre o canal
oficial de WhatsApp configurado em `src/lib/contact.ts`; o usuário ainda precisa
confirmar o envio no WhatsApp. Esse fluxo não confirma reservas nem emite
passagens.
