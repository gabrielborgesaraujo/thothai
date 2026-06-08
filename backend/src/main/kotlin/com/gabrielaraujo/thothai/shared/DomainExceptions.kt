package com.gabrielaraujo.thothai.shared

/** Recurso solicitado não encontrado (mapeado para HTTP 404). */
class ResourceNotFoundException(
    message: String,
) : RuntimeException(message)

/** Violação de regra de negócio / conflito de estado (mapeado para HTTP 409). */
class BusinessRuleException(
    message: String,
) : RuntimeException(message)

/** Entrada inválida na requisição (mapeado para HTTP 400). */
class InvalidRequestException(
    message: String,
) : RuntimeException(message)

/**
 * Falha em integração síncrona com serviço externo — storage, busca, LLM (mapeado para HTTP 503).
 * Suporta o tratamento de tolerância a falhas de terceiros (RNF02).
 */
class ExternalServiceException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
