// WebGL antes de criar o jogo (ADR-0004 §6). O render depende do tint, que no
// Phaser 4 é só WebGL, e o jogo é criado com type: WEBGL; sem contexto, o
// Phaser lançaria erro no boot e a página ficaria vazia. O teste usa o mesmo
// contexto 'webgl' que o renderer pede e o libera em seguida (o iOS limita os
// contextos ativos).
export function suportaWebGL(doc: Document): boolean {
  try {
    const gl = doc.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
