type AcervoTipo = "foto" | "video" | "audio" | "documento";

type AcervoEditorFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initialData?: {
    tipo?: AcervoTipo | null;
    titulo?: string | null;
    descricao?: string | null;
    url?: string | null;
    thumbUrl?: string | null;
    tags?: string | null;
    colecao?: string | null;
    autor?: string | null;
    ano?: number | null;
    publicado?: boolean | null;
  };
};

export function AcervoEditorForm({
  title,
  description,
  action,
  submitLabel,
  initialData,
}: AcervoEditorFormProps) {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">{title}</h1>
        <p className="text-sm text-mar-escuro/60 mt-2">{description}</p>
      </div>

      <form action={action} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={initialData?.tipo ?? "foto"}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm bg-white focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            >
              <option value="foto">Foto</option>
              <option value="video">Vídeo</option>
              <option value="audio">Áudio</option>
              <option value="documento">Documento</option>
            </select>
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
            placeholder="Nome do item do acervo"
          />
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
            placeholder="Contexto, história e observações sobre o item"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-mar-escuro mb-1.5">
              URL do arquivo
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              defaultValue={initialData?.url ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="thumbUrl" className="block text-sm font-medium text-mar-escuro mb-1.5">
              URL da miniatura
            </label>
            <input
              id="thumbUrl"
              name="thumbUrl"
              type="url"
              defaultValue={initialData?.thumbUrl ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="colecao" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Coleção
            </label>
            <input
              id="colecao"
              name="colecao"
              type="text"
              defaultValue={initialData?.colecao ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Ex.: Memórias da pesca"
            />
          </div>

          <div>
            <label htmlFor="autor" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Autor / origem
            </label>
            <input
              id="autor"
              name="autor"
              type="text"
              defaultValue={initialData?.autor ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="Pessoa, família ou instituição"
            />
          </div>

          <div>
            <label htmlFor="ano" className="block text-sm font-medium text-mar-escuro mb-1.5">
              Ano
            </label>
            <input
              id="ano"
              name="ano"
              type="number"
              min="0"
              defaultValue={initialData?.ano ?? ""}
              className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
              placeholder="2024"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={initialData?.tags ?? ""}
            className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            placeholder="pesca artesanal, comunidade, território"
          />
          <p className="text-xs text-mar-escuro/45 mt-1.5">Separe as tags por vírgula.</p>
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
