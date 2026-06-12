package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.TenantContext
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Popula o [TenantContext] por requisição (Fase 2 — multi-tenant):
 * - autenticado: tenant do principal ([AppUserDetails], embutido na sessão);
 * - rotas públicas por handle (`/api/p/{handle}/…`): tenant do publicador ATIVO dono do handle
 *   (handle desconhecido → 404 imediato).
 * O contexto é sempre limpo ao final (threads são reutilizadas pelo servlet container).
 */
internal open class TenantContextFilter(
    private val users: UserAccountRepository,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        try {
            // O handle do caminho tem PRECEDÊNCIA sobre a sessão: rotas /api/p/{handle} são
            // endereçadas explicitamente a um publicador — um visitante logado vendo o hub de
            // outra pessoa deve receber o conteúdo DELA, não o próprio.
            val handle = PUBLIC_HANDLE_PATH.find(request.requestURI)?.groupValues?.get(1)
            if (handle != null) {
                val owner = users.findByHandle(handle)?.takeIf { it.status == UserStatus.ACTIVE }
                if (owner == null) {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND, "Publicador não encontrado")
                    return
                }
                TenantContext.setCurrentTenant(owner.tenantId)
            } else {
                val principal = SecurityContextHolder.getContext().authentication?.principal
                if (principal is AppUserDetails) {
                    TenantContext.setCurrentTenant(principal.tenantId)
                }
            }
            filterChain.doFilter(request, response)
        } finally {
            TenantContext.clear()
        }
    }

    private companion object {
        val PUBLIC_HANDLE_PATH = Regex("^/api/p/([a-z0-9-]{1,64})(?:/.*)?$")
    }
}
