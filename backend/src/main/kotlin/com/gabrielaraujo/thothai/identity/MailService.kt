package com.gabrielaraujo.thothai.identity

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

/**
 * Envio de e-mails transacionais. O SMTP é configurado via variáveis `SPRING_MAIL_*` (binding
 * relaxado do Spring); sem SMTP configurado, o conteúdo é LOGADO — útil em dev para pegar o
 * link de redefinição sem caixa de entrada. Falhas nunca propagam (best-effort).
 */
@Service
internal class MailService(
    private val mailSender: ObjectProvider<JavaMailSender>,
    @param:Value("\${thothai.mail.from:no-reply@thothai.local}") private val from: String,
    @param:Value("\${spring.mail.host:}") private val smtpHost: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun send(
        to: String,
        subject: String,
        text: String,
    ) {
        // Host em branco (env presente mas vazia) também conta como "não configurado":
        // o conteúdo vai para o log, preservando o link de redefinição em dev/instalações sem SMTP.
        val sender = mailSender.ifAvailable.takeIf { smtpHost.isNotBlank() }
        if (sender == null) {
            log.info("SMTP não configurado — e-mail para {} apenas logado:\n[{}]\n{}", to, subject, text)
            return
        }
        try {
            val message =
                SimpleMailMessage().apply {
                    setFrom(from)
                    setTo(to)
                    setSubject(subject)
                    setText(text)
                }
            sender.send(message)
        } catch (ex: Exception) {
            log.warn("Falha ao enviar e-mail para {}: {}", to, ex.message)
        }
    }
}
