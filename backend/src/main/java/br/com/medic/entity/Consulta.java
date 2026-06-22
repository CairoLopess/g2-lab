package br.com.medic.entity;

import java.time.LocalDateTime;

import br.com.medic.enums.StatusConsulta;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "consultas")
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Medico medico;

    private LocalDateTime dataConsulta = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private StatusConsulta status = StatusConsulta.CRIADA;

    private String audioPath; 

    @Column(columnDefinition = "TEXT")
    private String transcricaoBruta; 

    @Column(columnDefinition = "TEXT")
    private String iaDadosEstruturados;

    @Column(columnDefinition = "TEXT")
    private String anamneseFormatada;

    @Column(nullable = false)
    private Boolean prontuarioGerado = false;

    @Column(name = "duracao_audio_seg")
    private Integer duracaoAudioSegundos = 0; 

    // --- CONSTRUTORES ---
    public Consulta() {}
    
    public Consulta(Paciente paciente, Medico medico) {
        this.paciente = paciente;
        this.medico = medico;
        this.dataConsulta = LocalDateTime.now();
        this.status = StatusConsulta.CRIADA;
    }

    // ==========================================
    // GETTERS E SETTERS 
    // ==========================================

    public Long getId() {
        return id;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }

    public Medico getMedico() {
        return medico;
    }

    public void setMedico(Medico medico) {
        this.medico = medico;
    }

    public LocalDateTime getDataConsulta() {
        return dataConsulta;
    }

    public void setDataConsulta(LocalDateTime dataConsulta) {
        this.dataConsulta = dataConsulta;
    }

    public StatusConsulta getStatus() {
        return status;
    }

    public void setStatus(StatusConsulta status) {
        this.status = status;
    }

    public String getAudioPath() {
        return audioPath;
    }

    public void setAudioPath(String audioPath) {
        this.audioPath = audioPath;
    }

    public String getTranscricaoBruta() {
        return transcricaoBruta;
    }

    public void setTranscricaoBruta(String transcricaoBruta) {
        this.transcricaoBruta = transcricaoBruta;
    }

    public String getIaDadosEstruturados() {
        return iaDadosEstruturados;
    }

    public void setIaDadosEstruturados(String iaDadosEstruturados) {
        this.iaDadosEstruturados = iaDadosEstruturados;
    }

    public String getAnamneseFormatada() {
        return anamneseFormatada;
    }

    public void setAnamneseFormatada(String anamneseFormatada) {
        this.anamneseFormatada = anamneseFormatada;
    }

    public Boolean getProntuarioGerado() {
        return prontuarioGerado;
    }

    public void setProntuarioGerado(Boolean prontuarioGerado) {
        this.prontuarioGerado = prontuarioGerado;
    }

    public Integer getDuracaoAudioSegundos() {
        return duracaoAudioSegundos;
    }

    public void setDuracaoAudioSegundos(Integer duracaoAudioSegundos) {
        this.duracaoAudioSegundos = duracaoAudioSegundos;
    }
}