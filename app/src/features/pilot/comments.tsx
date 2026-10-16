"use client";
import type { FormEvent } from "react";
import type { SharedAgreement } from "./model";
export function AgreementComments({ agreement, writable, reviewer, busy, onSubmit }: { agreement: SharedAgreement; writable: boolean; reviewer: boolean; busy: boolean; onSubmit: (id: string, text: string, kind: string) => Promise<boolean> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (await onSubmit(agreement.id, String(data.get("comment") ?? ""), String(data.get("kind") ?? "Note"))) form.reset();
  }
  return <details><summary>Comentarios y correcciones ({agreement.comments?.length ?? 0})</summary>
    <ol>{agreement.comments?.map(comment => <li key={comment.id}><strong>{comment.kind === "ChangesRequested" ? "Corrección solicitada" : "Comentario"}</strong> · {comment.actor} · <time dateTime={comment.at}>{new Date(comment.at).toLocaleString("es-AR")}</time><p className="pilot-notes">{comment.text}</p></li>)}</ol>
    {writable && <form onSubmit={submit}><fieldset disabled={busy}><legend>Agregar comentario a {agreement.title}</legend>
      <label htmlFor={`comment-${agreement.id}`}>Comentario para {agreement.title}</label><textarea id={`comment-${agreement.id}`} name="comment" required maxLength={2000} />
      <label htmlFor={`kind-${agreement.id}`}>Tipo de comentario para {agreement.title}</label><select id={`kind-${agreement.id}`} name="kind"><option value="Note">Comentario</option>{reviewer && <option value="ChangesRequested">Pedir corrección (vuelve a borrador)</option>}</select>
      <button type="submit">Enviar comentario</button>
    </fieldset></form>}
  </details>;
}
