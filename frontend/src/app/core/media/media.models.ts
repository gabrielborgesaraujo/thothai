/** Resposta do upload de mídia (RF03). */
export interface MediaResponse {
  url: string;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
}

/** Item da listagem de mídias para a gestão no painel. */
export interface MediaSummary {
  id: string;
  url: string;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  createdAt: string | null;
}
