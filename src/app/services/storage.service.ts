import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'qr_generator_state';

  constructor() {}

  /**
   * Salva o estado completo da aplicação no LocalStorage.
   */
  public saveState(state: any): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Não foi possível salvar o estado no LocalStorage:', e);
    }
  }

  /**
   * Recupera o estado salvo do LocalStorage. Retorna null se não houver estado.
   */
  public loadState(): any | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Não foi possível carregar o estado do LocalStorage:', e);
      return null;
    }
  }

  /**
   * Limpa o estado salvo no LocalStorage.
   */
  public clearState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Não foi possível limpar o estado no LocalStorage:', e);
    }
  }
}
