export function normaliseSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-GB").trim();
}

export function matchesSearch(text: string, query: string): boolean {
  const source = normaliseSearch(text);
  return normaliseSearch(query).split(/\s+/).every((word) => source.includes(word));
}

let removeFilterListeners: (() => void) | undefined;

export function initFilters(): () => void {
  removeFilterListeners?.();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  const projects = [...document.querySelectorAll<HTMLElement>("[data-project-category]")];
  const projectStatus = document.querySelector<HTMLElement>("[data-filter-status]");
  const filter = (category: string) => {
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
    let count = 0;
    projects.forEach((project) => {
      project.hidden = category !== "All" && project.dataset.projectCategory !== category;
      if (!project.hidden) count += 1;
    });
    if (projectStatus) projectStatus.textContent = `${count} ${count === 1 ? "project" : "projects"}${category === "All" ? "" : ` in ${category}`}.`;
  };
  buttons.forEach((button) => button.addEventListener("click", () => filter(button.dataset.filter ?? "All"), options));
  if (buttons.length) filter("All");

  const search = document.querySelector<HTMLInputElement>("[data-blog-search]");
  const articles = [...document.querySelectorAll<HTMLElement>("[data-blog-card]")];
  const searchStatus = document.querySelector<HTMLElement>("[data-search-status]");
  const applySearch = () => {
    let count = 0;
    articles.forEach((article) => {
      article.hidden = !matchesSearch(article.dataset.search ?? "", search?.value ?? "");
      if (!article.hidden) count += 1;
    });
    if (searchStatus) searchStatus.textContent = count ? `${count} ${count === 1 ? "article" : "articles"} found.` : "No articles found. Try another search.";
  };
  search?.addEventListener("input", applySearch, options);
  if (search) applySearch();
  removeFilterListeners = () => controller.abort();
  return removeFilterListeners;
}
