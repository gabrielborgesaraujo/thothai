package com.gabrielaraujo.thothai.shared

import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * Tradução centralizada de exceções para respostas [ProblemDetail] (RFC 7807),
 * garantindo um contrato de erro consistente em toda a API.
 */
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleNotFound(ex: ResourceNotFoundException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.message ?: "Recurso não encontrado")

    @ExceptionHandler(BusinessRuleException::class)
    fun handleConflict(ex: BusinessRuleException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.message ?: "Conflito de estado")

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ProblemDetail {
        val problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)
        problem.detail = "Falha de validação"
        problem.setProperty(
            "errors",
            ex.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "inválido") },
        )
        return problem
    }
}
