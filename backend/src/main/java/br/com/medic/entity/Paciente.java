	package br.com.medic.entity;
	
	import java.time.LocalDate;
import java.time.Period;

import org.hibernate.validator.constraints.br.CPF;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.UniqueConstraint;
	
	@Entity
	@Table(name = "pacientes", uniqueConstraints = {
		    @UniqueConstraint(columnNames = {"cpf", "medico_id"}) // <--- O SEGREDO ESTÁ AQUI
		})
	public class Paciente {
	
	    @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;
	
	    @ManyToOne(fetch = FetchType.LAZY)
	    @JoinColumn(name = "medico_id", nullable = false)
	    private Medico medicoResponsavel;
	
	    @Column(nullable = false)
	    private String nome; 
	    
	    @Column(nullable = false) 
	    private String cpf;
	    
	    private String telefone;
	    private String email;
	    
		private LocalDate dataNascimento; 
	
	    private String sexo;
	    
	    
	    @Column(columnDefinition = "TEXT")
	    private String historicoGeral; // ideia para o futuro apenas
	
	    @Column(updatable = false)
	    private LocalDate dataCadastro = LocalDate.now();
	    
	    public Paciente() {};
	    
	    public Paciente(Medico medicoResponsavel, String nome, @CPF(message = "CPF inválido") String cpf,
				LocalDate dataNascimento, String sexo, String telefone, String historicoGeral, LocalDate dataCadastro) {
			super();
			this.medicoResponsavel = medicoResponsavel;
			this.nome = nome;
			this.cpf = cpf;
			this.dataNascimento = dataNascimento;
			this.sexo = sexo;
			this.telefone = telefone;
		}
	
		public Long getId() {
			return id;
		}
	
		public Medico getMedicoResponsavel() {
			return medicoResponsavel;
		}
	
		public void setMedicoResponsavel(Medico medicoResponsavel) {
			this.medicoResponsavel = medicoResponsavel;
		}
	
		public String getNome() {
			return nome;
		}
	
		public void setNome(String nome) {
			this.nome = nome;
		}
	
		public String getCpf() {
			return cpf;
		}
	
		public void setCpf(String cpf) {
			this.cpf = cpf;
		}
	
		public LocalDate getDataNascimento() {
			return dataNascimento;
		}
	
		public void setDataNascimento(LocalDate dataNascimento) {
			this.dataNascimento = dataNascimento;
		}
	
		public String getSexo() {
			return sexo;
		}
	
		public void setSexo(String sexo) {
			this.sexo = sexo;
		}
	
		public String getTelefone() {
			return telefone;
		}
	
		public void setTelefone(String telefone) {
			this.telefone = telefone;
		}
	
		public String getHistoricoGeral() {
			return historicoGeral;
		}
	
		public void setHistoricoGeral(String historicoGeral) {
			this.historicoGeral = historicoGeral;
		}
	
		public LocalDate getDataCadastro() {
			return dataCadastro;
		}
	
		public void setDataCadastro(LocalDate dataCadastro) {
			this.dataCadastro = dataCadastro;
		}
	
		public String getEmail() {
			return email;
		}
	
		public void setEmail(String email) {
			this.email = email;
		}

		@Transient
		public Integer getIdade() {
		    if (this.dataNascimento == null || this.dataNascimento.isAfter(LocalDate.now())) {
		        return null;
		    }
		    return Period.between(this.dataNascimento, LocalDate.now()).getYears();
		}
	    
	}
