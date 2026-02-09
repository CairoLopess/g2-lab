package br.com.medic.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import br.com.medic.service.ai.MedicoAssistenteAi;
import dev.langchain4j.model.openai.OpenAiAudioTranscriptionModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;

@Configuration
public class AiConfig {

    @Value("${openai.api-key}")
    private String apiKey;

    /**
     * Bean para transcrição de áudio (Whisper)
     */
    @Bean
    public OpenAiAudioTranscriptionModel audioTranscriptionModel() {
        return OpenAiAudioTranscriptionModel.builder()
                .apiKey(apiKey)
                .modelName("whisper-1")
                .timeout(Duration.ofSeconds(120))
                .build();
    }

    /**
     * Bean para chat model (GPT)
     */
    @Bean
    public OpenAiChatModel openAiChatModel() {
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName("gpt-4o-mini")
                .temperature(0.0)
                .timeout(Duration.ofSeconds(120))
                .logRequests(true)
                .logResponses(true)
                .build();
    }

    /**
     * Bean do assistente médico
     */
    @Bean
    public MedicoAssistenteAi medicoAssistenteAi(OpenAiChatModel chatModel) {
        return AiServices.builder(MedicoAssistenteAi.class)
                .chatModel(chatModel)
                .build();
    }
}