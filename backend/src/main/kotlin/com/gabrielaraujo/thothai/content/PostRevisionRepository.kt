package com.gabrielaraujo.thothai.content

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.util.UUID

internal interface PostRevisionRepository : JpaRepository<PostRevision, UUID> {
    fun findByTenantIdAndPostIdOrderByCreatedAtDesc(
        tenantId: String,
        postId: UUID,
    ): List<PostRevision>

    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): PostRevision?

    /** Mantém apenas as [keep] versões mais recentes do post. */
    @Modifying
    @Query(
        nativeQuery = true,
        value = """
            DELETE FROM post_revisions
            WHERE post_id = :postId AND id NOT IN (
                SELECT id FROM post_revisions WHERE post_id = :postId
                ORDER BY created_at DESC LIMIT :keep
            )
        """,
    )
    fun pruneOld(
        postId: UUID,
        keep: Int,
    )
}
