package br.com.medic.storage;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "r2.enabled", havingValue = "true")
public class R2Config {

    @Value("${r2.account.id}")
    private String accountId;

    @Value("${r2.access.key.id}")
    private String accessKey;

    @Value("${r2.secret.access.key}")
    private String secretKey;

    @Bean
    public AmazonS3 s3Client() {
        var credentials = new BasicAWSCredentials(accessKey, secretKey);

        String endpointUrl = String.format("https://%s.r2.cloudflarestorage.com", accountId);

        // 3. Constrói o cliente
        return AmazonS3ClientBuilder.standard()
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                // A região no R2 geralmente é "auto" ou "us-east-1" (padrão S3), 
                // mas o endpoint é o que importa.
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(endpointUrl, "auto"))
                .build();
    }
}
