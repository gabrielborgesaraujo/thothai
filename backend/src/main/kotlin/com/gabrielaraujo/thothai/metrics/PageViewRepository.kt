package com.gabrielaraujo.thothai.metrics

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate
import java.util.UUID

/** Ponto de uma série diária de acessos. */
interface DailyViews {
    val date: LocalDate
    val views: Long
}

/** Acessos acumulados por caminho (top publicações). */
interface PathViews {
    val path: String
    val views: Long
}

internal interface PageViewRepository : JpaRepository<PageView, UUID> {
    /** Incremento atômico (upsert): seguro sob concorrência, sem load-modify-save. */
    @Modifying
    @Query(
        nativeQuery = true,
        value = """
            INSERT INTO page_views (id, tenant_id, view_date, path, metric, views, created_at, updated_at)
            VALUES (gen_random_uuid(), :tenantId, :date, :path, :metric, 1, now(), now())
            ON CONFLICT (tenant_id, view_date, path, metric)
            DO UPDATE SET views = page_views.views + 1, updated_at = now()
        """,
    )
    fun increment(
        tenantId: String,
        date: LocalDate,
        path: String,
        metric: String,
    )

    @Query(
        "SELECT COALESCE(SUM(p.views), 0) FROM PageView p WHERE p.tenantId = :tenantId AND p.metric = :metric",
    )
    fun totalViews(
        tenantId: String,
        metric: String,
    ): Long

    @Query(
        """
        SELECT COALESCE(SUM(p.views), 0) FROM PageView p
        WHERE p.tenantId = :tenantId AND p.metric = :metric AND p.viewDate >= :since
        """,
    )
    fun viewsSince(
        tenantId: String,
        metric: String,
        since: LocalDate,
    ): Long

    @Query(
        """
        SELECT p.viewDate AS date, SUM(p.views) AS views FROM PageView p
        WHERE p.tenantId = :tenantId AND p.metric = 'view' AND p.viewDate >= :since
        GROUP BY p.viewDate ORDER BY p.viewDate
        """,
    )
    fun dailyViews(
        tenantId: String,
        since: LocalDate,
    ): List<DailyViews>

    @Query(
        """
        SELECT p.path AS path, SUM(p.views) AS views FROM PageView p
        WHERE p.tenantId = :tenantId AND p.metric = :metric
          AND p.viewDate >= :since AND p.path LIKE '/posts/%'
        GROUP BY p.path ORDER BY SUM(p.views) DESC
        """,
    )
    fun topPosts(
        tenantId: String,
        metric: String,
        since: LocalDate,
        pageable: Pageable,
    ): List<PathViews>
}
