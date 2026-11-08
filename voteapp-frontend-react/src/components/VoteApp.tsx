import ProgrammingLanguage from "./ProgrammingLanguage";
import "bootstrap/dist/css/bootstrap.min.css";

// Everything below the languages grid is driven by window._env_.SITE,
// which is supplied at runtime from /env-config.js (a Kubernetes ConfigMap).
// Defaults keep the page working if SITE is missing.
const DEFAULTS = {
  title: "Language Vote App",
  owner: "",
  tagline: "",
  footer: "© CloudAcademy ❤",
  sections: [] as { title: string; items: { name: string; logo?: string; note?: string }[] }[],
};

function VoteApp() {
  const site = { ...DEFAULTS, ...(window._env_?.SITE ?? {}) };

  return (
    <main role="main">
      <div className="jumbotron">
        <div className="container">
          <h1 className="display-4">{site.title}</h1>
          {site.owner && <p className="lead mb-1">{site.owner}</p>}
          {site.tagline && <p className="text-muted mb-2">{site.tagline}</p>}
        </div>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <ProgrammingLanguage id="csharp" logo="csharp.jpg" />
          </div>
          <div className="col-md-4">
            <ProgrammingLanguage id="python" logo="python.png" />
          </div>
          <div className="col-md-4">
            <ProgrammingLanguage id="javascript" logo="javascript.png" />
          </div>
        </div>
        <hr></hr>
        <div className="row">
          <div className="col-md-4">
            <ProgrammingLanguage id="go" logo="go.png" />
          </div>
          <div className="col-md-4">
            <ProgrammingLanguage id="java" logo="java.png" />
          </div>
          <div className="col-md-4">
            <ProgrammingLanguage id="nodejs" logo="nodejs.png" />
          </div>
        </div>

        {site.sections.map((section) => (
          <section key={section.title} className="mt-5">
            <h2 className="h5 text-uppercase text-muted border-bottom pb-2 mb-3">
              {section.title}
            </h2>
            <div className="d-flex flex-wrap gap-2">
              {section.items.map((item) => (
                <span
                  key={item.name}
                  className="d-inline-flex align-items-center gap-2 border rounded-pill px-3 py-2 bg-white shadow-sm"
                  title={item.note ?? item.name}
                >
                  {item.logo && (
                    <img
                      src={`./img/logos/${item.logo}`}
                      alt=""
                      height={22}
                      width={22}
                    />
                  )}
                  <span className="small fw-semibold">{item.name}</span>
                </span>
              ))}
            </div>
          </section>
        ))}

        <footer className="text-center text-muted small my-5">{site.footer}</footer>
      </div>
    </main>
  );
}

// export VoteApp - allows the ReactDOM.render within the index.js file to use it
export default VoteApp;

