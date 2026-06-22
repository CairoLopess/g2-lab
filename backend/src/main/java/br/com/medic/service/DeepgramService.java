package br.com.medic.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class DeepgramService {

    private static final Logger log = LoggerFactory.getLogger(DeepgramService.class);

    @Value("${deepgram.api.key}")
    private String masterApiKey;

    @Value("${deepgram.project.id}")
    private String projectId;

    @Value("${deepgram.language}")
    private String language;

    @Value("${deepgram.model}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // HttpClient robusto
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1) // Mantemos 1.1 para estabilidade
            .connectTimeout(Duration.ofSeconds(60))
            .build();

    public String gerarChaveTemporaria() {
        try {
            String url = "https://api.deepgram.com/v1/projects/" + projectId + "/keys";
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("comment", "User Session Key");
            ArrayNode scopes = payload.putArray("scopes");
            scopes.add("usage:write");                    
            payload.put("time_to_live_in_seconds", 3600);

            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Token " + masterApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200 && response.statusCode() != 201) {
                log.error("Erro Key: {}", response.body());
                throw new RuntimeException("Erro Deepgram Key");
            }
            JsonNode root = objectMapper.readTree(response.body());
            return root.path("key").asText();
        } catch (Exception e) {
            throw new RuntimeException("Erro Auth Deepgram", e);
        }
    }

    /**
     * ESTRATÉGIA "FILE BUFFER": Salva em disco temporariamente para upload seguro.
     * Consumo de RAM: Quase Zero.
     * Estabilidade: Máxima.
     */
    /**
     * ESTRATÉGIA "FILE BUFFER": Salva em disco temporariamente para upload seguro.
     * Consumo de RAM: Quase Zero.
     * Estabilidade: Máxima.
     */
    public String transcreverAudioFinal(MultipartFile arquivo) {
        Path tempFile = null;
        try {
            // 1. Cria arquivo temporário no disco do servidor
            tempFile = Files.createTempFile("deepgram_upload_", ".tmp");

            // 2. Transfere os bytes do MultipartFile para esse arquivo (Rápido e Eficiente)
            arquivo.transferTo(tempFile.toFile());

            // 3. Detecta o Content-Type real do arquivo enviado pelo cliente
            //    "audio/*" é inválido como Content-Type de envio — o Deepgram rejeita com 400.
            String contentType = resolverContentType(arquivo);
            log.info("[DEEPGRAM] Enviando áudio. Content-Type detectado: {}", contentType);

            String url = String.format(
                "https://api.deepgram.com/v1/listen?model=%s&smart_format=true&diarize=true&language=%s",
                model, language
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Token " + masterApiKey)
                    .header("Content-Type", contentType)
                    .POST(HttpRequest.BodyPublishers.ofFile(tempFile))
                    .timeout(Duration.ofMinutes(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Deepgram Error: {}", response.body());
                throw new RuntimeException("Erro Deepgram: " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());

            if (root.has("results") &&
                root.path("results").has("channels") &&
                root.path("results").path("channels").get(0).path("alternatives").size() > 0) {

                return root.path("results")
                        .path("channels").get(0)
                        .path("alternatives").get(0)
                        .path("transcript").asText();
            }
            return "";

        } catch (IOException e) {
            log.error("Erro de I/O com arquivo temporário", e);
            throw new RuntimeException("Erro ao processar arquivo de áudio", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Upload interrompido", e);
        } finally {
            // 4. LIMPEZA: Sempre apaga o arquivo temporário, dando erro ou não
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException e) {
                    log.warn("Não foi possível deletar arquivo temporário: {}", tempFile);
                }
            }
        }
    }

    /**
     * Resolve o Content-Type correto para envio ao Deepgram.
     *
     * O Deepgram rejeita "audio/*" com HTTP 400 "Invalid data received".
     * Este método tenta obter o tipo real do arquivo e, caso não consiga,
     * infere pelo nome do arquivo. O fallback final é "audio/mpeg".
     */
    private String resolverContentType(MultipartFile arquivo) {
        String contentType = arquivo.getContentType();

        // Se o content-type veio válido e específico, usa direto
        if (contentType != null
                && !contentType.isBlank()
                && !contentType.equals("audio/*")
                && !contentType.equals("application/octet-stream")) {
            return contentType;
        }

        // Tenta inferir pela extensão do nome original do arquivo
        String originalFilename = arquivo.getOriginalFilename();
        if (originalFilename != null) {
            String lower = originalFilename.toLowerCase();
            if (lower.endsWith(".mp3"))  return "audio/mpeg";
            if (lower.endsWith(".wav"))  return "audio/wav";
            if (lower.endsWith(".webm")) return "audio/webm";
            if (lower.endsWith(".m4a"))  return "audio/mp4";
            if (lower.endsWith(".ogg"))  return "audio/ogg";
            if (lower.endsWith(".flac")) return "audio/flac";
            if (lower.endsWith(".aac"))  return "audio/aac";
            if (lower.endsWith(".mp4"))  return "video/mp4";
        }

        // Fallback: formato mais comum em gravações de voz
        log.warn("[DEEPGRAM] Não foi possível detectar Content-Type. Usando fallback: audio/mpeg");
        return "audio/mpeg";
    }
}