package com.gabrielaraujo.thothai

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import

@Import(TestcontainersConfiguration::class)
@SpringBootTest
class ThothaiApplicationTests {
    @Test
    fun contextLoads() {
    }
}
