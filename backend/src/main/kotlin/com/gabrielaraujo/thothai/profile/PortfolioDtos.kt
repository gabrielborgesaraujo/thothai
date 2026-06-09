package com.gabrielaraujo.thothai.profile

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.util.UUID

/** Payload de criação/atualização de uma entrada de portfólio (RF08). */
data class PortfolioEntryRequest(
    val category: PortfolioCategory,
    @field:NotBlank
    @field:Size(max = 255)
    val title: String,
    @field:Size(max = 255)
    val organization: String?,
    val description: String?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val visible: Boolean = true,
    val displayOrder: Int = 0,
)

data class PortfolioEntryResponse(
    val id: UUID,
    val category: PortfolioCategory,
    val title: String,
    val organization: String?,
    val description: String?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
    val visible: Boolean,
    val displayOrder: Int,
)

internal fun PortfolioEntry.toResponse() =
    PortfolioEntryResponse(
        id = requireNotNull(id),
        category = category,
        title = title,
        organization = organization,
        description = description,
        startDate = startDate,
        endDate = endDate,
        visible = visible,
        displayOrder = displayOrder,
    )
