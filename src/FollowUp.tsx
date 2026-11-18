import "./estilos/followup.css";

export interface FollowUpEvent {
  date: string;
  author?: string;
  text: string;
  notice?: string;
}

export interface FollowUpField {
  label: string;
  value?: string;
}

export interface FollowUpData {
  title?: string;
  reference: string;
  client: string;
  clientRef?: string;
  date?: string;
  status?: string;
  origin: { name: string; code?: string; date?: string };
  destination: { name: string; code?: string; date?: string };
  vessel?: string;
  fields: FollowUpField[];
  events: FollowUpEvent[];
}

interface Props {
  data: FollowUpData;
  logoSrc?: string;
}

export default function FollowUp({ data, logoSrc }: Props) {
  const { origin, destination } = data;

  return (
    <div className="fu">
      <div className="fu__sheet">
        <header className="fu__card fu__head">
          <div>
            {logoSrc ? <img className="fu__logo" src={logoSrc} alt="Conline" /> : <span className="fu__wordmark">conline</span>}
            <h1 className="fu__title">{data.title ?? "Follow-up · Importação marítima"}</h1>
          </div>

          <dl className="fu__meta">
            <dt>Referência</dt>
            <dd>{data.reference}</dd>
            <dt>Cliente</dt>
            <dd>{data.client}</dd>
            {data.clientRef ? (
              <>
                <dt>Ref. cliente</dt>
                <dd>{data.clientRef}</dd>
              </>
            ) : null}
            {data.date ? (
              <>
                <dt>Data</dt>
                <dd>{data.date}</dd>
              </>
            ) : null}
          </dl>
        </header>

        <section className="fu__card">
          <div className="fu__route">
            <div>
              <div className="fu__port-label">Origem</div>
              <div className="fu__port-name">{origin.name}</div>
              {origin.code ? <div className="fu__port-code">{origin.code}</div> : null}
              {origin.date ? <span className="fu__port-date">{origin.date}</span> : null}
            </div>

            <div className="fu__line" aria-hidden="true">
              {data.vessel ? <span>{data.vessel}</span> : null}
            </div>

            <div className="fu__port--end">
              <div className="fu__port-label">Destino</div>
              <div className="fu__port-name">{destination.name}</div>
              {destination.code ? <div className="fu__port-code">{destination.code}</div> : null}
              {destination.date ? <span className="fu__port-date">{destination.date}</span> : null}
            </div>
          </div>



          {data.fields.length ? (
            <div className="fu__grid">
              {data.fields.map((campo) => (
                <div className="fu__field" key={campo.label}>
                  <span className="fu__field-label">{campo.label}</span>
                  <span className="fu__field-value">{campo.value || "—"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="fu__card">
          <h2 className="fu__section-title">Acompanhamentos</h2>
          {data.events.length ? (
            <ol className="fu__timeline">
              {data.events.map((evento, indice) => (
                <li key={`${evento.date}-${indice}`} className={`fu__event${indice === 0 ? " fu__event--latest" : ""}`}>
                  <span className="fu__dot" />
                  <div className="fu__event-head">
                    <span className="fu__event-date">{evento.date}</span>
                  </div>
                  {evento.text ? <p className="fu__event-text">{evento.text}</p> : null}
                  {evento.notice ? <p className="fu__notice">{evento.notice}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="fu__vazio">Nenhum acompanhamento neste processo.</p>
          )}
        </section>

        <p className="fu__foot">
          Conline · Acompanhamento de {(data.title ?? "Follow-up · Importação marítima").replace(/^Follow-up · /i, "").toLowerCase()}
        </p>
      </div>
    </div>
  );
}
