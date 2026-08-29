package com.linkedin.searchservice.config;

import org.apache.http.HttpRequest;
import org.apache.http.HttpRequestInterceptor;
import org.apache.http.protocol.HttpContext;
import org.springframework.boot.autoconfigure.elasticsearch.RestClientBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenSearchHeaderConfig {

    @Bean
    public RestClientBuilderCustomizer restClientBuilderCustomizer() {
        return builder -> builder.setHttpClientConfigCallback(httpClientBuilder ->
                httpClientBuilder.addInterceptorFirst(new HttpRequestInterceptor() {
                    @Override
                    public void process(HttpRequest request, HttpContext context) {
                        request.removeHeaders("Content-Type");
                        request.setHeader("Content-Type", "application/json");
                        request.removeHeaders("Accept");
                        request.setHeader("Accept", "application/json");
                    }
                })
        );
    }
}
