import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { Post, PostRequest, PostSummary, PublicPost } from './post.models';

/**
 * Acesso às postagens (RF02 admin e RF06 público) sobre o [ApiService], que já prefixa `/api` e
 * envia o cookie de sessão. Os GET públicos são acessíveis sem autenticação.
 */
@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly api = inject(ApiService);

  // --- Painel administrativo (RF02) ---
  listAdmin(): Observable<PostSummary[]> {
    return this.api.get<PostSummary[]>('/admin/posts');
  }

  getAdmin(id: string): Observable<Post> {
    return this.api.get<Post>(`/admin/posts/${id}`);
  }

  create(request: PostRequest): Observable<Post> {
    return this.api.post<Post>('/admin/posts', request);
  }

  update(id: string, request: PostRequest): Observable<Post> {
    return this.api.put<Post>(`/admin/posts/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/posts/${id}`);
  }

  // --- Portal público (RF06) ---
  listPublished(): Observable<PostSummary[]> {
    return this.api.get<PostSummary[]>('/posts');
  }

  getPublished(slug: string): Observable<PublicPost> {
    return this.api.get<PublicPost>(`/posts/${slug}`);
  }
}
