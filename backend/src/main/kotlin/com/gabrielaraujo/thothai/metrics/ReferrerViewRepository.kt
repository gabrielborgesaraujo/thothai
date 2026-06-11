package com.gabrielaraujo.thothai.metrics

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.UUID

/** Acessos acumulados por origem (host do referrer). */
interface HostViews {
    val host: String
    val views: Long
}

internal interface ReferrerViewRepository : JpaRepository<ReferrerView, UUID> {
    @Modifying
    @Query(
        nativeQuery = true,
        value = """
            INSERT INTO referrer_views (id, tenant_id, view_date, host, views, created_at, updated_at)
            VALUES (gen_random_uuid(), :tenantId, :date, :host, 1, now(), now())
            ON CONFLICT (tenant_id, view_date, host)
            DO UPDATE SET views = referrer_views.views + 1, updated_at = now()
        """,
    )
    fun increment(
        tenantId: String,
        date: LocalDate,
        host: String,
    )

    @Query(
        """
        SELECT r.host AS host, SUM(r.views) AS views FROM ReferrerView r
        WHERE r.tenantId = :tenantId AND r.viewDate >= :since
        GROUP BY r.host ORDER BY SUM(r.views) DESC
        """,
    )
    fun topHosts(
        tenantId: String,
        since: LocalDate,
        pageable: Pageable,
    ): List<HostViews>
}
