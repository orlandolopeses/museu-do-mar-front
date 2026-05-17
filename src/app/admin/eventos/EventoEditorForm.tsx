type EventoEditorFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  institutions: Array<{
    id: string;
    nome: string;
    ativo: boolean;
  }>;
  initialData?: {
    titulo?: string | null;
    descricao?: string | null;
    instituicaoId?: string | null;
    local?: string | null;
    categoria?: string | null;
    coverImage?: string | null;
    linkExterno?: string | null;
    dataInicio?: Date | string | null;
    dataFim?: Date | string | null;
    publicado?: boolean | null;
  };
};

function toDateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventoEditorForm({
  title,
  description,
  action,
  submitLabel,
  institutions,
  initialData,
}: EventoEditorFormProps) {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">{title}</h1>
        <p className="text-sm text-mar-escuro/60 mt-2">{description}</p>
      </div>

      <form action={action} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Título
            </label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              required
              defaultValue={initialData?.titulo ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Nome do evento"
            />
          </div>

          <div>
            <label htmlFor="publicado" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Status
            </label>
            <select
              id="publicado"
              name="publicado"
              defaultValue={initialData?.publicado ? "publicado" : "rascunho"}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm bg-white focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            >
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={6}
            defaultValue={initialData?.descricao ?? ""}
            className="w-full px-4 py-3 border border-mar-areia/50 rounded-lg text-sm resize-y focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            placeholder="Detalhes do evento, programação e contexto"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Data e hora de início
            </label>
            <input
              id="dataInicio"
              name="dataInicio"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(initialData?.dataInicio)}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            />
          </div>

          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Data e hora de término
            </label>
            <input
              id="dataFim"
              name="dataFim"
              type="datetime-local"
              defaultValue={toDateTimeLocal(initialData?.dataFim)}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="instituicaoId" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Instituição relacionada
            </label>
            <select
              id="instituicaoId"
              name="instituicaoId"
              defaultValue={initialData?.instituicaoId ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm bg-white focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            >
              <option value="">Sem instituição vinculada</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.nome}{institution.ativo ? "" : " (inativa)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="local" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Local
            </label>
            <input
              id="local"
              name="local"
              type="text"
              defaultValue={initialData?.local ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Ex.: Aldeia de Perocão, Guarapari"
            />
          </div>

          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Categoria
            </label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              defaultValue={initialData?.categoria ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Oficina, exposição, roda de conversa"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="coverImage" className="block text-sm font-medium text-mar-escuro mb-1.5">
              URL da imagem de capa
            </label>
            <input
              id="coverImage"
              name="coverImage"
              type="url"
              defaultValue={initialData?.coverImage ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="linkExterno" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Link externo
            </label>
            <input
              id="linkExterno"
              name="linkExterno"
              type="url"
              defaultValue={initialData?.linkExterno ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
