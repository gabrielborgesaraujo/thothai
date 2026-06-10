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
  altText: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: string | null;
}

/** Atualização dos metadados editáveis de uma mídia. */
export interface MediaUpdateRequest {
  altText: string | null;
  description: string | null;
  tags: string[];
}

/** Região de corte em pixels, no espaço da imagem já rotacionada. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Edição aplicada no servidor (rotação → corte → redimensionamento); gera uma nova mídia. */
export interface MediaEditRequest {
  rotate: number;
  crop: CropRect | null;
  targetWidth: number | null;
}
