export type DadosRecuperacaoSenha = {
  to: string;
  nome: string;
  resetUrl: string;
};

export interface EnviadorRecuperacaoSenha {
  enviar(data: DadosRecuperacaoSenha): Promise<void>;
}

export function criarEnviadorRecuperacaoSenha(): EnviadorRecuperacaoSenha {
  return {
    async enviar(data) {
      const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
      const from = process.env.EMAIL_FROM || "Agendaqui <nao-responda@agendaqui.local>";
      const subject = "Redefinicao de senha do Agendaqui";
      const text = [
        `Ola, ${data.nome}.`,
        "",
        "Use o link abaixo para redefinir sua senha:",
        data.resetUrl,
        "",
        "Se voce nao solicitou esta alteracao, ignore esta mensagem."
      ].join("\n");

      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            from,
            to: data.to,
            subject,
            text
          })
        });

        if (!response.ok) {
          throw new Error("Falha ao enviar e-mail de recuperacao de senha.");
        }

        return;
      }

      console.info("Link de recuperacao de senha gerado para desenvolvimento local:");
      console.info(`Destinatario: ${data.to}`);
      console.info(data.resetUrl);
    }
  };
}
