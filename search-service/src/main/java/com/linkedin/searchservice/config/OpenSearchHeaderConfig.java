package com.linkedin.searchservice.config;

import org.apache.http.HttpRequest;
import org.apache.http.HttpRequestInterceptor;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.protocol.HttpContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.elasticsearch.RestClientBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenSearchHeaderConfig {

    @Value("${spring.elasticsearch.username:}")
    private String username;

    @Value("${spring.elasticsearch.password:}")
    private String password;

    @Bean
    public RestClientBuilderCustomizer restClientBuilderCustomizer() {
        return builder -> builder.setHttpClientConfigCallback(httpClientBuilder -> {
            if (username != null && !username.trim().isEmpty()) {
                CredentialsProvider credentialsProvider = new BasicCredentialsProvider();
                credentialsProvider.setCredentials(
                        AuthScope.ANY,
                        new UsernamePasswordCredentials(username, password)
                );
                httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider);
            }

            httpClientBuilder.addInterceptorFirst(new HttpRequestInterceptor() {
                @Override
                public void process(HttpRequest request, HttpContext context) {
                    request.removeHeaders("Content-Type");
                    request.setHeader("Content-Type", "application/json");
                    request.removeHeaders("Accept");
                    request.setHeader("Accept", "application/json");
                }
            });

            return httpClientBuilder;
        });
    }
}
