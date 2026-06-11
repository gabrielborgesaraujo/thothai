package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.util.UUID

/**
 * Snapshot do estado de uma postagem ANTES de cada atualização (histórico de versões).
 * Limitado às últimas [PostService.MAX_REVISIONS] por post; a restauração é feita pelo painel,
 * que preenche o formulário com a versão escolhida.
 */
@Entity
@Table(name = "post_revisions")
class PostRevision(
    @Column(name = "post_id", nullable = false)
    var postId: UUID,
    @Column(name = "title", nullable = false)
    var title: String,
    @Column(name = "summary", length = 500)
    var summary: String?,
    @Column(name = "body", nullable = false)
    var body: String,
    @Column(name = "banner_url", length = 1024)
    var bannerUrl: String? = null,
) : AbstractTenantEntity()
