'use strict';
const cards = [...document.querySelectorAll('[data-course]')];
const search = document.querySelector('#course-search');
const sectionButtons = [...document.querySelectorAll('[data-section]')];
const subjectButtons = [...document.querySelectorAll('[data-filter]')];
let section = 'Toutes les sections';
let subject = 'Toutes les matières';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filterCourses() {
  const term = normalize(search.value.trim());
  let count = 0;
  for (const card of cards) {
    const matches = (section === 'Toutes les sections' || card.dataset.sections.includes(section)) &&
      (subject === 'Toutes les matières' || card.dataset.subject === subject) &&
      normalize(`${card.dataset.title} ${card.dataset.subject}`).includes(term);
    card.hidden = !matches;
    if (matches) count++;
  }
  document.querySelector('#result-count').textContent = `${count} cours illustratif${count === 1 ? '' : 's'}`;
  document.querySelector('.empty').hidden = count !== 0;
  sectionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.section === section)));
  subjectButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === subject)));
}
sectionButtons.forEach(button => button.addEventListener('click', () => { section = button.dataset.section; filterCourses(); }));
subjectButtons.forEach(button => button.addEventListener('click', () => { subject = button.dataset.filter; filterCourses(); }));
document.querySelectorAll('a[data-subject]').forEach(link => link.addEventListener('click', () => {
  subject = link.dataset.subject; section = 'Toutes les sections'; search.value = ''; filterCourses();
}));
search.addEventListener('input', filterCourses);
document.querySelector('.search').addEventListener('submit', event => { event.preventDefault(); filterCourses(); document.querySelector('#catalogue').scrollIntoView(); });
document.querySelector('#reset-filters').addEventListener('click', () => {
  section = 'Toutes les sections'; subject = 'Toutes les matières'; search.value = ''; filterCourses(); sectionButtons[0].focus();
});
const dialog = document.querySelector('#preview-dialog');
function showPreview(title, description, demo = false) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;
  document.querySelector('#demo-link').hidden = !demo;
  dialog.showModal();
}
document.querySelectorAll('[data-course-title]').forEach(button => button.addEventListener('click', () => {
  showPreview(button.dataset.courseTitle, 'Cette fiche illustre le futur catalogue. Ce cours n’est pas publié. Seul un exemple technique de mathématiques est disponible, sans validation pédagogique.', button.dataset.demo === 'true');
}));
document.querySelectorAll('[data-account]').forEach(button => button.addEventListener('click', () => {
  showPreview(button.dataset.account, 'Cet aperçu présente la future plateforme. Les comptes ne sont pas encore disponibles et aucune donnée personnelle n’est collectée ici.');
}));
document.querySelectorAll('.dialog-close,.dialog-dismiss').forEach(button => button.addEventListener('click', () => dialog.close()));
