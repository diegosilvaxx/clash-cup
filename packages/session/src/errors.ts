import axios from 'axios';

export class SessionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function getSessionError(error: unknown): string {
  if (error instanceof SessionError) return error.message;
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'configuration-missing': 'O login ainda não está configurado neste ambiente.',
    'auth/invalid-credential': 'Email ou senha inválidos.',
    'auth/user-not-found': 'Email ou senha inválidos.',
    'auth/wrong-password': 'Email ou senha inválidos.',
    'auth/invalid-email': 'Informe um email válido.',
    'auth/email-already-in-use':
      'Não foi possível criar a conta com esse email. Tente entrar na sua conta.',
    'auth/weak-password': 'A senha não atende aos requisitos da conta.',
    'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos da conta.',
    'auth/popup-blocked': 'Permita a abertura da janela de login no navegador e tente novamente.',
    'auth/popup-closed-by-user': 'O login foi cancelado. Você pode tentar novamente.',
    'auth/cancelled-popup-request': 'Já existe uma janela de login aberta.',
    'auth/account-exists-with-different-credential':
      'Use o método de login já associado ao seu email.',
    'auth/operation-not-allowed': 'Esse método de login ainda não está habilitado.',
    'auth/unauthorized-domain': 'O endereço do portal ainda não está autorizado para login.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
    'auth/network-request-failed':
      'Não foi possível conectar. Confira sua internet e tente novamente.',
    'auth/user-disabled': 'Essa conta está desativada.',
  };
  if (messages[code]) return messages[code];
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403)
      return 'Não foi possível acessar os dados da sua conta. Entre em contato com o suporte.';
    if (error.response?.status === 404) return 'Jogador não encontrado. Confira a tag informada.';
    if (error.response?.status === 503)
      return 'A consulta de jogadores está temporariamente indisponível. Tente novamente mais tarde.';
    if (error.response?.status === 429)
      return 'Limite de consultas atingido. Tente novamente mais tarde.';
    return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
