/**
 * Normaliza um texto livre para o formato de endereço público (handle/URL):
 * minúsculas, sem acentos, espaços e símbolos viram hífen, máx. 30 caracteres.
 * Assim o usuário digita do jeito dele ("Gabriel Araújo") e o campo se formata sozinho.
 */
export function slugifyHandle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 30);
}
