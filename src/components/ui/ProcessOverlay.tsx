const steps = [
  ["Understand", "We get to know your idea, audience and the outcome you want to achieve."],
  ["Design & Model", "We prepare the scene, model the forms and develop the visual direction."],
  ["Design Review", "We review the model, layout and proposed views together before detailed visualisation begins."],
  ["Visualise", "Lighting, materials and composition bring the concept into focus."],
  ["Review & Refine", "We review the imagery together and refine the lighting, finishes and final details."],
  ["Deliver", "We prepare the agreed imagery or experience for its intended use."],
];
export function ProcessOverlay() {
  return (
    <section id="process" className="section section-pad section-surface"><div className="section-heading"><div><p className="eyebrow"><span /> A considered process</p><h2>Six steps.<br /><span className="text-muted">One shared vision.</span></h2></div><p>A clear path from the first conversation to the final delivery, with space to collaborate along the way.</p></div><ol className="process-grid">{steps.map(([title, text], index) => <li key={title}><span className="step-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
  );
}
