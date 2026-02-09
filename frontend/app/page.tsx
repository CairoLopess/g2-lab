'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, FileText, Activity, User, ClipboardList, Loader2, TestTube2, Printer, LogOut, Users, Plus, ChevronRight, Search } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // --- ESTADOS GERAIS ---
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // --- ESTADOS DE PACIENTE ---
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<number | null>(null); // Paciente selecionado
  const [pacienteSelecionadoNome, setPacienteSelecionadoNome] = useState<string>(""); 

  // Novo Paciente
  const [isCreatingPaciente, setIsCreatingPaciente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");

  // --- ESTADOS DA CONSULTA (Gravador) ---
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consultaId, setConsultaId] = useState<number | null>(null);

  const [documentoFinal, setDocumentoFinal] = useState<string>("");
  const [loadingDoc, setLoadingDoc] = useState(false);

  interface Prontuario {
    transcricao?: string;
    queixaPrincipal?: string;
    hda?: string;
    medicamentosEmUso?: string;
    alergias?: string;
    conduta?: string;
    antecedentesPessoais?: string;
    historicoFamiliar?: string;
    habitos?: string;
    exameFisico?: string;
    hipoteseDiagnostica?: string;
    examesSolicitados?: string;
    anamneseFormatada?: string; 
    [key: string]: string | undefined;
  }

  interface Paciente {
    id: number;
    nome: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  }
  
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // --- AUTH ---
  const logout = useCallback(() => {
    localStorage.removeItem('medic_token');
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('medic_token');
    if (!storedToken) { router.push('/login'); return; }
    setToken(storedToken);

    try {
        const base64Url = storedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const decoded = JSON.parse(jsonPayload);
        setMedicoId(decoded.id); 
    } catch (e) {
        console.error("Token inválido", e);
        logout();
    }
  }, [router, logout]);

  // --- BUSCA DE PACIENTES (Assim que logar) ---
  useEffect(() => {
    if (token) {
        fetchPacientes();
    }
  }, [token]);

  const fetchPacientes = async () => {
    try {
        const res = await fetch('http://localhost:8080/pacientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setPacientes(await res.json());
        }
    } catch (e) {
        console.error("Erro ao buscar pacientes", e);
    }
  };

  const handleCriarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
        const res = await fetch('http://localhost:8080/pacientes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ nome: novoNome, cpf: novoCpf })
        });

        if (res.ok) {
            const novo = await res.json();
            setPacientes([...pacientes, novo]); // Adiciona na lista
            setPacienteId(novo.id); // Já seleciona ele
            setPacienteSelecionadoNome(novo.nome);
            setIsCreatingPaciente(false); // Fecha modal
            setNovoNome(""); setNovoCpf("");
        } else {
            alert("Erro ao criar paciente");
        }
    } catch (e) {
        alert("Erro de conexão");
    }
  };

  const selecionarPaciente = (p: Paciente) => {
      setPacienteId(p.id);
      setPacienteSelecionadoNome(p.nome);
      // Limpa dados de consulta anterior se houver
      setConsultaId(null);
      setProntuario(null);
      setDocumentoFinal("");
  };

  const trocarPaciente = () => {
      setPacienteId(null);
      setConsultaId(null);
      setProntuario(null);
  };

  // --- FUNÇÕES DE GRAVAÇÃO (IGUAIS, MAS USANDO pacienteId STATE) ---
  const startRecording = async () => {
    if (!medicoId || !token || !pacienteId) return;

    try {
      const res = await fetch(`http://localhost:8080/consultas/iniciar?pacienteId=${pacienteId}&medicoId=${medicoId}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Erro ao iniciar consulta.");
      const data = await res.json();
      setConsultaId(data.id);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append("audio", blob, "audio.wav");
          
          const uploadRes = await fetch(`http://localhost:8080/consultas/${data.id}/upload`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData 
          });
          
          if (!uploadRes.ok) throw new Error("Erro no upload.");
          setProntuario(await uploadRes.json());
        } catch (error) { 
           alert("Erro no processamento."); 
        } finally { 
          setIsProcessing(false); 
          streamRef.current?.getTracks().forEach(t => t.stop());
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setProntuario(null);
      setDocumentoFinal("");
    } catch (error) { 
        alert("Erro ao iniciar gravação."); 
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultaId || !token) return;
    try {
      const res = await fetch(`http://localhost:8080/consultas/${consultaId}/finalizar`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prontuario)
      });
      if (res.ok) { 
          alert("✅ Salvo!"); 
          // Não recarrega a página, apenas limpa para próxima consulta ou mantém
      }
    } catch (error) { alert("Erro ao salvar."); }
  };

  const handleInputChange = (field: string, value: string) => {
    setProntuario((prev) => prev ? ({ ...prev, [field]: value }) : null);
  };

  const gerarLaudoSincronizado = () => {
    if (!prontuario) return;
    setLoadingDoc(true);
    const historiaClinica = prontuario.anamneseFormatada || `Paciente comparece referindo ${prontuario.queixaPrincipal || ''}. ${prontuario.hda || ''}`;
    const textoFinal = `
CLÍNICA MÉDICA INTEGRADA
-------------------------------------------------------------------------
PACIENTE: ${pacienteSelecionadoNome} (ID: ${pacienteId})
DATA: ${new Date().toLocaleDateString()}
-------------------------------------------------------------------------

1. ANAMNESE E HISTÓRIA CLÍNICA
${historiaClinica}

2. ANTECEDENTES E HÁBITOS
${prontuario.antecedentesPessoais ? `Ant. Pessoais: ${prontuario.antecedentesPessoais}` : ''}
${prontuario.historicoFamiliar ? `Hist. Familiar: ${prontuario.historicoFamiliar}` : ''}
${prontuario.habitos ? `Hábitos: ${prontuario.habitos}` : ''}
${!prontuario.antecedentesPessoais && !prontuario.habitos ? 'Nada digno de nota.' : ''}

3. EXAME FÍSICO
${prontuario.exameFisico || 'Sem alterações dignas de nota ao exame clínico.'}

4. RACIOCÍNIO CLÍNICO
Hipótese: ${prontuario.hipoteseDiagnostica || 'Em investigação.'}

5. CONDUTA E PLANO TEREAPÊUTICO
${prontuario.conduta || 'Orientações gerais.'}

6. PRESCRIÇÃO E EXAMES
${prontuario.medicamentosEmUso ? `Uso Prévio: ${prontuario.medicamentosEmUso}` : ''}
${prontuario.alergias ? `Alergias: ${prontuario.alergias}` : 'Nega alergias conhecidas.'}
${prontuario.examesSolicitados ? `Solicitação de Exames: ${prontuario.examesSolicitados}` : ''}

__________________________________________
Assinatura e Carimbo
    `;
    setDocumentoFinal(textoFinal);
    setLoadingDoc(false);
  };

  const handlePrint = () => { window.print(); };

  if (!medicoId) return null;

  // --- TELA 1: SELEÇÃO DE PACIENTE ---
  if (!pacienteId) {
      return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-4xl">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><Activity className="text-blue-600"/> Medic AI</h1>
                        <p className="text-slate-500">Bem-vindo(a), Doutor(a).</p>
                    </div>
                    <button onClick={logout} className="text-slate-400 hover:text-red-500"><LogOut /></button>
                </header>

                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><Users size={20}/> Meus Pacientes</h2>
                        <button onClick={() => setIsCreatingPaciente(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition">
                            <Plus size={16} /> Novo Paciente
                        </button>
                    </div>

                    {isCreatingPaciente && (
                        <form onSubmit={handleCriarPaciente} className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-bold text-blue-800 mb-3 text-sm uppercase">Cadastro Rápido</h3>
                            <div className="flex gap-4">
                                <input placeholder="Nome Completo" className="flex-1 p-2 border rounded" value={novoNome} onChange={e => setNovoNome(e.target.value)} required />
                                <input placeholder="CPF (Opcional)" className="w-40 p-2 border rounded" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} />
                                <button type="submit" className="bg-blue-600 text-white px-6 rounded font-bold hover:bg-blue-700">Salvar</button>
                                <button type="button" onClick={() => setIsCreatingPaciente(false)} className="text-slate-500 px-4 hover:underline">Cancelar</button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-2">
                        {pacientes.length === 0 ? (
                            <p className="text-center text-slate-400 py-10">Nenhum paciente encontrado. Cadastre o primeiro acima.</p>
                        ) : (
                            pacientes.map(p => (
                                <div key={p.id} onClick={() => selecionarPaciente(p)} 
                                    className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-200 p-3 rounded-full text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition"><User size={20}/></div>
                                        <div>
                                            <p className="font-bold text-slate-700">{p.nome}</p>
                                            <p className="text-xs text-slate-400">CPF: {p.cpf || 'Não informado'}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
      )
  }

  // --- TELA 2: A CONSULTA (GRAVADOR) ---
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-hidden mb-10 print:shadow-none print:w-full print:max-w-none">
        
        {/* Cabeçalho */}
        <header className="bg-blue-700 p-6 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
              <button onClick={trocarPaciente} className="bg-blue-800 p-2 rounded-lg hover:bg-blue-900 transition mr-2" title="Voltar para lista">
                  <Users size={18} />
              </button>
              <div>
                  <h1 className="text-lg font-bold flex items-center gap-2">Atendendo: {pacienteSelecionadoNome}</h1>
                  <span className="text-xs opacity-70">Protocolo: {consultaId || 'Nova Consulta'}</span>
              </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={logout} className="text-white/80 hover:text-white" title="Sair">
                <LogOut size={20} />
             </button>
          </div>
        </header>

        <div className="p-8 print:p-0">
          {!prontuario && (
            <div className="flex flex-col items-center py-12 gap-6">
              <button onClick={isRecording ? stopRecording : startRecording} 
                className={`p-8 rounded-full transition-all shadow-2xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isProcessing ? <Loader2 className="h-12 w-12 text-white animate-spin" /> : 
                 isRecording ? <Square className="h-12 w-12 text-white fill-current" /> : <Mic className="h-12 w-12 text-white" />}
              </button>
              <p className="text-lg text-slate-600 font-medium">
                {isProcessing ? "Ouvindo, Transcrevendo e Analisando Clinicamente..." : isRecording ? "Gravando..." : "Clique para iniciar"}
              </p>
            </div>
          )}

          {prontuario && (
            <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200 print:hidden">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2"><FileText size={14}/> Transcrição Original</label>
                <p className="text-slate-700 italic text-sm leading-relaxed">&quot;{prontuario.transcricao}&quot;</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
                {/* --- CAMPOS DO FORMULÁRIO (Igual ao anterior) --- */}
                <div className="space-y-6">
                   <h3 className="text-lg font-bold text-blue-800 border-b pb-2 flex items-center gap-2"><User size={20}/> Anamnese</h3>
                   <div><label className="label-form">Queixa Principal</label><input type="text" className="input-form" value={prontuario.queixaPrincipal || ''} onChange={e => handleInputChange('queixaPrincipal', e.target.value)} /></div>
                   <div><label className="label-form">HDA</label><textarea rows={4} className="input-form" value={prontuario.hda || ''} onChange={e => handleInputChange('hda', e.target.value)} /></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="label-form">Antecedentes</label><textarea rows={3} className="input-form text-sm" value={prontuario.antecedentesPessoais || ''} onChange={e => handleInputChange('antecedentesPessoais', e.target.value)} /></div>
                      <div><label className="label-form">Hábitos</label><textarea rows={3} className="input-form text-sm" value={prontuario.habitos || ''} onChange={e => handleInputChange('habitos', e.target.value)} /></div>
                   </div>
                   <h3 className="text-lg font-bold text-blue-800 border-b pb-2 flex items-center gap-2 pt-4"><ClipboardList size={20}/> Exame Físico</h3>
                   <textarea rows={3} className="input-form" value={prontuario.exameFisico || ''} onChange={e => handleInputChange('exameFisico', e.target.value)} />
                </div>

                <div className="space-y-6">
                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-bl font-bold">Sugestões IA</div>
                        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2"><TestTube2 size={20}/> Raciocínio Clínico</h3>
                        <div className="space-y-4">
                            <div><label className="label-form text-purple-900">Hipótese Diagnóstica</label><textarea rows={2} className="input-form border-purple-300 focus:ring-purple-500 bg-white" placeholder="A IA sugerirá diagnósticos aqui..." value={prontuario.hipoteseDiagnostica || ''} onChange={e => handleInputChange('hipoteseDiagnostica', e.target.value)} /></div>
                            <div><label className="label-form text-purple-900">Exames Complementares</label><textarea rows={3} className="input-form border-purple-300 focus:ring-purple-500 bg-white" placeholder="A IA sugerirá exames aqui..." value={prontuario.examesSolicitados || ''} onChange={e => handleInputChange('examesSolicitados', e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
                        <h3 className="text-lg font-bold text-green-900 mb-2">Conduta & Prescrição</h3>
                        <textarea rows={5} className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 text-slate-900 bg-white focus:ring-green-500 outline-none font-medium text-lg" value={prontuario.conduta || ''} onChange={e => handleInputChange('conduta', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="label-form">Medicamentos (Uso)</label><textarea rows={2} className="input-form" value={prontuario.medicamentosEmUso || ''} onChange={e => handleInputChange('medicamentosEmUso', e.target.value)} /></div>
                        <div><label className="label-form text-red-600">Alergias</label><textarea rows={2} className="input-form bg-red-50 border-red-200" value={prontuario.alergias || ''} onChange={e => handleInputChange('alergias', e.target.value)} /></div>
                    </div>
                </div>
              </div>

              {/* --- ÁREA DE IMPRESSÃO --- */}
              <div className="mt-12 pt-8 border-t-4 border-slate-200 print:border-none print:mt-0 print:pt-0">
                  <div className="flex justify-between items-center mb-6 print:hidden">
                      <div className="flex items-center gap-3">
                          <div className="p-3 bg-slate-800 rounded-lg text-white"><Printer size={24} /></div>
                          <div><h3 className="text-xl font-bold text-slate-800">Área de Impressão</h3><p className="text-sm text-slate-500">O documento é atualizado conforme você edita os campos acima.</p></div>
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={gerarLaudoSincronizado} disabled={loadingDoc} className="px-6 py-3 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-2">
                            {loadingDoc ? <Loader2 className="animate-spin" /> : <FileText size={18} />} {loadingDoc ? "Gerando..." : "Atualizar Laudo"}
                        </button>
                        <button type="button" onClick={handlePrint} disabled={!documentoFinal} className="px-8 py-3 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50">
                            <Printer size={18} /> Imprimir / PDF
                        </button>
                      </div>
                  </div>
                  <div className="bg-slate-200 p-8 rounded-xl flex justify-center overflow-auto border-inner print:p-0 print:bg-white print:overflow-visible">
                      {documentoFinal ? (
                          <div contentEditable suppressContentEditableWarning={true} className="folha-a4 bg-white text-black font-serif text-sm leading-relaxed shadow-2xl outline-none print:shadow-none print:w-full print:max-w-none" onBlur={(e) => setDocumentoFinal(e.currentTarget.innerText)}>
                             {documentoFinal.split('\n').map((line, i) => (<p key={i} className="min-h-[1em]">{line}</p>))}
                          </div>
                      ) : (
                          <div className="folha-a4 bg-white shadow-xl flex flex-col items-center justify-center text-slate-300 border border-slate-200 print:hidden">
                              <Printer size={48} className="mb-4 opacity-20" />
                              <p className="font-medium italic">O documento gerado aparecerá aqui</p>
                              <p className="text-xs mt-2">Clique em "Atualizar Laudo" acima</p>
                          </div>
                      )}
                  </div>
              </div>
            </form>
          )}
        </div>
      </div>
      <style jsx global>{`
        @media print { body * { visibility: hidden; } .folha-a4, .folha-a4 * { visibility: visible; } .folha-a4 { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20mm !important; box-shadow: none !important; border: none !important; } @page { size: auto; margin: 0mm; } }
        .folha-a4 { width: 210mm; min-height: 297mm; padding: 20mm; white-space: pre-wrap; }
        .label-form { display: block; font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
        .input-form { width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; outline: none; transition: all; color: #0f172a; background-color: #ffffff; font-size: 1rem; }
        .input-form:focus { ring: 2px; --tw-ring-color: #3b82f6; border-color: #3b82f6; }
      `}</style>
    </main>
  );
}