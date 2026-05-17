type BlogEditorFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initialData?: {
    title?: string | null;
    summary?: string | null;
    content?: string | null;
    coverImage?: string | null;
    status?: "rascunho" | "publicado" | null;
  };
};

export function BlogEditorForm({
  title,
  description,
  action,
  submitLabel,
  initialData,
}: BlogEditorFormProps) {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-mar-escuro">{title}</h1>
        <p className="text-sm text-mar-escuro/60 mt-2">{description}</p>
      </div>

      <form action={action} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initialData?.title ?? ""}
            className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            placeholder="Título da publicação"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Resumo
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={initialData?.summary ?? ""}
            className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm resize-none focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            placeholder="Resumo curto para listagens e destaque"
          />
        </div>

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
          <label htmlFor="content" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Conteúdo
          </label>
          <textarea
            id="content"
            name="content"
            rows={18}
            required
            defaultValue={initialData?.content ?? ""}
            className="w-full px-4 py-3 border border-mar-areia/50 rounded-lg text-sm resize-y focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
            placeholder="Escreva o conteúdo da publicação"
          />
        </div>

        <div className="max-w-xs">
          <label htmlFor="status" className="block text-sm font-medium text-mar-escuro mb-1.5">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initialData?.status ?? "rascunho"}
            className="w-full px-4 py-2.5 border border-mar-areia/50 rounded-lg text-sm bg-white focus:outline-none focus:border-mar-azul focus:ring-1 focus:ring-mar-azul"
          >
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
          </select>
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
