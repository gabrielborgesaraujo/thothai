package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize
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
    /** Modelo de publicação (RF02 / Fase 2): clássico na plataforma ou flexível. */
    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 16)
    var mode: PostMode = PostMode.PLATFORM,
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    var status: PostStatus,
    @Column(name = "summary")
    var summary: String?,
    @Column(name = "body", nullable = false)
    var body: String,
    /** Imagem de capa (cards em mosaico, hero do detalhe e og:image). */
    @Column(name = "banner_url", length = 1024)
    var bannerUrl: String? = null,
    @Column(name = "published_at")
    var publishedAt: Instant? = null,
    /** Horário-alvo de publicação quando [status] é [PostStatus.SCHEDULED]. */
    @Column(name = "scheduled_at")
    var scheduledAt: Instant? = null,
    /** Registro do compartilhamento no LinkedIn (badge no painel). */
    @Column(name = "linkedin_shared_at")
    var linkedinSharedAt: Instant? = null,
    @Column(name = "linkedin_post_id", length = 128)
    var linkedinPostId: String? = null,
    /**
     * Tags livres para filtro/descoberta. EAGER porque os DTOs são montados fora da transação
     * (open-in-view desligado); o BatchSize carrega as coleções da página em lote, evitando N+1.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "post_tags", joinColumns = [JoinColumn(name = "post_id")])
    @Column(name = "tag", nullable = false, length = 64)
    @BatchSize(size = 64)
    var tags: MutableSet<String> = mutableSetOf(),
) : AbstractTenantEntity()
