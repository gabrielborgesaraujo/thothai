package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.social.LinkedInShareCompleted
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

/**
 * Marca a postagem como compartilhada quando o módulo social publica no LinkedIn
 * (interação entre módulos via evento de aplicação — convenção do Modulith).
 */
@Component
internal class LinkedInShareListener(
    private val postService: PostService,
) {
    @EventListener
    fun on(event: LinkedInShareCompleted) {
        postService.markLinkedInShared(event.postId, event.linkedInPostId)
    }
}
