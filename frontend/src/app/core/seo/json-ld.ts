/**
 * Injeta/atualiza um bloco de dados estruturados JSON-LD no `<head>` (renderiza no SSR para SEO).
 * Idempotente por `id`: chamar de novo substitui o conteúdo em vez de duplicar o script.
 */
export function setJsonLd(document: Document, id: string, data: Record<string, unknown>): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
