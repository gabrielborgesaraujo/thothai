package com.gabrielaraujo.thothai.content

/** Estado de publicação de uma postagem (RF02). */
enum class PostStatus {
    DRAFT,

    /** Aguardando o horário definido em `scheduledAt` para ser promovida a [PUBLISHED]. */
    SCHEDULED,
    PUBLISHED,
}
