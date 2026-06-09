package com.gabrielaraujo.thothai.identity

import org.springframework.stereotype.Component
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * Proteção simples contra força-bruta no login (RF01), em memória: bloqueia o usuário por
 * [LOCK_MINUTES] minutos após [MAX_ATTEMPTS] falhas consecutivas. Single-instance no MVP; o estado
 * reinicia com a aplicação (aceitável para o escopo atual).
 */
@Component
internal class LoginAttemptService {
    private data class Attempt(
        val failures: Int,
        val lockedUntil: Instant?,
    )

    private val attempts = ConcurrentHashMap<String, Attempt>()

    fun isLocked(username: String): Boolean {
        val lockedUntil = attempts[key(username)]?.lockedUntil ?: return false
        return Instant.now().isBefore(lockedUntil)
    }

    fun recordFailure(username: String) {
        attempts.compute(key(username)) { _, current ->
            val failures = (current?.failures ?: 0) + 1
            val lockedUntil =
                if (failures >= MAX_ATTEMPTS) Instant.now().plusSeconds(LOCK_MINUTES * 60) else null
            Attempt(failures, lockedUntil)
        }
    }

    fun reset(username: String) {
        attempts.remove(key(username))
    }

    private fun key(username: String) = username.trim().lowercase()

    private companion object {
        const val MAX_ATTEMPTS = 5
        const val LOCK_MINUTES = 15L
    }
}
