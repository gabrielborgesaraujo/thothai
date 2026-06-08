package com.gabrielaraujo.thothai.shared

/** Recurso solicitado não encontrado (mapeado para HTTP 404). */
class ResourceNotFoundException(
    message: String,
) : RuntimeException(message)

/** Violação de regra de negócio / conflito de estado (mapeado para HTTP 409). */
class BusinessRuleException(
    message: String,
) : RuntimeException(message)
