/** Resposta do upload de mídia (RF03). */
export interface MediaResponse {
  url: string;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
}
