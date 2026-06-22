package br.com.medic.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import br.com.medic.service.ai.MedicoAssistenteAi;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;

@Configuration
public class AiConfig {

    @Value("${openai.api-key}")
    private String openAiApiKey;

    @Bean
    public OpenAiChatModel openAiChatModel() {
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName("gpt-4o-mini")
                .temperature(0.0)
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