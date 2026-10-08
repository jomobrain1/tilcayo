import { useState } from "react";

export function ElementsPage() {
  const [message, setMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");

  return (
    <div className="tl-stack tl-stack-lg">
      <h1 className="tl-heading-1">Elements</h1>
      <section className="tl-card tl-stack" aria-labelledby="buttons-title">
        <h2 id="buttons-title" className="tl-heading-3">
          Buttons
        </h2>
        <div className="tl-flex tl-flex-wrap tl-gap-3">
          <button
            className="tl-btn tl-btn-primary"
            onClick={() => setMessage("Primary clicked.")}
          >
            Primary
          </button>
          <button
            className="tl-btn tl-btn-outline"
            onClick={() => setMessage("Outline clicked.")}
          >
            Outline
          </button>
          <button className="tl-btn" disabled>
            Disabled
          </button>
        </div>
        <span className="tl-help-text" role="status">
          {message}
        </span>
      </section>
      <section className="tl-card" aria-labelledby="form-title">
        <h2 id="form-title" className="tl-heading-3">
          Form
        </h2>
        <form
          className="tl-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setFormMessage("Submitted locally. Nothing saved.");
          }}
        >
          <div className="tl-grid tl-grid-cols-2">
            <div className="tl-form-group">
              <label className="tl-label" htmlFor="name">
                Name
              </label>
              <input
                className="tl-input"
                id="name"
                name="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="tl-form-group">
              <label className="tl-label" htmlFor="category">
                Category
              </label>
              <select className="tl-select" id="category" name="category">
                <option>Personal</option>
                <option>Team</option>
              </select>
            </div>
          </div>
          <div className="tl-form-group">
            <label className="tl-label" htmlFor="description">
              Description
            </label>
            <textarea
              className="tl-textarea"
              id="description"
              name="description"
            />
          </div>
          <div>
            <button className="tl-btn tl-btn-primary" type="submit">
              Submit
            </button>
          </div>
          <span className="tl-help-text" role="status">
            {formMessage}
          </span>
        </form>
      </section>
      <section className="tl-stack" aria-labelledby="feedback-title">
        <h2 className="tl-heading-3" id="feedback-title">
          Feedback
        </h2>
        <div className="tl-alert">Example notification.</div>
        <div className="tl-flex tl-gap-2">
          <span className="tl-badge">Draft</span>
          <span className="tl-badge">Active</span>
        </div>
      </section>
      <div
        className="tl-table-wrapper"
        role="region"
        aria-label="Sample projects"
        tabIndex={0}
      >
        <table className="tl-table">
          <caption>Projects</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>First project</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>New idea</td>
              <td>Draft</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
