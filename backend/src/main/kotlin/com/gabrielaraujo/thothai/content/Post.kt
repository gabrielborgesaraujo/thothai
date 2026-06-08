package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.Instant

/**
 * Postagem do publicador (RF02): artigo, tutorial ou nota, com corpo em Markdown.
 * Herda de [AbstractTenantEntity] a identidade, a chave de tenant (RNF03) e a auditoria.
 */
@Entity
@Table(name = "posts")
class Post(
    @Column(name = "title", nullable = false)
    var title: String,
    @Column(name = "slug", nullable = false)
    var slug: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    var type: PostType,
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    var status: PostStatus,
    @Column(name = "summary")
    var summary: String?,
    @Column(name = "body", nullable = false)
    var body: String,
    @Column(name = "published_at")
    var publishedAt: Instant? = null,
) : AbstractTenantEntity()
