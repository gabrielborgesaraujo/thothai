package com.gabrielaraujo.thothai

import org.springframework.boot.fromApplication
import org.springframework.boot.with


fun main(args: Array<String>) {
	fromApplication<ThothaiApplication>().with(TestcontainersConfiguration::class).run(*args)
}
