/**
 * 項目ID用のランダム文字列。
 * crypto.randomUUID は安全なコンテキスト限定。スマホから http で LAN 接続すると使えない、から避ける。
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
