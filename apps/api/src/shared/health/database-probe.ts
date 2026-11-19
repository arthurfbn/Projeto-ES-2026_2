/** Porta: verifica se o banco responde. */
export interface DatabaseProbe {
  isUp(): Promise<boolean>
}
