package com.gabrielaraujo.thothai.shared

/**
 * Contexto de isolamento de inquilino (RNF03 — multi-tenant adormecido).
 *
 * No MVP single-publisher existe apenas o tenant [DEFAULT_TENANT]. Toda entidade persistida
 * carrega a chave de tenant e as consultas filtram por ela, de modo que a evolução para
 * multi-tenant não exija refatoração estrutural — bastará popular este contexto por requisição.
 */
object TenantContext {
    const val DEFAULT_TENANT: String = "default"

    private val holder = ThreadLocal.withInitial { DEFAULT_TENANT }

    fun currentTenant(): String = holder.get()

    fun setCurrentTenant(tenant: String) = holder.set(tenant)

    fun clear() = holder.remove()

    /** Executa [block] sob outro tenant, restaurando o anterior ao final. */
    fun <T> runAs(
        tenant: String,
        block: () -> T,
    ): T {
        val previous = holder.get()
        holder.set(tenant)
        try {
            return block()
        } finally {
            holder.set(previous)
        }
    }
}
