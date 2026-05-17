type ActivityLink = {
  label: string;
  href: string;
};

type ClassroomActivityPlan = {
  id: string;
  turmaId: string | null;
  sourceKey: string | null;
  audienceLabel: string;
  title: string;
  summary: string;
  focus: string;
  steps: string[];
  links: ActivityLink[];
};

type TeacherTurma = {
  id: string;
  nome: string;
  institutionName: string;
  studentsCount: number;
};

type StudentTurma = {
  id: string;
  nome: string;
  institutionName: string;
  classmatesCount: number;
};

const teacherFocuses = [
  "memória local e repertório de turma",
  "observação de acervo e registro em sala",
  "preparação para agenda e mediação cultural",
];

const studentFocuses = [
  "observar o território e levantar perguntas",
  "conectar a turma com objetos, imagens e documentos",
  "preparar participação em ações do projeto",
];

export function getTeacherClassroomActivityPlans(input: {
  turmas: TeacherTurma[];
  hasUpcomingEvents: boolean;
  hasInstitutions: boolean;
}): ClassroomActivityPlan[] {
  if (input.turmas.length === 0) {
    return [
      {
        id: "teacher-empty-state",
        turmaId: null,
        sourceKey: null,
        audienceLabel: "Preparação pedagógica",
        title: "Organizar base mínima de acompanhamento",
        summary: "Antes de abrir atividades por turma, vale consolidar vínculos institucionais e responsabilidades no cadastro atual.",
        focus: input.hasInstitutions
          ? "formalizar turmas sob responsabilidade"
          : "vincular instituição e depois formalizar turmas",
        steps: [
          "Revisar o perfil e confirmar instituição vinculada.",
          "Alinhar com a gestão quais turmas devem aparecer sob sua responsabilidade.",
          "Retomar a partir do painel quando a base estiver disponível.",
        ],
        links: [
          { label: "Meu perfil", href: "/app/perfil" },
          { label: "Painel do gestor", href: "/app/gestor" },
        ],
      },
    ];
  }

  return input.turmas.slice(0, 3).map((turma, index) => ({
    id: `teacher-${turma.id}`,
    turmaId: turma.id,
    sourceKey: `teacher-plan-${index + 1}`,
    audienceLabel: turma.nome,
    title: `Ativação pedagógica para ${turma.nome}`,
    summary: `Plano curto para mobilizar ${turma.studentsCount} estudante(s) de ${turma.institutionName} em torno do Museu do Mar.`,
    focus: teacherFocuses[index % teacherFocuses.length] ?? teacherFocuses[0],
    steps: [
      "Selecionar um texto ou item do acervo para abertura da atividade.",
      input.hasUpcomingEvents
        ? "Relacionar a atividade a um evento futuro da rede para ampliar o repertório da turma."
        : "Relacionar a atividade ao contexto do território e aos vínculos já presentes na turma.",
      "Registrar devolutivas, perguntas e próximos passos após a mediação.",
    ],
    links: [
      { label: "Ver blog", href: "/blog" },
      { label: "Ver acervo", href: "/acervo" },
      { label: "Ver agenda", href: "/agenda" },
    ],
  }));
}

export function getStudentClassroomActivityPlans(input: {
  turmas: StudentTurma[];
  hasUpcomingEvents: boolean;
  hasInstitutions: boolean;
}): ClassroomActivityPlan[] {
  if (input.turmas.length === 0) {
    return [
      {
        id: "student-empty-state",
        turmaId: null,
        sourceKey: null,
        audienceLabel: "Minha participação",
        title: "Preparar entrada da turma",
        summary: "Quando sua turma estiver vinculada, esta área poderá sugerir atividades conectadas ao seu contexto de aprendizagem.",
        focus: input.hasInstitutions
          ? "aguardar ou confirmar matrícula em turma ativa"
          : "completar vínculo institucional para receber trilhas mais situadas",
        steps: [
          "Conferir seus dados de participação no perfil.",
          "Ver com a equipe ou com o professor se sua turma já foi vinculada.",
          "Enquanto isso, explorar blog, acervo e fórum.",
        ],
        links: [
          { label: "Meu perfil", href: "/app/perfil" },
          { label: "Explorar blog", href: "/blog" },
        ],
      },
    ];
  }

  return input.turmas.slice(0, 3).map((turma, index) => ({
    id: `student-${turma.id}`,
    turmaId: turma.id,
    sourceKey: `student-plan-${index + 1}`,
    audienceLabel: turma.nome,
    title: `Próxima atividade para ${turma.nome}`,
    summary: `Percurso curto para aprender com ${Math.max(turma.classmatesCount, 0)} colega(s) a partir de ${turma.institutionName}.`,
    focus: studentFocuses[index % studentFocuses.length] ?? studentFocuses[0],
    steps: [
      "Abrir um texto ou item do acervo para entrar no tema.",
      input.hasUpcomingEvents
        ? "Observar se existe evento próximo da rede e pensar como participar."
        : "Relacionar o conteúdo estudado com memórias, lugares e perguntas da turma.",
      "Levar uma descoberta, pergunta ou comentário para a conversa com colegas e professores.",
    ],
    links: [
      { label: "Ver acervo", href: "/acervo" },
      { label: "Ver fórum", href: "/forum" },
      { label: "Ver agenda", href: "/agenda" },
    ],
  }));
}

export type { ClassroomActivityPlan };
