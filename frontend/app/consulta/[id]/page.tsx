'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Mic, Home, Database, Bell, Settings,
  Pause, ChevronDown, Loader2, Lock,
  Sparkles, ClipboardList, FileText, Save, Printer, Share2, User, AlertTriangle, X, CheckCircle,
  Brain, HelpCircle, Stethoscope, Download
} from 'lucide-react';
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

// --- INTERFACES DE UI ---
interface AccordionProps { title: string; isOpen?: boolean; children?: React.ReactNode; }
interface TagProps { text: string; removable?: boolean; }
interface ChatMessageProps { role: string; text: string; }

// --- INTERFACES DE DADOS (BACKEND) ---
interface ResumoBackend {
  queixaPrincipal: string[]; hda: string[]; sintomasAssociados: string[];
  antecedentesPessoais: string[]; antecedentesFamiliares: string[];
  medicamentosEmUso: string[]; alergias: string[];
}
interface PacienteData { nome: string; idade: number; sexo: string; cpf: string; }
interface DeepgramResponse {
  channel?: {
    alternatives?: { transcript?: string; words?: { speaker?: number }[]; }[];
  };
}
interface CustomWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
  AudioContext?: typeof AudioContext;
}

interface CopilotoResponse {
  perguntasSugeridas: string[];
  hipotesesDiagnosticas: string[];
  dadosExtraidos: {
    queixaPrincipal: string[];
    hda: string[];
    sintomasAssociados: string[];
    antecedentesPessoais: string[];
    antecedentesFamiliares: string[];
    medicamentosEmUso: string[];
    alergias: string[];
  };
}

interface ConsultaHistorico {
  id: number;
  dataConsulta: string;
  status: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_URL = `${BASE_URL}/consultas`;

// --- VISUALIZADOR DE ÁUDIO ---
const AudioVisualizer = ({ stream }: { stream: MediaStream | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const win = window as unknown as CustomWindow;
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    audioContextRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (!ctx) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = 4;
      const gap = 3;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const indices = [2, 6, 10, 14];
      indices.forEach((dataIndex, i) => {
        const value = dataArray[dataIndex] || 0;
        const height = 10 + (value / 255) * 30;
        ctx.fillStyle = '#0fc679';
        ctx.fillRect(centerX - ((i + 1) * (barWidth + gap)), centerY - height / 2, barWidth, height);
        ctx.fillRect(centerX + (i * (barWidth + gap)), centerY - height / 2, barWidth, height);
      });
    };
    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioContextRef.current?.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={60} height={40} className="absolute z-0 opacity-80" />;
};

// --- SIDEBAR ---
const Sidebar = ({ active, onHomeClick }: { active: string; onHomeClick: () => void }) => (
  <aside className="hidden md:flex flex-col items-center gap-6 w-[72px] z-20 fixed left-6 top-10">
    <nav className="flex flex-col gap-2 w-full py-4 items-center bg-[#3ed28c] rounded-[40px] shadow-[0_8px_30px_rgba(62,210,140,0.25)]">
      <button onClick={onHomeClick} className="p-3 rounded-full transition-all duration-300 flex justify-center items-center relative w-[52px] h-[52px] text-white hover:bg-white/20">
        <Home size={24} strokeWidth={2} />
      </button>
      <NavItem icon={<Mic size={24} strokeWidth={2} />} active={active === 'record'} />
      <NavItem icon={<Database size={24} strokeWidth={2} />} active={active === 'db'} />
    </nav>
    <nav className="flex flex-col gap-2 w-full py-4 items-center bg-[#3ed28c] rounded-[40px] shadow-[0_8px_30px_rgba(62,210,140,0.25)]">
      <NavItem icon={<Bell size={24} strokeWidth={2} />} active={active === 'notif'} hasDot={true} />
      <NavItem icon={<Settings size={24} strokeWidth={2} />} active={active === 'settings'} />
    </nav>
  </aside>
);

const NavItem = ({ icon, active, hasDot }: { icon: React.ReactNode; active?: boolean; hasDot?: boolean }) => (
  <button className={`p-3 rounded-full transition-all duration-300 flex justify-center items-center relative w-[52px] h-[52px]
    ${active ? 'text-[#3ed28c] bg-white shadow-md scale-105' : 'text-white hover:bg-white/20'}`}>
    <div className="relative z-10 flex items-center justify-center">
      {icon}
      {hasDot && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#42f5ce] border-2 border-[#3ed28c] rounded-full" />}
    </div>
  </button>
);

// --- COMPONENTE PRINCIPAL ---
export default function MedicDashboard() {
  const router = useRouter();
  const params = useParams();

  const consultaId = Number(params.id);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingFinal, setIsSavingFinal] = useState(false); 
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [medicoNome, setMedicoNome] = useState("Doutor");
  const [showExitModal, setShowExitModal] = useState(false);
  const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
  
  // Atualizando o tipo da transcrição para aceitar string genérica
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);

  const [statusConsulta, setStatusConsulta] = useState<string>('CRIADA');
  const isFinalizada = statusConsulta === 'FINALIZADA';

  const [resumo, setResumo] = useState<ResumoBackend>({
    queixaPrincipal: [], hda: [], sintomasAssociados: [], antecedentesPessoais: [],
    antecedentesFamiliares: [], medicamentosEmUso: [], alergias: [],
  });
  const [documentoFinal, setDocumentoFinal] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [copiloto, setCopiloto] = useState<CopilotoResponse | null>(null);
  const [copilotoLoading, setCopilotoLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const deepgramConnectionRef = useRef<{ finish: () => void; send: (data: Blob | string) => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fullTranscriptRef = useRef<string>("");
  const prontuarioSectionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copilotoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCopilotoLengthRef = useRef<number>(0);

  const handleAuthError = () => {
    localStorage.removeItem('medic_token');
    localStorage.removeItem('medic_nome');
    localStorage.removeItem('medic_id');
    router.push('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('medic_token');
    if (!token) { router.push('/login'); return; }
    setMedicoNome(localStorage.getItem('medic_nome') || "Dr. Cairo");
    fetchConsultaDetails(token);
  }, [router]);

  useEffect(() => {
    if (textareaRef.current && documentoFinal) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [documentoFinal]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // AUTO-SAVE DE RASCUNHO
  useEffect(() => {
    if (fullTranscriptRef.current.length > 0) {
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
            salvarRascunho();
        }, 2000);
    }
  }, [transcript]);

  const chamarCopiloto = async () => {
    const texto = fullTranscriptRef.current;
    if (texto.length < 30 || texto.length === lastCopilotoLengthRef.current) return;
    lastCopilotoLengthRef.current = texto.length;
    setCopilotoLoading(true);
    try {
      const token = localStorage.getItem('medic_token');
      const baseUrl = BASE_URL;
      const res = await fetch(`${baseUrl}/consultas/sugestoes-tempo-real`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ transcricao: texto }),
      });
      if (res.ok) {
        const data: CopilotoResponse = await res.json();
        setCopiloto(data);
        if (data.dadosExtraidos) {
          setResumo(prev => ({
            queixaPrincipal: data.dadosExtraidos.queixaPrincipal.length > 0 ? data.dadosExtraidos.queixaPrincipal : prev.queixaPrincipal,
            hda: data.dadosExtraidos.hda.length > 0 ? data.dadosExtraidos.hda : prev.hda,
            sintomasAssociados: data.dadosExtraidos.sintomasAssociados.length > 0 ? data.dadosExtraidos.sintomasAssociados : prev.sintomasAssociados,
            antecedentesPessoais: data.dadosExtraidos.antecedentesPessoais.length > 0 ? data.dadosExtraidos.antecedentesPessoais : prev.antecedentesPessoais,
            antecedentesFamiliares: data.dadosExtraidos.antecedentesFamiliares.length > 0 ? data.dadosExtraidos.antecedentesFamiliares : prev.antecedentesFamiliares,
            medicamentosEmUso: data.dadosExtraidos.medicamentosEmUso.length > 0 ? data.dadosExtraidos.medicamentosEmUso : prev.medicamentosEmUso,
            alergias: data.dadosExtraidos.alergias.length > 0 ? data.dadosExtraidos.alergias : prev.alergias,
          }));
        }
      }
    } catch (e) {
      console.warn("Erro no copiloto tempo real", e);
    } finally {
      setCopilotoLoading(false);
    }
  };

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        if (fullTranscriptRef.current.length > 30) {
          chamarCopiloto();
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const salvarRascunho = async () => {
    setIsSavingDraft(true);
    try {
        const token = localStorage.getItem('medic_token');
        await fetch(`${API_URL}/${consultaId}/rascunho`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ transcricao: fullTranscriptRef.current, resumo: resumo })
        });
    } catch (e) {
        console.warn("Falha ao salvar rascunho automático", e);
    } finally {
        setIsSavingDraft(false);
    }
  };

  const fetchConsultaDetails = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/${consultaId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 401) { handleAuthError(); return; }
      if (res.ok) {
        const data = await res.json();
        if (data.paciente) setPacienteData(data.paciente);

        if (data.status) setStatusConsulta(data.status);

        // RESTAURA O ESTADO SE HOUVER
        if (data.transcricaoBruta) {
            fullTranscriptRef.current = data.transcricaoBruta;
            if(data.transcricaoBruta.length > 0) {
                // Atribuindo 'pessoa1' como role padrão para a transcrição bruta salva, para simplificar a renderização
                setTranscript([{ role: 'pessoa1', text: data.transcricaoBruta }]); 
            }
        }
        if (data.iaDadosEstruturados) {
            try {
                const resumoParsed = JSON.parse(data.iaDadosEstruturados);
                setResumo(resumoParsed);
            } catch (e) { console.warn("Erro ao parsear resumo JSON", e); }
        }
        if (data.anamneseFormatada) { // O Documento final
            setDocumentoFinal(data.anamneseFormatada);
            setTimeout(() => prontuarioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
        }
      } else {
        setPacienteData({ nome: "Erro ao carregar", idade: 0, sexo: "-", cpf: "-" });
      }
    } catch {
      setPacienteData({ nome: "Erro de conexão", idade: 0, sexo: "-", cpf: "-" });
    }
  };

  const handleHomeClick = () => {
    if (isRecording || transcript.length > 0) setShowExitModal(true);
    else router.push('/');
  };

  const confirmExit = () => { stopRecording(); router.push('/'); };
  const toggleRecording = async () => { isRecording ? stopRecording() : await startRecording(); };

  const startRecording = async () => {
    try {
      const token = localStorage.getItem('medic_token');
      const baseUrl = BASE_URL;
      const tokenRes = await fetch(`${baseUrl}/consultas/deepgram-token`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (tokenRes.status === 403 || tokenRes.status === 401) { handleAuthError(); return; }
      const apiKey = await tokenRes.text();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      setActiveStream(stream);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "pt-BR",
        smart_format: true,
        diarize: true, // DEIXANDO A DIARIZAÇÃO ATIVADA PARA IDENTIFICAR PESSOA 1 E 2
        endpointing: 300, 
        interim_results: false, 
      });
      deepgramConnectionRef.current = connection as unknown as { finish: () => void; send: (data: Blob | string) => void };
      connection.on(LiveTranscriptionEvents.Open, () => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            connection.send(e.data);
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);

        keepAliveRef.current = setInterval(() => {
          try {
            deepgramConnectionRef.current?.send(JSON.stringify({ type: "KeepAlive" }));
          } catch { /* ignora */ }
        }, 8000);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data: DeepgramResponse) => {
        if (!data.channel?.alternatives?.[0]) return;
        const sentence = data.channel.alternatives[0];
        if (sentence.transcript) {
          // Alterando a lógica: Identificando os locutores como "pessoa1", "pessoa2", etc.
          // Fallback para 'pessoa1' se a Deepgram não retornar um speaker.
          const speakerNum = sentence.words?.[0]?.speaker ?? 0;
          const role = `pessoa${speakerNum + 1}`; 

          fullTranscriptRef.current += " " + sentence.transcript;
          setTranscript(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === role)
              return [...prev.slice(0, -1), { role, text: last.text + " " + sentence.transcript }];
            return [...prev, { role, text: sentence.transcript! }];
          });
        }
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error("[DEEPGRAM] Erro no WebSocket:", err);
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.warn("[DEEPGRAM] Conexão WebSocket fechada.");
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      });

      setIsRecording(true);
    } catch (e) {
      console.error(e);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      alert("Erro ao iniciar. Verifique microfone.");
    }
  };

  const stopRecording = () => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    deepgramConnectionRef.current?.finish();
    deepgramConnectionRef.current = null;
    streamRef.current = null;
    setActiveStream(null);
    setIsRecording(false);
    salvarRascunho(); 
  };

  const gerarProntuario = async () => {
    if (documentoFinal) return; // Trava contra duplo clique

    if (!fullTranscriptRef.current || fullTranscriptRef.current.length < 10)
      return alert("Grave uma consulta primeiro.");
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('medic_token');
      const payload = { textoTranscrito: fullTranscriptRef.current, resumoPreliminar: { ...resumo, habitos: [] } };
      let documentoGerado = "";
      
      try {
        const res = await fetch(`${API_URL}/${consultaId}/gerar-documento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        
        if (res.status === 403 || res.status === 401) { handleAuthError(); return; }
        if (res.status === 400) { alert("Prontuário já gerado."); return; } 
        
        if (res.ok) { 
            const data = await res.json(); 
            documentoGerado = data.documento; 
        }
      } catch { console.warn("Backend offline."); }

      if (!documentoGerado) {
        await new Promise(r => setTimeout(r, 2000));
        documentoGerado = `ERRO: Não foi possível conectar ao servidor de IA.\n\nTranscrição salva:\n${fullTranscriptRef.current}`;
      }
      
      setDocumentoFinal(documentoGerado);
      setTimeout(() => prontuarioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar consulta.");
    } finally {
      setIsProcessing(false);
    }
  };

  const salvarEAssinarProntuario = async () => {
      if (!documentoFinal) return;
      setIsSavingFinal(true);

      try {
          const token = localStorage.getItem('medic_token');
          const res = await fetch(`${API_URL}/${consultaId}/finalizar`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
              body: JSON.stringify({ documentoFinal: documentoFinal })
          });

          if (res.status === 403 || res.status === 401) { handleAuthError(); return; }

          if (res.ok) {
              alert("Prontuário salvo e finalizado com sucesso!");
              router.push('/'); 
          } else {
              alert("Erro ao salvar o prontuário.");
          }
      } catch (e) {
          console.error(e);
          alert("Erro de conexão.");
      } finally {
          setIsSavingFinal(false);
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] font-sans text-slate-800 selection:bg-[#0fc679]/30">
      <Sidebar active="record" onHomeClick={handleHomeClick} />

      <main className="flex-1 flex flex-col h-full relative z-10 pl-[120px] pr-8 py-6 overflow-y-auto custom-scrollbar scroll-smooth">

        {/* HEADER */}
        <header className="flex justify-between items-center h-16 shrink-0 mb-6">
          <div className="flex items-center gap-4 text-2xl font-bold tracking-tight">
            <span className="text-slate-700 ml-1">Nexmed</span>
            {isFinalizada && (
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full flex items-center gap-1">
                <Lock size={12} /> Prontuário Fechado
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700">Olá, {medicoNome}</p>
              <p className="text-xs text-slate-400">Médico</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#00c985]/10 flex items-center justify-center text-[#00c985]">
              <User size={20} />
            </div>
          </div>
        </header>

        {/* BARRA DE PACIENTE */}
        <div className="shrink-0 mb-6">
          <div className="bg-white text-slate-500 rounded-full px-6 py-3 flex justify-between items-center shadow-sm border border-slate-200 min-h-[50px]">
            {pacienteData ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-700 text-base">{pacienteData.nome}</span>
                <span className="text-slate-300">|</span>
                <span>{pacienteData.idade ? pacienteData.idade + " Anos" : "Idade N/A"}</span>
                <span className="text-slate-300">|</span>
                <span>{pacienteData.sexo || "Sexo N/A"}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{pacienteData.cpf}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Carregando dados do paciente...
              </span>
            )}
          </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px] shrink-0 pb-4">

          {/* COLUNA 1: DADOS */}
          <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
              <h3 className="text-slate-500 text-[16px] font-medium mb-4 ml-1 shrink-0">Resumo do prontuário</h3>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                <Accordion title="Queixa principal" isOpen>
                  <div className="flex flex-wrap gap-2">
                    {resumo.queixaPrincipal.length === 0 ? <Tag text="Aguardando dados..." /> : resumo.queixaPrincipal.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="História da doença atual" isOpen>
                  <div className="flex flex-wrap gap-2">
                    {resumo.hda.length === 0 ? <Tag text="Aguardando dados..." /> : resumo.hda.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="Sintomas associados">
                  <div className="flex flex-wrap gap-2">
                    {resumo.sintomasAssociados.length === 0 ? <Tag text="Nenhum relatado" /> : resumo.sintomasAssociados.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="Antecedentes pessoais">
                  <div className="flex flex-wrap gap-2">
                    {resumo.antecedentesPessoais.length === 0 ? <Tag text="Nenhum relatado" /> : resumo.antecedentesPessoais.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="Antecedentes familiares">
                  <div className="flex flex-wrap gap-2">
                    {resumo.antecedentesFamiliares.length === 0 ? <Tag text="Nenhum relatado" /> : resumo.antecedentesFamiliares.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="Medicamentos em uso">
                  <div className="flex flex-wrap gap-2">
                    {resumo.medicamentosEmUso.length === 0 ? <Tag text="Nenhum relatado" /> : resumo.medicamentosEmUso.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
                <Accordion title="Alergias">
                  <div className="flex flex-wrap gap-2">
                    {resumo.alergias.length === 0 ? <Tag text="Nenhuma relatada" /> : resumo.alergias.map((tag, idx) => <Tag key={idx} text={tag} />)}
                  </div>
                </Accordion>
              </div>
            </div>
          </div>

          {/* COLUNA 2: CENTRAL */}
          <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden relative">
            <div className="flex flex-col items-center justify-center shrink-0 pt-0 pb-2 z-10">
              <span className="text-slate-600 text-[15px] font-medium mb-3">
                {isFinalizada ? "Consulta Finalizada" : (isRecording ? "Escutando" : (isProcessing ? "Processando..." : "Iniciar Atendimento"))}
              </span>
              <button
                onClick={toggleRecording}
                disabled={isProcessing || isFinalizada}
                className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md border overflow-hidden
                  ${isFinalizada ? 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200 shadow-none' :
                    (isRecording ? 'bg-white shadow-slate-200 border-slate-200 scale-105' : 'bg-white border-slate-200 hover:bg-slate-50')}`}
              >
                {isProcessing ? (
                  <Loader2 size={24} className="text-slate-400 animate-spin" />
                ) : isRecording ? (
                  <>
                    <AudioVisualizer stream={activeStream} />
                    <Pause size={24} className="text-slate-500 fill-current relative z-10" />
                  </>
                ) : (
                  <Mic size={24} strokeWidth={2} className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Transcrição */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col overflow-hidden relative">
              <h3 className="text-slate-500 font-medium mb-4 text-[15px] flex justify-between shrink-0">
                Transcrição da consulta
                {isRecording && (
                  <span className="text-[#0fc679] text-xs font-bold animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0fc679]" /> Ao vivo
                  </span>
                )}
              </h3>
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-1 relative mb-16">
                {transcript.length === 0 && !isRecording && (
                  <p className="text-slate-400 italic text-sm text-center mt-10">A transcrição aparecerá aqui em tempo real.</p>
                )}
                {transcript.map((t, i) => <ChatMessage key={i} role={t.role} text={t.text} />)}
                {isRecording && (
                  <div className="flex gap-1 justify-center mt-4">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6 pointer-events-none">
                <div className="pointer-events-auto flex gap-3 p-1.5 bg-white/90 backdrop-blur rounded-full border border-slate-100 shadow-xl">
                  <button
                    onClick={gerarProntuario}
                    disabled={isRecording || isProcessing || !!documentoFinal || transcript.length === 0}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all flex items-center gap-2 shadow-sm
                      ${(!!documentoFinal) 
                        ? 'bg-slate-100 text-emerald-600 border border-emerald-200 cursor-default' 
                        : (isRecording || isProcessing || transcript.length === 0) 
                          ? 'bg-slate-100 text-slate-400' 
                          : 'bg-[#0fc679] hover:bg-[#0ba765] text-white'}`}
                  >
                    {!!documentoFinal ? <><CheckCircle size={14}/> Prontuário Gerado</> : 
                     isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {!documentoFinal && "Gerar prontuário"}
                  </button>
                  <button
                    disabled={isRecording || isProcessing || transcript.length === 0}
                    className={`px-5 py-2.5 rounded-full font-bold text-xs transition-all flex items-center gap-2 shadow-sm
                      ${(isRecording || isProcessing || transcript.length === 0) ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:text-[#0fc679] hover:border-[#0fc679]'}`}
                  >
                    <ClipboardList size={14} />
                    Pedir Exames
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* COLUNA 3: COPILOTO IA */}
          <div className="col-span-3 flex flex-col gap-3 h-full overflow-hidden">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-slate-500 text-[16px] font-medium flex items-center gap-2">
                  <Brain size={18} className="text-[#0fc679]" />
                  Copiloto IA
                </h3>
                {copilotoLoading && <Loader2 size={14} className="animate-spin text-[#0fc679]" />}
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {!copiloto && !copilotoLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <Brain size={32} className="text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm">O copiloto analisará a consulta em tempo real e sugerirá diagnósticos e perguntas.</p>
                    <p className="text-slate-300 text-xs mt-2">Inicie a gravação para ativar.</p>
                  </div>
                )}

                {copiloto && (
                  <>
                    {copiloto.perguntasSugeridas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <HelpCircle size={13} className="text-amber-500" />
                          Perguntas sugeridas
                        </h4>
                        <div className="space-y-2">
                          {copiloto.perguntasSugeridas.map((p, i) => (
                            <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-[13px] text-amber-800 leading-relaxed">
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {copiloto.hipotesesDiagnosticas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-blue-500" />
                          Hipóteses diagnósticas
                        </h4>
                        <div className="space-y-2">
                          {copiloto.hipotesesDiagnosticas.map((h, i) => (
                            <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-[13px] text-blue-800 leading-relaxed flex items-start gap-2">
                              <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PRONTUÁRIO EDITÁVEL */}
        {documentoFinal && (
          <div ref={prontuarioSectionRef} className="w-full mt-10 mb-20 animate-in fade-in slide-in-from-bottom-10 border-t border-slate-200 pt-10">
            <div className="flex justify-between items-center mb-6 px-4">
              <h2 className="text-2xl font-bold text-slate-700 flex items-center gap-3">
                <FileText className="text-[#0fc679]" size={28} /> Prontuário Médico
              </h2>
              <div className="flex gap-3">
                {!isFinalizada && (
                  <button onClick={() => setDocumentoFinal(null)} className="flex items-center gap-2 text-slate-500 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-white transition text-sm font-medium border border-transparent hover:border-slate-200">
                    <X size={16} /> Cancelar
                  </button>
                )}
                <button className="flex items-center gap-2 text-slate-500 hover:text-[#0fc679] px-4 py-2 rounded-lg hover:bg-white transition text-sm font-medium border border-transparent hover:border-slate-200">
                  <Printer size={16} /> Imprimir
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('medic_token');
                      const res = await fetch(`${API_URL}/${consultaId}/download-pdf`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                      });
                      if (res.status === 401 || res.status === 403) { handleAuthError(); return; }
                      if (!res.ok) { alert("Erro ao gerar PDF."); return; }
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `prontuario_consulta_${consultaId}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } catch { alert("Erro de conexão ao baixar PDF."); }
                  }}
                  className="flex items-center gap-2 text-slate-500 hover:text-[#0fc679] px-4 py-2 rounded-lg hover:bg-white transition text-sm font-medium border border-transparent hover:border-slate-200"
                >
                  <Download size={16} /> Baixar PDF
                </button>
                {!isFinalizada && (
                  <button 
                    onClick={salvarEAssinarProntuario}
                    disabled={isSavingFinal}
                    className="flex items-center gap-2 bg-[#0fc679] text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-[#0ba765] transition"
                  >
                    {isSavingFinal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSavingFinal ? 'Salvando...' : 'Salvar e Assinar'}
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto overflow-hidden">
              <textarea
                ref={textareaRef}
                value={documentoFinal}
                readOnly={isFinalizada}
                onChange={(e) => setDocumentoFinal(e.target.value)}
                className={`w-full min-h-[800px] p-12 text-slate-800 text-[15px] leading-loose resize-none focus:outline-none font-serif placeholder:text-slate-300 ${isFinalizada ? 'bg-slate-50/30' : 'bg-white'}`}
                placeholder="O prontuário gerado aparecerá aqui..."
                spellCheck={false}
              />
              <div className="bg-slate-50 px-10 py-4 border-t border-slate-100 flex justify-between items-center opacity-90">
                <p className="text-xs text-slate-400">Gerado automaticamente por Nexmed AI • Revisão necessária</p>
                <span className="text-xs text-slate-400 font-mono">Página 1 de 1</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE SAÍDA */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle size={28} />
              <h3 className="font-bold text-lg text-slate-800">Sair da Consulta?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Você tem uma consulta em andamento. Se sair agora, a gravação será interrompida e os dados não salvos poderão ser perdidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmExit} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold shadow-md">Sim, Sair</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

// --- SUB-COMPONENTES ---

const Accordion = ({ title, isOpen = false, children }: AccordionProps) => {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden transition-all hover:border-slate-300">
      <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-3.5 flex justify-between items-center transition">
        <span className="text-[14.5px] font-medium text-[#0fc679]">{title}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180 text-[#0fc679]' : 'text-slate-300'}`} />
      </button>
      {open && children && (
        <div className="px-4 pb-4 pt-0">{children}</div>
      )}
    </div>
  );
};

const Tag = ({ text, removable }: TagProps) => (
  <div className="inline-flex items-center gap-1.5 bg-[#f0fdf4] text-[#059669] px-3 py-1.5 rounded-full text-[13px] font-medium">
    {text}
    {removable && (
      <span className="cursor-pointer text-[#059669]/50 hover:text-[#059669] bg-white rounded-full p-0.5 shadow-sm">
        <X size={12} strokeWidth={3} />
      </span>
    )}
  </div>
);

// MUDANÇA AQUI NO CHAT MESSAGE
const ChatMessage = ({ role, text }: ChatMessageProps) => {
  // Determinando a cor e o rótulo com base no papel da pessoa
  let roleColorClass = 'text-slate-400';
  let roleLabel = 'Pessoa:';
  let textColorClass = 'text-slate-500';

  if (role === 'pessoa1') {
      roleColorClass = 'text-[#0fc679]';
      roleLabel = 'Pessoa 1:';
      textColorClass = 'text-[#0fc679]/90';
  } else if (role === 'pessoa2') {
      roleColorClass = 'text-[#38bdf8]'; // Azul para diferenciar
      roleLabel = 'Pessoa 2:';
      textColorClass = 'text-slate-600';
  } else {
      // Caso apareça pessoa 3, 4, etc.
      roleColorClass = 'text-amber-500';
      roleLabel = `${role.replace('pessoa', 'Pessoa ')}:`;
      textColorClass = 'text-slate-600';
  }

  return (
    <div className="mb-1 text-[14px] animate-in fade-in slide-in-from-bottom-2 flex gap-1">
      <span className={`font-bold whitespace-nowrap ${roleColorClass}`}>
        {roleLabel}
      </span>
      <span className={textColorClass}>{text}</span>
    </div>
  );
};

