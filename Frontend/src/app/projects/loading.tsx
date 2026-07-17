export default function ProjectsLoading() {
  return <main className="project-select-page" aria-busy="true" aria-label="กำลังโหลดโปรเจกต์">
    <section className="project-select-shell project-select-loading">
      <header className="project-select-header">
        <div className="project-loading-brand" />
        <div className="project-loading-signout" />
      </header>
      <div className="project-loading-heading">
        <span />
        <b />
        <small />
      </div>
      <div className="project-loading-grid">
        <span />
        <span />
      </div>
      <div className="project-loading-create" />
    </section>
  </main>;
}
