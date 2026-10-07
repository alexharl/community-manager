import nodemailer from 'nodemailer';

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
}

/** TLS ergibt sich aus dem Port: 465 = implizites TLS, sonst STARTTLS, sofern angeboten (Entscheidung A7). */
export function createTransport({ host, port, user, pass }: SmtpSettings) {
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
}
