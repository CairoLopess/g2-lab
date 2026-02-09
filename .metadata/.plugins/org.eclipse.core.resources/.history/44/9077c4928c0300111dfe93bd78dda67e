package br.com.medic.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class StorageService {

    @Autowired
    private AmazonS3 s3Client;

    // Lendo o nome do bucket das suas configs
    @Value("${r2.bucket.name}")
    private String bucketName;

    public String uploadArquivo(MultipartFile arquivo) {
        try {
            // Gera nome único: uuid + extensão original (ex: "550e84... .wav")
            String nomeOriginal = arquivo.getOriginalFilename();
            String extensao = (nomeOriginal != null && nomeOriginal.contains(".")) 
                              ? nomeOriginal.substring(nomeOriginal.lastIndexOf(".")) 
                              : ".wav";
            
            String nomeArquivoUnico = UUID.randomUUID().toString() + extensao;

            // Metadados são importantes para o Cloudflare saber o tipo do arquivo
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(arquivo.getSize());
            metadata.setContentType(arquivo.getContentType());

            // Envia para o Cloudflare R2
            s3Client.putObject(new PutObjectRequest(bucketName, nomeArquivoUnico, arquivo.getInputStream(), metadata));

            return nomeArquivoUnico;
        } catch (IOException e) {
            throw new RuntimeException("Erro ao enviar arquivo para o Storage R2", e);
        }
    }
}