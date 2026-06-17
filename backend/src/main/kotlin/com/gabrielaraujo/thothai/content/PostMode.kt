package com.gabrielaraujo.thothai.content

/**
 * Modelo de publicação de uma postagem (RF02 / Fase 2):
 * - [PLATFORM]: modelo clássico — vive no hub e, ao compartilhar no LinkedIn, gera uma "isca"
 *   com link de volta ao portal;
 * - [FLEXIBLE]: modelo flexível — a publicação no hub é opcional (governada pelo `status`) e o
 *   compartilhamento no LinkedIn leva o conteúdo inteiro, sem link de retorno.
 */
enum class PostMode {
    PLATFORM,
    FLEXIBLE,
}
