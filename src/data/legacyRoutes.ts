export interface LegacyRoute {
  readonly file: string;
  readonly target: string;
  readonly title: string;
  readonly description: string;
  readonly linkLabel: string;
}

/** Preserve useful incoming links without reviving retired technical design services. */
export const legacyRoutes = [
  { file: "about.html", target: "about/", title: "The studio story has moved", description: "Discover Fireball Studios’ visualisation approach and six-stage process at the current About address.", linkLabel: "Meet the studio" },
  { file: "contact.html", target: "contact/", title: "Project enquiries have a new address", description: "Contact Fireball Studios about your property, furniture, automotive or creative visualisation project using the current enquiry page.", linkLabel: "Start a conversation" },
  { file: "industries.html", target: "industries/", title: "Our industry guide has moved", description: "Explore Fireball Studios’ visualisation services for property, architecture, automotive, furniture and products at the current Industries address.", linkLabel: "Explore our industries" },
  { file: "projects.html", target: "projects/", title: "The visualisation portfolio has moved", description: "Browse the current Fireball Studios portfolio of property, architectural, furniture and automotive visualisation studies.", linkLabel: "Explore the portfolio" },
  { file: "services.html", target: "industries/", title: "Explore our current visualisation services", description: "Find the current guide to Fireball Studios’ 3D imagery, animation and interactive presentation services, organised by industry.", linkLabel: "Find your visualisation service" },
  { file: "visualisation.html", target: "industries/", title: "Our visualisation guide has a new home", description: "See how Fireball Studios presents spaces, products and vehicles through still imagery, animation and interactive experiences.", linkLabel: "Explore visualisation services" },
  { file: "process.html", target: "about/#process", title: "Our creative process has moved", description: "Follow Fireball Studios’ six-stage visualisation process, from understanding the brief through modelling, reviews and final delivery.", linkLabel: "See the six-stage process" },
  { file: "privacy.html", target: "privacy/", title: "The privacy notice has moved", description: "Read the current Fireball Studios privacy notice for information about project enquiries, hosting and linked visual experiences.", linkLabel: "Read the privacy notice" },
  { file: "terms.html", target: "terms/", title: "The website terms have moved", description: "Read the current terms for Fireball Studios’ website, project enquiries, studio studies, imagery and attributed interactive models.", linkLabel: "Read the website terms" },
  { file: "fireball-car-configurator2.html", target: "projects/car-configurator/", title: "The car configurator has moved", description: "Launch Fireball Studios’ interactive automotive study from its current portfolio page, with model credits and viewing information.", linkLabel: "Explore the car configurator" },
  { file: "courtyard-house5.html", target: "projects/", title: "Explore the current property portfolio", description: "This older courtyard study address has retired. Explore the current Fireball Studios portfolio to see available property visualisation work.", linkLabel: "See the current portfolio" },
  { file: "glass-sculpture-11-selected.html", target: "projects/", title: "Explore the current studio portfolio", description: "This older glass sculpture study address has retired. Browse Fireball Studios’ current visualisation studies in spaces, furniture and interactive experiences.", linkLabel: "Browse the current studies" },
] as const satisfies readonly LegacyRoute[];

/** Only these known root documents may be generated alongside the normal directory routes. */
export function getLegacyRoute(file: string): LegacyRoute | undefined {
  return legacyRoutes.find((entry) => entry.file === file);
}
